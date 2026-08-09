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
import { router, useFocusEffect } from 'expo-router';
import axios from 'axios';

// ============================================
// 1. API CONFIGURATION
// ============================================

const API_BASE_URL = 'http://10.225.180.27:5000';

// ============================================
// 2. TYPES & INTERFACES
// ============================================

interface Address {
    _id: string;
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    landmark?: string;
    isDefault: boolean;
    addressType?: 'Home' | 'Work' | 'Other';
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

interface OrderItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
    brand?: string;
    variant?: string;
}

interface OrderSummary {
    subtotal: number;
    shipping: number;
    couponDiscount: number;
    grandTotal: number;
    itemCount: number;
}

interface PaymentMethod {
    id: string;
    title: string;
    type: 'UPI' | 'Credit Card' | 'Debit Card' | 'Net Banking' | 'Wallet' | 'COD';
    icon: string;
    description: string;
    isSelected?: boolean;
}

interface CouponResponse {
    success: boolean;
    message: string;
    data: {
        couponCode: string;
        discountAmount: number;
        subtotal: number;
        grandTotal: number;
    };
}

interface OrderResponse {
    success: boolean;
    message: string;
    data: {
        orders: Array<{
            _id: string;
            orderId: string;
            status: string;
            totalPrice: number;
        }>;
        summary: OrderSummary;
    };
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
// 3. API SERVICE FUNCTIONS
// ============================================

const getAuthToken = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem('token');
    } catch (error) {
        console.error('Error getting auth token:', error);
        return null;
    }
};

// Get User Profile with Addresses
const getUserProfile = async (): Promise<{ _id: string; name: string; email: string; phone: string; addresses: Address[] }> => {
    try {
        const token = await getAuthToken();
        if (!token) {
            throw new Error('No authentication token found');
        }

        const response = await axios.get(
            `${API_BASE_URL}/User/profile`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            }
        );

        if (response.data.success) {
            return response.data.data;
        } else {
            throw new Error(response.data.message || 'Failed to fetch user profile');
        }
    } catch (error: any) {
        console.error('Get user profile error:', error.response?.data || error.message);
        throw error;
    }
};

// Get Cart Items
const getCart = async (): Promise<{ items: CartItem[]; summary: OrderSummary }> => {
    try {
        const token = await getAuthToken();
        if (!token) {
            throw new Error('No authentication token found');
        }

        const response = await axios.get(
            `${API_BASE_URL}/Cart`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            }
        );

        if (response.data.success) {
            return response.data.data;
        } else {
            throw new Error(response.data.message || 'Failed to fetch cart');
        }
    } catch (error: any) {
        console.error('Get cart error:', error.response?.data || error.message);
        throw error;
    }
};

// Apply Coupon
const applyCoupon = async (couponCode: string): Promise<CouponResponse> => {
    try {
        const token = await getAuthToken();
        if (!token) {
            throw new Error('No authentication token found');
        }

        const response = await axios.post(
            `${API_BASE_URL}/Cart/apply-coupon`,
            { couponCode },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            }
        );

        return response.data;
    } catch (error: any) {
        console.error('Apply coupon error:', error.response?.data || error.message);
        throw error;
    }
};

// Remove Coupon
const removeCoupon = async (): Promise<{ success: boolean; message: string; data: { modifiedCount: number } }> => {
    try {
        const token = await getAuthToken();
        if (!token) {
            throw new Error('No authentication token found');
        }

        const response = await axios.delete(
            `${API_BASE_URL}/Cart/remove-coupon`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            }
        );

        return response.data;
    } catch (error: any) {
        console.error('Remove coupon error:', error.response?.data || error.message);
        throw error;
    }
};

// Create Order
const createOrder = async (data: { 
    address: any; 
    paymentMethod: string; 
    couponCode?: string; 
    notes?: string 
}): Promise<OrderResponse> => {
    try {
        const token = await getAuthToken();
        if (!token) {
            throw new Error('No authentication token found');
        }

        const response = await axios.post(
            `${API_BASE_URL}/Order/create`,
            {
                address: data.address,
                paymentMethod: data.paymentMethod,
                couponCode: data.couponCode || '',
                notes: data.notes || '',
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            }
        );

        return response.data;
    } catch (error: any) {
        console.error('Create order error:', error.response?.data || error.message);
        throw error;
    }
};

