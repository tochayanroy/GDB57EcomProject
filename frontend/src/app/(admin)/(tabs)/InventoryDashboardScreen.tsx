import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
// API CONFIGURATION
// ============================================

const API_BASE_URL = 'http://10.225.180.27:5000';

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

interface InventoryStats {
    totalProducts: number;
    totalStockUnits: number;
    totalInventoryValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    overstockCount: number;
    pendingRestocks: number;
    warehouseUtilization: number;
}

// ============================================
// API SERVICE FUNCTIONS
// ============================================

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
});

// Add token to requests
apiClient.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// API Functions
const fetchInventoryStats = async (): Promise<InventoryStats> => {
    try {
        const response = await apiClient.get('/Product/admin/stats');
        if (response.data.success) {
            const data = response.data.data;
            return {
                totalProducts: data.totalProducts || 0,
                totalStockUnits: data.totalStockUnits || 0,
                totalInventoryValue: data.totalInventoryValue || 0,
                lowStockCount: data.lowStock || 0,
                outOfStockCount: data.outOfStock || 0,
                overstockCount: data.overstockCount || 0,
                pendingRestocks: data.pendingRestocks || 0,
                warehouseUtilization: data.warehouseUtilization || 0,
            };
        }
        throw new Error('Failed to fetch inventory stats');
    } catch (error) {
        console.error('Error fetching inventory stats:', error);
        throw error;
    }
};

const fetchLowStockProducts = async (limit: number = 10): Promise<TopProduct[]> => {
    try {
        const response = await apiClient.get(`/Product/admin/low-stock?threshold=10&limit=${limit}`);
        if (response.data.success) {
            return response.data.data.map((product: any) => ({
                id: product._id,
                name: product.name,
                sku: product.sku || `SKU-${product._id.slice(0, 6)}`,
                stock: product.stock || 0,
                warehouse: product.warehouse || 'Main',
                value: (product.stock || 0) * (product.discountPrice || product.price || 0),
                image: product.images?.[0]?.url || 'https://via.placeholder.com/200',
            }));
        }
        throw new Error('Failed to fetch low stock products');
    } catch (error) {
        console.error('Error fetching low stock products:', error);
        throw error;
    }
};

const fetchTopProductsByStock = async (limit: number = 5): Promise<TopProduct[]> => {
    try {
        const response = await apiClient.get('/Product/admin/top-selling?limit=10');
        if (response.data.success) {
            return response.data.data.slice(0, limit).map((product: any) => ({
                id: product._id,
                name: product.name,
                sku: product.sku || `SKU-${product._id.slice(0, 6)}`,
                stock: product.stock || 0,
                warehouse: product.warehouse || 'Main',
                value: (product.stock || 0) * (product.discountPrice || product.price || 0),
                image: product.images?.[0]?.url || 'https://via.placeholder.com/200',
            }));
        }
        throw new Error('Failed to fetch top products');
    } catch (error) {
        console.error('Error fetching top products:', error);
        throw error;
    }
};

const fetchCategoryDistribution = async (): Promise<CategoryInventory[]> => {
    try {
        const response = await apiClient.get('/Category/admin/stats');
        if (response.data.success) {
            const data = response.data.data;
            const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#EC4899', '#F59E0B', '#06B6D4'];
            return data.categoryStats.map((cat: any, index: number) => ({
                id: cat._id || `cat-${index}`,
                name: cat.name || 'Uncategorized',
                stockCount: cat.productCount || 0,
                value: (cat.productCount || 0) * 100, // Placeholder value
                percentage: cat.percentage || 0,
                color: colors[index % colors.length],
            }));
        }
        throw new Error('Failed to fetch category distribution');
    } catch (error) {
        console.error('Error fetching category distribution:', error);
        throw error;
    }
};

const fetchRecentActivities = async (limit: number = 6): Promise<Activity[]> => {
    try {
        const response = await apiClient.get('/Order/admin/orders?page=1&limit=10&sort=-createdAt');
        if (response.data.success) {
            const orders = response.data.data;
            return orders.slice(0, limit).map((order: any) => ({
                id: order._id,
                type: 'order',
                description: `New order ${order.orderId} received from ${order.addresses?.[0]?.fullName || 'Unknown'}`,
                timestamp: new Date(order.createdAt).toLocaleString(),
                performedBy: 'Customer',
                icon: 'cart',
            }));
        }
        throw new Error('Failed to fetch activities');
    } catch (error) {
        console.error('Error fetching activities:', error);
        return [];
    }
};

