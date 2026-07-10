// PaymentScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
    interpolate,
    SlideInUp,
    useAnimatedStyle,
    useSharedValue,
    withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import FontAwesome from 'react-native-vector-icons/FontAwesome5';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';

// ============================================
// 1. TYPES & INTERFACES
// ============================================

interface Address {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  landmark?: string;
}

interface PaymentMethod {
  id: string;
  title: string;
  type: 'UPI' | 'Credit Card' | 'Debit Card' | 'Net Banking' | 'Wallet' | 'COD';
  icon: string;
  description: string;
  isSelected?: boolean;
}

interface SavedPayment {
  id: string;
  type: 'Visa' | 'MasterCard' | 'UPI' | 'PayPal';
  last4?: string;
  upiId?: string;
  expiry?: string;
  isDefault?: boolean;
}

interface Coupon {
  id: string;
  code: string;
  discount: string;
  description: string;
  minOrder?: number;
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  size?: string;
  color?: string;
  brand?: string;
}

interface RecommendedProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  rating: number;
}

interface BillingDetails {
  subtotal: number;
  discount: number;
  couponDiscount: number;
  shippingFee: number;
  tax: number;
  platformFee: number;
}

interface OrderSummary {
  subtotal: number;
  shipping: number;
  couponDiscount: number;
  grandTotal: number;
  itemCount: number;
}

interface CartItem {
  _id: string;
  product: {
    _id: string;
    name: string;
    slug: string;
    price: number;
    discountPrice: number;
    thumbnail: string;
    images: string[];
    stock: number;
    brand: string;
  };
  variant: string | null;
  quantity: number;
  totalPrice: number;
  currentTotalPrice: number;
  stockAvailable: boolean;
  priceChanged: boolean;
}

interface PaymentResponse {
  success: boolean;
  message: string;
  data: {
    _id: string;
    order: string;
    user: string;
    amount: number;
    method: string;
    transactionId: string;
    invoiceId: string;
    status: string;
    paidAt: string | null;
  };
}

// ============================================
// 2. API SERVICE
// ============================================

const API_BASE_URL = 'http://192.168.0.103:5000';

const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

const apiRequest = async <T,>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<T> => {
  const token = await getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const config: RequestInit = {
    method,
    headers,
  };
  
  if (body) {
    config.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'API request failed');
  }
  
  return response.json();
};

// Cart API calls
const cartAPI = {
  getCart: () =>
    apiRequest<{ success: boolean; data: { items: CartItem[]; summary: OrderSummary } }>('/cart'),
  
  getSummary: () =>
    apiRequest<{ success: boolean; data: { itemCount: number; subtotal: string; cartCount: number } }>('/cart/summary'),
  
  validateCart: () =>
    apiRequest<{ success: boolean; data: { valid: boolean; items: any[]; unavailableItems: any[]; outOfStockItems: any[]; priceChangedItems: any[] } }>('/cart/validate'),
  
  applyCoupon: (couponCode: string) =>
    apiRequest<{ success: boolean; message: string; data: { couponCode: string; discountAmount: number; subtotal: number; grandTotal: number } }>('/cart/apply-coupon', 'POST', { couponCode }),
  
  removeCoupon: () =>
    apiRequest<{ success: boolean; message: string; data: { modifiedCount: number } }>('/cart/remove-coupon', 'DELETE'),
};

// Order API calls
const orderAPI = {
  createOrder: (data: { address: any; paymentMethod: string; couponCode?: string; notes?: string }) =>
    apiRequest<{ success: boolean; message: string; data: { orders: any[]; summary: OrderSummary } }>('/order/create', 'POST', data),
};

// Payment API calls
const paymentAPI = {
  createPayment: (orderId: string, method: string, provider?: string, paymentDetails?: any) =>
    apiRequest<PaymentResponse>(`/payment/create/${orderId}`, 'POST', {
      method,
      provider: provider || 'NONE',
      paymentDetails: paymentDetails || {},
    }),
  
  retryPayment: (paymentId: string, paymentDetails?: any) =>
    apiRequest<{ success: boolean; message: string; data: any }>(`/payment/retry/${paymentId}`, 'POST', {
      paymentDetails: paymentDetails || {},
    }),
};

