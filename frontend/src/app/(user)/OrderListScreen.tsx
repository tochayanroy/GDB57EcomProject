import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    RefreshControl,
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
    useSharedValue,
    withSpring
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const QUICK_ACTION_SIZE = (SCREEN_WIDTH - 48) / 4;

// ============================================
// TYPES & INTERFACES
// ============================================

interface Order {
  id: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAvatar: string;
  orderDate: string;
  updatedAt: string;
  status: 'pending' | 'processing' | 'packed' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'refunded';
  paymentMethod: 'credit_card' | 'paypal' | 'cod' | 'bank_transfer';
  paymentStatus: 'paid' | 'unpaid' | 'refunded';
  shippingMethod: string;
  trackingNumber: string | null;
  courier: string | null;
  expectedDelivery: string | null;
  itemCount: number;
  totalQuantity: number;
  totalWeight: number;
  totalAmount: number;
  isPriority: boolean;
  requiresAction: boolean;
  actionReason?: string;
}

interface AnalyticsCardData {
  id: string;
  title: string;
  count: number;
  icon: string;
  color: string;
  trend?: number;
}

interface FilterChip {
  id: string;
  label: string;
  count?: number;
}

interface StatusPipeline {
  id: string;
  status: string;
  count: number;
  color: string;
}

interface PriorityOrder {
  id: string;
  orderId: string;
  reason: string;
  priority: 'high' | 'urgent' | 'medium';
}

interface ActivityItem {
  id: string;
  action: string;
  orderId: string;
  timestamp: string;
  icon: string;
}

interface TopCustomer {
  id: string;
  name: string;
  avatar: string;
  ordersCount: number;
  totalSpend: number;
}

interface QuickAction {
  id: string;
  title: string;
  icon: string;
  color: string;
}

interface Insight {
  id: string;
  message: string;
  type: 'positive' | 'warning' | 'neutral';
}

// ============================================
// DUMMY DATA
// ============================================

