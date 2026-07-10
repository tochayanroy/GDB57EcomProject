import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
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

interface KPI {
  id: string;
  title: string;
  value: string;
  icon: string;
  color: string;
  trend?: number;
  subtitle: string;
}

interface Warehouse {
  id: string;
  name: string;
  location: string;
  inventoryCount: number;
  capacity: number;
  occupied: number;
  status: 'active' | 'maintenance' | 'full';
}

interface Alert {
  id: string;
  type: 'low_stock' | 'out_of_stock' | 'overstock' | 'expired' | 'damaged' | 'transfer';
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: string;
}

interface TopProduct {
  id: string;
  name: string;
  sku: string;
  stock: number;
  warehouse: string;
  value: number;
  image: string;
}

interface Replenishment {
  id: string;
  name: string;
  currentStock: number;
  threshold: number;
  recommendedQty: number;
  supplier: string;
  leadTime: string;
}

interface CategoryInventory {
  id: string;
  name: string;
  stockCount: number;
  value: number;
  percentage: number;
  color: string;
}

interface Supplier {
  id: string;
  name: string;
  productsSupplied: number;
  leadTime: string;
  performanceScore: number;
  delayedShipments: number;
}

interface Activity {
  id: string;
  type: 'stock_update' | 'transfer' | 'restock' | 'adjustment' | 'damage' | 'purchase';
  description: string;
  timestamp: string;
  performedBy: string;
  icon: string;
}

interface QuickAction {
  id: string;
  title: string;
  icon: string;
  color: string;
}

// ============================================
// DUMMY DATA
// ============================================

const kpis: KPI[] = [
  { id: '1', title: 'Total Products', value: '12,458', icon: 'package-variant', color: '#3B82F6', trend: 5.2, subtitle: '+587 this month' },
  { id: '2', title: 'Total Stock Units', value: '245,892', icon: 'warehouse', color: '#10B981', trend: 8.4, subtitle: '+18,345 units' },
  { id: '3', title: 'Inventory Value', value: '$2.45M', icon: 'currency-usd', color: '#F59E0B', trend: 12.3, subtitle: '+$267K' },
  { id: '4', title: 'Low Stock', value: '48', icon: 'alert-circle', color: '#EF4444', trend: -5.2, subtitle: '12 critical' },
  { id: '5', title: 'Out of Stock', value: '23', icon: 'close-circle', color: '#DC2626', trend: -8.1, subtitle: 'Need restock' },
  { id: '6', title: 'Overstock', value: '156', icon: 'package-up', color: '#8B5CF6', trend: 15.3, subtitle: '+34 items' },
  { id: '7', title: 'Pending Restocks', value: '89', icon: 'truck', color: '#EC4899', trend: 0, subtitle: 'ETA this week' },
  { id: '8', title: 'Warehouse Utilization', value: '78%', icon: 'warehouse', color: '#06B6D4', trend: 4.2, subtitle: '244K/312K units' },
];

const warehouses: Warehouse[] = [
  { id: '1', name: 'Main Warehouse', location: 'New York, NY', inventoryCount: 124500, capacity: 150000, occupied: 83, status: 'active' },
  { id: '2', name: 'West Coast DC', location: 'Los Angeles, CA', inventoryCount: 89200, capacity: 100000, occupied: 89, status: 'active' },
  { id: '3', name: 'South Hub', location: 'Houston, TX', inventoryCount: 34200, capacity: 62000, occupied: 55, status: 'active' },
  { id: '4', name: 'Returns Center', location: 'Chicago, IL', inventoryCount: 12400, capacity: 25000, occupied: 50, status: 'maintenance' },
];

const alerts: Alert[] = [
  { id: '1', type: 'low_stock', count: 48, severity: 'high', action: 'Restock Now' },
  { id: '2', type: 'out_of_stock', count: 23, severity: 'critical', action: 'Create PO' },
  { id: '3', type: 'overstock', count: 156, severity: 'medium', action: 'Review' },
  { id: '4', type: 'damaged', count: 12, severity: 'medium', action: 'Inspect' },
  { id: '5', type: 'expired', count: 5, severity: 'critical', action: 'Dispose' },
  { id: '6', type: 'transfer', count: 34, severity: 'low', action: 'Process' },
];