// User API calls
const userAPI = {
  getUserProfile: () =>
    apiRequest<{ success: boolean; data: { _id: string; name: string; email: string; phone: string; addresses: Address[] } }>('/users/profile'),
};

// ============================================
// 3. HELPER FUNCTIONS
// ============================================

const getPaymentIcon = (type: string): string => {
  switch (type) {
    case 'UPI': return 'google-pay';
    case 'Credit Card': return 'credit-card';
    case 'Debit Card': return 'credit-card';
    case 'Net Banking': return 'university';
    case 'Wallet': return 'wallet';
    case 'COD': return 'money-bill';
    default: return 'credit-card';
  }
};

const getPaymentTypeIcon = (type: string) => {
  if (type === 'UPI') return 'logo-google-wallet';
  if (type === 'Credit Card') return 'cc-visa';
  if (type === 'Debit Card') return 'credit-card';
  if (type === 'Net Banking') return 'university';
  if (type === 'Wallet') return 'wallet';
  if (type === 'COD') return 'money-off-csred';
  return 'credit-card';
};

// ============================================
// 4. COMPONENTS
// ============================================

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const CheckoutProgress: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  const steps = ['Address', 'Payment', 'Confirmation'];
  
  return (
    <View style={styles.progressContainer}>
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <View style={styles.progressStep}>
            <View style={[styles.progressDot, index <= currentStep && styles.progressDotActive]}>
              {index < currentStep && <Icon name="check" size={12} color="#FFFFFF" />}
              {index === currentStep && <View style={styles.progressDotInner} />}
            </View>
            <Text style={[styles.progressLabel, index <= currentStep && styles.progressLabelActive]}>
              {step}
            </Text>
          </View>
          {index < steps.length - 1 && (
            <View style={[styles.progressLine, index < currentStep && styles.progressLineActive]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
};

const DeliveryAddressCard: React.FC<{ address: Address; onChangePress: () => void; loading: boolean }> = ({ 
  address, 
  onChangePress,
  loading 
}) => {
  if (loading) {
    return (
      <View style={styles.addressCard}>
        <ActivityIndicator size="small" color="#2563EB" />
        <Text style={styles.loadingAddressText}>Loading address...</Text>
      </View>
    );
  }

  if (!address) {
    return (
      <View style={styles.addressCard}>
        <Text style={styles.noAddressText}>No delivery address found</Text>
        <TouchableOpacity style={styles.addAddressButton} onPress={onChangePress}>
          <Text style={styles.addAddressButtonText}>Add Address</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.delay(100)} style={styles.addressCard}>
      <View style={styles.addressHeader}>
        <View style={styles.addressIconContainer}>
          <Icon name="map-pin" size={20} color="#2563EB" />
        </View>
        <Text style={styles.addressTitle}>Deliver To</Text>
        <TouchableOpacity onPress={onChangePress}>
          <Text style={styles.changeText}>Change</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.customerName}>{address.fullName}</Text>
      <Text style={styles.customerPhone}>{address.phone}</Text>
      <Text style={styles.addressText}>
        {address.street}, {address.city}, {address.state} - {address.zipCode}
      </Text>
      <Text style={styles.addressText}>{address.country}</Text>
      {address.landmark && <Text style={styles.landmarkText}>Landmark: {address.landmark}</Text>}
    </Animated.View>
  );
};

const PaymentMethodCard: React.FC<{ method: PaymentMethod; onSelect: () => void }> = ({ method, onSelect }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(method.isSelected ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(method.isSelected ? 1 : 0, { duration: 200 });
  }, [method.isSelected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const radioStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: interpolate(opacity.value, [0, 1], [0.8, 1]) }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.98, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 100 });
  };

  const iconName = getPaymentTypeIcon(method.type);

  return (
    <AnimatedTouchable
      style={[styles.paymentMethodCard, method.isSelected && styles.paymentMethodCardSelected, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onSelect}
      activeOpacity={1}
    >
      <View style={styles.paymentMethodLeft}>
        <View style={styles.paymentMethodIcon}>
          {typeof iconName === 'string' && (
            method.type === 'UPI' ? (
              <Ionicons name={iconName as any} size={24} color="#2563EB" />
            ) : method.type === 'Credit Card' || method.type === 'Debit Card' ? (
              <FontAwesome name={iconName as any} size={24} color="#2563EB" />
            ) : method.type === 'Net Banking' ? (
              <FontAwesome name={iconName as any} size={24} color="#2563EB" />
            ) : method.type === 'Wallet' ? (
              <FontAwesome name={iconName as any} size={24} color="#2563EB" />
            ) : (
              <MaterialIcon name={iconName as any} size={24} color="#2563EB" />
            )
          )}
        </View>
        <View>
          <Text style={styles.paymentMethodTitle}>{method.title}</Text>
          <Text style={styles.paymentMethodDescription}>{method.description}</Text>
        </View>
      </View>
      <Animated.View style={[styles.radioButton, method.isSelected && styles.radioButtonSelected, radioStyle]} />
    </AnimatedTouchable>
  );
};