const orders: Order[] = [
  {
    id: '1', orderId: '#ORD-10458', customerName: 'Sarah Johnson', customerEmail: 'sarah@example.com',
    customerPhone: '+1 (555) 123-4567', customerAvatar: 'https://randomuser.me/api/portraits/women/1.jpg',
    orderDate: '2024-06-15T10:30:00', updatedAt: '2024-06-15T14:20:00',
    status: 'pending', paymentMethod: 'credit_card', paymentStatus: 'paid',
    shippingMethod: 'Express Shipping', trackingNumber: null, courier: null,
    expectedDelivery: '2024-06-18', itemCount: 3, totalQuantity: 3, totalWeight: 2.5,
    totalAmount: 299.97, isPriority: false, requiresAction: false,
  },
  {
    id: '2', orderId: '#ORD-10457', customerName: 'Michael Chen', customerEmail: 'michael@example.com',
    customerPhone: '+1 (555) 234-5678', customerAvatar: 'https://randomuser.me/api/portraits/men/2.jpg',
    orderDate: '2024-06-15T09:15:00', updatedAt: '2024-06-15T11:45:00',
    status: 'processing', paymentMethod: 'paypal', paymentStatus: 'paid',
    shippingMethod: 'Standard Shipping', trackingNumber: '1Z999AA10123456784', courier: 'UPS',
    expectedDelivery: '2024-06-20', itemCount: 2, totalQuantity: 2, totalWeight: 1.8,
    totalAmount: 159.98, isPriority: true, requiresAction: false,
  },
  {
    id: '3', orderId: '#ORD-10456', customerName: 'Emily Davis', customerEmail: 'emily@example.com',
    customerPhone: '+1 (555) 345-6789', customerAvatar: 'https://randomuser.me/api/portraits/women/3.jpg',
    orderDate: '2024-06-14T16:45:00', updatedAt: '2024-06-15T09:30:00',
    status: 'packed', paymentMethod: 'credit_card', paymentStatus: 'paid',
    shippingMethod: 'Express Shipping', trackingNumber: null, courier: null,
    expectedDelivery: '2024-06-17', itemCount: 5, totalQuantity: 7, totalWeight: 4.2,
    totalAmount: 89.95, isPriority: false, requiresAction: false,
  },
  {
    id: '4', orderId: '#ORD-10455', customerName: 'James Wilson', customerEmail: 'james@example.com',
    customerPhone: '+1 (555) 456-7890', customerAvatar: 'https://randomuser.me/api/portraits/men/4.jpg',
    orderDate: '2024-06-14T14:20:00', updatedAt: '2024-06-14T18:30:00',
    status: 'shipped', paymentMethod: 'cod', paymentStatus: 'unpaid',
    shippingMethod: 'Standard Shipping', trackingNumber: '9400116902181234567890', courier: 'USPS',
    expectedDelivery: '2024-06-19', itemCount: 1, totalQuantity: 1, totalWeight: 0.5,
    totalAmount: 49.99, isPriority: false, requiresAction: true, actionReason: 'Pending payment',
  },
  {
    id: '5', orderId: '#ORD-10454', customerName: 'Lisa Anderson', customerEmail: 'lisa@example.com',
    customerPhone: '+1 (555) 567-8901', customerAvatar: 'https://randomuser.me/api/portraits/women/5.jpg',
    orderDate: '2024-06-13T11:30:00', updatedAt: '2024-06-14T10:15:00',
    status: 'delivered', paymentMethod: 'credit_card', paymentStatus: 'paid',
    shippingMethod: 'Express Shipping', trackingNumber: '1Z999AA10123456783', courier: 'UPS',
    expectedDelivery: '2024-06-15', itemCount: 4, totalQuantity: 4, totalWeight: 3.1,
    totalAmount: 459.96, isPriority: false, requiresAction: false,
  },
  {
    id: '6', orderId: '#ORD-10453', customerName: 'Robert Martinez', customerEmail: 'robert@example.com',
    customerPhone: '+1 (555) 678-9012', customerAvatar: 'https://randomuser.me/api/portraits/men/6.jpg',
    orderDate: '2024-06-13T09:45:00', updatedAt: '2024-06-13T15:20:00',
    status: 'cancelled', paymentMethod: 'paypal', paymentStatus: 'refunded',
    shippingMethod: 'Standard Shipping', trackingNumber: null, courier: null,
    expectedDelivery: null, itemCount: 2, totalQuantity: 2, totalWeight: 1.2,
    totalAmount: 79.98, isPriority: false, requiresAction: false,
  },
  {
    id: '7', orderId: '#ORD-10452', customerName: 'Jennifer Lee', customerEmail: 'jennifer@example.com',
    customerPhone: '+1 (555) 789-0123', customerAvatar: 'https://randomuser.me/api/portraits/women/7.jpg',
    orderDate: '2024-06-12T15:30:00', updatedAt: '2024-06-13T11:45:00',
    status: 'returned', paymentMethod: 'credit_card', paymentStatus: 'refunded',
    shippingMethod: 'Standard Shipping', trackingNumber: '1Z999AA10123456782', courier: 'UPS',
    expectedDelivery: '2024-06-17', itemCount: 1, totalQuantity: 1, totalWeight: 0.3,
    totalAmount: 29.99, isPriority: false, requiresAction: true, actionReason: 'Return requested',
  },
  {
    id: '8', orderId: '#ORD-10451', customerName: 'David Kim', customerEmail: 'david@example.com',
    customerPhone: '+1 (555) 890-1234', customerAvatar: 'https://randomuser.me/api/portraits/men/8.jpg',
    orderDate: '2024-06-12T10:00:00', updatedAt: '2024-06-12T16:30:00',
    status: 'processing', paymentMethod: 'bank_transfer', paymentStatus: 'paid',
    shippingMethod: 'Express Shipping', trackingNumber: null, courier: null,
    expectedDelivery: '2024-06-16', itemCount: 3, totalQuantity: 3, totalWeight: 2.9,
    totalAmount: 399.97, isPriority: true, requiresAction: false,
  },
];

const analyticsCards: AnalyticsCardData[] = [
  { id: '1', title: 'Total Orders', count: 1258, icon: 'shopping', color: '#3B82F6', trend: 12 },
  { id: '2', title: 'Pending', count: 45, icon: 'time', color: '#F59E0B', trend: -5 },
  { id: '3', title: 'Processing', count: 89, icon: 'sync', color: '#8B5CF6', trend: 8 },
  { id: '4', title: 'Shipped', count: 234, icon: 'truck', color: '#06B6D4', trend: 15 },
  { id: '5', title: 'Delivered', count: 856, icon: 'checkmark-circle', color: '#10B981', trend: 22 },
  { id: '6', title: 'Cancelled', count: 23, icon: 'close-circle', color: '#EF4444', trend: -8 },
  { id: '7', title: 'Returned', count: 11, icon: 'refresh', color: '#EC4899', trend: 3 },
  { id: '8', title: "Today's Orders", count: 28, icon: 'today', color: '#6366F1', trend: 0 },
];

