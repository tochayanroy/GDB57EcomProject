import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
    Dimensions,
    Image,
    Linking,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInLeft,
    FadeInRight,
    FadeInUp,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// TYPES & INTERFACES
// ============================================

interface Order {
  id: string;
  orderId: string;
  orderDate: string;
  orderTime: string;
  status: 'pending' | 'processing' | 'packed' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'refunded';
  paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded';
  totalAmount: number;
  subtotal: number;
  discount: number;
  tax: number;
  shippingFee: number;
  couponDiscount: number;
  serviceCharge: number;
  grandTotal: number;
}

interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  staff: string;
  status: 'completed' | 'current' | 'pending';
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  customerId: string;
  createdAt: string;
  totalOrders: number;
  lifetimeSpending: number;
  averageOrderValue: number;
  lastPurchaseDate: string;
}

interface ShippingAddress {
  recipientName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  courier: string;
  trackingNumber: string;
  expectedDelivery: string;
  shippingMethod: string;
  packageWeight: number;
}

interface BillingInfo {
  billingName: string;
  billingAddress: string;
  taxNumber: string;
  companyName: string;
  invoiceNumber: string;
  invoiceDate: string;
}

interface OrderProduct {
  id: string;
  name: string;
  sku: string;
  brand: string;
  category: string;
  image: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  totalPrice: number;
  currentStock: number;
  warehouseStock: number;
}

interface PaymentDetails {
  method: 'credit_card' | 'paypal' | 'cod' | 'bank_transfer';
  transactionId: string;
  gateway: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  paymentDate: string;
  authorizationCode: string;
}

interface DiscountApplied {
  code: string;
  type: string;
  amount: number;
  campaign: string;
  source: string;
}

interface Fulfillment {
  warehouse: string;
  assignedStaff: string;
  packingDate: string;
  shippingDate: string;
  deliveryDate: string;
  notes: string;
}

interface OrderNote {
  id: string;
  text: string;
  type: 'customer' | 'admin';
  createdAt: string;
  createdBy: string;
}

interface RefundInfo {
  status: 'none' | 'requested' | 'approved' | 'rejected' | 'processed';
  amount: number;
  date: string;
  reason: string;
}

interface ActivityLog {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  performedBy: string;
  icon: string;
}

interface RiskAssessment {
  fraudScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  ipVerified: boolean;
  addressVerified: boolean;
  paymentVerified: boolean;
  deviceVerified: boolean;
}

interface RevenueMetrics {
  profitMargin: number;
  productCost: number;
  revenueGenerated: number;
  taxCollected: number;
  netProfit: number;
}

// ============================================
// DUMMY DATA
// ============================================

const order: Order = {
  id: '1',
  orderId: '#ORD-10458',
  orderDate: '2024-06-15',
  orderTime: '10:30 AM',
  status: 'processing',
  paymentStatus: 'paid',
  totalAmount: 299.97,
  subtotal: 299.97,
  discount: 0,
  tax: 29.99,
  shippingFee: 0,
  couponDiscount: 0,
  serviceCharge: 0,
  grandTotal: 329.96,
};

const timelineEvents: TimelineEvent[] = [
  { id: '1', title: 'Order Placed', description: 'Order confirmed by customer', timestamp: 'Jun 15, 2024 - 10:30 AM', staff: 'Customer', status: 'completed' },
  { id: '2', title: 'Payment Confirmed', description: 'Payment received via Credit Card', timestamp: 'Jun 15, 2024 - 10:31 AM', staff: 'System', status: 'completed' },
  { id: '3', title: 'Processing', description: 'Order sent to warehouse', timestamp: 'Jun 15, 2024 - 11:45 AM', staff: 'Sarah Chen', status: 'completed' },
  { id: '4', title: 'Packed', description: 'Items packed and ready for shipping', timestamp: 'Pending', staff: 'Pending', status: 'current' },
  { id: '5', title: 'Shipped', description: 'Order dispatched', timestamp: 'Pending', staff: 'Pending', status: 'pending' },
  { id: '6', title: 'Delivered', description: 'Order delivered to customer', timestamp: 'Pending', staff: 'Pending', status: 'pending' },
];