const CouponSection: React.FC<{ 
  onApplyCoupon: (code: string) => void; 
  onRemoveCoupon: () => void;
  appliedCoupon: string | null;
  loading: boolean;
}> = ({ onApplyCoupon, onRemoveCoupon, appliedCoupon, loading }) => {
  const [couponCode, setCouponCode] = useState('');
  const [showCoupons, setShowCoupons] = useState(false);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleApply = () => {
    if (couponCode) {
      onApplyCoupon(couponCode);
    }
  };

  const handleRemove = () => {
    setCouponCode('');
    onRemoveCoupon();
  };

  return (
    <Animated.View entering={FadeInDown.delay(200)} style={styles.couponSection}>
      <TouchableOpacity onPress={() => setShowCoupons(!showCoupons)} style={styles.couponHeader}>
        <View style={styles.couponHeaderLeft}>
          <Icon name="gift" size={20} color="#8B5CF6" />
          <Text style={styles.couponHeaderTitle}>
            {appliedCoupon ? `Coupon Applied: ${appliedCoupon}` : 'Apply Coupon'}
          </Text>
        </View>
        <View style={styles.couponHeaderRight}>
          {appliedCoupon && (
            <TouchableOpacity onPress={handleRemove} style={styles.removeCouponButton}>
              <Text style={styles.removeCouponText}>Remove</Text>
            </TouchableOpacity>
          )}
          <Icon name={showCoupons ? 'chevron-up' : 'chevron-down'} size={20} color="#64748B" />
        </View>
      </TouchableOpacity>

      {showCoupons && !appliedCoupon && (
        <Animated.View entering={FadeInDown}>
          <View style={styles.couponInputContainer}>
            <TextInput
              style={styles.couponInput}
              placeholder="Enter Promo Code"
              value={couponCode}
              onChangeText={setCouponCode}
              placeholderTextColor="#94A3B8"
              editable={!loading}
            />
            <AnimatedTouchable 
              style={[styles.applyButton, animatedStyle]} 
              onPress={handleApply} 
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.applyButtonText}>Apply</Text>
              )}
            </AnimatedTouchable>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
};

const OrderItemCard: React.FC<{ item: OrderItem }> = ({ item }) => (
  <View style={styles.orderItemCard}>
    <Image source={{ uri: item.image || 'https://via.placeholder.com/70' }} style={styles.orderItemImage} />
    <View style={styles.orderItemDetails}>
      {item.brand && <Text style={styles.orderItemBrand}>{item.brand}</Text>}
      <Text style={styles.orderItemName}>{item.name}</Text>
      {item.size && <Text style={styles.orderItemMeta}>Size: {item.size}</Text>}
      {item.color && <Text style={styles.orderItemMeta}>Color: {item.color}</Text>}
      <Text style={styles.orderItemPrice}>₹{item.price.toLocaleString()}</Text>
    </View>
    <Text style={styles.orderItemQuantity}>x{item.quantity}</Text>
  </View>
);