const filterChips: FilterChip[] = [
  { id: 'all', label: 'All Orders', count: 1258 },
  { id: 'pending', label: 'Pending', count: 45 },
  { id: 'processing', label: 'Processing', count: 89 },
  { id: 'packed', label: 'Packed', count: 56 },
  { id: 'shipped', label: 'Shipped', count: 234 },
  { id: 'delivered', label: 'Delivered', count: 856 },
  { id: 'cancelled', label: 'Cancelled', count: 23 },
  { id: 'returned', label: 'Returned', count: 11 },
  { id: 'cod', label: 'COD', count: 67 },
  { id: 'unpaid', label: 'Unpaid', count: 34 },
  { id: 'high-value', label: 'High Value', count: 89 },
];

const statusPipeline: StatusPipeline[] = [
  { id: '1', status: 'Pending', count: 45, color: '#F59E0B' },
  { id: '2', status: 'Processing', count: 89, color: '#8B5CF6' },
  { id: '3', status: 'Packed', count: 56, color: '#06B6D4' },
  { id: '4', status: 'Shipped', count: 234, color: '#3B82F6' },
  { id: '5', status: 'Delivered', count: 856, color: '#10B981' },
];

const priorityOrders: PriorityOrder[] = [
  { id: '1', orderId: '#ORD-10457', reason: 'Processing delay', priority: 'urgent' },
  { id: '2', orderId: '#ORD-10455', reason: 'Pending payment', priority: 'high' },
  { id: '3', orderId: '#ORD-10452', reason: 'Return request', priority: 'high' },
  { id: '4', orderId: '#ORD-10450', reason: 'Customer complaint', priority: 'urgent' },
];

const recentActivities: ActivityItem[] = [
  { id: '1', action: 'Order placed', orderId: '#ORD-10458', timestamp: '2 minutes ago', icon: 'cart' },
  { id: '2', action: 'Payment received', orderId: '#ORD-10457', timestamp: '15 minutes ago', icon: 'card' },
  { id: '3', action: 'Order shipped', orderId: '#ORD-10455', timestamp: '1 hour ago', icon: 'truck' },
  { id: '4', action: 'Delivery confirmed', orderId: '#ORD-10454', timestamp: '3 hours ago', icon: 'checkmark' },
  { id: '5', action: 'Return approved', orderId: '#ORD-10452', timestamp: '5 hours ago', icon: 'refresh' },
];

const topCustomers: TopCustomer[] = [
  { id: '1', name: 'Sarah Johnson', avatar: 'https://randomuser.me/api/portraits/women/1.jpg', ordersCount: 24, totalSpend: 5680 },
  { id: '2', name: 'Michael Chen', avatar: 'https://randomuser.me/api/portraits/men/2.jpg', ordersCount: 18, totalSpend: 4320 },
  { id: '3', name: 'Emily Davis', avatar: 'https://randomuser.me/api/portraits/women/3.jpg', ordersCount: 15, totalSpend: 2890 },
  { id: '4', name: 'James Wilson', avatar: 'https://randomuser.me/api/portraits/men/4.jpg', ordersCount: 12, totalSpend: 2150 },
];

const quickActions: QuickAction[] = [
  { id: '1', title: 'Create Order', icon: 'plus-circle', color: '#3B82F6' },
  { id: '2', title: 'Shipments', icon: 'truck', color: '#06B6D4' },
  { id: '3', title: 'Print Labels', icon: 'printer', color: '#8B5CF6' },
  { id: '4', title: 'Reports', icon: 'chart-line', color: '#10B981' },
  { id: '5', title: 'Refunds', icon: 'cash-refund', color: '#EF4444' },
  { id: '6', title: 'Support', icon: 'headphones', color: '#F59E0B' },
  { id: '7', title: 'Export', icon: 'download', color: '#6366F1' },
  { id: '8', title: 'Settings', icon: 'cog', color: '#6B7280' },
];

const insights: Insight[] = [
  { id: '1', message: 'Pending orders increased by 18% today. Review pending queue.', type: 'warning' },
  { id: '2', message: 'Average order value increased by 12% this week.', type: 'positive' },
  { id: '3', message: '15 orders require shipment within the next 24 hours.', type: 'warning' },
];

// ============================================
// REUSABLE COMPONENTS
// ============================================