const customer: Customer = {
  id: '1',
  name: 'Sarah Johnson',
  email: 'sarah.johnson@example.com',
  phone: '+1 (555) 123-4567',
  avatar: 'https://randomuser.me/api/portraits/women/1.jpg',
  customerId: 'CUST-10248',
  createdAt: '2024-01-15',
  totalOrders: 24,
  lifetimeSpending: 5680.50,
  averageOrderValue: 236.69,
  lastPurchaseDate: '2024-06-15',
};

const shippingAddress: ShippingAddress = {
  recipientName: 'Sarah Johnson',
  phone: '+1 (555) 123-4567',
  address: '123 Main Street, Apt 4B',
  city: 'New York',
  state: 'NY',
  postalCode: '10001',
  country: 'United States',
  courier: 'UPS',
  trackingNumber: '1Z999AA10123456784',
  expectedDelivery: '2024-06-20',
  shippingMethod: 'Express Shipping',
  packageWeight: 2.5,
};

const billingInfo: BillingInfo = {
  billingName: 'Sarah Johnson',
  billingAddress: '123 Main Street, Apt 4B, New York, NY 10001',
  taxNumber: 'TAX-987654321',
  companyName: 'Sarah Enterprises',
  invoiceNumber: 'INV-2024-10458',
  invoiceDate: '2024-06-15',
};

const products: OrderProduct[] = [
  {
    id: '1', name: 'Premium Wireless Headphones Pro', sku: 'SKU-1001', brand: 'Sony', category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200',
    quantity: 1, unitPrice: 299.99, discount: 0, tax: 29.99, totalPrice: 329.98,
    currentStock: 145, warehouseStock: 200,
  },
  {
    id: '2', name: 'Premium USB-C Cable (6ft)', sku: 'SKU-1005', brand: 'Anker', category: 'Accessories',
    image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=200',
    quantity: 2, unitPrice: 19.99, discount: 0, tax: 4.00, totalPrice: 43.98,
    currentStock: 345, warehouseStock: 500,
  },
];

const paymentDetails: PaymentDetails = {
  method: 'credit_card',
  transactionId: 'TXN-9876543210',
  gateway: 'Stripe',
  status: 'paid',
  paymentDate: '2024-06-15 10:31 AM',
  authorizationCode: 'AUTH-12345ABC',
};

const discountApplied: DiscountApplied = {
  code: 'WELCOME10',
  type: 'Percentage',
  amount: 10,
  campaign: 'Welcome Campaign',
  source: 'Email Marketing',
};

const fulfillment: Fulfillment = {
  warehouse: 'Main Warehouse - New York',
  assignedStaff: 'Mike Johnson',
  packingDate: '',
  shippingDate: '',
  deliveryDate: '',
  notes: 'Handle with care - fragile items',
};

const orderNotes: OrderNote[] = [
  { id: '1', text: 'Please deliver after 3 PM as no one will be home before that.', type: 'customer', createdAt: '2024-06-15 10:32 AM', createdBy: 'Sarah Johnson' },
  { id: '2', text: 'High value order - priority handling required.', type: 'admin', createdAt: '2024-06-15 11:30 AM', createdBy: 'Support Team' },
];

const refundInfo: RefundInfo = {
  status: 'none',
  amount: 0,
  date: '',
  reason: '',
};

const activityLogs: ActivityLog[] = [
  { id: '1', action: 'Order Created', description: 'Order #ORD-10458 was placed', timestamp: 'Jun 15, 2024 - 10:30 AM', performedBy: 'Sarah Johnson', icon: 'cart' },
  { id: '2', action: 'Payment Received', description: 'Payment of $329.96 received via Credit Card', timestamp: 'Jun 15, 2024 - 10:31 AM', performedBy: 'System', icon: 'card' },
  { id: '3', action: 'Status Updated', description: 'Order status changed to Processing', timestamp: 'Jun 15, 2024 - 11:45 AM', performedBy: 'Sarah Chen', icon: 'sync' },
  { id: '4', action: 'Customer Contacted', description: 'Order confirmation email sent', timestamp: 'Jun 15, 2024 - 11:50 AM', performedBy: 'System', icon: 'mail' },
];