const BillingSummary: React.FC<{ 
  summary: OrderSummary; 
  loading: boolean;
}> = ({ summary, loading }) => {
  if (loading) {
    return (
      <View style={styles.billingCard}>
        <ActivityIndicator size="small" color="#2563EB" />
        <Text style={styles.loadingText}>Calculating totals...</Text>
      </View>
    );
  }

  const grandTotal = summary.grandTotal || 0;

  return (
    <Animated.View entering={FadeInUp.delay(150)} style={styles.billingCard}>
      <Text style={styles.billingTitle}>Billing Summary</Text>
      
      <View style={styles.billingRow}>
        <Text style={styles.billingLabel}>Subtotal ({summary.itemCount || 0} items)</Text>
        <Text style={styles.billingValue}>₹{summary.subtotal?.toLocaleString() || 0}</Text>
      </View>
      
      <View style={styles.billingRow}>
        <Text style={styles.billingLabel}>Shipping Fee</Text>
        <Text style={styles.billingValue}>
          {summary.shipping === 0 ? 'Free' : `₹${summary.shipping?.toLocaleString() || 0}`}
        </Text>
      </View>
      
      {summary.couponDiscount > 0 && (
        <View style={styles.billingRow}>
          <Text style={[styles.billingLabel, styles.couponLabel]}>Coupon Discount</Text>
          <Text style={[styles.billingValue, styles.couponValue]}>
            -₹{summary.couponDiscount.toLocaleString()}
          </Text>
        </View>
      )}
      
      <View style={styles.divider} />
      
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Grand Total</Text>
        <Text style={styles.totalValue}>₹{grandTotal.toLocaleString()}</Text>
      </View>
    </Animated.View>
  );
};

const SecurityCard: React.FC = () => (
  <Animated.View entering={FadeInDown.delay(250)} style={styles.securityCard}>
    <View style={styles.securityHeader}>
      <Icon name="shield" size={20} color="#10B981" />
      <Text style={styles.securityTitle}>Payment Security</Text>
    </View>
    <Text style={styles.securityTextDescription}>
      Your payment information is encrypted and secure. We use SSL encryption and are PCI compliant.
    </Text>
    <View style={styles.securityIcons}>
      <FontAwesome name="cc-visa" size={32} color="#1A1F36" />
      <FontAwesome name="cc-mastercard" size={32} color="#1A1F36" />
      <FontAwesome name="cc-amex" size={32} color="#1A1F36" />
      <FontAwesome name="google-pay" size={32} color="#1A1F36" />
    </View>
  </Animated.View>
);

// ============================================
// 5. MAIN COMPONENT
// ============================================

