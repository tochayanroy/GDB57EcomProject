// TrackOrderScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    Linking,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
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
    SlideInLeft,
    SlideInRight,
    useAnimatedStyle,
    useSharedValue,
    withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';

// ============================================
// 1. TYPES & INTERFACES
// ============================================

interface Order {
  _id: string;
  orderId: string;
  user: string;
  product: {
    _id: string;
    name: string;
    slug: string;
    thumbnail: string;
    images: string[];
    brand: string;
  };
  variant: string | null;
  quantity: number;
  price: number;
  discountPrice: number;
  totalPrice: number;
  shippingCharge: number;
  coupon: {
    code: string | null;
    discountAmount: number;
  };
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  payment: {
    method: string;
    status: string;
    transactionId: string | null;
    paidAt: string | null;
  };
  addresses: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  }[];
  shipping: {
    method: string;
    trackingNumber: string | null;
    carrier: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
  };
  notes: string;
  isPaid: boolean;
  isDelivered: boolean;
  refund: {
    status: string;
    amount: number;
    reason: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface TimelineEvent {
  id: string;
  status: string;
  description: string;
  location?: string;
  timestamp: string;
  date: Date;
  completed: boolean;
  current: boolean;
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

interface DeliveryAddress {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface ActivityUpdate {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  icon: string;
}

interface OrderResponse {
  success: boolean;
  data: Order;
}

interface TrackResponse {
  success: boolean;
  data: {
    orderId: string;
    product: any;
    status: string;
    trackingSteps: {
      step: string;
      status: string;
      date: string | null;
      description: string;
    }[];
    trackingNumber: string | null;
    carrier: string | null;
    estimatedDelivery: string | null;
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

// Order API calls
const orderAPI = {
  getOrderById: (orderId: string) =>
    apiRequest<OrderResponse>(`/order/${orderId}`),
  
  getOrderByOrderId: (orderId: string) =>
    apiRequest<OrderResponse>(`/order/by-order-id/${orderId}`),
  
  trackOrder: (orderId: string) =>
    apiRequest<TrackResponse>(`/order/${orderId}/track`),
  
  cancelOrder: (orderId: string, reason: string) =>
    apiRequest<{ success: boolean; message: string; data: Order }>(
      `/order/${orderId}/cancel`,
      'POST',
      { reason }
    ),
  
  requestReturn: (orderId: string, reason: string) =>
    apiRequest<{ success: boolean; message: string; data: Order }>(
      `/order/${orderId}/return`,
      'POST',
      { reason }
    ),
  
  getInvoice: (orderId: string) =>
    apiRequest<{ success: boolean; data: any }>(`/order/${orderId}/invoice`),
};

// ============================================
// 3. HELPER FUNCTIONS
// ============================================

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'delivered': return '#22C55E';
    case 'shipped': return '#2563EB';
    case 'confirmed':
    case 'processing': return '#8B5CF6';
    case 'pending': return '#F59E0B';
    case 'cancelled':
    case 'returned': return '#EF4444';
    default: return '#64748B';
  }
};

const getStatusText = (status: string): string => {
  switch (status) {
    case 'pending': return 'Pending Confirmation';
    case 'confirmed': return 'Confirmed';
    case 'processing': return 'Processing';
    case 'shipped': return 'Shipped';
    case 'delivered': return 'Delivered';
    case 'cancelled': return 'Cancelled';
    case 'returned': return 'Returned';
    default: return status;
  }
};

const getProgressPercentage = (status: string): number => {
  switch (status) {
    case 'pending': return 10;
    case 'confirmed': return 20;
    case 'processing': return 35;
    case 'shipped': return 60;
    case 'delivered': return 100;
    case 'cancelled': return 100;
    case 'returned': return 100;
    default: return 0;
  }
};

const getDaysRemaining = (estimatedDate: string | null): number => {
  if (!estimatedDate) return 0;
  const diffTime = new Date(estimatedDate).getTime() - new Date().getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getActivityIcon = (status: string): string => {
  switch (status) {
    case 'pending': return 'clock';
    case 'confirmed': return 'check-circle';
    case 'processing': return 'package';
    case 'shipped': return 'truck';
    case 'delivered': return 'check-circle';
    case 'cancelled': return 'x-circle';
    case 'returned': return 'rotate-ccw';
    default: return 'circle';
  }
};

// ============================================
// 4. COMPONENTS
// ============================================

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const OrderStatusHero: React.FC<{ order: Order; trackingData?: TrackResponse['data'] }> = ({ 
  order, 
  trackingData 
}) => {
  const progressWidth = useSharedValue(0);
  const status = order.status;
  const progress = getProgressPercentage(status);
  const color = getStatusColor(status);
  
  useEffect(() => {
    progressWidth.value = withTiming(progress, { duration: 1000 });
  }, [progress]);

  const progressAnimStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const estimatedDate = trackingData?.estimatedDelivery || 
    (order.shipping.shippedAt 
      ? new Date(new Date(order.shipping.shippedAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : null);

  const daysRemaining = estimatedDate ? getDaysRemaining(estimatedDate) : 0;

  return (
    <Animated.View entering={FadeInDown.delay(100)} style={styles.heroCard}>
      <View style={styles.statusRow}>
        <View style={[styles.statusBadge, { backgroundColor: color + '15' }]}>
          <View style={[styles.statusDot, { backgroundColor: color }]} />
          <Text style={[styles.statusText, { color }]}>{getStatusText(status)}</Text>
        </View>
        <Text style={styles.orderNumber}>{order.orderId}</Text>
      </View>
      
      <Text style={styles.estimatedTitle}>Estimated Delivery</Text>
      <Text style={styles.estimatedDate}>
        {status === 'delivered' 
          ? 'Delivered'
          : status === 'cancelled'
          ? 'Cancelled'
          : daysRemaining > 0
          ? `${daysRemaining} days remaining`
          : 'Processing'}
      </Text>
      
      {status !== 'delivered' && status !== 'cancelled' && (
        <>
          <View style={styles.countdownContainer}>
            <Icon name="calendar" size={16} color="#64748B" />
            <Text style={styles.countdownText}>
              {daysRemaining === 0 
                ? 'Processing your order' 
                : `Expected delivery in ${daysRemaining} days`}
            </Text>
          </View>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View style={[styles.progressFill, { backgroundColor: color }, progressAnimStyle]} />
            </View>
            <Text style={styles.progressText}>{progress}% completed</Text>
          </View>
        </>
      )}
    </Animated.View>
  );
};

const TimelineEventItem: React.FC<{ event: TimelineEvent; index: number }> = ({ event, index }) => {
  const getIcon = () => {
    if (event.completed) return 'check-circle';
    if (event.current) return 'loader';
    return 'circle';
  };

  const getIconColor = () => {
    if (event.completed) return '#22C55E';
    if (event.current) return '#2563EB';
    return '#CBD5E1';
  };

  return (
    <Animated.View 
      entering={SlideInRight.delay(100 + index * 50)} 
      style={styles.timelineItem}
    >
      <View style={styles.timelineLeft}>
        <View style={[styles.timelineIcon, { backgroundColor: getIconColor() + '15' }]}>
          <Icon name={getIcon()} size={20} color={getIconColor()} />
        </View>
        {index < 6 && <View style={styles.timelineLine} />}
      </View>
      <View style={styles.timelineContent}>
        <Text style={styles.timelineStatus}>{event.status}</Text>
        <Text style={styles.timelineDescription}>{event.description}</Text>
        {event.location && <Text style={styles.timelineLocation}>📍 {event.location}</Text>}
        <Text style={styles.timelineTimestamp}>{event.timestamp}</Text>
      </View>
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

const DeliveryAddressCard: React.FC<{ address: DeliveryAddress }> = ({ address }) => (
  <Animated.View entering={FadeInUp.delay(200)} style={styles.addressCard}>
    <View style={styles.cardHeader}>
      <MaterialIcon name="location-on" size={20} color="#2563EB" />
      <Text style={styles.cardTitle}>Shipping Address</Text>
    </View>
    <Text style={styles.addressName}>{address.fullName}</Text>
    <Text style={styles.addressPhone}>{address.phone}</Text>
    <Text style={styles.addressText}>
      {address.street}, {address.city}, {address.state} - {address.zipCode}
    </Text>
    <Text style={styles.addressText}>{address.country}</Text>
  </Animated.View>
);

const CourierCard: React.FC<{ order: Order }> = ({ order }) => {
  const handleTrackOnWeb = () => {
    if (order.shipping.trackingNumber) {
      const url = `https://www.trackcourier.com/${order.shipping.carrier}/${order.shipping.trackingNumber}`;
      Linking.openURL(url);
    }
  };

  const handleCallCourier = () => {
    // In production, use actual courier phone number
    Linking.openURL('tel:+18001234567');
  };

  if (!order.shipping.trackingNumber && order.status !== 'delivered') {
    return null;
  }

  return (
    <Animated.View entering={FadeInUp.delay(250)} style={styles.courierCard}>
      <View style={styles.cardHeader}>
        <Ionicons name="cube-outline" size={20} color="#2563EB" />
        <Text style={styles.cardTitle}>Courier Information</Text>
      </View>
      
      <View style={styles.courierInfo}>
        <View style={styles.courierLogoContainer}>
          <Ionicons name="cube-outline" size={30} color="#2563EB" />
        </View>
        <View style={styles.courierDetails}>
          <Text style={styles.courierName}>
            {order.shipping.carrier || 'Standard Shipping'}
          </Text>
          {order.shipping.trackingNumber && (
            <Text style={styles.trackingNumber}>
              Tracking: {order.shipping.trackingNumber}
            </Text>
          )}
          <Text style={styles.shipmentType}>
            {order.shipping.method || 'Standard Delivery'}
          </Text>
        </View>
      </View>
      
      {order.shipping.trackingNumber && (
        <View style={styles.courierActions}>
          <TouchableOpacity style={styles.courierActionButton} onPress={handleTrackOnWeb}>
            <Icon name="globe" size={18} color="#2563EB" />
            <Text style={styles.courierActionText}>Track on Web</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.courierActionButton} onPress={handleCallCourier}>
            <Icon name="phone" size={18} color="#2563EB" />
            <Text style={styles.courierActionText}>Call Support</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
};

const DeliveryNotesCard: React.FC<{ notes?: string }> = ({ notes }) => {
  if (!notes) return null;
  
  return (
    <Animated.View entering={FadeInUp.delay(300)} style={styles.notesCard}>
      <View style={styles.cardHeader}>
        <Icon name="file-text" size={18} color="#8B5CF6" />
        <Text style={styles.cardTitle}>Delivery Instructions</Text>
      </View>
      <Text style={styles.notesText}>{notes}</Text>
    </Animated.View>
  );
};

const OrderSummaryCard: React.FC<{ order: Order }> = ({ order }) => {
  const totalAmount = order.totalPrice + (order.shippingCharge || 0) - (order.coupon?.discountAmount || 0);
  
  return (
    <Animated.View entering={FadeInUp.delay(350)} style={styles.summaryCard}>
      <View style={styles.cardHeader}>
        <Icon name="shopping-bag" size={18} color="#0F172A" />
        <Text style={styles.cardTitle}>Order Summary</Text>
      </View>
      
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Product Total</Text>
        <Text style={styles.summaryValue}>₹{order.totalPrice.toLocaleString()}</Text>
      </View>
      {order.shippingCharge > 0 && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Shipping</Text>
          <Text style={styles.summaryValue}>₹{order.shippingCharge.toLocaleString()}</Text>
        </View>
      )}
      {order.coupon?.discountAmount > 0 && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Coupon Discount</Text>
          <Text style={[styles.summaryValue, { color: '#22C55E' }]}>
            -₹{order.coupon.discountAmount.toLocaleString()}
          </Text>
        </View>
      )}
      <View style={[styles.summaryRow, styles.summaryTotal]}>
        <Text style={styles.summaryLabelTotal}>Grand Total</Text>
        <Text style={styles.summaryValueTotal}>₹{totalAmount.toLocaleString()}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Payment Method</Text>
        <Text style={styles.summaryValue}>{order.payment.method || 'Not specified'}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Payment Status</Text>
        <Text style={[styles.summaryValue, { color: order.isPaid ? '#22C55E' : '#F59E0B' }]}>
          {order.isPaid ? 'Paid' : 'Pending'}
        </Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Order Date</Text>
        <Text style={styles.summaryValue}>
          {new Date(order.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}
        </Text>
      </View>
    </Animated.View>
  );
};

const ActivityUpdateItem: React.FC<{ activity: ActivityUpdate; index: number }> = ({ activity, index }) => (
  <Animated.View 
    entering={SlideInLeft.delay(400 + index * 50)} 
    style={styles.activityItem}
  >
    <View style={styles.activityIcon}>
      <Icon name={activity.icon} size={18} color="#2563EB" />
    </View>
    <View style={styles.activityContent}>
      <Text style={styles.activityTitle}>{activity.title}</Text>
      <Text style={styles.activityDescription}>{activity.description}</Text>
      <Text style={styles.activityTime}>{activity.timestamp}</Text>
    </View>
  </Animated.View>
);

const SupportCard: React.FC = () => {
  const handleChat = () => {
    Alert.alert('Chat Support', 'Connecting to support agent...');
  };

  const handleCall = () => {
    Linking.openURL('tel:+18001234567');
  };

  const handleRaiseTicket = () => {
    Alert.alert('Raise Ticket', 'Your support ticket has been created');
  };

  const handleReportIssue = () => {
    Alert.alert('Report Issue', 'Please describe the delivery issue');
  };

  return (
    <Animated.View entering={FadeInUp.delay(450)} style={styles.supportCard}>
      <View style={styles.cardHeader}>
        <Icon name="help-circle" size={18} color="#0F172A" />
        <Text style={styles.cardTitle}>Need Help?</Text>
      </View>
      
      <View style={styles.supportGrid}>
        <TouchableOpacity style={styles.supportItem} onPress={handleChat}>
          <View style={styles.supportIconBg}>
            <Icon name="message-circle" size={22} color="#2563EB" />
          </View>
          <Text style={styles.supportItemTitle}>Chat Support</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.supportItem} onPress={handleCall}>
          <View style={styles.supportIconBg}>
            <Icon name="phone-call" size={22} color="#10B981" />
          </View>
          <Text style={styles.supportItemTitle}>Call Support</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.supportItem} onPress={handleRaiseTicket}>
          <View style={styles.supportIconBg}>
            <Icon name="file-text" size={22} color="#F59E0B" />
          </View>
          <Text style={styles.supportItemTitle}>Raise Ticket</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.supportItem} onPress={handleReportIssue}>
          <View style={styles.supportIconBg}>
            <Icon name="alert-triangle" size={22} color="#EF4444" />
          </View>
          <Text style={styles.supportItemTitle}>Report Issue</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const DeliverySuccessCard: React.FC<{ order: Order }> = ({ order }) => {
  if (order.status !== 'delivered') return null;
  
  return (
    <Animated.View entering={FadeInUp} style={styles.successCard}>
      <View style={styles.successIconContainer}>
        <Icon name="check-circle" size={40} color="#22C55E" />
      </View>
      <Text style={styles.successTitle}>Delivered Successfully!</Text>
      <Text style={styles.successDate}>
        Delivered on {new Date(order.shipping.deliveredAt || order.updatedAt).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })}
      </Text>
      <TouchableOpacity style={styles.rateButton}>
        <Text style={styles.rateButtonText}>Rate Delivery Experience</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const CancelOrderCard: React.FC<{ order: Order; onCancel: (reason: string) => void }> = ({ 
  order, 
  onCancel 
}) => {
  if (order.status === 'cancelled' || order.status === 'delivered') return null;
  if (!['pending', 'confirmed'].includes(order.status)) return null;

  const handleCancel = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: () => onCancel('Cancelled by customer')
        }
      ]
    );
  };

  return (
    <Animated.View entering={FadeInUp.delay(400)} style={styles.cancelCard}>
      <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
        <Icon name="x-circle" size={20} color="#EF4444" />
        <Text style={styles.cancelButtonText}>Cancel Order</Text>
      </TouchableOpacity>
      <Text style={styles.cancelNote}>
        You can cancel this order before it's shipped
      </Text>
    </Animated.View>
  );
};

// ============================================
// 5. MAIN COMPONENT
// ============================================

const TrackOrderScreen: React.FC = () => {
  const params = useLocalSearchParams();
  const orderId = (params as any)?.orderId || (params as any)?.id;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [trackingData, setTrackingData] = useState<TrackResponse['data'] | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const stickyBarTranslateY = useSharedValue(100);

  // Load order data
  const loadOrderData = useCallback(async () => {
    if (!orderId) {
      setError('Order ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get order details
      const orderResponse = await orderAPI.getOrderById(orderId);
      
      if (!orderResponse.success || !orderResponse.data) {
        throw new Error('Order not found');
      }
      
      const orderData = orderResponse.data;
      setOrder(orderData);
      
      // Get tracking info
      try {
        const trackResponse = await orderAPI.trackOrder(orderId);
        if (trackResponse.success) {
          setTrackingData(trackResponse.data);
          
          // Build timeline from tracking steps
          if (trackResponse.data.trackingSteps) {
            const events = trackResponse.data.trackingSteps.map((step, index) => ({
              id: `step_${index}`,
              status: step.step,
              description: step.description,
              location: undefined,
              timestamp: step.date || 'Pending',
              date: step.date ? new Date(step.date) : new Date(),
              completed: step.status === 'completed',
              current: step.status === 'active',
            }));
            setTimelineEvents(events);
          }
        }
      } catch (trackError) {
        console.log('Tracking info not available:', trackError);
      }
      
      // Build order items
      if (orderData.product) {
        setOrderItems([{
          id: orderData.product._id,
          name: orderData.product.name,
          price: orderData.price,
          quantity: orderData.quantity,
          image: orderData.product.thumbnail || orderData.product.images?.[0] || '',
          brand: orderData.product.brand || '',
          size: orderData.variant || undefined,
        }]);
      }
      
      // Set delivery address
      if (orderData.addresses && orderData.addresses.length > 0) {
        setDeliveryAddress(orderData.addresses[0]);
      }
      
    } catch (err) {
      console.error('Error loading order:', err);
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  // Initial load
  useEffect(() => {
    loadOrderData();
  }, [loadOrderData]);

  // Sticky bar animation
  useEffect(() => {
    stickyBarTranslateY.value = withTiming(0, { duration: 500 });
  }, []);

  const stickyBarStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: stickyBarTranslateY.value }],
  }));

  // Handlers
  const handleRefresh = () => {
    setRefreshing(true);
    loadOrderData();
  };

  const handleBack = () => {
    router.back();
  };

  const handleTrackLive = () => {
    if (order?.shipping.trackingNumber) {
      Alert.alert(
        'Track Package',
        `Tracking Number: ${order.shipping.trackingNumber}\nCarrier: ${order.shipping.carrier || 'Standard'}`
      );
    } else {
      Alert.alert('Tracking', 'Tracking information will be available soon');
    }
  };

  const handleContactCourier = () => {
    Linking.openURL('tel:+18001234567');
  };

  const handleCancelOrder = async (reason: string) => {
    if (!order) return;
    
    try {
      const response = await orderAPI.cancelOrder(order._id, reason);
      if (response.success) {
        Alert.alert('Success', 'Order cancelled successfully');
        await loadOrderData();
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      Alert.alert('Error', 'Failed to cancel order');
    }
  };

  const handleRequestReturn = async () => {
    if (!order) return;
    
    Alert.prompt(
      'Request Return',
      'Please provide a reason for return',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async (reason) => {
            if (!reason) {
              Alert.alert('Error', 'Please provide a reason');
              return;
            }
            try {
              const response = await orderAPI.requestReturn(order._id, reason);
              if (response.success) {
                Alert.alert('Success', 'Return request submitted');
                await loadOrderData();
              }
            } catch (error) {
              console.error('Error requesting return:', error);
              Alert.alert('Error', 'Failed to request return');
            }
          }
        }
      ]
    );
  };

  const handleSupport = () => {
    router.push('/support');
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
            <Icon name="arrow-left" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Track Order</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
            <Icon name="arrow-left" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Track Order</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={60} color="#EF4444" />
          <Text style={styles.errorTitle}>Order Not Found</Text>
          <Text style={styles.errorText}>{error || 'Unable to load order details'}</Text>
          <TouchableOpacity style={styles.errorButton} onPress={loadOrderData}>
            <Text style={styles.errorButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Build activity updates from order status
  const activityUpdates: ActivityUpdate[] = [
    {
      id: '1',
      title: 'Order Placed',
      description: 'Your order has been confirmed',
      timestamp: new Date(order.createdAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      icon: 'check-circle',
    },
  ];

  if (order.isPaid) {
    activityUpdates.push({
      id: '2',
      title: 'Payment Confirmed',
      description: 'Payment received successfully',
      timestamp: new Date(order.payment.paidAt || order.updatedAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      icon: 'credit-card',
    });
  }

  if (order.status === 'shipped' && order.shipping.shippedAt) {
    activityUpdates.push({
      id: '3',
      title: 'Order Shipped',
      description: 'Package left the warehouse',
      timestamp: new Date(order.shipping.shippedAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      icon: 'truck',
    });
  }

  if (order.status === 'delivered' && order.shipping.deliveredAt) {
    activityUpdates.push({
      id: '4',
      title: 'Delivered',
      description: 'Package delivered successfully',
      timestamp: new Date(order.shipping.deliveredAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      icon: 'check-circle',
    });
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        
        <Animated.View entering={FadeIn.delay(300)} style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
            <Icon name="arrow-left" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Track Order</Text>
          <TouchableOpacity style={styles.headerButton} onPress={handleSupport}>
            <Icon name="headphones" size={22} color="#0F172A" />
          </TouchableOpacity>
        </Animated.View>

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
          {/* Order Status Hero */}
          <OrderStatusHero order={order} trackingData={trackingData} />

          {/* Tracking Information Section */}
          {timelineEvents.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Shipment Progress</Text>
              <View style={styles.timelineContainer}>
                {timelineEvents.map((event, index) => (
                  <TimelineEventItem key={event.id} event={event} index={index} />
                ))}
              </View>
            </View>
          )}

          {/* Live Delivery Status */}
          {order.status !== 'delivered' && order.status !== 'cancelled' && (
            <Animated.View entering={FadeInUp.delay(150)} style={styles.liveStatusCard}>
              <View style={styles.liveHeader}>
                <View style={styles.liveIndicator}>
                  <View style={styles.pulsingDot} />
                  <Text style={styles.liveText}>Live Update</Text>
                </View>
                <Text style={styles.lastUpdated}>
                  Updated: {new Date(order.updatedAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
              <Text style={styles.currentLocation}>
                {order.status === 'shipped' ? 'Package in transit' : 
                 order.status === 'confirmed' ? 'Order confirmed, preparing for shipment' :
                 'Processing your order'}
              </Text>
              <Text style={styles.progressStatus}>
                {getProgressPercentage(order.status)}% of journey completed
              </Text>
            </Animated.View>
          )}

          {/* Order Items */}
          {orderItems.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Items In This Order</Text>
              {orderItems.map((item) => (
                <OrderItemCard key={item.id} item={item} />
              ))}
            </View>
          )}

          {/* Delivery Address */}
          {deliveryAddress && <DeliveryAddressCard address={deliveryAddress} />}

          {/* Courier Information */}
          <CourierCard order={order} />

          {/* Delivery Notes */}
          <DeliveryNotesCard notes={order.notes} />

          {/* Cancel Order Button */}
          <CancelOrderCard order={order} onCancel={handleCancelOrder} />

          {/* Order Summary */}
          <OrderSummaryCard order={order} />

          {/* Recent Activity Updates */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Latest Updates</Text>
            <View style={styles.activityContainer}>
              {activityUpdates.map((activity, index) => (
                <ActivityUpdateItem key={activity.id} activity={activity} index={index} />
              ))}
            </View>
          </View>

          {/* Delivery Success Card */}
          <DeliverySuccessCard order={order} />

          {/* Support Section */}
          <SupportCard />

          {/* Return Request Button */}
          {order.status === 'delivered' && (
            <Animated.View entering={FadeInUp.delay(500)} style={styles.returnSection}>
              <TouchableOpacity style={styles.returnButton} onPress={handleRequestReturn}>
                <Icon name="rotate-ccw" size={18} color="#FFFFFF" />
                <Text style={styles.returnButtonText}>Request Return</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>

        {/* Sticky Action Bar */}
        <Animated.View entering={SlideInRight.delay(400)} style={[styles.stickyBar, stickyBarStyle]}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleContactCourier}>
            <Icon name="phone" size={18} color="#2563EB" />
            <Text style={styles.secondaryButtonText}>Contact Support</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={handleTrackLive}>
            <Icon name="map-pin" size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>
              {order.status === 'delivered' ? 'View Details' : 'Track Live'}
            </Text>
          </TouchableOpacity>
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
  heroCard: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    marginTop: 16,
    padding: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  orderNumber: {
    fontSize: 13,
    color: '#64748B',
  },
  estimatedTitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  estimatedDate: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  countdownText: {
    fontSize: 13,
    color: '#64748B',
  },
  progressContainer: {
    gap: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'right',
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
  timelineContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
    width: 32,
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    position: 'absolute',
    top: 32,
    bottom: -24,
    left: 15,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 8,
  },
  timelineStatus: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  timelineDescription: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  timelineLocation: {
    fontSize: 12,
    color: '#2563EB',
    marginBottom: 4,
  },
  timelineTimestamp: {
    fontSize: 11,
    color: '#94A3B8',
  },
  liveStatusCard: {
    backgroundColor: '#2563EB10',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2563EB20',
  },
  liveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  liveText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#22C55E',
  },
  lastUpdated: {
    fontSize: 11,
    color: '#64748B',
  },
  currentLocation: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  progressStatus: {
    fontSize: 12,
    color: '#64748B',
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
  addressCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  addressPhone: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  courierCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  courierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  courierLogoContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  courierDetails: {
    flex: 1,
  },
  courierName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  trackingNumber: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 2,
  },
  shipmentType: {
    fontSize: 12,
    color: '#94A3B8',
  },
  courierActions: {
    flexDirection: 'row',
    gap: 12,
  },
  courierActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2563EB',
    gap: 8,
  },
  courierActionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2563EB',
  },
  notesCard: {
    backgroundColor: '#F3E8FF',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 20,
  },
  notesText: {
    fontSize: 13,
    color: '#6B21A5',
    lineHeight: 18,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
    marginTop: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
  },
  summaryLabelTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  summaryValueTotal: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  cancelCard: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    alignItems: 'center',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  cancelNote: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
  },
  activityContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
  successCard: {
    backgroundColor: '#22C55E10',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#22C55E30',
  },
  successIconContainer: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#22C55E',
    marginBottom: 4,
  },
  successDate: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  rateButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  rateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  supportCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  supportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  supportItem: {
    width: (width - 80) / 2,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    gap: 8,
  },
  supportIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  supportItemTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0F172A',
  },
  returnSection: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  returnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  returnButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
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
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2563EB',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563EB', 
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default TrackOrderScreen;