const riskAssessment: RiskAssessment = {
  fraudScore: 15,
  riskLevel: 'low',
  ipVerified: true,
  addressVerified: true,
  paymentVerified: true,
  deviceVerified: false,
};

const revenueMetrics: RevenueMetrics = {
  profitMargin: 42,
  productCost: 145.50,
  revenueGenerated: 329.96,
  taxCollected: 33.99,
  netProfit: 138.47,
};

// ============================================
// REUSABLE COMPONENTS
// ============================================

const SectionHeader = ({ title, icon, onAction, actionText }: { title: string; icon?: string; onAction?: () => void; actionText?: string }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionTitleContainer}>
      {icon && <MaterialCommunityIcons name={icon as any} size={20} color="#3B82F6" style={styles.sectionIcon} />}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {onAction && actionText && (
      <TouchableOpacity onPress={onAction}>
        <Text style={styles.sectionActionText}>{actionText}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const StatusBadge = ({ status }: { status: Order['status'] | Order['paymentStatus'] | string }) => {
  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: 'Pending', color: '#F59E0B', bg: '#FEF3C7' },
    processing: { label: 'Processing', color: '#8B5CF6', bg: '#EDE9FE' },
    packed: { label: 'Packed', color: '#06B6D4', bg: '#CFFAFE' },
    shipped: { label: 'Shipped', color: '#3B82F6', bg: '#DBEAFE' },
    delivered: { label: 'Delivered', color: '#10B981', bg: '#D1FAE5' },
    cancelled: { label: 'Cancelled', color: '#EF4444', bg: '#FEE2E2' },
    returned: { label: 'Returned', color: '#EC4899', bg: '#FCE7F3' },
    refunded: { label: 'Refunded', color: '#6B7280', bg: '#F3F4F6' },
    paid: { label: 'Paid', color: '#10B981', bg: '#D1FAE5' },
    failed: { label: 'Failed', color: '#EF4444', bg: '#FEE2E2' },
  };
  const config = statusConfig[status] || { label: String(status), color: '#6B7280', bg: '#F3F4F6' };
  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
      <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

const TimelineItem = ({ event, index }: { event: TimelineEvent; index: number }) => {
  const getIcon = () => {
    if (event.status === 'completed') return 'checkmark-circle';
    if (event.status === 'current') return 'time';
    return 'ellipse-outline';
  };
  const getIconColor = () => {
    if (event.status === 'completed') return '#10B981';
    if (event.status === 'current') return '#3B82F6';
    return '#D1D5DB';
  };
  return (
    <Animated.View entering={FadeInLeft.delay(index * 50).springify()} style={styles.timelineItem}>
      <View style={styles.timelineLeft}>
        <View style={[styles.timelineIcon, { backgroundColor: `${getIconColor()}15` }]}>
          <Ionicons name={getIcon()} size={20} color={getIconColor()} />
        </View>
        {index < timelineEvents.length - 1 && <View style={styles.timelineLine} />}
      </View>
      <View style={styles.timelineContent}>
        <Text style={styles.timelineTitle}>{event.title}</Text>
        <Text style={styles.timelineDescription}>{event.description}</Text>
        <View style={styles.timelineMeta}>
          <Text style={styles.timelineTimestamp}>{event.timestamp}</Text>
          <Text style={styles.timelineStaff}>• {event.staff}</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const ProductCard = ({ product, index }: { product: OrderProduct; index: number }) => (
  <Animated.View entering={FadeInRight.delay(index * 50).springify()} style={styles.productCard}>
    <Image source={{ uri: product.image }} style={styles.productImage} />
    <View style={styles.productInfo}>
      <Text style={styles.productName}>{product.name}</Text>
      <Text style={styles.productMeta}>SKU: {product.sku} • {product.brand} • {product.category}</Text>
      <View style={styles.productDetails}>
        <View style={styles.productDetail}>
          <Text style={styles.productDetailLabel}>Qty:</Text>
          <Text style={styles.productDetailValue}>{product.quantity}</Text>
        </View>
        <View style={styles.productDetail}>
          <Text style={styles.productDetailLabel}>Price:</Text>
          <Text style={styles.productDetailValue}>${product.unitPrice}</Text>
        </View>
        <View style={styles.productDetail}>
          <Text style={styles.productDetailLabel}>Total:</Text>
          <Text style={styles.productDetailValue}>${product.totalPrice.toFixed(2)}</Text>
        </View>
      </View>
      <View style={styles.productInventory}>
        <Text style={styles.inventoryText}>Stock: {product.currentStock} | Warehouse: {product.warehouseStock}</Text>
      </View>
    </View>
    <View style={styles.productActions}>
      <TouchableOpacity style={styles.productActionButton}>
        <Ionicons name="eye-outline" size={16} color="#3B82F6" />
      </TouchableOpacity>
    </View>
  </Animated.View>
);

const ActivityLogItem = ({ log, index }: { log: ActivityLog; index: number }) => (
  <Animated.View entering={FadeInLeft.delay(index * 40).springify()} style={styles.activityItem}>
    <View style={styles.activityIcon}>
      <Ionicons name={log.icon as any} size={16} color="#3B82F6" />
    </View>
    <View style={styles.activityContent}>
      <Text style={styles.activityTitle}>{log.action}</Text>
      <Text style={styles.activityDescription}>{log.description}</Text>
      <View style={styles.activityMeta}>
        <Text style={styles.activityTime}>{log.timestamp}</Text>
        <Text style={styles.activityStaff}>• {log.performedBy}</Text>
      </View>
    </View>
  </Animated.View>
);

const RiskBadge = ({ level }: { level: 'low' | 'medium' | 'high' }) => {
  const config = {
    low: { label: 'Low Risk', color: '#10B981', bg: '#D1FAE5' },
    medium: { label: 'Medium Risk', color: '#F59E0B', bg: '#FEF3C7' },
    high: { label: 'High Risk', color: '#EF4444', bg: '#FEE2E2' },
  };
  const { label, color, bg } = config[level];
  return <View style={[styles.riskBadge, { backgroundColor: bg }]}><Text style={[styles.riskText, { color }]}>{label}</Text></View>;
};

const ValidationChecklist = () => (
  <View style={styles.validationContainer}>
    {[
      { id: '1', label: 'Payment Verified', completed: true },
      { id: '2', label: 'Address Verified', completed: true },
      { id: '3', label: 'Tracking Assigned', completed: false },
      { id: '4', label: 'Inventory Reserved', completed: true },
      { id: '5', label: 'Invoice Generated', completed: true },
      { id: '6', label: 'Fulfillment Assigned', completed: false },
    ].map((item) => (
      <View key={item.id} style={styles.validationItem}>
        <View style={[styles.validationCircle, item.completed && styles.validationCircleCompleted]}>
          {item.completed && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
        </View>
        <Text style={[styles.validationLabel, item.completed && styles.validationLabelCompleted]}>{item.label}</Text>
      </View>
    ))}
  </View>
);

const AIInsightCard = () => (
  <Animated.View entering={FadeInUp.springify()} style={styles.aiInsightCard}>
    <LinearGradient
      colors={['#8B5CF6', '#6366F1']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.aiInsightGradient}
    >
      <View style={styles.aiInsightContent}>
        <View style={styles.aiInsightIcon}>
          <MaterialCommunityIcons name="robot-outline" size={24} color="#FFFFFF" />
        </View>
        <View style={styles.aiInsightText}>
          <Text style={styles.aiInsightTitle}>AI Operational Insight</Text>
          <Text style={styles.aiInsightMessage}>
            Order is likely to be delivered within 2 days. Customer has a 98% successful delivery history.
            This order qualifies for VIP customer support. Risk score remains low.
          </Text>
        </View>
      </View>
    </LinearGradient>
  </Animated.View>
);

// ============================================
// MAIN ORDER DETAILS SCREEN
// ============================================

export default function OrderDetailsScreen() {
  const insets = useSafeAreaInsets();
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNote, setNewNote] = useState('');
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: scrollY.value > 50 ? 0.96 : 1,
    shadowOpacity: scrollY.value > 10 ? 0.05 : 0,
  }));

  const handleUpdateStatus = () => {
    console.log('Update status');
  };

  const handlePrintInvoice = () => {
    console.log('Print invoice');
  };

  const handleContactCustomer = () => {
    console.log('Contact customer');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      <Animated.View style={[styles.headerContainer, headerAnimatedStyle]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handlePrintInvoice} style={styles.headerButton}>
              <Ionicons name="print-outline" size={22} color="#1F2937" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="ellipsis-horizontal" size={22} color="#1F2937" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* Order Summary Card */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={styles.orderId}>{order.orderId}</Text>
              <Text style={styles.orderDate}>{order.orderDate} at {order.orderTime}</Text>
            </View>
            <StatusBadge status={order.status} />
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryDetails}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Amount</Text>
              <Text style={styles.summaryValue}>${order.totalAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryDividerVertical} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Payment Status</Text>
              <StatusBadge status={order.paymentStatus} />
            </View>
          </View>
          <View style={styles.summaryActions}>
            <TouchableOpacity onPress={handleUpdateStatus} style={styles.summaryActionButton}>
              <MaterialCommunityIcons name="truck-delivery" size={18} color="#3B82F6" />
              <Text style={styles.summaryActionText}>Update Status</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePrintInvoice} style={styles.summaryActionButton}>
              <Ionicons name="print-outline" size={18} color="#6B7280" />
              <Text style={styles.summaryActionText}>Print</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.summaryActionButton}>
              <Ionicons name="share-outline" size={18} color="#6B7280" />
              <Text style={styles.summaryActionText}>Share</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Order Timeline */}
        <View style={styles.timelineCard}>
          <SectionHeader title="Order Timeline" icon="timeline-clock" />
          {timelineEvents.map((event, index) => (
            <TimelineItem key={event.id} event={event} index={index} />
          ))}
        </View>

        {/* Customer Information */}
        <View style={styles.infoCard}>
          <SectionHeader title="Customer Details" icon="account" onAction={() => {}} actionText="Contact" />
          <View style={styles.customerContainer}>
            <Image source={{ uri: customer.avatar }} style={styles.customerAvatar} />
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{customer.name}</Text>
              <Text style={styles.customerEmail}>{customer.email}</Text>
              <Text style={styles.customerPhone}>{customer.phone}</Text>
              <Text style={styles.customerMeta}>Customer ID: {customer.customerId} • Since {customer.createdAt}</Text>
            </View>
          </View>
          <View style={styles.customerStats}>
            <View style={styles.customerStat}>
              <Text style={styles.customerStatValue}>{customer.totalOrders}</Text>
              <Text style={styles.customerStatLabel}>Orders</Text>
            </View>
            <View style={styles.customerStat}>
              <Text style={styles.customerStatValue}>${customer.lifetimeSpending.toFixed(0)}</Text>
              <Text style={styles.customerStatLabel}>Spent</Text>
            </View>
            <View style={styles.customerStat}>
              <Text style={styles.customerStatValue}>${customer.averageOrderValue.toFixed(0)}</Text>
              <Text style={styles.customerStatLabel}>Avg Order</Text>
            </View>
          </View>
          <View style={styles.customerActions}>
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${customer.phone}`)} style={styles.customerActionButton}>
              <Ionicons name="call-outline" size={18} color="#3B82F6" />
              <Text style={styles.customerActionText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL(`mailto:${customer.email}`)} style={styles.customerActionButton}>
              <Ionicons name="mail-outline" size={18} color="#3B82F6" />
              <Text style={styles.customerActionText}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.customerActionButton}>
              <Ionicons name="person-outline" size={18} color="#3B82F6" />
              <Text style={styles.customerActionText}>Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Shipping Address */}
        <View style={styles.infoCard}>
          <SectionHeader title="Shipping Information" icon="truck" onAction={() => {}} actionText="Track" />
          <View style={styles.addressContainer}>
            <Text style={styles.addressName}>{shippingAddress.recipientName}</Text>
            <Text style={styles.addressPhone}>{shippingAddress.phone}</Text>
            <Text style={styles.addressText}>{shippingAddress.address}</Text>
            <Text style={styles.addressText}>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}</Text>
            <Text style={styles.addressText}>{shippingAddress.country}</Text>
          </View>
          <View style={styles.deliveryInfo}>
            <View style={styles.deliveryItem}>
              <Text style={styles.deliveryLabel}>Courier</Text>
              <Text style={styles.deliveryValue}>{shippingAddress.courier}</Text>
            </View>
            <View style={styles.deliveryItem}>
              <Text style={styles.deliveryLabel}>Tracking</Text>
              <Text style={styles.deliveryValue}>{shippingAddress.trackingNumber}</Text>
            </View>
            <View style={styles.deliveryItem}>
              <Text style={styles.deliveryLabel}>Expected</Text>
              <Text style={styles.deliveryValue}>{shippingAddress.expectedDelivery}</Text>
            </View>
            <View style={styles.deliveryItem}>
              <Text style={styles.deliveryLabel}>Weight</Text>
              <Text style={styles.deliveryValue}>{shippingAddress.packageWeight} kg</Text>
            </View>
          </View>
        </View>

        {/* Billing Information */}
        <View style={styles.infoCard}>
          <SectionHeader title="Billing Information" icon="credit-card" />
          <View style={styles.billingContainer}>
            <Text style={styles.billingName}>{billingInfo.billingName}</Text>
            <Text style={styles.billingText}>{billingInfo.billingAddress}</Text>
            {billingInfo.companyName && <Text style={styles.billingText}>Company: {billingInfo.companyName}</Text>}
            <Text style={styles.billingText}>Tax ID: {billingInfo.taxNumber}</Text>
            <Text style={styles.billingText}>Invoice: {billingInfo.invoiceNumber} • {billingInfo.invoiceDate}</Text>
          </View>
        </View>

        {/* Ordered Products */}
        <View style={styles.productsCard}>
          <SectionHeader title={`Ordered Products (${products.length})`} icon="package-variant" />
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </View>

        {/* Payment Details */}
        <View style={styles.infoCard}>
          <SectionHeader title="Payment Details" icon="cash" />
          <View style={styles.paymentContainer}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Method</Text>
              <Text style={styles.paymentValue}>{paymentDetails.method.replace('_', ' ').toUpperCase()}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Transaction ID</Text>
              <Text style={styles.paymentValue}>{paymentDetails.transactionId}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Gateway</Text>
              <Text style={styles.paymentValue}>{paymentDetails.gateway}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Payment Date</Text>
              <Text style={styles.paymentValue}>{paymentDetails.paymentDate}</Text>
            </View>
          </View>
          <View style={styles.financialBreakdown}>
            <Text style={styles.breakdownTitle}>Financial Breakdown</Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Subtotal</Text>
              <Text style={styles.breakdownValue}>${order.subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Tax</Text>
              <Text style={styles.breakdownValue}>${order.tax.toFixed(2)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Shipping</Text>
              <Text style={styles.breakdownValue}>${order.shippingFee.toFixed(2)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Discount</Text>
              <Text style={styles.breakdownValue}>-${order.discount.toFixed(2)}</Text>
            </View>
            <View style={[styles.breakdownRow, styles.breakdownTotal]}>
              <Text style={styles.breakdownTotalLabel}>Grand Total</Text>
              <Text style={styles.breakdownTotalValue}>${order.grandTotal.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Fulfillment Management */}
        <View style={styles.infoCard}>
          <SectionHeader title="Fulfillment Details" icon="warehouse" onAction={() => {}} actionText="Assign" />
          <View style={styles.fulfillmentContainer}>
            <View style={styles.fulfillmentRow}>
              <Text style={styles.fulfillmentLabel}>Warehouse</Text>
              <Text style={styles.fulfillmentValue}>{fulfillment.warehouse}</Text>
            </View>
            <View style={styles.fulfillmentRow}>
              <Text style={styles.fulfillmentLabel}>Assigned Staff</Text>
              <Text style={styles.fulfillmentValue}>{fulfillment.assignedStaff}</Text>
            </View>
            <View style={styles.fulfillmentRow}>
              <Text style={styles.fulfillmentLabel}>Notes</Text>
              <Text style={styles.fulfillmentValue}>{fulfillment.notes}</Text>
            </View>
          </View>
        </View>

        {/* Order Notes */}
        <View style={styles.infoCard}>
          <SectionHeader title="Notes & Instructions" icon="note-text" />
          {orderNotes.map((note) => (
            <View key={note.id} style={[styles.noteItem, note.type === 'customer' ? styles.customerNote : styles.adminNote]}>
              <Text style={styles.noteText}>{note.text}</Text>
              <View style={styles.noteMeta}>
                <Text style={styles.noteType}>{note.type === 'customer' ? 'Customer Note' : 'Admin Note'}</Text>
                <Text style={styles.noteTime}>{note.createdAt}</Text>
              </View>
            </View>
          ))}
          {showAddNote ? (
            <View style={styles.addNoteContainer}>
              <TextInput
                style={styles.noteInput}
                placeholder="Add a note..."
                placeholderTextColor="#9CA3AF"
                value={newNote}
                onChangeText={setNewNote}
                multiline
              />
              <View style={styles.addNoteActions}>
                <TouchableOpacity onPress={() => setShowAddNote(false)} style={styles.cancelNoteButton}>
                  <Text style={styles.cancelNoteText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setShowAddNote(false); setNewNote(''); }} style={styles.saveNoteButton}>
                  <Text style={styles.saveNoteText}>Add Note</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setShowAddNote(true)} style={styles.addNoteButton}>
              <Ionicons name="add" size={20} color="#3B82F6" />
              <Text style={styles.addNoteText}>Add Note</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Activity Log */}
        <View style={styles.infoCard}>
          <SectionHeader title="Activity History" icon="history" />
          {activityLogs.map((log, index) => (
            <ActivityLogItem key={log.id} log={log} index={index} />
          ))}
        </View>

        {/* Risk Assessment */}
        <View style={styles.infoCard}>
          <SectionHeader title="Risk Assessment" icon="shield-check" />
          <View style={styles.riskContainer}>
            <View style={styles.riskHeader}>
              <Text style={styles.riskScore}>Fraud Score: {riskAssessment.fraudScore}/100</Text>
              <RiskBadge level={riskAssessment.riskLevel} />
            </View>
            <View style={styles.riskChecks}>
              <View style={styles.riskCheck}>
                <Ionicons name={riskAssessment.ipVerified ? 'checkmark-circle' : 'close-circle'} size={16} color={riskAssessment.ipVerified ? '#10B981' : '#EF4444'} />
                <Text style={styles.riskCheckText}>IP Verification</Text>
              </View>
              <View style={styles.riskCheck}>
                <Ionicons name={riskAssessment.addressVerified ? 'checkmark-circle' : 'close-circle'} size={16} color={riskAssessment.addressVerified ? '#10B981' : '#EF4444'} />
                <Text style={styles.riskCheckText}>Address Verification</Text>
              </View>
              <View style={styles.riskCheck}>
                <Ionicons name={riskAssessment.paymentVerified ? 'checkmark-circle' : 'close-circle'} size={16} color={riskAssessment.paymentVerified ? '#10B981' : '#EF4444'} />
                <Text style={styles.riskCheckText}>Payment Verification</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Revenue Impact */}
        <View style={styles.infoCard}>
          <SectionHeader title="Order Analytics" icon="chart-line" />
          <View style={styles.revenueGrid}>
            <View style={styles.revenueMetric}>
              <Text style={styles.revenueMetricLabel}>Profit Margin</Text>
              <Text style={styles.revenueMetricValue}>{revenueMetrics.profitMargin}%</Text>
            </View>
            <View style={styles.revenueMetric}>
              <Text style={styles.revenueMetricLabel}>Product Cost</Text>
              <Text style={styles.revenueMetricValue}>${revenueMetrics.productCost.toFixed(2)}</Text>
            </View>
            <View style={styles.revenueMetric}>
              <Text style={styles.revenueMetricLabel}>Revenue</Text>
              <Text style={styles.revenueMetricValue}>${revenueMetrics.revenueGenerated.toFixed(2)}</Text>
            </View>
            <View style={styles.revenueMetric}>
              <Text style={styles.revenueMetricLabel}>Net Profit</Text>
              <Text style={styles.revenueMetricValue}>${revenueMetrics.netProfit.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* AI Insight */}
        <AIInsightCard />

        {/* Validation & Health */}
        <View style={styles.infoCard}>
          <SectionHeader title="Order Health Check" icon="check-circle" />
          <ValidationChecklist />
        </View>
      </Animated.ScrollView>

      {/* Sticky Bottom Action Bar */}
      <Animated.View entering={FadeInUp.springify()} style={[styles.bottomActionBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity onPress={handleUpdateStatus} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Update Status</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handlePrintInvoice} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Print</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleContactCustomer} style={styles.tertiaryButton}>
          <Text style={styles.tertiaryButtonText}>Contact</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerContainer: {
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollContent: {
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  sectionActionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3B82F6',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderId: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  orderDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 16,
  },
  summaryDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  summaryDividerVertical: {
    width: 1,
    backgroundColor: '#F3F4F6',
  },
  summaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  summaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryActionText: {
    fontSize: 13,
    color: '#6B7280',
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 32,
    marginRight: 12,
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
    backgroundColor: '#E5E7EB',
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 8,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  timelineDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  timelineMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  timelineTimestamp: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  timelineStaff: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  customerContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  customerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  customerEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  customerPhone: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  customerMeta: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  customerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  customerStat: {
    alignItems: 'center',
  },
  customerStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  customerStatLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  customerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  customerActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    borderRadius: 12,
  },
  customerActionText: {
    fontSize: 13,
    color: '#3B82F6',
  },
  addressContainer: {
    marginBottom: 16,
  },
  addressName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  addressPhone: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  deliveryInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  deliveryItem: {
    flex: 1,
    minWidth: '45%',
  },
  deliveryLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  deliveryValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
  },
  billingContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 12,
  },
  billingName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  billingText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  productsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  productMeta: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 8,
  },
  productDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 6,
  },
  productDetail: {
    flexDirection: 'row',
    gap: 4,
  },
  productDetailLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  productDetailValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1F2937',
  },
  productInventory: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  inventoryText: {
    fontSize: 10,
    color: '#3B82F6',
  },
  productActions: {
    justifyContent: 'center',
  },
  productActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  paymentValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
  },
  financialBreakdown: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  breakdownTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  breakdownValue: {
    fontSize: 13,
    color: '#1F2937',
  },
  breakdownTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  breakdownTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  breakdownTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3B82F6',
  },
  fulfillmentContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 12,
  },
  fulfillmentRow: {
    marginBottom: 8,
  },
  fulfillmentLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  fulfillmentValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
  },
  noteItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  customerNote: {
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  adminNote: {
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  noteText: {
    fontSize: 13,
    color: '#1F2937',
    marginBottom: 8,
  },
  noteMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  noteType: {
    fontSize: 10,
    color: '#6B7280',
  },
  noteTime: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  addNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 12,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addNoteText: {
    fontSize: 13,
    color: '#3B82F6',
  },
  addNoteContainer: {
    marginTop: 8,
  },
  noteInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  addNoteActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelNoteButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  cancelNoteText: {
    fontSize: 13,
    color: '#6B7280',
  },
  saveNoteButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#3B82F6',
  },
  saveNoteText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  activityItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  activityMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  activityTime: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  activityStaff: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  riskContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 12,
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  riskScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  riskText: {
    fontSize: 11,
    fontWeight: '600',
  },
  riskChecks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  riskCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  riskCheckText: {
    fontSize: 11,
    color: '#6B7280',
  },
  revenueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  revenueMetric: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  revenueMetricLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  revenueMetricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  validationContainer: {
    gap: 12,
  },
  validationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  validationCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  validationCircleCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  validationLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  validationLabelCompleted: {
    color: '#10B981',
    textDecorationLine: 'line-through',
  },
  aiInsightCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  aiInsightGradient: {
    padding: 20,
  },
  aiInsightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiInsightIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  aiInsightText: {
    flex: 1,
  },
  aiInsightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  aiInsightMessage: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButton: {
    flex: 2,
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  tertiaryButton: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },
  tertiaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
});