const fetchSuppliers = async (limit: number = 5): Promise<Supplier[]> => {
    try {
        // This is a placeholder - you'll need to create a supplier endpoint
        // For now, return mock data based on products
        const response = await apiClient.get('/Product/admin/stats');
        if (response.data.success) {
            const data = response.data.data;
            // Create mock suppliers based on product data
            return [
                { id: '1', name: 'TechSupply Co', productsSupplied: Math.floor(data.totalProducts * 0.3), leadTime: '5 days', performanceScore: 96, delayedShipments: 2 },
                { id: '2', name: 'AudioTech', productsSupplied: Math.floor(data.totalProducts * 0.2), leadTime: '7 days', performanceScore: 92, delayedShipments: 3 },
                { id: '3', name: 'Footwear Direct', productsSupplied: Math.floor(data.totalProducts * 0.15), leadTime: '10 days', performanceScore: 88, delayedShipments: 5 },
                { id: '4', name: 'Fashion Hub', productsSupplied: Math.floor(data.totalProducts * 0.25), leadTime: '8 days', performanceScore: 94, delayedShipments: 2 },
            ];
        }
        throw new Error('Failed to fetch suppliers');
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        throw error;
    }
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

const HealthScoreCard = ({ stats }: { stats: InventoryStats }) => {
    const healthScore = Math.min(100, Math.round(
        (1 - (stats.lowStockCount + stats.outOfStockCount) / (stats.totalProducts || 1)) * 100
    ));

    return (
        <View style={styles.healthCard}>
            <View style={styles.healthHeader}>
                <Text style={styles.healthTitle}>Inventory Health</Text>
                <View style={styles.healthScore}>
                    <Text style={styles.healthScoreValue}>{healthScore}</Text>
                    <Text style={styles.healthScoreMax}>/100</Text>
                </View>
            </View>
            <View style={styles.healthIndicator}>
                <View style={[styles.healthIndicatorBar, { 
                    width: `${healthScore}%`, 
                    backgroundColor: healthScore > 80 ? '#10B981' : healthScore > 60 ? '#F59E0B' : '#EF4444' 
                }]} />
            </View>
            <Text style={[styles.healthStatus, { 
                color: healthScore > 80 ? '#10B981' : healthScore > 60 ? '#F59E0B' : '#EF4444' 
            }]}>
                {healthScore > 80 ? 'Excellent - Above Target' : healthScore > 60 ? 'Good - Monitor Closely' : 'Needs Attention'}
            </Text>
            <View style={styles.healthBreakdown}>
                <View style={styles.healthMetric}><Text style={styles.healthMetricLabel}>Stock Availability</Text><Text style={styles.healthMetricValue}>{((stats.totalProducts - stats.outOfStockCount) / (stats.totalProducts || 1) * 100).toFixed(0)}%</Text></View>
                <View style={styles.healthMetric}><Text style={styles.healthMetricLabel}>Warehouse Efficiency</Text><Text style={styles.healthMetricValue}>{stats.warehouseUtilization}%</Text></View>
                <View style={styles.healthMetric}><Text style={styles.healthMetricLabel}>Replenishment Readiness</Text><Text style={styles.healthMetricValue}>{Math.min(100, Math.round((1 - stats.lowStockCount / (stats.totalProducts || 1)) * 100))}%</Text></View>
                <View style={styles.healthMetric}><Text style={styles.healthMetricLabel}>Inventory Turnover</Text><Text style={styles.healthMetricValue}>4.2x</Text></View>
            </View>
        </View>
    );
};

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
        <Image source={{ uri: product.image ? `${API_BASE_URL}${product.image}` : 'https://via.placeholder.com/200' }} style={styles.topProductImage} />
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
            <View style={[styles.categoryProgressFill, { width: `${Math.min(category.percentage, 100)}%`, backgroundColor: category.color }]} />
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


const AIInsightCard = ({ stats }: { stats: InventoryStats }) => {
    const hasLowStock = stats.lowStockCount > 0;
    const hasOutOfStock = stats.outOfStockCount > 0;
    
    let message = '';
    if (hasOutOfStock) {
        message = `${stats.outOfStockCount} products are out of stock. Immediate action required. `;
    } else if (hasLowStock) {
        message = `${stats.lowStockCount} products are running low on stock. Consider restocking soon. `;
    }
    message += `Total inventory value is $${(stats.totalInventoryValue || 0).toFixed(0)}. Warehouse utilization is at ${stats.warehouseUtilization}%.`;

    return (
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
                        <Text style={styles.aiInsightMessage}>{message}</Text>
                    </View>
                </View>
            </LinearGradient>
        </Animated.View>
    );
};

const InventoryCompliance = ({ stats }: { stats: InventoryStats }) => {
    const items = [
        { label: 'Stock Levels Updated', completed: true },
        { label: 'Reorder Rules Configured', completed: stats.totalProducts > 0 },
        { label: 'Warehouse Capacity Monitored', completed: true },
        { label: 'Supplier Data Synced', completed: stats.totalProducts > 10 },
        { label: 'Inventory Audits Completed', completed: stats.totalProducts > 5 },
        { label: 'Damaged Stock Reviewed', completed: stats.outOfStockCount === 0 },
    ];

    return (
        <View style={styles.complianceContainer}>
            {items.map((item, index) => (
                <View key={index} style={styles.complianceItem}>
                    <View style={[styles.complianceCircle, item.completed && styles.complianceCircleCompleted]}>
                        {item.completed && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
                    </View>
                    <Text style={[styles.complianceLabel, item.completed && styles.complianceLabelCompleted]}>{item.label}</Text>
                </View>
            ))}
        </View>
    );
};

// ============================================
// MAIN INVENTORY DASHBOARD SCREEN
// ============================================

export default function InventoryDashboardScreen() {
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [notificationCount] = useState(3);
    const scrollY = useSharedValue(0);

    // State for data
    const [stats, setStats] = useState<InventoryStats>({
        totalProducts: 0,
        totalStockUnits: 0,
        totalInventoryValue: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        overstockCount: 0,
        pendingRestocks: 0,
        warehouseUtilization: 0,
    });
    const [kpiData, setKpiData] = useState<KPI[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
    const [lowStockProducts, setLowStockProducts] = useState<TopProduct[]>([]);
    const [categoryDistribution, setCategoryDistribution] = useState<CategoryInventory[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [replenishments, setReplenishments] = useState<Replenishment[]>([]);

    const warehouses: Warehouse[] = [
        { id: '1', name: 'Main Warehouse', location: 'New York, NY', inventoryCount: stats.totalStockUnits || 124500, capacity: 150000, occupied: Math.min(100, Math.round((stats.totalStockUnits / 150000) * 100)), status: 'active' },
        { id: '2', name: 'West Coast DC', location: 'Los Angeles, CA', inventoryCount: Math.round(stats.totalStockUnits * 0.35) || 89200, capacity: 100000, occupied: Math.min(100, Math.round((stats.totalStockUnits * 0.35 / 100000) * 100)), status: 'active' },
        { id: '3', name: 'South Hub', location: 'Houston, TX', inventoryCount: Math.round(stats.totalStockUnits * 0.15) || 34200, capacity: 62000, occupied: Math.min(100, Math.round((stats.totalStockUnits * 0.15 / 62000) * 100)), status: 'active' },
    ];


    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    const headerAnimatedStyle = useAnimatedStyle(() => ({
        opacity: scrollY.value > 50 ? 0.96 : 1,
        shadowOpacity: scrollY.value > 10 ? 0.05 : 0,
    }));

    // Fetch all dashboard data
    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true);
            
            // Fetch all data in parallel
            const [
                inventoryStats,
                lowStock,
                topProductsData,
                categories,
                activitiesData,
                suppliersData,
            ] = await Promise.all([
                fetchInventoryStats(),
                fetchLowStockProducts(10),
                fetchTopProductsByStock(4),
                fetchCategoryDistribution(),
                fetchRecentActivities(6),
                fetchSuppliers(4),
            ]);

            setStats(inventoryStats);
            setLowStockProducts(lowStock);
            setTopProducts(topProductsData);
            setCategoryDistribution(categories);
            setActivities(activitiesData);
            setSuppliers(suppliersData);

            // Update KPI data based on real stats
            setKpiData([
                { 
                    id: '1', 
                    title: 'Total Products', 
                    value: inventoryStats.totalProducts.toLocaleString(), 
                    icon: 'package-variant', 
                    color: '#3B82F6', 
                    trend: 5.2, 
                    subtitle: `+${Math.round(inventoryStats.totalProducts * 0.05)} this month` 
                },
                { 
                    id: '2', 
                    title: 'Total Stock Units', 
                    value: inventoryStats.totalStockUnits.toLocaleString(), 
                    icon: 'warehouse', 
                    color: '#10B981', 
                    trend: 8.4, 
                    subtitle: `+${Math.round(inventoryStats.totalStockUnits * 0.07)} units` 
                },
                { 
                    id: '3', 
                    title: 'Inventory Value', 
                    value: `$${(inventoryStats.totalInventoryValue / 1000).toFixed(0)}K`, 
                    icon: 'currency-usd', 
                    color: '#F59E0B', 
                    trend: 12.3, 
                    subtitle: `+$${(inventoryStats.totalInventoryValue * 0.1 / 1000).toFixed(0)}K` 
                },
                { 
                    id: '4', 
                    title: 'Low Stock', 
                    value: inventoryStats.lowStockCount.toString(), 
                    icon: 'alert-circle', 
                    color: '#EF4444', 
                    trend: -5.2, 
                    subtitle: `${Math.round(inventoryStats.lowStockCount * 0.25)} critical` 
                },
                { 
                    id: '5', 
                    title: 'Out of Stock', 
                    value: inventoryStats.outOfStockCount.toString(), 
                    icon: 'close-circle', 
                    color: '#DC2626', 
                    trend: -8.1, 
                    subtitle: 'Need restock' 
                },
                { 
                    id: '6', 
                    title: 'Overstock', 
                    value: inventoryStats.overstockCount.toString(), 
                    icon: 'package-up', 
                    color: '#8B5CF6', 
                    trend: 15.3, 
                    subtitle: `+${Math.round(inventoryStats.overstockCount * 0.2)} items` 
                },
                { 
                    id: '7', 
                    title: 'Pending Restocks', 
                    value: inventoryStats.pendingRestocks.toString(), 
                    icon: 'truck', 
                    color: '#EC4899', 
                    trend: 0, 
                    subtitle: 'ETA this week' 
                },
                { 
                    id: '8', 
                    title: 'Warehouse Utilization', 
                    value: `${inventoryStats.warehouseUtilization}%`, 
                    icon: 'warehouse', 
                    color: '#06B6D4', 
                    trend: 4.2, 
                    subtitle: `${Math.round(inventoryStats.totalStockUnits / 1000)}K/${Math.round(inventoryStats.totalStockUnits / 0.78 / 1000)}K units` 
                },
            ]);

            // Update alerts based on real data
            const newAlerts: Alert[] = [];
            if (inventoryStats.lowStockCount > 0) {
                newAlerts.push({ 
                    id: '1', 
                    type: 'low_stock', 
                    count: inventoryStats.lowStockCount, 
                    severity: inventoryStats.lowStockCount > 20 ? 'high' : 'medium', 
                    action: 'Restock Now' 
                });
            }
            if (inventoryStats.outOfStockCount > 0) {
                newAlerts.push({ 
                    id: '2', 
                    type: 'out_of_stock', 
                    count: inventoryStats.outOfStockCount, 
                    severity: 'critical', 
                    action: 'Create PO' 
                });
            }
            if (inventoryStats.overstockCount > 0) {
                newAlerts.push({ 
                    id: '3', 
                    type: 'overstock', 
                    count: inventoryStats.overstockCount, 
                    severity: 'medium', 
                    action: 'Review' 
                });
            }
            setAlerts(newAlerts);

            // Update replenishments based on low stock products
            const newReplenishments = lowStock.slice(0, 4).map((product, index) => ({
                id: product.id,
                name: product.name,
                currentStock: product.stock,
                threshold: Math.max(10, Math.round(product.stock * 1.5)),
                recommendedQty: Math.max(50, Math.round(product.stock * 3)),
                supplier: suppliersData[index % suppliersData.length]?.name || 'Unknown Supplier',
                leadTime: `${3 + (index % 5)} days`,
            }));
            setReplenishments(newReplenishments);

        } catch (error) {
            console.error('Error fetching inventory dashboard data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchDashboardData();
        setRefreshing(false);
    }, [fetchDashboardData]);

   

    // Initial data fetch
    useEffect(() => {
        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ fontSize: 16, color: '#6B7280' }}>Loading Inventory...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

            <Animated.View style={[styles.headerContainer, headerAnimatedStyle]}>
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
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
                    data={kpiData}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item, index }) => <KPICard data={item} index={index} />}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.kpiList}
                    style={styles.kpiSection}
                />

                {/* Inventory Health Score */}
                <HealthScoreCard stats={stats} />

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
                {alerts.length > 0 && (
                    <View style={styles.alertsSection}>
                        <SectionHeader title="Inventory Alerts" icon="bell" onAction={() => {}} actionText="View All" />
                        {alerts.map((alert, index) => (
                            <AlertCard key={alert.id} alert={alert} index={index} />
                        ))}
                    </View>
                )}

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
                {topProducts.length > 0 && (
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
                )}

                {/* Replenishment Center */}
                {replenishments.length > 0 && (
                    <View style={styles.replenishmentSection}>
                        <SectionHeader title="Reorder Recommendations" icon="truck" onAction={() => {}} actionText="Create PO" />
                        {replenishments.map((item, index) => (
                            <ReplenishmentCard key={item.id} item={item} index={index} />
                        ))}
                    </View>
                )}

                {/* Category Distribution */}
                <View style={styles.categorySection}>
                    <SectionHeader title="Inventory By Category" icon="chart-pie" showSeeAll={false} />
                    <View style={styles.categoryContainer}>
                        {categoryDistribution.map((category, index) => (
                            <CategoryRow key={category.id} category={category} index={index} />
                        ))}
                        {categoryDistribution.length === 0 && (
                            <Text style={styles.emptyStateText}>No category data available</Text>
                        )}
                    </View>
                </View>

                {/* Inventory Valuation */}
                <View style={styles.valuationSection}>
                    <SectionHeader title="Inventory Value Analysis" icon="currency-usd" showSeeAll={false} />
                    <View style={styles.valuationContainer}>
                        <View style={styles.valuationMetric}><Text style={styles.valuationLabel}>Total Value</Text><Text style={styles.valuationValue}>${(stats.totalInventoryValue / 1000).toFixed(0)}K</Text></View>
                        <View style={styles.valuationMetric}><Text style={styles.valuationLabel}>Available</Text><Text style={styles.valuationValue}>${((stats.totalInventoryValue * 0.86) / 1000).toFixed(0)}K</Text></View>
                        <View style={styles.valuationMetric}><Text style={styles.valuationLabel}>Reserved</Text><Text style={styles.valuationValue}>${((stats.totalInventoryValue * 0.08) / 1000).toFixed(0)}K</Text></View>
                        <View style={styles.valuationMetric}><Text style={styles.valuationLabel}>Damaged</Text><Text style={styles.valuationValue}>${((stats.totalInventoryValue * 0.01) / 1000).toFixed(0)}K</Text></View>
                    </View>
                </View>

                {/* Supplier Overview */}
                {suppliers.length > 0 && (
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
                )}

                {/* Recent Activities */}
                <View style={styles.activitySection}>
                    <SectionHeader title="Activity Feed" icon="history" onAction={() => {}} actionText="View All" />
                    <View style={styles.activityContainer}>
                        {activities.map((activity, index) => (
                            <ActivityItem key={activity.id} activity={activity} index={index} />
                        ))}
                        {activities.length === 0 && (
                            <Text style={styles.emptyStateText}>No recent activities</Text>
                        )}
                    </View>
                </View>

                {/* AI Insight Card */}
                <AIInsightCard stats={stats} />

                {/* Inventory Compliance */}
                <View style={styles.complianceSection}>
                    <SectionHeader title="Inventory Readiness" icon="check-circle" showSeeAll={false} />
                    <InventoryCompliance stats={stats} />
                </View>
            </Animated.ScrollView>
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
    emptyStateText: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        padding: 16,
    },
});