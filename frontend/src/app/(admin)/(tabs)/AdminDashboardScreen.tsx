import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    Platform,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;
const QUICK_ACTION_SIZE = (SCREEN_WIDTH - 64) / 4;

// ============================================
// TYPES & INTERFACES
// ============================================

interface AdminUser {
  id: string;
  name: string;
  avatar: string;
  role: string;
}

interface KPICardData {
  id: string;
  title: string;
  value: string;
  change: number;
  icon: string;
  iconColor: string;
  trend: 'up' | 'down';
  subtitle: string;
}

interface Order {
  id: string;
  orderId: string;
  customerName: string;
  amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  time: string;
}

interface OrderStatusSummary {
  id: string;
  status: string;
  count: number;
  icon: string;
  color: string;
}

interface TopProduct {
  id: string;
  name: string;
  category: string;
  image: string;
  salesCount: number;
  revenue: number;
}

interface InventoryItem {
  id: string;
  title: string;
  count: number;
  icon: string;
  status: 'good' | 'warning' | 'critical';
}

interface CustomerMetric {
  id: string;
  title: string;
  value: string;
  change: number;
  icon: string;
}

interface RevenueBreakdown {
  grossRevenue: number;
  netRevenue: number;
  refundAmount: number;
  profit: number;
}

interface Activity {
  id: string;
  type: 'order' | 'product' | 'customer' | 'refund' | 'delivery';
  description: string;
  timestamp: string;
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

const adminUser: AdminUser = {
  id: '1',
  name: 'Michael Chen',
  avatar: 'https://randomuser.me/api/portraits/men/41.jpg',
  role: 'Store Administrator',
};

const kpiData: KPICardData[] = [
  { id: '1', title: 'Total Revenue', value: '$48,295', change: 12.5, icon: 'trending-up', iconColor: '#10B981', trend: 'up', subtitle: 'vs last month' },
  { id: '2', title: 'Total Orders', value: '3,284', change: 8.2, icon: 'shopping-bag', iconColor: '#3B82F6', trend: 'up', subtitle: 'vs last month' },
  { id: '3', title: 'Total Customers', value: '2,847', change: 15.3, icon: 'users', iconColor: '#8B5CF6', trend: 'up', subtitle: 'new: +342' },
  { id: '4', title: 'Total Products', value: '1,249', change: 5.4, icon: 'package', iconColor: '#F59E0B', trend: 'up', subtitle: 'active: 92%' },
];

const recentOrders: Order[] = [
  { id: '1', orderId: '#ORD-1024', customerName: 'Sarah Johnson', amount: 189.99, status: 'processing', time: '10 mins ago' },
  { id: '2', orderId: '#ORD-1023', customerName: 'David Williams', amount: 64.50, status: 'shipped', time: '35 mins ago' },
  { id: '3', orderId: '#ORD-1022', customerName: 'Emily Brown', amount: 299.99, status: 'pending', time: '1 hour ago' },
  { id: '4', orderId: '#ORD-1021', customerName: 'James Wilson', amount: 45.00, status: 'delivered', time: '2 hours ago' },
  { id: '5', orderId: '#ORD-1020', customerName: 'Lisa Anderson', amount: 159.99, status: 'processing', time: '3 hours ago' },
  { id: '6', orderId: '#ORD-1019', customerName: 'Robert Martinez', amount: 89.99, status: 'cancelled', time: '4 hours ago' },
];

const orderStatusSummary: OrderStatusSummary[] = [
  { id: '1', status: 'Pending', count: 12, icon: 'time-outline', color: '#F59E0B' },
  { id: '2', status: 'Processing', count: 28, icon: 'sync-outline', color: '#3B82F6' },
  { id: '3', status: 'Shipped', count: 45, icon: 'cube-outline', color: '#8B5CF6' },
  { id: '4', status: 'Delivered', count: 234, icon: 'checkmark-circle-outline', color: '#10B981' },
];

const topProducts: TopProduct[] = [
  { id: '1', name: 'Wireless Headphones Pro', category: 'Electronics', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200', salesCount: 342, revenue: 34158.58 },
  { id: '2', name: 'Premium Cotton T-Shirt', category: 'Fashion', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200', salesCount: 289, revenue: 11502.11 },
  { id: '3', name: 'Smart Watch Ultra', category: 'Electronics', image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=200', salesCount: 234, revenue: 58499.66 },
  { id: '4', name: 'Running Shoes', category: 'Sports', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200', salesCount: 198, revenue: 19701.02 },
  { id: '5', name: 'Leather Backpack', category: 'Accessories', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200', salesCount: 167, revenue: 13343.30 },
];

const inventoryItems: InventoryItem[] = [
  { id: '1', title: 'Low Stock', count: 23, icon: 'alert-circle-outline', status: 'warning' },
  { id: '2', title: 'Out of Stock', count: 8, icon: 'close-circle-outline', status: 'critical' },
  { id: '3', title: 'Active Products', count: 1149, icon: 'checkmark-circle-outline', status: 'good' },
  { id: '4', title: 'Draft Products', count: 46, icon: 'create-outline', status: 'neutral' },
];

const customerMetrics: CustomerMetric[] = [
  { id: '1', title: 'Total Customers', value: '2,847', change: 15.3, icon: 'people-outline' },
  { id: '2', title: 'New Customers', value: '342', change: 22.5, icon: 'person-add-outline' },
  { id: '3', title: 'Returning', value: '1,876', change: 8.7, icon: 'repeat-outline' },
  { id: '4', title: 'Retention Rate', value: '67.8%', change: 5.2, icon: 'trending-up-outline' },
];

const revenueBreakdown: RevenueBreakdown = {
  grossRevenue: 52890.00,
  netRevenue: 48295.00,
  refundAmount: 3450.00,
  profit: 28977.00,
};

const recentActivities: Activity[] = [
  { id: '1', type: 'order', description: 'New order #ORD-1024 received from Sarah Johnson', timestamp: '2 mins ago' },
  { id: '2', type: 'product', description: 'New product "Smart Watch Pro" added to catalog', timestamp: '15 mins ago' },
  { id: '3', type: 'customer', description: 'New customer registration: James Wilson', timestamp: '32 mins ago' },
  { id: '4', type: 'refund', description: 'Refund requested for order #ORD-1018', timestamp: '1 hour ago' },
  { id: '5', type: 'delivery', description: 'Order #ORD-1017 delivered successfully', timestamp: '2 hours ago' },
  { id: '6', type: 'order', description: 'Bulk order #ORD-1016 received from Tech Corp', timestamp: '3 hours ago' },
  { id: '7', type: 'product', description: '50 units of "Wireless Mouse" added to inventory', timestamp: '4 hours ago' },
  { id: '8', type: 'customer', description: 'Customer feedback submitted for product #P-234', timestamp: '5 hours ago' },
];

const quickActions: QuickAction[] = [
  { id: '1', title: 'Add Product', icon: 'add-circle-outline', color: '#3B82F6' },
  { id: '2', title: 'Manage Orders', icon: 'cart-outline', color: '#8B5CF6' },
  { id: '3', title: 'Customers', icon: 'people-outline', color: '#10B981' },
  { id: '4', title: 'Inventory', icon: 'cube-outline', color: '#F59E0B' },
  { id: '5', title: 'Create Coupon', icon: 'pricetag-outline', color: '#EC4899' },
  { id: '6', title: 'View Reports', icon: 'bar-chart-outline', color: '#6366F1' },
  { id: '7', title: 'Send Notification', icon: 'notifications-outline', color: '#EF4444' },
  { id: '8', title: 'Settings', icon: 'settings-outline', color: '#6B7280' },
];

const insights: Insight[] = [
  { id: '1', message: 'Today\'s sales increased by 12.5% compared to yesterday. Great momentum!', type: 'positive' },
  { id: '2', message: 'Best-selling category this week: Electronics with $15,234 revenue', type: 'neutral' },
  { id: '3', message: 'Low inventory alert: 8 products need restocking soon', type: 'warning' },
];

// ============================================
// REUSABLE COMPONENTS
// ============================================

const SectionHeader = ({ title, onSeeAll, showSeeAll = true }: { title: string; onSeeAll?: () => void; showSeeAll?: boolean }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionHeaderTitle}>{title}</Text>
    {showSeeAll && (
      <TouchableOpacity onPress={onSeeAll} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.sectionHeaderSeeAll}>See Details</Text>
      </TouchableOpacity>
    )}
  </View>
);

const StatusBadge = ({ status }: { status: Order['status'] }) => {
  const config = {
    pending: { label: 'Pending', color: '#F59E0B', bg: '#FEF3C7' },
    processing: { label: 'Processing', color: '#3B82F6', bg: '#DBEAFE' },
    shipped: { label: 'Shipped', color: '#8B5CF6', bg: '#EDE9FE' },
    delivered: { label: 'Delivered', color: '#10B981', bg: '#D1FAE5' },
    cancelled: { label: 'Cancelled', color: '#EF4444', bg: '#FEE2E2' },
  };
  const { label, color, bg } = config[status];
  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
};

const KPICard = ({ data, index }: { data: KPICardData; index: number }) => {
  const scale = useSharedValue(1);
  
  const onPressIn = () => { scale.value = withSpring(0.98); };
  const onPressOut = () => { scale.value = withSpring(1); };
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()} style={[styles.kpiCardWrapper]}>
      <TouchableOpacity activeOpacity={0.9} onPressIn={onPressIn} onPressOut={onPressOut}>
        <Animated.View style={[styles.kpiCard, animatedStyle]}>
          <View style={styles.kpiHeader}>
            <View style={[styles.kpiIconContainer, { backgroundColor: `${data.iconColor}15` }]}>
              <Ionicons name={data.icon as any} size={22} color={data.iconColor} />
            </View>
            <View style={styles.kpiTrend}>
              <Ionicons name={data.trend === 'up' ? 'arrow-up' : 'arrow-down'} size={12} color={data.trend === 'up' ? '#10B981' : '#EF4444'} />
              <Text style={[styles.kpiChange, { color: data.trend === 'up' ? '#10B981' : '#EF4444' }]}>{data.change}%</Text>
            </View>
          </View>
          <Text style={styles.kpiValue}>{data.value}</Text>
          <Text style={styles.kpiTitle}>{data.title}</Text>
          <Text style={styles.kpiSubtitle}>{data.subtitle}</Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const OrderItem = ({ order, index }: { order: Order; index: number }) => (
  <Animated.View entering={FadeInRight.delay(index * 30).springify()} style={styles.orderItem}>
    <View style={styles.orderLeft}>
      <View style={styles.orderIconContainer}>
        <Ionicons name="receipt-outline" size={18} color="#3B82F6" />
      </View>
      <View>
        <Text style={styles.orderId}>{order.orderId}</Text>
        <Text style={styles.orderCustomer}>{order.customerName}</Text>
      </View>
    </View>
    <View style={styles.orderRight}>
      <Text style={styles.orderAmount}>${order.amount.toFixed(2)}</Text>
      <StatusBadge status={order.status} />
      <Text style={styles.orderTime}>{order.time}</Text>
    </View>
  </Animated.View>
);

const OrderStatusCard = ({ item, index }: { item: OrderStatusSummary; index: number }) => (
  <Animated.View entering={FadeInUp.delay(index * 80).springify()} style={styles.orderStatusCard}>
    <View style={[styles.orderStatusIcon, { backgroundColor: `${item.color}15` }]}>
      <Ionicons name={item.icon as any} size={22} color={item.color} />
    </View>
    <Text style={styles.orderStatusCount}>{item.count}</Text>
    <Text style={styles.orderStatusLabel}>{item.status}</Text>
  </Animated.View>
);

const TopProductItem = ({ product, index }: { product: TopProduct; index: number }) => (
  <Animated.View entering={FadeInLeft.delay(index * 50).springify()} style={styles.topProductItem}>
    <Image source={{ uri: product.image }} style={styles.topProductImage} />
    <View style={styles.topProductInfo}>
      <Text style={styles.topProductName} numberOfLines={1}>{product.name}</Text>
      <Text style={styles.topProductCategory}>{product.category}</Text>
      <View style={styles.topProductStats}>
        <Text style={styles.topProductSales}>{product.salesCount} sold</Text>
        <Text style={styles.topProductRevenue}>${product.revenue.toFixed(0)}</Text>
      </View>
    </View>
  </Animated.View>
);

const InventoryCard = ({ item, index }: { item: InventoryItem; index: number }) => {
  const statusColor = item.status === 'good' ? '#10B981' : item.status === 'warning' ? '#F59E0B' : '#EF4444';
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()} style={styles.inventoryCard}>
      <View style={[styles.inventoryIconContainer, { backgroundColor: `${statusColor}15` }]}>
        <Ionicons name={item.icon as any} size={22} color={statusColor} />
      </View>
      <Text style={styles.inventoryCount}>{item.count}</Text>
      <Text style={styles.inventoryTitle}>{item.title}</Text>
    </Animated.View>
  );
};

const CustomerMetricCard = ({ metric, index }: { metric: CustomerMetric; index: number }) => (
  <Animated.View entering={FadeInUp.delay(index * 60).springify()} style={styles.customerMetricCard}>
    <View style={styles.customerMetricHeader}>
      <Ionicons name={metric.icon as any} size={18} color="#6B7280" />
      <View style={styles.customerMetricChange}>
        <Ionicons name="arrow-up" size={10} color="#10B981" />
        <Text style={styles.customerMetricChangeText}>{metric.change}%</Text>
      </View>
    </View>
    <Text style={styles.customerMetricValue}>{metric.value}</Text>
    <Text style={styles.customerMetricTitle}>{metric.title}</Text>
  </Animated.View>
);

const RevenueCard = ({ revenue }: { revenue: RevenueBreakdown }) => (
  <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.revenueCard}>
    <View style={styles.revenueRow}>
      <View style={styles.revenueItem}>
        <Text style={styles.revenueLabel}>Gross Revenue</Text>
        <Text style={styles.revenueValue}>${revenue.grossRevenue.toFixed(0)}</Text>
      </View>
      <View style={styles.revenueDivider} />
      <View style={styles.revenueItem}>
        <Text style={styles.revenueLabel}>Net Revenue</Text>
        <Text style={[styles.revenueValue, { color: '#10B981' }]}>${revenue.netRevenue.toFixed(0)}</Text>
      </View>
    </View>
    <View style={styles.revenueRow}>
      <View style={styles.revenueItem}>
        <Text style={styles.revenueLabel}>Refund Amount</Text>
        <Text style={[styles.revenueValue, { color: '#EF4444' }]}>${revenue.refundAmount.toFixed(0)}</Text>
      </View>
      <View style={styles.revenueDivider} />
      <View style={styles.revenueItem}>
        <Text style={styles.revenueLabel}>Profit</Text>
        <Text style={[styles.revenueValue, { color: '#8B5CF6' }]}>${revenue.profit.toFixed(0)}</Text>
      </View>
    </View>
  </Animated.View>
);

const ActivityItem = ({ activity, index }: { activity: Activity; index: number }) => {
  const getIcon = () => {
    switch (activity.type) {
      case 'order': return 'cart-outline';
      case 'product': return 'cube-outline';
      case 'customer': return 'person-outline';
      case 'refund': return 'refresh-outline';
      case 'delivery': return 'checkmark-done-outline';
      default: return 'notifications-outline';
    }
  };
  const getColor = () => {
    switch (activity.type) {
      case 'order': return '#3B82F6';
      case 'product': return '#8B5CF6';
      case 'customer': return '#10B981';
      case 'refund': return '#F59E0B';
      case 'delivery': return '#EC4899';
      default: return '#6B7280';
    }
  };
  return (
    <Animated.View entering={FadeInLeft.delay(index * 20).springify()} style={styles.activityItem}>
      <View style={[styles.activityIcon, { backgroundColor: `${getColor()}15` }]}>
        <Ionicons name={getIcon()} size={18} color={getColor()} />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityDescription} numberOfLines={2}>{activity.description}</Text>
        <Text style={styles.activityTime}>{activity.timestamp}</Text>
      </View>
    </Animated.View>
  );
};

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
          <Ionicons name={action.icon as any} size={24} color={action.color} />
        </View>
        <Text style={styles.quickActionTitle}>{action.title}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