const SectionHeader = ({ title, onSeeAll, showSeeAll = true, count }: { title: string; onSeeAll?: () => void; showSeeAll?: boolean; count?: number }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionHeaderLeft}>
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
      {count !== undefined && <Text style={styles.sectionHeaderCount}>{count}</Text>}
    </View>
    {showSeeAll && (
      <TouchableOpacity onPress={onSeeAll} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.sectionHeaderSeeAll}>See All</Text>
      </TouchableOpacity>
    )}
  </View>
);

const AnalyticsCard = ({ data, index }: { data: AnalyticsCardData; index: number }) => {
  const scale = useSharedValue(1);
  
  const onPressIn = () => { scale.value = withSpring(0.97); };
  const onPressOut = () => { scale.value = withSpring(1); };
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeInLeft.delay(index * 30).springify()} style={styles.analyticsCardWrapper}>
      <TouchableOpacity activeOpacity={0.9} onPressIn={onPressIn} onPressOut={onPressOut}>
        <Animated.View style={[styles.analyticsCard, animatedStyle]}>
          <View style={[styles.analyticsIconContainer, { backgroundColor: `${data.color}15` }]}>
            <Ionicons name={data.icon as any} size={20} color={data.color} />
          </View>
          <Text style={styles.analyticsCount}>{data.count.toLocaleString()}</Text>
          <Text style={styles.analyticsTitle}>{data.title}</Text>
          {data.trend !== undefined && data.trend !== 0 && (
            <View style={[styles.analyticsTrend, { backgroundColor: data.trend > 0 ? '#D1FAE5' : '#FEE2E2' }]}>
              <Ionicons name={data.trend > 0 ? 'arrow-up' : 'arrow-down'} size={10} color={data.trend > 0 ? '#10B981' : '#EF4444'} />
              <Text style={[styles.analyticsTrendText, { color: data.trend > 0 ? '#10B981' : '#EF4444' }]}>{Math.abs(data.trend)}%</Text>
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const FilterChipComponent = ({ chip, isSelected, onPress }: { chip: FilterChip; isSelected: boolean; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.filterChip, isSelected && styles.filterChipSelected]}>
      <Text style={[styles.filterChipLabel, isSelected && styles.filterChipLabelSelected]}>{chip.label}</Text>
      {chip.count !== undefined && (
        <View style={[styles.filterChipCount, isSelected && styles.filterChipCountSelected]}>
          <Text style={[styles.filterChipCountText, isSelected && styles.filterChipCountTextSelected]}>{chip.count}</Text>
        </View>
      )}
    </View>
  </TouchableOpacity>
);

const StatusBadge = ({ status }: { status: Order['status'] }) => {
  const config = {
    pending: { label: 'Pending', color: '#F59E0B', bg: '#FEF3C7' },
    processing: { label: 'Processing', color: '#8B5CF6', bg: '#EDE9FE' },
    packed: { label: 'Packed', color: '#06B6D4', bg: '#CFFAFE' },
    shipped: { label: 'Shipped', color: '#3B82F6', bg: '#DBEAFE' },
    delivered: { label: 'Delivered', color: '#10B981', bg: '#D1FAE5' },
    cancelled: { label: 'Cancelled', color: '#EF4444', bg: '#FEE2E2' },
    returned: { label: 'Returned', color: '#EC4899', bg: '#FCE7F3' },
    refunded: { label: 'Refunded', color: '#6B7280', bg: '#F3F4F6' },
  };
  const { label, color, bg } = config[status];
  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
};

const OrderCard = ({ order, index, onPress, onUpdateStatus }: { order: Order; index: number; onPress: () => void; onUpdateStatus: () => void }) => {
  const scale = useSharedValue(1);
  
  const onPressIn = () => { scale.value = withSpring(0.99); };
  const onPressOut = () => { scale.value = withSpring(1); };
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getPaymentIcon = () => {
    switch (order.paymentMethod) {
      case 'credit_card': return 'card-outline';
      case 'paypal': return 'logo-paypal';
      case 'cod': return 'cash-outline';
      default: return 'business-outline';
    }
  };

  return (
    <Animated.View entering={FadeInUp.delay(index * 30).springify()} style={styles.orderCardContainer}>
      <TouchableOpacity activeOpacity={0.95} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <Animated.View style={[styles.orderCard, animatedStyle]}>
          <View style={styles.orderHeader}>
            <View style={styles.orderIdContainer}>
              <Text style={styles.orderId}>{order.orderId}</Text>
              {order.isPriority && (
                <View style={styles.priorityBadge}>
                  <Ionicons name="alert-circle" size={12} color="#EF4444" />
                  <Text style={styles.priorityText}>Priority</Text>
                </View>
              )}
            </View>
            <StatusBadge status={order.status} />
          </View>

          <View style={styles.orderCustomer}>
            <Image source={{ uri: order.customerAvatar }} style={styles.customerAvatar} />
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{order.customerName}</Text>
              <Text style={styles.customerEmail}>{order.customerEmail}</Text>
              <Text style={styles.customerPhone}>{order.customerPhone}</Text>
            </View>
          </View>

          <View style={styles.orderDetails}>
            <View style={styles.orderDetailRow}>
              <View style={styles.orderDetailItem}>
                <Ionicons name="cube-outline" size={14} color="#6B7280" />
                <Text style={styles.orderDetailText}>{order.itemCount} items</Text>
              </View>
              <View style={styles.orderDetailItem}>
                <Ionicons name="pricetag-outline" size={14} color="#6B7280" />
                <Text style={styles.orderDetailText}>${order.totalAmount.toFixed(2)}</Text>
              </View>
            </View>
            <View style={styles.orderDetailRow}>
              <View style={styles.orderDetailItem}>
                <Ionicons name={getPaymentIcon()} size={14} color="#6B7280" />
                <Text style={styles.orderDetailText}>
                  {order.paymentMethod === 'credit_card' ? 'Card' : order.paymentMethod === 'paypal' ? 'PayPal' : order.paymentMethod === 'cod' ? 'COD' : 'Transfer'}
                </Text>
              </View>
              <View style={[styles.orderDetailItem, styles.paymentStatusContainer, { backgroundColor: order.paymentStatus === 'paid' ? '#D1FAE5' : order.paymentStatus === 'unpaid' ? '#FEE2E2' : '#F3F4F6' }]}>
                <Text style={[styles.paymentStatusText, { color: order.paymentStatus === 'paid' ? '#10B981' : order.paymentStatus === 'unpaid' ? '#EF4444' : '#6B7280' }]}>
                  {order.paymentStatus === 'paid' ? 'Paid' : order.paymentStatus === 'unpaid' ? 'Unpaid' : 'Refunded'}
                </Text>
              </View>
            </View>
          </View>

          {order.trackingNumber && (
            <View style={styles.trackingInfo}>
              <Ionicons name="location-outline" size={12} color="#6B7280" />
              <Text style={styles.trackingText}>Tracking: {order.trackingNumber}</Text>
            </View>
          )}

          {order.requiresAction && (
            <View style={styles.actionRequired}>
              <Ionicons name="warning" size={14} color="#EF4444" />
              <Text style={styles.actionRequiredText}>{order.actionReason}</Text>
              <TouchableOpacity style={styles.resolveButton}>
                <Text style={styles.resolveButtonText}>Resolve</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.orderFooter}>
            <Text style={styles.orderDate}>{new Date(order.orderDate).toLocaleDateString()}</Text>
            <View style={styles.orderActions}>
              <TouchableOpacity onPress={onUpdateStatus} style={styles.orderActionButton}>
                <MaterialCommunityIcons name="truck-delivery" size={16} color="#3B82F6" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.orderActionButton}>
                <Ionicons name="print-outline" size={16} color="#6B7280" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.orderActionButton}>
                <Ionicons name="ellipsis-horizontal" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const StatusPipelineCard = ({ item, index }: { item: StatusPipeline; index: number }) => (
  <Animated.View entering={FadeInDown.delay(index * 50).springify()} style={styles.pipelineCard}>
    <View style={styles.pipelineHeader}>
      <View style={[styles.pipelineDot, { backgroundColor: item.color }]} />
      <Text style={styles.pipelineStatus}>{item.status}</Text>
    </View>
    <Text style={styles.pipelineCount}>{item.count}</Text>
    <View style={styles.pipelineProgress}>
      <View style={[styles.pipelineProgressFill, { width: `${(item.count / 1258) * 100}%`, backgroundColor: item.color }]} />
    </View>
  </Animated.View>
);

const PriorityOrderCard = ({ item, index }: { item: PriorityOrder; index: number }) => (
  <Animated.View entering={FadeInRight.delay(index * 40).springify()} style={styles.priorityCard}>
    <View style={styles.priorityHeader}>
      <View style={[styles.priorityTypeBadge, { backgroundColor: item.priority === 'urgent' ? '#FEE2E2' : '#FEF3C7' }]}>
        <Text style={[styles.priorityTypeText, { color: item.priority === 'urgent' ? '#EF4444' : '#F59E0B' }]}>
          {item.priority.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.priorityOrderId}>{item.orderId}</Text>
    </View>
    <Text style={styles.priorityReason}>{item.reason}</Text>
    <TouchableOpacity style={styles.resolveNowButton}>
      <Text style={styles.resolveNowText}>Resolve Now</Text>
    </TouchableOpacity>
  </Animated.View>
);

const ActivityItem = ({ item, index }: { item: ActivityItem; index: number }) => (
  <Animated.View entering={FadeInLeft.delay(index * 30).springify()} style={styles.activityItem}>
    <View style={styles.activityIcon}>
      <Ionicons name={item.icon as any} size={16} color="#3B82F6" />
    </View>
    <View style={styles.activityContent}>
      <Text style={styles.activityText}>{item.action} for {item.orderId}</Text>
      <Text style={styles.activityTime}>{item.timestamp}</Text>
    </View>
  </Animated.View>
);

const RevenueSummary = () => (
  <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.revenueCard}>
    <View style={styles.revenueRow}>
      <View style={styles.revenueItem}>
        <Text style={styles.revenueLabel}>Total Revenue</Text>
        <Text style={styles.revenueValue}>$125,890</Text>
      </View>
      <View style={styles.revenueDivider} />
      <View style={styles.revenueItem}>
        <Text style={styles.revenueLabel}>Avg Order Value</Text>
        <Text style={styles.revenueValue}>$102.50</Text>
      </View>
    </View>
    <View style={styles.revenueRow}>
      <View style={styles.revenueItem}>
        <Text style={styles.revenueLabel}>Today's Revenue</Text>
        <Text style={styles.revenueValue}>$3,450</Text>
      </View>
      <View style={styles.revenueDivider} />
      <View style={styles.revenueItem}>
        <Text style={styles.revenueLabel}>This Week</Text>
        <Text style={styles.revenueValue}>$28,430</Text>
      </View>
    </View>
  </Animated.View>
);

const TopCustomerCard = ({ customer, index }: { customer: TopCustomer; index: number }) => (
  <Animated.View entering={FadeInRight.delay(index * 50).springify()} style={styles.topCustomerCard}>
    <Image source={{ uri: customer.avatar }} style={styles.topCustomerAvatar} />
    <View style={styles.topCustomerInfo}>
      <Text style={styles.topCustomerName}>{customer.name}</Text>
      <Text style={styles.topCustomerStats}>{customer.ordersCount} orders • ${customer.totalSpend.toLocaleString()}</Text>
    </View>
  </Animated.View>
);

const QuickActionCard = ({ action, index }: { action: QuickAction; index: number }) => {
  const scale = useSharedValue(1);
  
  const onPressIn = () => { scale.value = withSpring(0.96); };
  const onPressOut = () => { scale.value = withSpring(1); };
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity activeOpacity={0.9} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[styles.quickActionCard, animatedStyle]}>
        <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}15` }]}>
          <MaterialCommunityIcons name={action.icon as any} size={24} color={action.color} />
        </View>
        <Text style={styles.quickActionTitle}>{action.title}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

const InsightCard = ({ insight, index }: { insight: Insight; index: number }) => {
  const getIcon = () => {
    switch (insight.type) {
      case 'positive': return 'bulb-outline';
      case 'warning': return 'alert-circle-outline';
      default: return 'information-circle-outline';
    }
  };
  const getBgColor = () => {
    switch (insight.type) {
      case 'positive': return '#10B981';
      case 'warning': return '#F59E0B';
      default: return '#3B82F6';
    }
  };
  return (
    <Animated.View entering={FadeInLeft.delay(index * 40).springify()} style={styles.insightCard}>
      <View style={[styles.insightIcon, { backgroundColor: `${getBgColor()}15` }]}>
        <Ionicons name={getIcon()} size={20} color={getBgColor()} />
      </View>
      <View style={styles.insightContent}>
        <Text style={styles.insightText}>{insight.message}</Text>
      </View>
    </Animated.View>
  );
};

// ============================================
// MAIN ORDER LIST SCREEN
// ============================================

export default function OrderListScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [notificationCount] = useState(5);
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const toggleOrderSelection = useCallback((orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedOrders([]);
    setIsBulkMode(false);
  }, []);

  const filteredOrders = useMemo(() => {
    let filtered = orders;
    
    if (selectedFilter !== 'all') {
      if (selectedFilter === 'cod') filtered = filtered.filter(o => o.paymentMethod === 'cod');
      else if (selectedFilter === 'unpaid') filtered = filtered.filter(o => o.paymentStatus === 'unpaid');
      else if (selectedFilter === 'high-value') filtered = filtered.filter(o => o.totalAmount > 200);
      else filtered = filtered.filter(o => o.status === selectedFilter);
    }
    
    if (searchText) {
      const query = searchText.toLowerCase();
      filtered = filtered.filter(o => 
        o.orderId.toLowerCase().includes(query) ||
        o.customerName.toLowerCase().includes(query) ||
        o.customerEmail.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [selectedFilter, searchText]);

  const renderOrderItem = ({ item, index }: { item: Order; index: number }) => (
    <OrderCard
      order={item}
      index={index}
      onPress={() => {}}
      onUpdateStatus={() => {}}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      <Animated.View style={[styles.headerContainer, headerAnimatedStyle]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Orders</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerIconButton}>
              <Ionicons name="notifications-outline" size={22} color="#1F2937" />
              {notificationCount > 0 && (
                <View style={styles.headerNotificationBadge}>
                  <Text style={styles.headerNotificationText}>{notificationCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconButton}>
              <Ionicons name="ellipsis-horizontal" size={22} color="#1F2937" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <Animated.FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderItem}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={['#3B82F6']} />
        }
        ListHeaderComponent={
          <View>
            {/* Analytics Cards */}
            <FlatList
              data={analyticsCards}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item, index }) => <AnalyticsCard data={item} index={index} />}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.analyticsList}
              style={styles.analyticsSection}
            />

            {/* Search Bar */}
            <View style={styles.searchSection}>
              <View style={styles.searchContainer}>
                <Feather name="search" size={20} color="#9CA3AF" />
                <TextInput
                  placeholder="Search orders, customers, order IDs..."
                  placeholderTextColor="#9CA3AF"
                  value={searchText}
                  onChangeText={setSearchText}
                  style={styles.searchInput}
                />
                {searchText.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchText('')}>
                    <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Filter Chips */}
            <View style={styles.filterSection}>
              <FlatList
                data={filterChips}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <FilterChipComponent
                    chip={item}
                    isSelected={selectedFilter === item.id}
                    onPress={() => setSelectedFilter(item.id)}
                  />
                )}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.filterList}
              />
            </View>

            {/* Bulk Action Toolbar */}
            {selectedOrders.length > 0 && (
              <Animated.View entering={FadeInDown.springify()} style={styles.bulkToolbar}>
                <View style={styles.bulkInfo}>
                  <Text style={styles.bulkCount}>{selectedOrders.length} selected</Text>
                </View>
                <View style={styles.bulkActions}>
                  <TouchableOpacity style={styles.bulkAction}>
                    <MaterialCommunityIcons name="truck-delivery" size={20} color="#3B82F6" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.bulkAction}>
                    <MaterialCommunityIcons name="printer" size={20} color="#8B5CF6" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.bulkAction}>
                    <MaterialCommunityIcons name="download" size={20} color="#10B981" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.bulkAction} onPress={clearSelection}>
                    <MaterialCommunityIcons name="close" size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            {/* Orders Header */}
            <SectionHeader title="All Orders" count={filteredOrders.length} />

            {/* Order Status Pipeline */}
            <View style={styles.pipelineSection}>
              <SectionHeader title="Order Workflow" showSeeAll={false} />
              <FlatList
                data={statusPipeline}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item, index }) => <StatusPipelineCard item={item} index={index} />}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.pipelineList}
              />
            </View>

            {/* Priority Orders */}
            <View style={styles.prioritySection}>
              <SectionHeader title="Needs Attention" />
              <FlatList
                data={priorityOrders}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item, index }) => <PriorityOrderCard item={item} index={index} />}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.priorityList}
              />
            </View>

            {/* Recent Activity */}
            <View style={styles.activitySection}>
              <SectionHeader title="Recent Activities" showSeeAll={false} />
              <View style={styles.activityContainer}>
                {recentActivities.map((item, index) => (
                  <ActivityItem key={item.id} item={item} index={index} />
                ))}
              </View>
            </View>

            {/* Revenue Summary */}
            <View style={styles.revenueSection}>
              <SectionHeader title="Revenue Overview" showSeeAll={false} />
              <RevenueSummary />
            </View>

            {/* Top Customers */}
            <View style={styles.topCustomersSection}>
              <SectionHeader title="Top Customers" />
              <FlatList
                data={topCustomers}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item, index }) => <TopCustomerCard customer={item} index={index} />}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.topCustomersList}
              />
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActionsSection}>
              <SectionHeader title="Quick Actions" showSeeAll={false} />
              <View style={styles.quickActionsGrid}>
                {quickActions.map((action, index) => (
                  <QuickActionCard key={action.id} action={action} index={index} />
                ))}
              </View>
            </View>

            {/* Insights */}
            <View style={styles.insightsSection}>
              <SectionHeader title="Order Insights" showSeeAll={false} />
              {insights.map((insight, index) => (
                <InsightCard key={insight.id} insight={insight} index={index} />
              ))}
            </View>
          </View>
        }
        ListFooterComponent={<View style={[styles.footerSpacing, { height: insets.bottom + 80 }]} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="shopping-outline" size={80} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>No Orders Found</Text>
            <Text style={styles.emptyStateDescription}>
              Customer orders will appear here once purchases are made.
            </Text>
            <TouchableOpacity style={styles.emptyStateButton}>
              <Text style={styles.emptyStateButtonText}>Create Order</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 24 }]}>
        <LinearGradient
          colors={['#3B82F6', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  headerNotificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  headerNotificationText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  analyticsSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  analyticsList: {
    paddingHorizontal: 16,
  },
  analyticsCardWrapper: {
    width: 100,
    marginHorizontal: 6,
  },
  analyticsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  analyticsIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  analyticsCount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  analyticsTitle: {
    fontSize: 9,
    color: '#6B7280',
    textAlign: 'center',
  },
  analyticsTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  analyticsTrendText: {
    fontSize: 8,
    fontWeight: '600',
    marginLeft: 2,
  },
  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#1F2937',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterList: {
    paddingHorizontal: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 30,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterChipLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
  },
  filterChipLabelSelected: {
    color: '#FFFFFF',
  },
  filterChipCount: {
    marginLeft: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  filterChipCountSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  filterChipCountText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterChipCountTextSelected: {
    color: '#FFFFFF',
  },
  bulkToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  bulkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bulkCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  bulkActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bulkAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: '#F3F4F6',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  sectionHeaderCount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 8,
  },
  sectionHeaderSeeAll: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3B82F6',
  },
  orderCardContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderId: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#EF4444',
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
  orderCustomer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  customerEmail: {
    fontSize: 11,
    color: '#6B7280',
  },
  customerPhone: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  orderDetails: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  orderDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderDetailText: {
    fontSize: 12,
    color: '#4B5563',
  },
  paymentStatusContainer: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  paymentStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  trackingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
  },
  trackingText: {
    fontSize: 11,
    color: '#6B7280',
  },
  actionRequired: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  actionRequiredText: {
    flex: 1,
    fontSize: 12,
    color: '#F59E0B',
  },
  resolveButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
  },
  resolveButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  orderDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  orderActions: {
    flexDirection: 'row',
    gap: 12,
  },
  orderActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  pipelineSection: {
    marginBottom: 24,
  },
  pipelineList: {
    paddingHorizontal: 16,
  },
  pipelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 6,
    width: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  pipelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  pipelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pipelineStatus: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
  },
  pipelineCount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
  },
  pipelineProgress: {
    height: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    overflow: 'hidden',
  },
  pipelineProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  prioritySection: {
    marginBottom: 24,
  },
  priorityList: {
    paddingHorizontal: 16,
  },
  priorityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 6,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  priorityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  priorityTypeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  priorityOrderId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  priorityReason: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  resolveNowButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  resolveNowText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  activitySection: {
    marginBottom: 24,
  },
  activityContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
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
  activityText: {
    fontSize: 13,
    color: '#1F2937',
  },
  activityTime: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  revenueSection: {
    marginBottom: 24,
  },
  revenueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  revenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  revenueItem: {
    flex: 1,
    alignItems: 'center',
  },
  revenueDivider: {
    width: 1,
    backgroundColor: '#F3F4F6',
  },
  revenueLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  revenueValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  topCustomersSection: {
    marginBottom: 24,
  },
  topCustomersList: {
    paddingHorizontal: 16,
  },
  topCustomerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 6,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  topCustomerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  topCustomerInfo: {
    flex: 1,
  },
  topCustomerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  topCustomerStats: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  quickActionsSection: {
    marginBottom: 24,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  quickActionCard: {
    width: QUICK_ACTION_SIZE,
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 12,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#4B5563',
    textAlign: 'center',
  },
  insightsSection: {
    marginBottom: 24,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightText: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 17,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footerSpacing: {
    height: 40,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});