// Create Payment
const createPayment = async (orderId: string, method: string, provider?: string): Promise<PaymentResponse> => {
    try {
        const token = await getAuthToken();
        if (!token) {
            throw new Error('No authentication token found');
        }

        const response = await axios.post(
            `${API_BASE_URL}/Payment/create`,
            {
                orderId,
                amount: 0, // Will be calculated from order
                method,
                provider: provider || 'NONE',
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            }
        );

        return response.data;
    } catch (error: any) {
        console.error('Create payment error:', error.response?.data || error.message);
        throw error;
    }
};

// Process Payment
const processPayment = async (paymentId: string): Promise<any> => {
    try {
        const token = await getAuthToken();
        if (!token) {
            throw new Error('No authentication token found');
        }

        const response = await axios.post(
            `${API_BASE_URL}/Payment/${paymentId}/process`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            }
        );

        return response.data;
    } catch (error: any) {
        console.error('Process payment error:', error.response?.data || error.message);
        throw error;
    }
};

// ============================================
// 4. HELPER FUNCTIONS
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
// 5. COMPONENTS
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

const DeliveryAddressCard: React.FC<{
    address: Address | null;
    onChangePress: () => void;
    loading: boolean;
}> = ({ address, onChangePress, loading }) => {
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
        if (couponCode.trim()) {
            onApplyCoupon(couponCode.trim());
        } else {
            Alert.alert('Error', 'Please enter a coupon code');
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
                            autoCapitalize="characters"
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
        <Image
            source={{
                uri: item.image && item.image.startsWith('http')
                    ? item.image
                    : `${API_BASE_URL}${item.image || '/uploads/default-product.png'}`
            }}
            style={styles.orderItemImage}
            defaultSource={{uri: 'https://via.placeholder.com/150'}}
        />
        <View style={styles.orderItemDetails}>
            {item.brand && <Text style={styles.orderItemBrand}>{item.brand}</Text>}
            <Text style={styles.orderItemName}>{item.name}</Text>
            {item.variant && <Text style={styles.orderItemMeta}>Variant: {item.variant}</Text>}
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

    const grandTotal = summary.grandTotal || summary.subtotal || 0;

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
// 6. MAIN COMPONENT
// ============================================

const PaymentScreen: React.FC = () => {
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

    const scrollViewRef = useRef<ScrollView>(null);
    const stickyBarTranslateY = useSharedValue(100);

    // ============================================
    // 7. API FUNCTIONS
    // ============================================

    const loadAddress = async () => {
        try {
            const userData = await getUserProfile();
            if (userData.addresses && userData.addresses.length > 0) {
                // Get default address or first address
                const defaultAddress = userData.addresses.find(addr => addr.isDefault);
                setAddress(defaultAddress || userData.addresses[0]);
            } else {
                setAddress(null);
            }
        } catch (error: any) {
            console.error('Load address error:', error.message);
            // Don't show alert for address error, just set null
            setAddress(null);
        }
    };

    const loadCart = async () => {
        try {
            const cartData = await getCart();

            // Transform cart items to order items
            const items = cartData.items.map((item: CartItem) => ({
                id: item.product._id,
                name: item.product.name,
                price: item.product.discountPrice || item.product.price,
                quantity: item.quantity,
                image: item.product.thumbnail || item.product.images?.[0] || '',
                brand: item.product.brand || '',
                variant: item.variant || undefined,
            }));
            setCartItems(items);

            // Set summary
            if (cartData.summary) {
                setSummary(cartData.summary);
            }
        } catch (error: any) {
            console.error('Load cart error:', error.message);
            throw error;
        }
    };

    const loadPaymentMethods = () => {
        const methods: PaymentMethod[] = [
            { id: '1', title: 'Credit Card', type: 'Credit Card', icon: 'credit-card', description: 'Visa, MasterCard, Amex' },
            { id: '2', title: 'Debit Card', type: 'Debit Card', icon: 'credit-card', description: 'All major banks' },
            { id: '3', title: 'Net Banking', type: 'Net Banking', icon: 'university', description: '50+ banks supported' },
            { id: '4', title: 'PayTM Wallet', type: 'Wallet', icon: 'wallet', description: 'Instant payment' },
            { id: '5', title: 'Cash on Delivery', type: 'COD', icon: 'money-bill', description: 'Pay when delivered' },
        ];
        setPaymentMethods(methods);
        setSelectedPaymentId('1');
    };

    const loadAllData = async () => {
        try {
            setLoading(true);
            setError(null);

            await Promise.all([
                loadAddress(),
                loadCart(),
            ]);

            loadPaymentMethods();

        } catch (error: any) {
            console.error('Load data error:', error.message);
            setError(error.message || 'Failed to load payment details');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const refreshData = async () => {
        setRefreshing(true);
        await loadAllData();
    };

    // ============================================
    // 8. HANDLERS
    // ============================================

    const handleSelectPayment = useCallback((id: string) => {
        setSelectedPaymentId(id);
        setPaymentMethods(prev => prev.map(method => ({
            ...method,
            isSelected: method.id === id,
        })));
    }, []);

    const handleApplyCoupon = useCallback(async (code: string) => {
        if (!code.trim()) return;

        try {
            const response = await applyCoupon(code);
            if (response.success) {
                setAppliedCoupon(code);
                setSummary(prev => ({
                    ...prev,
                    couponDiscount: response.data.discountAmount,
                    grandTotal: response.data.grandTotal,
                }));
                Alert.alert('Success', `Coupon ${code} applied successfully!`);
            } else {
                Alert.alert('Error', response.message || 'Failed to apply coupon');
            }
        } catch (error: any) {
            console.error('Apply coupon error:', error.message);
            Alert.alert('Error', error.response?.data?.message || 'Failed to apply coupon');
        }
    }, []);

    const handleRemoveCoupon = useCallback(async () => {
        try {
            const response = await removeCoupon();
            if (response.success) {
                setAppliedCoupon(null);
                // Reload cart to get updated summary
                await loadCart();
                Alert.alert('Removed', 'Coupon removed successfully');
            } else {
                Alert.alert('Error', response.message || 'Failed to remove coupon');
            }
        } catch (error: any) {
            console.error('Remove coupon error:', error.message);
            Alert.alert('Error', error.response?.data?.message || 'Failed to remove coupon');
        }
    }, []);

    const handlePlaceOrder = () => {
      router.push('/ConfirmationScreen');
    }


    const handleBack = useCallback(() => {
        router.back();
    }, []);

    const handleChangeAddress = useCallback(() => {
        router.push('/AddressScreen');
    }, []);

    // ============================================
    // 9. EFFECTS
    // ============================================

    useEffect(() => {
        loadAllData();
    }, []);

    useFocusEffect(
        useCallback(() => {
            // Refresh address when returning to screen
            loadAddress();
            loadCart();
        }, [])
    );

    // Sticky bar animation
    useEffect(() => {
        stickyBarTranslateY.value = withTiming(0, { duration: 500 });
    }, []);

    const stickyBarStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: stickyBarTranslateY.value }],
    }));

    // ============================================
    // 10. LOADING STATE
    // ============================================

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

    // ============================================
    // 11. ERROR STATE
    // ============================================

    if (error && cartItems.length === 0) {
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
                    <TouchableOpacity style={styles.errorButton} onPress={loadAllData}>
                        <Text style={styles.errorButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // ============================================
    // 12. RENDER
    // ============================================

    const grandTotal = summary.grandTotal || summary.subtotal || 0;

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
                                onRefresh={refreshData}
                                colors={['#2563EB']}
                                tintColor="#2563EB"
                            />
                        }
                    >
                        {/* Delivery Address */}
                        <DeliveryAddressCard
                            address={address}
                            onChangePress={handleChangeAddress}
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
                            disabled={placingOrder || !address}
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
// 13. STYLES
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
        marginTop: 4,
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