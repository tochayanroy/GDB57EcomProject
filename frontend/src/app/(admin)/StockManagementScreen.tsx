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

interface StockKPI {
  id: string;
  title: string;
  value: string;
  icon: string;
  color: string;
  trend?: number;
  subtitle: string;
}

interface StockItem {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  brand: string;
  category: string;
  image: string;
  currentQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  minThreshold: number;
  maxThreshold: number;
  reorderLevel: number;
  warehouse: string;
  binLocation: string;
  storageZone: string;
  unitCost: number;
  sellingPrice: number;
  inventoryValue: number;
  profitMargin: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock' | 'reserved';
  lastUpdated: string;
  lastAuditDate: string;
  supplier: string;
}

interface Alert {
  id: string;
  type: 'low_stock' | 'out_of_stock' | 'critical' | 'overstock' | 'damaged' | 'expired' | 'audit';
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: string;
}

interface Warehouse {
  id: string;
  name: string;
  inventory: number;
  capacity: number;
  occupancy: number;
  value: number;
}

interface StockMovement {
  id: string;
  type: 'added' | 'removed' | 'adjusted' | 'damaged' | 'returned' | 'reconciled';
  quantity: number;
  reason: string;
  date: string;
  performedBy: string;
}

interface Replenishment {
  id: string;
  name: string;
  currentQuantity: number;
  reorderLevel: number;
  recommendedQty: number;
  supplier: string;
  leadTime: string;
}

interface Audit {
  id: string;
  name: string;
  warehouse: string;
  status: 'pending' | 'in_progress' | 'completed';
  assignedStaff: string;
  dueDate: string;
}

interface SupplierStock {
  id: string;
  name: string;
  productsSupplied: number;
  stockCoverage: string;
  leadTime: string;
  performanceScore: number;
}