const topProducts: TopProduct[] = [
  { id: '1', name: 'Premium Wireless Headphones Pro', sku: 'SKU-1001', stock: 2450, warehouse: 'Main', value: 735000, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200' },
  { id: '2', name: 'Smart Watch Ultra', sku: 'SKU-1002', stock: 1890, warehouse: 'Main', value: 850500, image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=200' },
  { id: '3', name: 'Premium Cotton T-Shirt', sku: 'SKU-2001', stock: 3450, warehouse: 'West Coast', value: 138000, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200' },
  { id: '4', name: 'Leather Backpack', sku: 'SKU-3001', stock: 890, warehouse: 'South Hub', value: 71200, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200' },
];

const replenishments: Replenishment[] = [
  { id: '1', name: 'Smart Watch Ultra', currentStock: 45, threshold: 100, recommendedQty: 500, supplier: 'TechSupply Co', leadTime: '5 days' },
  { id: '2', name: 'Premium Wireless Headphones', currentStock: 78, threshold: 150, recommendedQty: 400, supplier: 'AudioTech', leadTime: '7 days' },
  { id: '3', name: 'Running Shoes Pro', currentStock: 23, threshold: 80, recommendedQty: 300, supplier: 'Footwear Direct', leadTime: '10 days' },
  { id: '4', name: 'Designer Handbag', currentStock: 12, threshold: 50, recommendedQty: 150, supplier: 'Luxury Goods Co', leadTime: '14 days' },
];

const categoryInventory: CategoryInventory[] = [
  { id: '1', name: 'Electronics', stockCount: 89450, value: 1890000, percentage: 36.5, color: '#3B82F6' },
  { id: '2', name: 'Fashion', stockCount: 75420, value: 420000, percentage: 30.8, color: '#8B5CF6' },
  { id: '3', name: 'Home & Living', stockCount: 34520, value: 89000, percentage: 14.1, color: '#10B981' },
  { id: '4', name: 'Beauty', stockCount: 23450, value: 34500, percentage: 9.6, color: '#EC4899' },
  { id: '5', name: 'Sports', stockCount: 12450, value: 28000, percentage: 5.1, color: '#F59E0B' },
  { id: '6', name: 'Books', stockCount: 9800, value: 12000, percentage: 4.0, color: '#06B6D4' },
];

const suppliers: Supplier[] = [
  { id: '1', name: 'TechSupply Co', productsSupplied: 124, leadTime: '5 days', performanceScore: 96, delayedShipments: 2 },
  { id: '2', name: 'AudioTech', productsSupplied: 89, leadTime: '7 days', performanceScore: 92, delayedShipments: 3 },
  { id: '3', name: 'Footwear Direct', productsSupplied: 156, leadTime: '10 days', performanceScore: 88, delayedShipments: 5 },
  { id: '4', name: 'Fashion Hub', productsSupplied: 234, leadTime: '8 days', performanceScore: 94, delayedShipments: 2 },
];

const activities: Activity[] = [
  { id: '1', type: 'stock_update', description: 'Stock updated for 24 products', timestamp: '10 minutes ago', performedBy: 'System', icon: 'refresh' },
  { id: '2', type: 'restock', description: 'Restocked 500 units of Smart Watch Ultra', timestamp: '1 hour ago', performedBy: 'Sarah Chen', icon: 'package' },
  { id: '3', type: 'transfer', description: 'Transferred 200 units to West Coast DC', timestamp: '3 hours ago', performedBy: 'Mike Johnson', icon: 'truck' },
  { id: '4', type: 'adjustment', description: 'Inventory adjustment for damaged items', timestamp: '5 hours ago', performedBy: 'Lisa Wong', icon: 'clipboard' },
  { id: '5', type: 'purchase', description: 'PO #PO-2024-10458 created', timestamp: '1 day ago', performedBy: 'John Smith', icon: 'file' },
];

const quickActions: QuickAction[] = [
  { id: '1', title: 'Add Inventory', icon: 'plus-circle', color: '#3B82F6' },
  { id: '2', title: 'Stock Adjust', icon: 'clipboard-list', color: '#10B981' },
  { id: '3', title: 'Transfer', icon: 'swap-horizontal', color: '#8B5CF6' },
  { id: '4', title: 'Create PO', icon: 'file-document', color: '#F59E0B' },
  { id: '5', title: 'Warehouses', icon: 'warehouse', color: '#EC4899' },
  { id: '6', title: 'Suppliers', icon: 'truck-fast', color: '#06B6D4' },
  { id: '7', title: 'Reports', icon: 'chart-line', color: '#6366F1' },
  { id: '8', title: 'Export', icon: 'download', color: '#6B7280' },
];

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

const KPICard = ({ data, index }: { data: KPI; index: number }) => {
  const scale = useSharedValue(1);
  
  const onPressIn = () => { scale.value = withSpring(0.97); };
  const onPressOut = () => { scale.value = withSpring(1); };
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeInLeft.delay(index * 30).springify()} style={styles.kpiWrapper}>
      <TouchableOpacity activeOpacity={0.9} onPressIn={onPressIn} onPressOut={onPressOut}>
        <Animated.View style={[styles.kpiCard, animatedStyle]}>
          <View style={[styles.kpiIconContainer, { backgroundColor: `${data.color}15` }]}>
            <MaterialCommunityIcons name={data.icon as any} size={22} color={data.color} />
          </View>
          <Text style={styles.kpiValue}>{data.value}</Text>
          <Text style={styles.kpiTitle}>{data.title}</Text>
          <Text style={styles.kpiSubtitle}>{data.subtitle}</Text>
          {data.trend !== undefined && data.trend !== 0 && (
            <View style={[styles.kpiTrend, { backgroundColor: data.trend > 0 ? '#D1FAE5' : '#FEE2E2' }]}>
              <Ionicons name={data.trend > 0 ? 'arrow-up' : 'arrow-down'} size={10} color={data.trend > 0 ? '#10B981' : '#EF4444'} />
              <Text style={[styles.kpiTrendText, { color: data.trend > 0 ? '#10B981' : '#EF4444' }]}>{Math.abs(data.trend)}%</Text>
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const HealthScoreCard = () => (
  <View style={styles.healthCard}>
    <View style={styles.healthHeader}>
      <Text style={styles.healthTitle}>Inventory Health</Text>
      <View style={styles.healthScore}>
        <Text style={styles.healthScoreValue}>92</Text>
        <Text style={styles.healthScoreMax}>/100</Text>
      </View>
    </View>
    <View style={styles.healthIndicator}>
      <View style={[styles.healthIndicatorBar, { width: '92%', backgroundColor: '#10B981' }]} />
    </View>
    <Text style={styles.healthStatus}>Excellent - Above Target</Text>
    <View style={styles.healthBreakdown}>
      <View style={styles.healthMetric}><Text style={styles.healthMetricLabel}>Stock Availability</Text><Text style={styles.healthMetricValue}>94%</Text></View>
      <View style={styles.healthMetric}><Text style={styles.healthMetricLabel}>Warehouse Efficiency</Text><Text style={styles.healthMetricValue}>88%</Text></View>
      <View style={styles.healthMetric}><Text style={styles.healthMetricLabel}>Replenishment Readiness</Text><Text style={styles.healthMetricValue}>85%</Text></View>
      <View style={styles.healthMetric}><Text style={styles.healthMetricLabel}>Inventory Turnover</Text><Text style={styles.healthMetricValue}>4.2x</Text></View>
    </View>
  </View>
);

const AlertCard = ({ alert, index }: { alert: Alert; index: number }) => {
  const getTypeConfig = () => {
    switch (alert.type) {
      case 'low_stock': return { label: 'Low Stock', icon: 'alert-circle', color: '#F59E0B' };
      case 'out_of_stock': return { label: 'Out of Stock', icon: 'close-circle', color: '#EF4444' };
      case 'overstock': return { label: 'Overstock', icon: 'package-up', color: '#8B5CF6' };
      case 'expired': return { label: 'Expired', icon: 'calendar-remove', color: '#DC2626' };
      case 'damaged': return { label: 'Damaged', icon: 'package-variant-closed', color: '#6B7280' };
      default: return { label: 'Transfer', icon: 'truck', color: '#3B82F6' };
    }
  };
  const config = getTypeConfig();
  const severityColor = alert.severity === 'critical' ? '#DC2626' : alert.severity === 'high' ? '#EF4444' : alert.severity === 'medium' ? '#F59E0B' : '#3B82F6';
  
  return (
    <Animated.View entering={FadeInRight.delay(index * 40).springify()} style={styles.alertCard}>
      <View style={[styles.alertIcon, { backgroundColor: `${config.color}15` }]}>
        <MaterialCommunityIcons name={config.icon as any} size={20} color={config.color} />
      </View>
      <View style={styles.alertInfo}>
        <Text style={styles.alertType}>{config.label}</Text>
        <Text style={styles.alertCount}>{alert.count} products</Text>
      </View>
      <View style={[styles.alertSeverity, { backgroundColor: `${severityColor}15` }]}>
        <Text style={[styles.alertSeverityText, { color: severityColor }]}>{alert.severity.toUpperCase()}</Text>
      </View>
      <TouchableOpacity style={styles.alertAction}>
        <Text style={styles.alertActionText}>{alert.action}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const WarehouseCard = ({ warehouse, index }: { warehouse: Warehouse; index: number }) => (
  <Animated.View entering={FadeInDown.delay(index * 50).springify()} style={styles.warehouseCard}>
    <View style={styles.warehouseHeader}>
      <View>
        <Text style={styles.warehouseName}>{warehouse.name}</Text>
        <Text style={styles.warehouseLocation}>{warehouse.location}</Text>
      </View>
      <View style={[styles.warehouseStatus, { backgroundColor: warehouse.status === 'active' ? '#D1FAE5' : '#FEE2E2' }]}>
        <Text style={[styles.warehouseStatusText, { color: warehouse.status === 'active' ? '#10B981' : '#EF4444' }]}>
          {warehouse.status === 'active' ? 'Active' : 'Maintenance'}
        </Text>
      </View>
    </View>
    <View style={styles.warehouseStats}>
      <View style={styles.warehouseStat}>
        <Text style={styles.warehouseStatValue}>{warehouse.inventoryCount.toLocaleString()}</Text>
        <Text style={styles.warehouseStatLabel}>Units</Text>
      </View>
      <View style={styles.warehouseStat}>
        <Text style={styles.warehouseStatValue}>{warehouse.occupied}%</Text>
        <Text style={styles.warehouseStatLabel}>Occupancy</Text>
      </View>
    </View>
    <View style={styles.warehouseProgressBar}>
      <View style={[styles.warehouseProgressFill, { width: `${warehouse.occupied}%`, backgroundColor: warehouse.occupied > 85 ? '#EF4444' : warehouse.occupied > 70 ? '#F59E0B' : '#10B981' }]} />
    </View>
  </Animated.View>
);

const TopProductCard = ({ product, index }: { product: TopProduct; index: number }) => (
  <Animated.View entering={FadeInRight.delay(index * 60).springify()} style={styles.topProductCard}>
    <Image source={{ uri: product.image }} style={styles.topProductImage} />
    <View style={styles.topProductInfo}>
      <Text style={styles.topProductName} numberOfLines={1}>{product.name}</Text>
      <Text style={styles.topProductSku}>{product.sku}</Text>
      <View style={styles.topProductStats}>
        <Text style={styles.topProductStock}>Stock: {product.stock.toLocaleString()}</Text>
        <Text style={styles.topProductValue}>${(product.value / 1000).toFixed(0)}K</Text>
      </View>
      <Text style={styles.topProductWarehouse}>{product.warehouse} Warehouse</Text>
    </View>
  </Animated.View>
);

const ReplenishmentCard = ({ item, index }: { item: Replenishment; index: number }) => (
  <Animated.View entering={FadeInLeft.delay(index * 50).springify()} style={styles.replenishmentCard}>
    <View style={styles.replenishmentHeader}>
      <Text style={styles.replenishmentName}>{item.name}</Text>
      <View style={styles.replenishmentUrgency}>
        <Text style={[styles.replenishmentUrgencyText, { color: item.currentStock < item.threshold ? '#EF4444' : '#F59E0B' }]}>
          {item.currentStock < item.threshold ? 'Urgent' : 'Plan'}
        </Text>
      </View>
    </View>
    <View style={styles.replenishmentStats}>
      <Text style={styles.replenishmentStock}>Current: {item.currentStock} / Min: {item.threshold}</Text>
      <Text style={styles.replenishmentQty}>Recommended: {item.recommendedQty} units</Text>
    </View>
    <View style={styles.replenishmentFooter}>
      <Text style={styles.replenishmentSupplier}>{item.supplier} • {item.leadTime}</Text>
      <TouchableOpacity style={styles.replenishmentButton}>
        <Text style={styles.replenishmentButtonText}>Create PO</Text>
      </TouchableOpacity>
    </View>
  </Animated.View>
);

const CategoryRow = ({ category, index }: { category: CategoryInventory; index: number }) => (
  <Animated.View entering={FadeInDown.delay(index * 30).springify()} style={styles.categoryRow}>
    <View style={styles.categoryInfo}>
      <View style={[styles.categoryColor, { backgroundColor: category.color }]} />
      <Text style={styles.categoryName}>{category.name}</Text>
      <Text style={styles.categoryCount}>{category.stockCount.toLocaleString()} units</Text>
    </View>
    <Text style={styles.categoryValue}>${(category.value / 1000).toFixed(0)}K</Text>
    <View style={styles.categoryProgressBar}>
      <View style={[styles.categoryProgressFill, { width: `${category.percentage}%`, backgroundColor: category.color }]} />
    </View>
  </Animated.View>
);

const SupplierCard = ({ supplier, index }: { supplier: Supplier; index: number }) => (
  <Animated.View entering={FadeInRight.delay(index * 40).springify()} style={styles.supplierCard}>
    <View style={styles.supplierHeader}>
      <Text style={styles.supplierName}>{supplier.name}</Text>
      <View style={[styles.supplierScore, { backgroundColor: supplier.performanceScore >= 90 ? '#D1FAE5' : '#FEF3C7' }]}>
        <Text style={[styles.supplierScoreText, { color: supplier.performanceScore >= 90 ? '#10B981' : '#F59E0B' }]}>{supplier.performanceScore}%</Text>
      </View>
    </View>
    <Text style={styles.supplierProducts}>{supplier.productsSupplied} products supplied</Text>
    <View style={styles.supplierStats}>
      <Text style={styles.supplierLeadTime}>Lead Time: {supplier.leadTime}</Text>
      <Text style={styles.supplierDelayed}>{supplier.delayedShipments} delayed shipments</Text>
    </View>
  </Animated.View>
);

const ActivityItem = ({ activity, index }: { activity: Activity; index: number }) => (
  <Animated.View entering={FadeInLeft.delay(index * 30).springify()} style={styles.activityItem}>
    <View style={styles.activityIcon}>
      <MaterialCommunityIcons name={activity.icon as any} size={16} color="#3B82F6" />
    </View>
    <View style={styles.activityContent}>
      <Text style={styles.activityDescription}>{activity.description}</Text>
      <View style={styles.activityMeta}>
        <Text style={styles.activityTime}>{activity.timestamp}</Text>
        <Text style={styles.activityStaff}>• {activity.performedBy}</Text>
      </View>
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
          <Text style={styles.aiInsightTitle}>AI Inventory Insights</Text>
          <Text style={styles.aiInsightMessage}>
            12 products may go out of stock within 7 days. Main Warehouse is operating at 92% capacity.
            Electronics inventory turnover increased by 18%. Inventory value grew by 11% this month.
          </Text>
        </View>
      </View>
    </LinearGradient>
  </Animated.View>
);

const InventoryCompliance = () => (
  <View style={styles.complianceContainer}>
    {[
      { label: 'Stock Levels Updated', completed: true },
      { label: 'Reorder Rules Configured', completed: true },
      { label: 'Warehouse Capacity Monitored', completed: true },
      { label: 'Supplier Data Synced', completed: false },
      { label: 'Inventory Audits Completed', completed: true },
      { label: 'Damaged Stock Reviewed', completed: false },
    ].map((item, index) => (
      <View key={index} style={styles.complianceItem}>
        <View style={[styles.complianceCircle, item.completed && styles.complianceCircleCompleted]}>
          {item.completed && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
        </View>
        <Text style={[styles.complianceLabel, item.completed && styles.complianceLabelCompleted]}>{item.label}</Text>
      </View>
    ))}
  </View>
);

// ============================================
// MAIN INVENTORY DASHBOARD SCREEN
// ============================================

export default function InventoryDashboardScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [notificationCount] = useState(3);
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

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      <Animated.View style={[styles.headerContainer, headerAnimatedStyle]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Inventory</Text>
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

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={['#3B82F6']} />}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* KPI Cards */}
        <FlatList
          data={kpis}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item, index }) => <KPICard data={item} index={index} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.kpiList}
          style={styles.kpiSection}
        />

        {/* Inventory Health Score */}
        <HealthScoreCard />

        {/* Search Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Feather name="search" size={20} color="#9CA3AF" />
            <TextInput
              placeholder="Search products, SKU, warehouse..."
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

        {/* Alert Center */}
        <View style={styles.alertsSection}>
          <SectionHeader title="Inventory Alerts" icon="bell" onAction={() => {}} actionText="View All" />
          {alerts.map((alert, index) => (
            <AlertCard key={alert.id} alert={alert} index={index} />
          ))}
        </View>

        {/* Warehouse Overview */}
        <View style={styles.warehouseSection}>
          <SectionHeader title="Warehouse Overview" icon="warehouse" onAction={() => {}} actionText="Manage" />
          <FlatList
            data={warehouses}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item, index }) => <WarehouseCard warehouse={item} index={index} />}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.warehouseList}
          />
        </View>

        {/* Top Inventory Products */}
        <View style={styles.topProductsSection}>
          <SectionHeader title="Highest Stock Products" icon="package-variant" onAction={() => {}} actionText="View All" />
          <FlatList
            data={topProducts}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item, index }) => <TopProductCard product={item} index={index} />}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.topProductsList}
          />
        </View>

        {/* Replenishment Center */}
        <View style={styles.replenishmentSection}>
          <SectionHeader title="Reorder Recommendations" icon="truck" onAction={() => {}} actionText="Create PO" />
          {replenishments.map((item, index) => (
            <ReplenishmentCard key={item.id} item={item} index={index} />
          ))}
        </View>

        {/* Category Distribution */}
        <View style={styles.categorySection}>
          <SectionHeader title="Inventory By Category" icon="chart-pie" showSeeAll={false} />
          <View style={styles.categoryContainer}>
            {categoryInventory.map((category, index) => (
              <CategoryRow key={category.id} category={category} index={index} />
            ))}
          </View>
        </View>

        {/* Inventory Valuation */}
        <View style={styles.valuationSection}>
          <SectionHeader title="Inventory Value Analysis" icon="currency-usd" showSeeAll={false} />
          <View style={styles.valuationContainer}>
            <View style={styles.valuationMetric}><Text style={styles.valuationLabel}>Total Value</Text><Text style={styles.valuationValue}>$2.45M</Text></View>
            <View style={styles.valuationMetric}><Text style={styles.valuationLabel}>Available</Text><Text style={styles.valuationValue}>$2.12M</Text></View>
            <View style={styles.valuationMetric}><Text style={styles.valuationLabel}>Reserved</Text><Text style={styles.valuationValue}>$198K</Text></View>
            <View style={styles.valuationMetric}><Text style={styles.valuationLabel}>Damaged</Text><Text style={styles.valuationValue}>$24K</Text></View>
          </View>
        </View>

        {/* Supplier Overview */}
        <View style={styles.supplierSection}>
          <SectionHeader title="Supplier Insights" icon="truck-fast" onAction={() => {}} actionText="Manage" />
          <FlatList
            data={suppliers}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item, index }) => <SupplierCard supplier={item} index={index} />}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.supplierList}
          />
        </View>

        {/* Recent Activities */}
        <View style={styles.activitySection}>
          <SectionHeader title="Activity Feed" icon="history" onAction={() => {}} actionText="View All" />
          <View style={styles.activityContainer}>
            {activities.map((activity, index) => (
              <ActivityItem key={activity.id} activity={activity} index={index} />
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <SectionHeader title="Quick Actions" icon="lightning-bolt" showSeeAll={false} />
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, index) => (
              <QuickActionCard key={action.id} action={action} index={index} />
            ))}
          </View>
        </View>

        {/* AI Insight Card */}
        <AIInsightCard />

        {/* Inventory Compliance */}
        <View style={styles.complianceSection}>
          <SectionHeader title="Inventory Readiness" icon="check-circle" showSeeAll={false} />
          <InventoryCompliance />
        </View>
      </Animated.ScrollView>

      {/* Sticky Bottom Action Bar */}
      <Animated.View entering={FadeInUp.springify()} style={[styles.bottomActionBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Add Inventory</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Create PO</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tertiaryButton}>
          <Text style={styles.tertiaryButtonText}>Stock Adjust</Text>
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
  scrollContent: {
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  sectionActionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3B82F6',
  },
  kpiSection: {
    marginBottom: 16,
  },
  kpiList: {
    paddingHorizontal: 12,
  },
  kpiWrapper: {
    width: 130,
    marginHorizontal: 4,
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  kpiIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  kpiTitle: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
  },
  kpiSubtitle: {
    fontSize: 9,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 2,
  },
  kpiTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  kpiTrendText: {
    fontSize: 8,
    fontWeight: '600',
    marginLeft: 2,
  },
  healthCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  healthTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  healthScore: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  healthScoreValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#10B981',
  },
  healthScoreMax: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  healthIndicator: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  healthIndicatorBar: {
    height: '100%',
    borderRadius: 4,
  },
  healthStatus: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
    marginBottom: 16,
  },
  healthBreakdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  healthMetric: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 12,
  },
  healthMetricLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  healthMetricValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
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
  alertsSection: {
    marginBottom: 16,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertInfo: {
    flex: 1,
  },
  alertType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  alertCount: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  alertSeverity: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  alertSeverityText: {
    fontSize: 9,
    fontWeight: '600',
  },
  alertAction: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  alertActionText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#3B82F6',
  },
  warehouseSection: {
    marginBottom: 16,
  },
  warehouseList: {
    paddingHorizontal: 12,
  },
  warehouseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    width: 200,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  warehouseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  warehouseName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  warehouseLocation: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  warehouseStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  warehouseStatusText: {
    fontSize: 9,
    fontWeight: '600',
  },
  warehouseStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  warehouseStat: {
    alignItems: 'center',
  },
  warehouseStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  warehouseStatLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  warehouseProgressBar: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  warehouseProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  topProductsSection: {
    marginBottom: 16,
  },
  topProductsList: {
    paddingHorizontal: 12,
  },
  topProductCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    width: 260,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  topProductImage: {
    width: 60,
    height: 60,
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
  topProductSku: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  topProductStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  topProductStock: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3B82F6',
  },
  topProductValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  topProductWarehouse: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
  },
  replenishmentSection: {
    marginBottom: 16,
  },
  replenishmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  replenishmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  replenishmentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  replenishmentUrgency: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
  },
  replenishmentUrgencyText: {
    fontSize: 9,
    fontWeight: '600',
  },
  replenishmentStats: {
    marginBottom: 12,
  },
  replenishmentStock: {
    fontSize: 12,
    color: '#6B7280',
  },
  replenishmentQty: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
    marginTop: 4,
  },
  replenishmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  replenishmentSupplier: {
    fontSize: 11,
    color: '#6B7280',
  },
  replenishmentButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  replenishmentButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  categorySection: {
    marginBottom: 16,
  },
  categoryContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 16,
  },
  categoryRow: {
    marginBottom: 12,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 8,
  },
  categoryCount: {
    fontSize: 11,
    color: '#6B7280',
  },
  categoryValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    textAlign: 'right',
    marginBottom: 4,
  },
  categoryProgressBar: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  valuationSection: {
    marginBottom: 16,
  },
  valuationContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 16,
    gap: 12,
  },
  valuationMetric: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  valuationLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  valuationValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  supplierSection: {
    marginBottom: 16,
  },
  supplierList: {
    paddingHorizontal: 12,
  },
  supplierCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    width: 220,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  supplierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  supplierName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  supplierScore: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  supplierScoreText: {
    fontSize: 10,
    fontWeight: '600',
  },
  supplierProducts: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 8,
  },
  supplierStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  supplierLeadTime: {
    fontSize: 10,
    color: '#3B82F6',
  },
  supplierDelayed: {
    fontSize: 10,
    color: '#EF4444',
  },
  activitySection: {
    marginBottom: 16,
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
  activityDescription: {
    fontSize: 13,
    color: '#1F2937',
  },
  activityMeta: {
    flexDirection: 'row',
    marginTop: 2,
  },
  activityTime: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  activityStaff: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  quickActionsSection: {
    marginBottom: 16,
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
  complianceSection: {
    marginBottom: 16,
  },
  complianceContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 16,
    gap: 12,
  },
  complianceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  complianceCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  complianceCircleCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  complianceLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  complianceLabelCompleted: {
    color: '#10B981',
    textDecorationLine: 'line-through',
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