const PaymentScreen: React.FC = () => {
  const params = useLocalSearchParams();
  const orderId = (params as any)?.orderId;
  
  // State
  const [address, setAddress] = useState<Address | null>(null);
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [summary, setSummary] = useState<OrderSummary>({
    subtotal: 0,
    shipping: 0,
    couponDiscount: 0,
    grandTotal: 0,
    itemCount: 0,
  });
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddons] = useState(true);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const stickyBarTranslateY = useSharedValue(100);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user profile with address
      const userResponse = await userAPI.getUserProfile();
      if (userResponse.success && userResponse.data) {
        const userData = userResponse.data;
        if (userData.addresses && userData.addresses.length > 0) {
          setAddress(userData.addresses[0]);
        }
      }

      // Get cart items
      const cartResponse = await cartAPI.getCart();
      if (cartResponse.success) {
        const cartData = cartResponse.data;
        
        // Transform cart items to order items
        const items = cartData.items.map((item: CartItem) => ({
          id: item.product._id,
          name: item.product.name,
          price: item.product.discountPrice || item.product.price,
          quantity: item.quantity,
          image: item.product.thumbnail || item.product.images?.[0] || '',
          brand: item.product.brand || '',
          size: item.variant || undefined,
        }));
        setCartItems(items);
        
        // Set summary
        if (cartData.summary) {
          setSummary(cartData.summary);
        }
      }

      // Set payment methods
      const methods: PaymentMethod[] = [
        { id: '1', title: 'Google Pay', type: 'UPI', icon: 'google-pay', description: 'Pay using UPI', isSelected: true },
        { id: '2', title: 'PhonePe', type: 'UPI', icon: 'phonepe', description: 'Instant bank transfer' },
        { id: '3', title: 'Credit Card', type: 'Credit Card', icon: 'credit-card', description: 'Visa, MasterCard, Amex' },
        { id: '4', title: 'Debit Card', type: 'Debit Card', icon: 'credit-card', description: 'All major banks' },
        { id: '5', title: 'Net Banking', type: 'Net Banking', icon: 'university', description: '50+ banks supported' },
        { id: '6', title: 'PayTM Wallet', type: 'Wallet', icon: 'wallet', description: 'Instant payment' },
        { id: '7', title: 'Cash on Delivery', type: 'COD', icon: 'money-bill', description: 'Pay when delivered' },
      ];
      setPaymentMethods(methods);
      setSelectedPaymentId('1');

    } catch (err) {
      console.error('Error loading payment data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sticky bar animation
  useEffect(() => {
    stickyBarTranslateY.value = withTiming(0, { duration: 500 });
  }, []);

  const stickyBarStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: stickyBarTranslateY.value }],
  }));

  // Handlers
  const handleSelectPayment = useCallback((id: string) => {
    setSelectedPaymentId(id);
    setPaymentMethods(prev => prev.map(method => ({
      ...method,
      isSelected: method.id === id,
    })));
  }, []);

  const handleApplyCoupon = useCallback(async (code: string) => {
    if (!code) return;
    
    try {
      const response = await cartAPI.applyCoupon(code);
      if (response.success) {
        setAppliedCoupon(code);
        setSummary(prev => ({
          ...prev,
          couponDiscount: response.data.discountAmount,
          grandTotal: response.data.grandTotal,
        }));
        Alert.alert('Success', `Coupon ${code} applied successfully!`);
      }
    } catch (error) {
      console.error('Error applying coupon:', error);
      Alert.alert('Error', 'Failed to apply coupon');
    }
  }, []);

  const handleRemoveCoupon = useCallback(async () => {
    try {
      const response = await cartAPI.removeCoupon();
      if (response.success) {
        setAppliedCoupon(null);
        // Reload cart to get updated summary
        const cartResponse = await cartAPI.getCart();
        if (cartResponse.success && cartResponse.data.summary) {
          setSummary(cartResponse.data.summary);
        }
        Alert.alert('Removed', 'Coupon removed successfully');
      }
    } catch (error) {
      console.error('Error removing coupon:', error);
      Alert.alert('Error', 'Failed to remove coupon');
    }
  }, []);

  const handlePlaceOrder = useCallback(async () => {
    if (!address) {
      Alert.alert('Error', 'Please add a delivery address');
      return;
    }

    if (!selectedPaymentId) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    const selectedMethod = paymentMethods.find(m => m.id === selectedPaymentId);
    if (!selectedMethod) {
      Alert.alert('Error', 'Invalid payment method');
      return;
    }

    try {
      setPlacingOrder(true);

      // Create order
      const orderData = {
        address: {
          fullName: address.fullName,
          phone: address.phone,
          street: address.street,
          city: address.city,
          state: address.state,
          zipCode: address.zipCode,
          country: address.country,
        },
        paymentMethod: selectedMethod.type,
        couponCode: appliedCoupon || undefined,
        notes: '',
      };

      const orderResponse = await orderAPI.createOrder(orderData);
      
      if (!orderResponse.success) {
        throw new Error(orderResponse.message || 'Failed to create order');
      }

      const orderId = orderResponse.data.orders[0]?._id;
      
      if (!orderId) {
        throw new Error('Order ID not found');
      }

      // Create payment
      const paymentResponse = await paymentAPI.createPayment(
        orderId,
        selectedMethod.type,
        'NONE',
        {}
      );

      if (paymentResponse.success) {
        Alert.alert(
          'Order Placed!',
          `Your order has been placed successfully. Order ID: ${orderResponse.data.orders[0]?.orderId || ''}`,
          [
            {
              text: 'View Orders',
              onPress: () => router.push('/orders'),
            },
          ]
        );
      } else {
        throw new Error(paymentResponse.message || 'Payment failed');
      }

    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to place order');
    } finally {
      setPlacingOrder(false);
    }
  }, [address, selectedPaymentId, paymentMethods, appliedCoupon]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
            <Icon name="arrow-left" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={styles.securityBadge}>
            <Icon name="lock" size={14} color="#10B981" />
            <Text style={styles.securityText}>Secure</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading payment details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && !address && cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
            <Icon name="arrow-left" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={styles.securityBadge}>
            <Icon name="lock" size={14} color="#10B981" />
            <Text style={styles.securityText}>Secure</Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={60} color="#EF4444" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.errorButton} onPress={loadData}>
            <Text style={styles.errorButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const grandTotal = summary.grandTotal || 0;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        
        <Animated.View entering={FadeIn.delay(300)} style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
            <Icon name="arrow-left" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={styles.securityBadge}>
            <Icon name="lock" size={14} color="#10B981" />
            <Text style={styles.securityText}>Secure</Text>
          </View>
        </Animated.View>

        <CheckoutProgress currentStep={1} />

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            initialNumToRender={8}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#2563EB']}
                tintColor="#2563EB"
              />
            }
          >
            {/* Delivery Address */}
            <DeliveryAddressCard 
              address={address!} 
              onChangePress={() => router.push('/address')}
              loading={loading}
            />

            {/* Payment Methods */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Payment Method</Text>
              {paymentMethods.map((method) => (
                <PaymentMethodCard
                  key={method.id}
                  method={method}
                  onSelect={() => handleSelectPayment(method.id)}
                />
              ))}
            </View>

            {/* Coupon Section */}
            <CouponSection 
              onApplyCoupon={handleApplyCoupon}
              onRemoveCoupon={handleRemoveCoupon}
              appliedCoupon={appliedCoupon}
              loading={loading}
            />

            {/* Order Items Preview */}
            {cartItems.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Order Items ({cartItems.length})</Text>
                </View>
                {cartItems.map((item) => (
                  <OrderItemCard key={item.id} item={item} />
                ))}
              </View>
            )}

            {/* Billing Summary */}
            <BillingSummary summary={summary} loading={loading} />

            {/* Payment Security */}
            <SecurityCard />

            {/* Terms & Conditions */}
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                By proceeding, you agree to the{' '}
                <Text style={styles.termsLink}>Terms & Conditions</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Sticky Payment Bar */}
        <Animated.View entering={SlideInUp.delay(400)} style={[styles.stickyBar, stickyBarStyle]}>
          <View style={styles.stickyBarContent}>
            <View>
              <Text style={styles.totalAmountLabel}>Total Amount</Text>
              <Text style={styles.totalAmount}>₹{grandTotal.toLocaleString()}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.payNowButton, placingOrder && styles.disabledButton]} 
              onPress={handlePlaceOrder}
              disabled={placingOrder}
            >
              {placingOrder ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.payNowText}>Place Order</Text>
                  <Icon name="arrow-right" size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