const InsightCard = ({ insight }: { insight: Insight }) => {
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
    <Animated.View entering={FadeInUp.springify()} style={styles.insightCard}>
      <View style={[styles.insightIcon, { backgroundColor: `${getBgColor()}15` }]}>
        <Ionicons name={getIcon()} size={22} color={getBgColor()} />
      </View>
      <View style={styles.insightContent}>
        <Text style={styles.insightText}>{insight.message}</Text>
      </View>
    </Animated.View>
  );
};

// Simple Chart Component
const SalesChart = () => {
  const data = [32, 45, 38, 52, 48, 65, 72];
  const maxValue = Math.max(...data);
  
  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartBars}>
        {data.map((value, index) => (
          <View key={index} style={styles.chartBarWrapper}>
            <View 
              style={[
                styles.chartBar, 
                { height: (value / maxValue) * 80, backgroundColor: index === 6 ? '#3B82F6' : '#93C5FD' }
              ]} 
            />
            <Text style={styles.chartLabel}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</Text>
          </View>
        ))}
      </View>
      <View style={styles.chartStats}>
        <View style={styles.chartStat}>
          <Text style={styles.chartStatLabel}>Today</Text>
          <Text style={styles.chartStatValue}>$2,890</Text>
        </View>
        <View style={styles.chartStat}>
          <Text style={styles.chartStatLabel}>This Week</Text>
          <Text style={styles.chartStatValue}>$18,342</Text>
        </View>
        <View style={styles.chartStat}>
          <Text style={styles.chartStatLabel}>This Month</Text>
          <Text style={styles.chartStatValue}>$48,295</Text>
        </View>
      </View>
    </View>
  );
};