interface Activity {
  id: string;
  type: 'stock_update' | 'transfer' | 'audit' | 'restock' | 'adjustment' | 'delivery';
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

const stockKpis: StockKPI[] = [
  { id: '1', title: 'Total SKUs', value: '12,458', icon: 'package-variant', color: '#3B82F6', trend: 5.2, subtitle: '+587 this month' },
  { id: '2', title: 'Available Stock', value: '189,234', icon: 'check-circle', color: '#10B981', trend: 8.4, subtitle: '+12,345 units' },
  { id: '3', title: 'Reserved Stock', value: '56,658', icon: 'clock', color: '#F59E0B', trend: 3.2, subtitle: 'Pending orders' },
  { id: '4', title: 'Low Stock', value: '48', icon: 'alert-circle', color: '#EF4444', trend: -5.2, subtitle: '12 critical' },
  { id: '5', title: 'Out of Stock', value: '23', icon: 'close-circle', color: '#DC2626', trend: -8.1, subtitle: 'Need restock' },
  { id: '6', title: 'Overstock', value: '156', icon: 'package-up', color: '#8B5CF6', trend: 15.3, subtitle: '+34 items' },
  { id: '7', title: 'Stock Value', value: '$2.45M', icon: 'currency-usd', color: '#06B6D4', trend: 12.3, subtitle: '+$267K' },
  { id: '8', title: 'Pending Restocks', value: '89', icon: 'truck', color: '#EC4899', trend: 0, subtitle: 'ETA this week' },
];

const stockItems: StockItem[] = [
  {
    id: '1', name: 'Premium Wireless Headphones Pro', sku: 'SKU-1001', barcode: '8901234567890',
    brand: 'Sony', category: 'Electronics', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200',
    currentQuantity: 2450, availableQuantity: 2350, reservedQuantity: 100, minThreshold: 200, maxThreshold: 3000,
    reorderLevel: 250, warehouse: 'Main Warehouse', binLocation: 'A-12-34', storageZone: 'Zone A',
    unitCost: 89.99, sellingPrice: 299.99, inventoryValue: 220500, profitMargin: 70,
    status: 'in_stock', lastUpdated: '2024-06-15', lastAuditDate: '2024-06-01', supplier: 'TechSupply Co',
  },
  {
    id: '2', name: 'Smart Watch Ultra', sku: 'SKU-1002', barcode: '8901234567891',
    brand: 'Apple', category: 'Electronics', image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=200',
    currentQuantity: 1890, availableQuantity: 1790, reservedQuantity: 100, minThreshold: 150, maxThreshold: 2500,
    reorderLevel: 200, warehouse: 'Main Warehouse', binLocation: 'A-12-35', storageZone: 'Zone A',
    unitCost: 249.99, sellingPrice: 449.99, inventoryValue: 850500, profitMargin: 44,
    status: 'in_stock', lastUpdated: '2024-06-14', lastAuditDate: '2024-06-01', supplier: 'TechSupply Co',
  },
  {
    id: '3', name: 'Premium Cotton T-Shirt', sku: 'SKU-2001', barcode: '8901234567892',
    brand: 'Nike', category: 'Fashion', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200',
    currentQuantity: 3450, availableQuantity: 3350, reservedQuantity: 100, minThreshold: 500, maxThreshold: 5000,
    reorderLevel: 600, warehouse: 'West Coast DC', binLocation: 'B-05-12', storageZone: 'Zone B',
    unitCost: 12.99, sellingPrice: 39.99, inventoryValue: 138000, profitMargin: 67,
    status: 'in_stock', lastUpdated: '2024-06-13', lastAuditDate: '2024-05-28', supplier: 'Fashion Hub',
  },
  {
    id: '4', name: 'Leather Backpack', sku: 'SKU-3001', barcode: '8901234567893',
    brand: 'Coach', category: 'Accessories', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200',
    currentQuantity: 45, availableQuantity: 35, reservedQuantity: 10, minThreshold: 80, maxThreshold: 500,
    reorderLevel: 100, warehouse: 'South Hub', binLocation: 'C-08-22', storageZone: 'Zone C',
    unitCost: 45.99, sellingPrice: 79.99, inventoryValue: 3600, profitMargin: 42,
    status: 'low_stock', lastUpdated: '2024-06-12', lastAuditDate: '2024-05-25', supplier: 'Luxury Goods Co',
  },
  {
    id: '5', name: 'Running Shoes Pro', sku: 'SKU-4001', barcode: '8901234567894',
    brand: 'Adidas', category: 'Sports', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200',
    currentQuantity: 23, availableQuantity: 18, reservedQuantity: 5, minThreshold: 100, maxThreshold: 800,
    reorderLevel: 120, warehouse: 'West Coast DC', binLocation: 'D-02-08', storageZone: 'Zone D',
    unitCost: 34.99, sellingPrice: 99.99, inventoryValue: 2300, profitMargin: 65,
    status: 'out_of_stock', lastUpdated: '2024-06-10', lastAuditDate: '2024-05-20', supplier: 'Footwear Direct',
  },
];

const alerts: Alert[] = [
  { id: '1', type: 'low_stock', count: 48, severity: 'high', action: 'Restock Now' },
  { id: '2', type: 'out_of_stock', count: 23, severity: 'critical', action: 'Create PO' },
  { id: '3', type: 'critical', count: 12, severity: 'critical', action: 'Urgent Action' },
  { id: '4', type: 'overstock', count: 156, severity: 'medium', action: 'Review' },
  { id: '5', type: 'damaged', count: 18, severity: 'medium', action: 'Inspect' },
  { id: '6', type: 'expired', count: 5, severity: 'high', action: 'Dispose' },
];

const warehouses: Warehouse[] = [
  { id: '1', name: 'Main Warehouse', inventory: 124500, capacity: 150000, occupancy: 83, value: 1245000 },
  { id: '2', name: 'West Coast DC', inventory: 89200, capacity: 100000, occupancy: 89, value: 892000 },
  { id: '3', name: 'South Hub', inventory: 34200, capacity: 62000, occupancy: 55, value: 342000 },
];

const stockMovements: StockMovement[] = [
  { id: '1', type: 'added', quantity: 500, reason: 'New shipment received', date: '2024-06-15', performedBy: 'Sarah Chen' },
  { id: '2', type: 'removed', quantity: 234, reason: 'Customer orders', date: '2024-06-14', performedBy: 'System' },
  { id: '3', type: 'adjusted', quantity: -12, reason: 'Damaged items', date: '2024-06-13', performedBy: 'Mike Johnson' },
  { id: '4', type: 'returned', quantity: 45, reason: 'Customer return', date: '2024-06-12', performedBy: 'Lisa Wong' },
  { id: '5', type: 'reconciled', quantity: 23, reason: 'Inventory audit correction', date: '2024-06-11', performedBy: 'John Smith' },
];

const replenishments: Replenishment[] = [
  { id: '1', name: 'Smart Watch Ultra', currentQuantity: 45, reorderLevel: 100, recommendedQty: 500, supplier: 'TechSupply Co', leadTime: '5 days' },
  { id: '2', name: 'Premium Wireless Headphones', currentQuantity: 78, reorderLevel: 150, recommendedQty: 400, supplier: 'AudioTech', leadTime: '7 days' },
  { id: '3', name: 'Running Shoes Pro', currentQuantity: 23, reorderLevel: 80, recommendedQty: 300, supplier: 'Footwear Direct', leadTime: '10 days' },
  { id: '4', name: 'Leather Backpack', currentQuantity: 12, reorderLevel: 50, recommendedQty: 150, supplier: 'Luxury Goods Co', leadTime: '14 days' },
];

const audits: Audit[] = [
  { id: '1', name: 'Monthly Inventory Audit', warehouse: 'Main Warehouse', status: 'pending', assignedStaff: 'Sarah Chen', dueDate: '2024-06-30' },
  { id: '2', name: 'Quarterly Stock Take', warehouse: 'West Coast DC', status: 'in_progress', assignedStaff: 'Mike Johnson', dueDate: '2024-06-25' },
  { id: '3', name: 'Electronics Category Audit', warehouse: 'South Hub', status: 'completed', assignedStaff: 'Lisa Wong', dueDate: '2024-06-20' },
];

const supplierStocks: SupplierStock[] = [
  { id: '1', name: 'TechSupply Co', productsSupplied: 124, stockCoverage: '45 days', leadTime: '5 days', performanceScore: 96 },
  { id: '2', name: 'AudioTech', productsSupplied: 89, stockCoverage: '38 days', leadTime: '7 days', performanceScore: 92 },
  { id: '3', name: 'Footwear Direct', productsSupplied: 156, stockCoverage: '28 days', leadTime: '10 days', performanceScore: 88 },
  { id: '4', name: 'Fashion Hub', productsSupplied: 234, stockCoverage: '52 days', leadTime: '8 days', performanceScore: 94 },
];

const activities: Activity[] = [
  { id: '1', type: 'stock_update', description: 'Stock updated for 24 products', timestamp: '10 minutes ago', performedBy: 'System', icon: 'refresh' },
  { id: '2', type: 'restock', description: 'Restocked 500 units of Smart Watch Ultra', timestamp: '1 hour ago', performedBy: 'Sarah Chen', icon: 'package' },
  { id: '3', type: 'transfer', description: 'Transferred 200 units to West Coast DC', timestamp: '3 hours ago', performedBy: 'Mike Johnson', icon: 'truck' },
  { id: '4', type: 'adjustment', description: 'Inventory adjustment for damaged items', timestamp: '5 hours ago', performedBy: 'Lisa Wong', icon: 'clipboard' },
  { id: '5', type: 'audit', description: 'Completed quarterly inventory audit', timestamp: '1 day ago', performedBy: 'John Smith', icon: 'file-check' },
];

const quickActions: QuickAction[] = [
  { id: '1', title: 'Add Stock', icon: 'plus-circle', color: '#3B82F6' },
  { id: '2', title: 'Adjust Stock', icon: 'clipboard-list', color: '#10B981' },
  { id: '3', title: 'Transfer', icon: 'swap-horizontal', color: '#8B5CF6' },
  { id: '4', title: 'Create PO', icon: 'file-document', color: '#F59E0B' },
  { id: '5', title: 'Audit', icon: 'clipboard-check', color: '#EC4899' },
  { id: '6', title: 'Warehouses', icon: 'warehouse', color: '#06B6D4' },
  { id: '7', title: 'Export', icon: 'download', color: '#6366F1' },
  { id: '8', title: 'Settings', icon: 'cog', color: '#6B7280' },
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

const KPICard = ({ data, index }: { data: StockKPI; index: number }) => {
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

const StockStatusBadge = ({ status }: { status: StockItem['status'] }) => {
  const config = {
    in_stock: { label: 'In Stock', color: '#10B981', bg: '#D1FAE5' },
    low_stock: { label: 'Low Stock', color: '#F59E0B', bg: '#FEF3C7' },
    out_of_stock: { label: 'Out of Stock', color: '#EF4444', bg: '#FEE2E2' },
    overstock: { label: 'Overstock', color: '#8B5CF6', bg: '#EDE9FE' },
    reserved: { label: 'Reserved', color: '#3B82F6', bg: '#DBEAFE' },
  };
  const { label, color, bg } = config[status];
  return (
    <View style={[styles.stockStatusBadge, { backgroundColor: bg }]}>
      <Text style={[styles.stockStatusText, { color }]}>{label}</Text>
    </View>
  );
};

const StockItemCard = ({ item, index }: { item: StockItem; index: number }) => (
  <Animated.View entering={FadeInUp.delay(index * 30).springify()} style={styles.stockItemCard}>
    <View style={styles.stockItemHeader}>
      <Image source={{ uri: item.image }} style={styles.stockItemImage} />
      <View style={styles.stockItemInfo}>
        <Text style={styles.stockItemName}>{item.name}</Text>
        <Text style={styles.stockItemSku}>SKU: {item.sku} • {item.brand}</Text>
        <View style={styles.stockItemStatus}>
          <StockStatusBadge status={item.status} />
          <Text style={styles.stockItemWarehouse}>{item.warehouse}</Text>
        </View>
      </View>
    </View>
    <View style={styles.stockQuantitySection}>
      <View style={styles.stockQuantityRow}>
        <Text style={styles.stockQuantityLabel}>Current:</Text>
        <Text style={[styles.stockQuantityValue, { color: item.currentQuantity < item.minThreshold ? '#EF4444' : '#1F2937' }]}>
          {item.currentQuantity.toLocaleString()}
        </Text>
      </View>
      <View style={styles.stockQuantityRow}>
        <Text style={styles.stockQuantityLabel}>Available:</Text>
        <Text style={styles.stockQuantityValue}>{item.availableQuantity.toLocaleString()}</Text>
      </View>
      <View style={styles.stockQuantityRow}>
        <Text style={styles.stockQuantityLabel}>Reserved:</Text>
        <Text style={styles.stockQuantityValue}>{item.reservedQuantity.toLocaleString()}</Text>
      </View>
      <View style={styles.stockQuantityRow}>
        <Text style={styles.stockQuantityLabel}>Min/Max:</Text>
        <Text style={styles.stockQuantityValue}>{item.minThreshold} / {item.maxThreshold}</Text>
      </View>
    </View>
    <View style={styles.stockProgressBar}>
      <View style={[styles.stockProgressFill, { width: `${(item.currentQuantity / item.maxThreshold) * 100}%`, backgroundColor: item.currentQuantity < item.minThreshold ? '#EF4444' : item.currentQuantity > item.maxThreshold * 0.9 ? '#F59E0B' : '#10B981' }]} />
    </View>
    <View style={styles.stockItemFooter}>
      <View>
        <Text style={styles.stockItemValue}>Value: ${item.inventoryValue.toLocaleString()}</Text>
        <Text style={styles.stockItemUpdated}>Updated: {item.lastUpdated}</Text>
      </View>
      <View style={styles.stockItemActions}>
        <TouchableOpacity style={styles.stockActionButton}>
          <MaterialCommunityIcons name="pencil" size={16} color="#3B82F6" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.stockActionButton}>
          <MaterialCommunityIcons name="swap-horizontal" size={16} color="#8B5CF6" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.stockActionButton}>
          <Ionicons name="ellipsis-horizontal" size={16} color="#6B7280" />
        </TouchableOpacity>
      </View>
    </View>
  </Animated.View>
);

const AlertCard = ({ alert, index }: { alert: Alert; index: number }) => {
  const getTypeConfig = () => {
    switch (alert.type) {
      case 'low_stock': return { label: 'Low Stock', icon: 'alert-circle', color: '#F59E0B' };
      case 'out_of_stock': return { label: 'Out of Stock', icon: 'close-circle', color: '#EF4444' };
      case 'critical': return { label: 'Critical Stock', icon: 'alert-octagon', color: '#DC2626' };
      case 'overstock': return { label: 'Overstock', icon: 'package-up', color: '#8B5CF6' };
      case 'damaged': return { label: 'Damaged', icon: 'package-variant-closed', color: '#6B7280' };
      case 'expired': return { label: 'Expired', icon: 'calendar-remove', color: '#DC2626' };
      default: return { label: 'Audit', icon: 'clipboard', color: '#3B82F6' };
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
      <Text style={styles.warehouseName}>{warehouse.name}</Text>
      <Text style={styles.warehouseValue}>${(warehouse.value / 1000).toFixed(0)}K</Text>
    </View>
    <View style={styles.warehouseStats}>
      <View style={styles.warehouseStat}>
        <Text style={styles.warehouseStatValue}>{warehouse.inventory.toLocaleString()}</Text>
        <Text style={styles.warehouseStatLabel}>Units</Text>
      </View>
      <View style={styles.warehouseStat}>
        <Text style={styles.warehouseStatValue}>{warehouse.occupancy}%</Text>
        <Text style={styles.warehouseStatLabel}>Occupancy</Text>
      </View>
    </View>
    <View style={styles.warehouseProgressBar}>
      <View style={[styles.warehouseProgressFill, { width: `${warehouse.occupancy}%`, backgroundColor: warehouse.occupancy > 85 ? '#EF4444' : warehouse.occupancy > 70 ? '#F59E0B' : '#10B981' }]} />
    </View>
  </Animated.View>
);

const ReplenishmentCard = ({ item, index }: { item: Replenishment; index: number }) => (
  <Animated.View entering={FadeInLeft.delay(index * 50).springify()} style={styles.replenishmentCard}>
    <View style={styles.replenishmentHeader}>
      <Text style={styles.replenishmentName}>{item.name}</Text>
      <View style={[styles.replenishmentUrgency, { backgroundColor: item.currentQuantity < item.reorderLevel ? '#FEE2E2' : '#FEF3C7' }]}>
        <Text style={[styles.replenishmentUrgencyText, { color: item.currentQuantity < item.reorderLevel ? '#EF4444' : '#F59E0B' }]}>
          {item.currentQuantity < item.reorderLevel ? 'Urgent' : 'Plan'}
        </Text>
      </View>
    </View>
    <View style={styles.replenishmentStats}>
      <Text style={styles.replenishmentStock}>Current: {item.currentQuantity} / Reorder: {item.reorderLevel}</Text>
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

const AuditCard = ({ audit, index }: { audit: Audit; index: number }) => (
  <Animated.View entering={FadeInRight.delay(index * 40).springify()} style={styles.auditCard}>
    <View style={styles.auditHeader}>
      <Text style={styles.auditName}>{audit.name}</Text>
      <View style={[styles.auditStatus, { backgroundColor: audit.status === 'completed' ? '#D1FAE5' : audit.status === 'in_progress' ? '#FEF3C7' : '#FEE2E2' }]}>
        <Text style={[styles.auditStatusText, { color: audit.status === 'completed' ? '#10B981' : audit.status === 'in_progress' ? '#F59E0B' : '#EF4444' }]}>
          {audit.status === 'completed' ? 'Completed' : audit.status === 'in_progress' ? 'In Progress' : 'Pending'}
        </Text>
      </View>
    </View>
    <Text style={styles.auditWarehouse}>{audit.warehouse}</Text>
    <View style={styles.auditFooter}>
      <Text style={styles.auditStaff}>Assigned: {audit.assignedStaff}</Text>
      <Text style={styles.auditDueDate}>Due: {audit.dueDate}</Text>
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
          <Text style={styles.aiInsightTitle}>AI Stock Intelligence</Text>
          <Text style={styles.aiInsightMessage}>
            15 products expected to run out of stock within 5 days. Main Warehouse approaching maximum capacity.
            Inventory turnover improved by 12% this month. Current stock coverage sufficient for next 21 days.
          </Text>
        </View>
      </View>
    </LinearGradient>
  </Animated.View>
);

const StockHealthScore = () => (
  <View style={styles.healthCard}>
    <View style={styles.healthHeader}>
      <Text style={styles.healthTitle}>Stock Health</Text>
      <View style={styles.healthScore}>
        <Text style={styles.healthScoreValue}>91</Text>
        <Text style={styles.healthScoreMax}>/100</Text>
      </View>
    </View>
    <View style={styles.healthIndicator}>
      <View style={[styles.healthIndicatorBar, { width: '91%', backgroundColor: '#10B981' }]} />
    </View>
    <Text style={styles.healthStatus}>Excellent - Above Target</Text>
    <View style={styles.healthBreakdown}>
      <View style={styles.healthMetric}><Text style={styles.healthMetricLabel}>Stock Availability</Text><Text style={styles.healthMetricValue}>94%</Text></View>
      <View style={styles.healthMetric}><Text style={styles.healthMetricLabel}>Restock Readiness</Text><Text style={styles.healthMetricValue}>88%</Text></View>
      <View style={styles.healthMetric}><Text style={styles.healthMetricLabel}>Inventory Accuracy</Text><Text style={styles.healthMetricValue}>96%</Text></View>
      <View style={styles.healthMetric}><Text style={styles.healthMetricLabel}>Stock Turnover</Text><Text style={styles.healthMetricValue}>4.2x</Text></View>
    </View>
  </View>
);

// ============================================
// MAIN STOCK MANAGEMENT SCREEN
// ============================================

export default function StockManagementScreen() {
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

  const filteredStock = stockItems.filter(item => {
    if (selectedFilter !== 'all') {
      if (selectedFilter === 'low_stock' && item.status !== 'low_stock') return false;
      if (selectedFilter === 'out_of_stock' && item.status !== 'out_of_stock') return false;
      if (selectedFilter === 'overstock' && item.status !== 'overstock') return false;
    }
    if (searchText) {
      const query = searchText.toLowerCase();
      return item.name.toLowerCase().includes(query) || item.sku.toLowerCase().includes(query);
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      <Animated.View style={[styles.headerContainer, headerAnimatedStyle]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Stock Management</Text>
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
          data={stockKpis}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item, index }) => <KPICard data={item} index={index} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.kpiList}
          style={styles.kpiSection}
        />

        {/* Stock Health Score */}
        <StockHealthScore />

        {/* Search Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Feather name="search" size={20} color="#9CA3AF" />
            <TextInput
              placeholder="Search products, SKU, barcode..."
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

        {/* Stock Alerts Center */}
        <View style={styles.alertsSection}>
          <SectionHeader title="Stock Alerts" icon="bell" onAction={() => {}} actionText="View All" />
          {alerts.map((alert, index) => (
            <AlertCard key={alert.id} alert={alert} index={index} />
          ))}
        </View>

        {/* Inventory Stock List */}
        <View style={styles.stockListSection}>
          <SectionHeader title="Stock Inventory" icon="package-variant" count={filteredStock.length} />
          {filteredStock.map((item, index) => (
            <StockItemCard key={item.id} item={item} index={index} />
          ))}
        </View>

        {/* Stock Movements */}
        <View style={styles.movementsSection}>
          <SectionHeader title="Recent Stock Adjustments" icon="history" onAction={() => {}} actionText="View All" />
          <View style={styles.movementsContainer}>
            {stockMovements.map((movement, index) => (
              <View key={movement.id} style={styles.movementItem}>
                <View style={styles.movementIcon}>
                  <MaterialCommunityIcons name={movement.type === 'added' ? 'arrow-up' : movement.type === 'removed' ? 'arrow-down' : movement.type === 'adjusted' ? 'pencil' : movement.type === 'returned' ? 'refresh' : 'clipboard'} size={14} color="#3B82F6" />
                </View>
                <View style={styles.movementContent}>
                  <Text style={styles.movementText}>
                    {movement.type === 'added' ? '+' : movement.type === 'removed' ? '-' : ''}{movement.quantity} units • {movement.reason}
                  </Text>
                  <View style={styles.movementMeta}>
                    <Text style={styles.movementDate}>{movement.date}</Text>
                    <Text style={styles.movementStaff}>• {movement.performedBy}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Warehouse Distribution */}
        <View style={styles.warehouseSection}>
          <SectionHeader title="Warehouse Distribution" icon="warehouse" onAction={() => {}} actionText="Manage" />
          <FlatList
            data={warehouses}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item, index }) => <WarehouseCard warehouse={item} index={index} />}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.warehouseList}
          />
        </View>

        {/* Replenishment Center */}
        <View style={styles.replenishmentSection}>
          <SectionHeader title="Restock Recommendations" icon="truck" onAction={() => {}} actionText="Create PO" />
          {replenishments.map((item, index) => (
            <ReplenishmentCard key={item.id} item={item} index={index} />
          ))}
        </View>

        {/* Inventory Audit */}
        <View style={styles.auditSection}>
          <SectionHeader title="Audit Management" icon="clipboard-check" onAction={() => {}} actionText="Start Audit" />
          {audits.map((audit, index) => (
            <AuditCard key={audit.id} audit={audit} index={index} />
          ))}
        </View>

        {/* Supplier Stock Overview */}
        <View style={styles.supplierSection}>
          <SectionHeader title="Supplier Inventory Insights" icon="truck-fast" onAction={() => {}} actionText="View All" />
          <FlatList
            data={supplierStocks}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <View style={styles.supplierCard}>
                <Text style={styles.supplierName}>{item.name}</Text>
                <Text style={styles.supplierProducts}>{item.productsSupplied} products</Text>
                <Text style={styles.supplierCoverage}>Coverage: {item.stockCoverage}</Text>
                <View style={styles.supplierFooter}>
                  <Text style={styles.supplierLeadTime}>Lead: {item.leadTime}</Text>
                  <View style={[styles.supplierScore, { backgroundColor: item.performanceScore >= 90 ? '#D1FAE5' : '#FEF3C7' }]}>
                    <Text style={[styles.supplierScoreText, { color: item.performanceScore >= 90 ? '#10B981' : '#F59E0B' }]}>{item.performanceScore}%</Text>
                  </View>
                </View>
              </View>
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.supplierList}
          />
        </View>

        {/* Recent Activities */}
        <View style={styles.activitySection}>
          <SectionHeader title="Stock Activity Feed" icon="history" onAction={() => {}} actionText="View All" />
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

        {/* Stock Compliance & Readiness */}
        <View style={styles.complianceSection}>
          <SectionHeader title="Inventory Readiness" icon="check-circle" showSeeAll={false} />
          <View style={styles.complianceContainer}>
            {[
              { label: 'Stock Levels Updated', completed: true },
              { label: 'Audit Records Current', completed: true },
              { label: 'Reorder Rules Configured', completed: true },
              { label: 'Warehouse Capacity Monitored', completed: true },
              { label: 'Supplier Data Synced', completed: false },
              { label: 'Inventory Valuation Updated', completed: true },
            ].map((item, index) => (
              <View key={index} style={styles.complianceItem}>
                <View style={[styles.complianceCircle, item.completed && styles.complianceCircleCompleted]}>
                  {item.completed && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
                </View>
                <Text style={[styles.complianceLabel, item.completed && styles.complianceLabelCompleted]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </Animated.ScrollView>

      {/* Sticky Bottom Action Bar */}
      <Animated.View entering={FadeInUp.springify()} style={[styles.bottomActionBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Adjust Stock</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Transfer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tertiaryButton}>
          <Text style={styles.tertiaryButtonText}>Create PO</Text>
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
  stockListSection: {
    marginBottom: 16,
  },
  stockItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  stockItemHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  stockItemImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
  },
  stockItemInfo: {
    flex: 1,
  },
  stockItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  stockItemSku: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  stockItemStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  stockStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  stockStatusText: {
    fontSize: 9,
    fontWeight: '600',
  },
  stockItemWarehouse: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  stockQuantitySection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  stockQuantityRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  stockQuantityLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  stockQuantityValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  stockProgressBar: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  stockProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  stockItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  stockItemValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  stockItemUpdated: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  stockItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  stockActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  movementsSection: {
    marginBottom: 16,
  },
  movementsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 8,
  },
  movementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  movementIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  movementContent: {
    flex: 1,
  },
  movementText: {
    fontSize: 13,
    color: '#1F2937',
  },
  movementMeta: {
    flexDirection: 'row',
    marginTop: 2,
  },
  movementDate: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  movementStaff: {
    fontSize: 10,
    color: '#9CA3AF',
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
    width: 180,
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
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  warehouseValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
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
    fontSize: 16,
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
  auditSection: {
    marginBottom: 16,
  },
  auditCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
  },
  auditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  auditName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  auditStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  auditStatusText: {
    fontSize: 9,
    fontWeight: '600',
  },
  auditWarehouse: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 8,
  },
  auditFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  auditStaff: {
    fontSize: 10,
    color: '#3B82F6',
  },
  auditDueDate: {
    fontSize: 10,
    color: '#EF4444',
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
    width: 200,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  supplierName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  supplierProducts: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  supplierCoverage: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 8,
  },
  supplierFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  supplierLeadTime: {
    fontSize: 10,
    color: '#3B82F6',
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