// ============================================
// 6. STYLES
// ============================================

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98115',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  securityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  progressStep: {
    alignItems: 'center',
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressDotActive: {
    backgroundColor: '#2563EB',
  },
  progressDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  progressLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  progressLabelActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: '#2563EB',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: '#64748B',
  },
  loadingAddressText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  errorText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    marginTop: 16,
    padding: 18,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  noAddressText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },
  addAddressButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addAddressButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  addressIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563EB15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  addressTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  changeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2563EB',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
    width: '100%',
  },
  customerPhone: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
    width: '100%',
  },
  addressText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    width: '100%',
  },
  landmarkText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    width: '100%',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paymentMethodCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#2563EB08',
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentMethodIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentMethodTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  paymentMethodDescription: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  radioButtonSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#2563EB',
  },
  couponSection: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    marginTop: 8,
    marginBottom: 0,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  couponHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  couponHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  couponHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  couponHeaderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  removeCouponButton: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  removeCouponText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#EF4444',
  },
  couponInputContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  couponInput: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  applyButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    minWidth: 80,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  orderItemCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  orderItemImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    marginRight: 12,
  },
  orderItemDetails: {
    flex: 1,
  },
  orderItemBrand: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  orderItemMeta: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  orderItemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
    marginTop: 4,
  },
  orderItemQuantity: {
    fontSize: 13,
    color: '#64748B',
  },
  billingCard: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    marginTop: 20,
    padding: 18,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  billingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 16,
    width: '100%',
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    width: '100%',
  },
  billingLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  billingValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  couponLabel: {
    color: '#8B5CF6',
  },
  couponValue: {
    color: '#8B5CF6',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
    width: '100%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2563EB',
  },
  securityCard: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    marginTop: 0,
    padding: 18,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  securityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  securityTextDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  securityIcons: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  termsContainer: {
    paddingHorizontal: 20,
    marginVertical: 16,
  },
  termsText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
  },
  termsLink: {
    color: '#2563EB',
    textDecorationLine: 'underline',
  },
  stickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  stickyBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalAmountLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2563EB',
  },
  payNowButton: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  payNowText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.7,
  },
});

export default PaymentScreen;