// ============================================
// MAIN DASHBOARD SCREEN
// ============================================

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [notificationCount] = useState(5);
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: scrollY.value > 50 ? 0.95 : 1,
    shadowOpacity: scrollY.value > 10 ? 0.05 : 0,
  }));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      <Animated.View style={[styles.headerContainer, headerAnimatedStyle]}>
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <Image source={{ uri: adminUser.avatar }} style={styles.userAvatar} />
            <View>
              <Text style={styles.userGreeting}>Good Morning 👋</Text>
              <Text style={styles.userName}>{adminUser.name}</Text>
              <Text style={styles.userRole}>{adminUser.role}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="notifications-outline" size={24} color="#1F2937" />
              {notificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{notificationCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="settings-outline" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <Animated.FlatList
        data={[]}
        keyExtractor={() => 'main'}
        renderItem={null}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={['#3B82F6']} />
        }
        ListHeaderComponent={
          <View>
            {/* KPI Cards Grid */}
            <View style={styles.kpiGrid}>
              {kpiData.map((item, index) => (
                <KPICard key={item.id} data={item} index={index} />
              ))}
            </View>

            {/* Sales Analytics Section */}
            <View style={styles.salesSection}>
              <SectionHeader title="Sales Analytics" />
              <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.salesCard}>
                <SalesChart />
              </Animated.View>
            </View>

            {/* Recent Orders */}
            <View style={styles.ordersSection}>
              <SectionHeader title="Recent Orders" onSeeAll={() => {}} />
              <View style={styles.ordersList}>
                {recentOrders.slice(0, 5).map((order, index) => (
                  <OrderItem key={order.id} order={order} index={index} />
                ))}
              </View>
            </View>

            {/* Order Status Summary */}
            <View style={styles.orderStatusSection}>
              <SectionHeader title="Order Status" showSeeAll={false} />
              <FlatList
                data={orderStatusSummary}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item, index }) => <OrderStatusCard item={item} index={index} />}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.orderStatusList}
              />
            </View>

            {/* Top Selling Products */}
            <View style={styles.topProductsSection}>
              <SectionHeader title="Top Products" onSeeAll={() => {}} />
              <View style={styles.topProductsList}>
                {topProducts.map((product, index) => (
                  <TopProductItem key={product.id} product={product} index={index} />
                ))}
              </View>
            </View>

            {/* Inventory Overview */}
            <View style={styles.inventorySection}>
              <SectionHeader title="Inventory Overview" showSeeAll={false} />
              <View style={styles.inventoryGrid}>
                {inventoryItems.map((item, index) => (
                  <InventoryCard key={item.id} item={item} index={index} />
                ))}
              </View>
            </View>

            {/* Customer Analytics */}
            <View style={styles.customerSection}>
              <SectionHeader title="Customer Analytics" showSeeAll={false} />
              <View style={styles.customerGrid}>
                {customerMetrics.map((metric, index) => (
                  <CustomerMetricCard key={metric.id} metric={metric} index={index} />
                ))}
              </View>
            </View>

            {/* Revenue Breakdown */}
            <View style={styles.revenueSection}>
              <SectionHeader title="Revenue Breakdown" showSeeAll={false} />
              <RevenueCard revenue={revenueBreakdown} />
            </View>

            {/* Recent Activities */}
            <View style={styles.activitiesSection}>
              <SectionHeader title="Recent Activity" onSeeAll={() => {}} />
              <View style={styles.activitiesList}>
                {recentActivities.slice(0, 6).map((activity, index) => (
                  <ActivityItem key={activity.id} activity={activity} index={index} />
                ))}
              </View>
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

            {/* Business Insights */}
            <View style={styles.insightsSection}>
              <SectionHeader title="Business Insights" showSeeAll={false} />
              {insights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </View>
          </View>
        }
        ListFooterComponent={<View style={[styles.footerSpacing, { height: insets.bottom + 40 }]} />}
      />
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
    paddingTop: Platform.OS === 'android' ? 8 : 0,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  userGreeting: {
    fontSize: 12,
    color: '#6B7280',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  userRole: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
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
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  sectionHeaderSeeAll: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3B82F6',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginTop: 8,
  },
  kpiCardWrapper: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  kpiChange: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 2,
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  kpiTitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  kpiSubtitle: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  salesSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  salesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  chartContainer: {
    width: '100%',
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 110,
    marginBottom: 20,
  },
  chartBarWrapper: {
    alignItems: 'center',
    width: 30,
  },
  chartBar: {
    width: 24,
    borderRadius: 12,
    marginBottom: 8,
  },
  chartLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  chartStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  chartStat: {
    alignItems: 'center',
  },
  chartStatLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  chartStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  ordersSection: {
    marginBottom: 24,
  },
  ordersList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 20,
    overflow: 'hidden',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  orderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
  },
  orderIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  orderCustomer: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  orderRight: {
    alignItems: 'flex-end',
    flex: 1,
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  orderTime: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
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
  orderStatusSection: {
    marginBottom: 24,
  },
  orderStatusList: {
    paddingHorizontal: 16,
  },
  orderStatusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    width: 85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  orderStatusIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderStatusCount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
  },
  orderStatusLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  topProductsSection: {
    marginBottom: 24,
  },
  topProductsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 20,
    overflow: 'hidden',
  },
  topProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  topProductImage: {
    width: 50,
    height: 50,
    borderRadius: 12,
    marginRight: 12,
  },
  topProductInfo: {
    flex: 1,
  },
  topProductName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  topProductCategory: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  topProductStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  topProductSales: {
    fontSize: 11,
    color: '#3B82F6',
  },
  topProductRevenue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  inventorySection: {
    marginBottom: 24,
  },
  inventoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  inventoryCard: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  inventoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  inventoryCount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
  },
  inventoryTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  customerSection: {
    marginBottom: 24,
  },
  customerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  customerMetricCard: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  customerMetricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerMetricChange: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  customerMetricChangeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 2,
  },
  customerMetricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 2,
  },
  customerMetricTitle: {
    fontSize: 11,
    color: '#6B7280',
  },
  revenueSection: {
    marginBottom: 24,
  },
  revenueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  revenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
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
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  revenueValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  activitiesSection: {
    marginBottom: 24,
  },
  activitiesList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 20,
    overflow: 'hidden',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityDescription: {
    fontSize: 13,
    color: '#1F2937',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 10,
    color: '#9CA3AF',
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
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  footerSpacing: {
    height: 40,
  },
});