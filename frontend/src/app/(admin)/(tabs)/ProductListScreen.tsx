import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
    Image,
    Platform,
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;
const QUICK_ACTION_SIZE = (SCREEN_WIDTH - 48) / 4;

// ============================================
// API CONFIGURATION
// ============================================

const API_BASE_URL = 'http://10.225.180.27:5000';

// ============================================
// TYPES & INTERFACES
// ============================================

interface Product {
    id: string;
    name: string;
    sku: string;
    category: string;
    brand: string;
    price: number;
    originalPrice: number;
    discount: number;
    stockQuantity: number;
    warehouseQuantity: number;
    unitsSold: number;
    revenue: number;
    image: string;
    status: 'active' | 'draft' | 'out_of_stock' | 'archived' | 'featured' | 'best_seller';
    createdAt: string;
    updatedAt: string;
    isLowStock: boolean;
    categoryId?: string;
}

interface SummaryCardData {
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

interface CategoryDistribution {
    id: string;
    name: string;
    count: number;
    percentage: number;
    color: string;
}

interface PerformanceInsight {
    id: string;
    title: string;
    productName: string;
    productImage: string;
    metric: string;
    value: string;
}

interface QuickAction {
    id: string;
    title: string;
    icon: string;
    color: string;
    route: string;
}

interface InventoryHealth {
    id: string;
    title: string;
    count: number;
    icon: string;
    color: string;
}

interface ProductStats {
    totalProducts: number;
    activeProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
    draftProducts: number;
    archivedProducts: number;
    featuredProducts: number;
    totalRevenue: number;
    totalSold: number;
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
const fetchProducts = async (page: number = 1, limit: number = 20, filters: any = {}): Promise<{ products: Product[], total: number }> => {
    try {
        const params = { page, limit, ...filters };
        const response = await apiClient.get('/Product', { params });
        
        if (response.data.success) {
            const products = response.data.data.map((product: any) => ({
                id: product._id,
                name: product.name,
                sku: product.sku || `SKU-${product._id.slice(0, 6)}`,
                category: product.category?.name || 'Uncategorized',
                categoryId: product.category?._id || '',
                brand: product.brand || 'Unknown',
                price: product.discountPrice > 0 ? product.discountPrice : product.price,
                originalPrice: product.price,
                discount: product.discountPrice > 0 ? Math.round(((product.price - product.discountPrice) / product.price) * 100) : 0,
                stockQuantity: product.stock || 0,
                warehouseQuantity: product.stock || 0,
                unitsSold: product.soldCount || 0,
                revenue: (product.soldCount || 0) * (product.discountPrice > 0 ? product.discountPrice : product.price),
                image: product.images?.[0]?.url || 'https://via.placeholder.com/300',
                status: product.isActive ? (product.isFeatured ? 'featured' : 'active') : 'draft',
                createdAt: new Date(product.createdAt).toLocaleDateString(),
                updatedAt: new Date(product.updatedAt).toLocaleDateString(),
                isLowStock: (product.stock || 0) < 10,
            }));
            
            return {
                products,
                total: response.data.pagination?.total || products.length,
            };
        }
        throw new Error('Failed to fetch products');
    } catch (error) {
        console.error('Error fetching products:', error);
        throw error;
    }
};

const fetchProductStats = async (): Promise<ProductStats> => {
    try {
        const response = await apiClient.get('/Product/admin/stats');
        if (response.data.success) {
            const data = response.data.data;
            return {
                totalProducts: data.totalProducts || 0,
                activeProducts: data.activeProducts || 0,
                lowStockCount: data.lowStock || 0,
                outOfStockCount: data.outOfStock || 0,
                draftProducts: data.draftProducts || 0,
                archivedProducts: data.archivedProducts || 0,
                featuredProducts: data.featuredProducts || 0,
                totalRevenue: data.totalRevenue || 0,
                totalSold: data.totalSold || 0,
            };
        }
        throw new Error('Failed to fetch product stats');
    } catch (error) {
        console.error('Error fetching product stats:', error);
        throw error;
    }
};

const fetchCategoryDistribution = async (): Promise<CategoryDistribution[]> => {
    try {
        const response = await apiClient.get('/Category/admin/stats');
        if (response.data.success) {
            const data = response.data.data;
            const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#EC4899', '#F59E0B', '#06B6D4', '#EF4444', '#14B8A6'];
            
            return data.categoryStats.map((cat: any, index: number) => ({
                id: cat._id || `cat-${index}`,
                name: cat.name || 'Uncategorized',
                count: cat.productCount || 0,
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

const fetchLowStockProducts = async (limit: number = 4): Promise<Product[]> => {
    try {
        const response = await apiClient.get(`/Product/admin/low-stock?threshold=10&limit=${limit}`);
        if (response.data.success) {
            return response.data.data.map((product: any) => ({
                id: product._id,
                name: product.name,
                sku: product.sku || `SKU-${product._id.slice(0, 6)}`,
                category: product.category?.name || 'Uncategorized',
                brand: product.brand || 'Unknown',
                price: product.discountPrice > 0 ? product.discountPrice : product.price,
                originalPrice: product.price,
                discount: product.discountPrice > 0 ? Math.round(((product.price - product.discountPrice) / product.price) * 100) : 0,
                stockQuantity: product.stock || 0,
                warehouseQuantity: product.stock || 0,
                unitsSold: product.soldCount || 0,
                revenue: (product.soldCount || 0) * (product.discountPrice > 0 ? product.discountPrice : product.price),
                image: product.images?.[0]?.url || 'https://via.placeholder.com/300',
                status: 'active',
                createdAt: new Date(product.createdAt).toLocaleDateString(),
                updatedAt: new Date(product.updatedAt).toLocaleDateString(),
                isLowStock: true,
            }));
        }
        throw new Error('Failed to fetch low stock products');
    } catch (error) {
        console.error('Error fetching low stock products:', error);
        return [];
    }
};

const fetchRecentProducts = async (limit: number = 4): Promise<Product[]> => {
    try {
        const response = await apiClient.get(`/Product?page=1&limit=${limit}&sort=-createdAt`);
        if (response.data.success) {
            return response.data.data.map((product: any) => ({
                id: product._id,
                name: product.name,
                sku: product.sku || `SKU-${product._id.slice(0, 6)}`,
                category: product.category?.name || 'Uncategorized',
                brand: product.brand || 'Unknown',
                price: product.discountPrice > 0 ? product.discountPrice : product.price,
                originalPrice: product.price,
                discount: product.discountPrice > 0 ? Math.round(((product.price - product.discountPrice) / product.price) * 100) : 0,
                stockQuantity: product.stock || 0,
                warehouseQuantity: product.stock || 0,
                unitsSold: product.soldCount || 0,
                revenue: (product.soldCount || 0) * (product.discountPrice > 0 ? product.discountPrice : product.price),
                image: product.images?.[0]?.url || 'https://via.placeholder.com/300',
                status: product.isActive ? 'active' : 'draft',
                createdAt: new Date(product.createdAt).toLocaleDateString(),
                updatedAt: new Date(product.updatedAt).toLocaleDateString(),
                isLowStock: (product.stock || 0) < 10,
            }));
        }
        throw new Error('Failed to fetch recent products');
    } catch (error) {
        console.error('Error fetching recent products:', error);
        return [];
    }
};

const fetchTopSellingProducts = async (limit: number = 3): Promise<PerformanceInsight[]> => {
    try {
        const response = await apiClient.get(`/Product/admin/top-selling?limit=${limit}`);
        if (response.data.success) {
            return response.data.data.map((product: any, index: number) => ({
                id: product._id,
                title: index === 0 ? 'Best Selling' : index === 1 ? 'Highest Revenue' : 'Most Viewed',
                productName: product.name,
                productImage: product.images?.[0]?.url || 'https://via.placeholder.com/200',
                metric: index === 0 ? 'Units Sold' : 'Revenue',
                value: index === 0 ? product.soldCount?.toString() || '0' : `$${((product.soldCount || 0) * (product.discountPrice > 0 ? product.discountPrice : product.price)).toFixed(0)}`,
            }));
        }
        throw new Error('Failed to fetch top selling products');
    } catch (error) {
        console.error('Error fetching top selling products:', error);
        return [];
    }
};

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

const SummaryCard = ({ data, index }: { data: SummaryCardData; index: number }) => {
    const scale = useSharedValue(1);
    
    const onPressIn = () => { scale.value = withSpring(0.97); };
    const onPressOut = () => { scale.value = withSpring(1); };
    
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View entering={FadeInLeft.delay(index * 50).springify()} style={styles.summaryCardWrapper}>
            <TouchableOpacity activeOpacity={0.9} onPressIn={onPressIn} onPressOut={onPressOut}>
                <Animated.View style={[styles.summaryCard, animatedStyle]}>
                    <View style={[styles.summaryIconContainer, { backgroundColor: `${data.color}15` }]}>
                        <MaterialCommunityIcons name={data.icon as any} size={22} color={data.color} />
                    </View>
                    <Text style={styles.summaryCount}>{data.count.toLocaleString()}</Text>
                    <Text style={styles.summaryTitle}>{data.title}</Text>
                    {data.trend !== undefined && data.trend !== 0 && (
                        <View style={[styles.summaryTrend, { backgroundColor: data.trend > 0 ? '#D1FAE5' : '#FEE2E2' }]}>
                            <Ionicons name={data.trend > 0 ? 'arrow-up' : 'arrow-down'} size={10} color={data.trend > 0 ? '#10B981' : '#EF4444'} />
                            <Text style={[styles.summaryTrendText, { color: data.trend > 0 ? '#10B981' : '#EF4444' }]}>{Math.abs(data.trend)}%</Text>
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

const ProductStatusBadge = ({ status }: { status: Product['status'] }) => {
    const config = {
        active: { label: 'Active', color: '#10B981', bg: '#D1FAE5' },
        draft: { label: 'Draft', color: '#8B5CF6', bg: '#EDE9FE' },
        out_of_stock: { label: 'Out of Stock', color: '#EF4444', bg: '#FEE2E2' },
        archived: { label: 'Archived', color: '#6B7280', bg: '#F3F4F6' },
        featured: { label: 'Featured', color: '#F59E0B', bg: '#FEF3C7' },
        best_seller: { label: 'Best Seller', color: '#EC4899', bg: '#FCE7F3' },
    };
    const { label, color, bg } = config[status] || config.active;
    return (
        <View style={[styles.productStatusBadge, { backgroundColor: bg }]}>
            <Text style={[styles.productStatusText, { color }]}>{label}</Text>
        </View>
    );
};

const ProductCard = ({ product, index, onPress, onEdit, onDelete }: { product: Product; index: number; onPress: () => void; onEdit: () => void; onDelete: () => void }) => {
    const scale = useSharedValue(1);
    
    const onPressIn = () => { scale.value = withSpring(0.99); };
    const onPressOut = () => { scale.value = withSpring(1); };
    
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View entering={FadeInUp.delay(index * 30).springify()} style={styles.productCardContainer}>
            <TouchableOpacity activeOpacity={0.95} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
                <Animated.View style={[styles.productCard, animatedStyle]}>
                    <View style={styles.productCardMain}>
                        <Image source={{ uri: product.image? `${API_BASE_URL}${product.image}` : 'https://via.placeholder.com/200' }} style={styles.productImage} />  
                        <View style={styles.productInfo}>
                            <View style={styles.productHeader}>
                                <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                                <ProductStatusBadge status={product.status} />
                            </View>
                            
                            <Text style={styles.productMeta}>{product.category} • {product.brand} • SKU: {product.sku}</Text>
                            
                            <View style={styles.productPricing}>
                                <Text style={styles.productPrice}>${product.price.toFixed(2)}</Text>
                                {product.originalPrice > product.price && (
                                    <>
                                        <Text style={styles.productOriginalPrice}>${product.originalPrice.toFixed(2)}</Text>
                                        {product.discount > 0 && (
                                            <View style={styles.productDiscountBadge}>
                                                <Text style={styles.productDiscountText}>-{product.discount}%</Text>
                                            </View>
                                        )}
                                    </>
                                )}
                            </View>
                        </View>
                    </View>
                    
                    <View style={styles.productDetails}>
                        <View style={styles.productDetailItem}>
                            <MaterialCommunityIcons name="package-variant" size={14} color="#6B7280" />
                            <Text style={styles.productDetailText}>Stock: {product.stockQuantity}</Text>
                        </View>
                        <View style={styles.productDetailItem}>
                            <MaterialCommunityIcons name="chart-line" size={14} color="#6B7280" />
                            <Text style={styles.productDetailText}>Sold: {product.unitsSold}</Text>
                        </View>
                        <View style={styles.productDetailItem}>
                            <MaterialCommunityIcons name="currency-usd" size={14} color="#6B7280" />
                            <Text style={styles.productDetailText}>Revenue: ${(product.revenue || 0).toFixed(0)}</Text>
                        </View>
                    </View>
                    
                    <View style={styles.productFooter}>
                        <Text style={styles.productDate}>Updated: {product.updatedAt}</Text>
                        <View style={styles.productActions}>
                            <TouchableOpacity onPress={onEdit} style={styles.productActionButton}>
                                <Ionicons name="create-outline" size={18} color="#3B82F6" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={onDelete} style={styles.productActionButton}>
                                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    </View>
                    
                    {product.isLowStock && (
                        <View style={styles.lowStockWarning}>
                            <MaterialCommunityIcons name="alert-circle" size={14} color="#F59E0B" />
                            <Text style={styles.lowStockWarningText}>Low Stock Alert</Text>
                        </View>
                    )}
                </Animated.View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const InventoryHealthCard = ({ item, index }: { item: InventoryHealth; index: number }) => (
    <Animated.View entering={FadeInRight.delay(index * 60).springify()} style={styles.inventoryHealthCard}>
        <View style={[styles.inventoryHealthIcon, { backgroundColor: `${item.color}15` }]}>
            <MaterialCommunityIcons name={item.icon as any} size={22} color={item.color} />
        </View>
        <Text style={styles.inventoryHealthCount}>{item.count}</Text>
        <Text style={styles.inventoryHealthTitle}>{item.title}</Text>
    </Animated.View>
);

const CategoryRow = ({ category, index }: { category: CategoryDistribution; index: number }) => (
    <Animated.View entering={FadeInLeft.delay(index * 40).springify()} style={styles.categoryRow}>
        <View style={styles.categoryInfo}>
            <View style={[styles.categoryColorDot, { backgroundColor: category.color }]} />
            <Text style={styles.categoryName}>{category.name}</Text>
            <Text style={styles.categoryCount}>{category.count} products</Text>
        </View>
        <View style={styles.categoryPercentageBar}>
            <View style={[styles.categoryPercentageFill, { width: `${Math.min(category.percentage, 100)}%`, backgroundColor: category.color }]} />
        </View>
        <Text style={styles.categoryPercentage}>{category.percentage.toFixed(1)}%</Text>
    </Animated.View>
);

const PerformanceInsightCard = ({ insight, index }: { insight: PerformanceInsight; index: number }) => (
    <Animated.View entering={FadeInUp.delay(index * 70).springify()} style={styles.performanceCard}>
        <Image source={{ uri: insight.productImage? `${API_BASE_URL}${insight.productImage}` : 'https://via.placeholder.com/200' }} style={styles.performanceImage} />
        <View style={styles.performanceInfo}>
            <Text style={styles.performanceTitle}>{insight.title}</Text>
            <Text style={styles.performanceProductName} numberOfLines={1}>{insight.productName}</Text>
            <View style={styles.performanceMetric}>
                <Text style={styles.performanceMetricLabel}>{insight.metric}:</Text>
                <Text style={styles.performanceMetricValue}>{insight.value}</Text>
            </View>
        </View>
    </Animated.View>
);

const QuickActionCard = ({ action, index, onPress }: { action: QuickAction; index: number; onPress?: () => void }) => {
    const scale = useSharedValue(1);
    
    const onPressIn = () => { scale.value = withSpring(0.96); };
    const onPressOut = () => { scale.value = withSpring(1); };
    
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <TouchableOpacity activeOpacity={0.9} onPressIn={onPressIn} onPressOut={onPressOut} onPress={onPress}>
            <Animated.View style={[styles.quickActionCard, animatedStyle]}>
                <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}15` }]}>
                    <MaterialCommunityIcons name={action.icon as any} size={24} color={action.color} />
                </View>
                <Text style={styles.quickActionTitle}>{action.title}</Text>
            </Animated.View>
        </TouchableOpacity>
    );
};

const RecentlyAddedItem = ({ product, index }: { product: Product; index: number }) => (
    <Animated.View entering={FadeInRight.delay(index * 50).springify()} style={styles.recentlyAddedItem}>
        <Image source={{ uri: product.image ? `${API_BASE_URL}${product.image}` : 'https://via.placeholder.com/200' }} style={styles.recentlyAddedImage} />
        <View style={styles.recentlyAddedInfo}>
            <Text style={styles.recentlyAddedName} numberOfLines={1}>{product.name}</Text>
            <Text style={styles.recentlyAddedMeta}>{product.category} • {product.createdAt}</Text>
        </View>
    </Animated.View>
);

const AIInsightCard = ({ stats }: { stats: ProductStats }) => {
    const hasLowStock = stats.lowStockCount > 0;
    const hasOutOfStock = stats.outOfStockCount > 0;
    
    let message = '';
    if (hasOutOfStock) {
        message = `${stats.outOfStockCount} products are out of stock. `;
    }
    if (hasLowStock) {
        message += `${stats.lowStockCount} products are running low on stock. `;
    }
    message += `Total revenue is $${stats.totalRevenue.toFixed(0)} with ${stats.totalSold} units sold. `;
    message += `${stats.activeProducts} products are currently active.`;

    return (
        <Animated.View entering={FadeInUp.springify()} style={styles.aiInsightCard}>
            <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.aiInsightGradient}
            >
                <View style={styles.aiInsightContent}>
                    <View style={styles.aiInsightIcon}>
                        <MaterialCommunityIcons name="robot-outline" size={24} color="#FFFFFF" />
                    </View>
                    <View style={styles.aiInsightText}>
                        <Text style={styles.aiInsightTitle}>AI Business Insight</Text>
                        <Text style={styles.aiInsightMessage}>{message}</Text>
                    </View>
                </View>
            </LinearGradient>
        </Animated.View>
    );
};

// ============================================
// MAIN PRODUCT LIST SCREEN
// ============================================

export default function ProductListScreen() {
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('all');
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [notificationCount] = useState(3);
    const scrollY = useSharedValue(0);

    // State for data
    const [products, setProducts] = useState<Product[]>([]);
    const [totalProducts, setTotalProducts] = useState(0);
    const [stats, setStats] = useState<ProductStats>({
        totalProducts: 0,
        activeProducts: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        draftProducts: 0,
        archivedProducts: 0,
        featuredProducts: 0,
        totalRevenue: 0,
        totalSold: 0,
    });
    const [summaryCards, setSummaryCards] = useState<SummaryCardData[]>([]);
    const [categoryDistribution, setCategoryDistribution] = useState<CategoryDistribution[]>([]);
    const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
    const [recentlyAdded, setRecentlyAdded] = useState<Product[]>([]);
    const [performanceInsights, setPerformanceInsights] = useState<PerformanceInsight[]>([]);
    const [filterChips, setFilterChips] = useState<FilterChip[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const inventoryHealth: InventoryHealth[] = [
        { id: '1', title: 'Low Stock Alert', count: stats.lowStockCount, icon: 'alert-triangle', color: '#F59E0B' },
        { id: '2', title: 'Out of Stock', count: stats.outOfStockCount, icon: 'package-variant-closed', color: '#EF4444' },
        { id: '3', title: 'Active Products', count: stats.activeProducts, icon: 'check-circle', color: '#10B981' },
        { id: '4', title: 'Featured', count: stats.featuredProducts, icon: 'star', color: '#F59E0B' },
    ];

    const quickActions: QuickAction[] = [
        { id: '1', title: 'Add Product', icon: 'plus-circle', color: '#3B82F6', route: '../AddProductScreen' },
        { id: '2', title: 'Category List', icon: 'format-list-bulleted', color: '#10B981', route: '../CategoryListScreen' },
        { id: '3', title: 'Add Category', icon: 'folder-plus', color: '#6366F1', route: '../AddCategoryScreen' },

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
                productStats,
                productsData,
                categories,
                lowStock,
                recent,
                topSelling,
            ] = await Promise.all([
                fetchProductStats(),
                fetchProducts(1, 20, { isActive: true }),
                fetchCategoryDistribution(),
                fetchLowStockProducts(4),
                fetchRecentProducts(4),
                fetchTopSellingProducts(3),
            ]);

            setStats(productStats);
            setProducts(productsData.products);
            setTotalProducts(productsData.total);
            setCategoryDistribution(categories);
            setLowStockProducts(lowStock);
            setRecentlyAdded(recent);
            setPerformanceInsights(topSelling);

            // Update summary cards based on real stats
            setSummaryCards([
                { id: '1', title: 'Total Products', count: productStats.totalProducts, icon: 'package-variant', color: '#3B82F6', trend: 5.4 },
                { id: '2', title: 'Active', count: productStats.activeProducts, icon: 'check-circle', color: '#10B981', trend: 3.2 },
                { id: '3', title: 'Low Stock', count: productStats.lowStockCount, icon: 'alert-circle', color: '#F59E0B', trend: -2.1 },
                { id: '4', title: 'Out of Stock', count: productStats.outOfStockCount, icon: 'close-circle', color: '#EF4444', trend: -1.5 },
                { id: '5', title: 'Draft', count: productStats.draftProducts, icon: 'file-document', color: '#8B5CF6', trend: 12.3 },
                { id: '6', title: 'Featured', count: productStats.featuredProducts, icon: 'star', color: '#F59E0B', trend: 8.7 },
            ]);

            // Update filter chips
            setFilterChips([
                { id: 'all', label: 'All', count: productStats.totalProducts },
                { id: 'active', label: 'Active', count: productStats.activeProducts },
                { id: 'draft', label: 'Draft', count: productStats.draftProducts },
                { id: 'out_of_stock', label: 'Out of Stock', count: productStats.outOfStockCount },
                { id: 'low_stock', label: 'Low Stock', count: productStats.lowStockCount },
                { id: 'featured', label: 'Featured', count: productStats.featuredProducts },
            ]);

        } catch (error) {
            console.error('Error fetching product data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchDashboardData();
        setRefreshing(false);
    }, [fetchDashboardData]);

    const loadMoreProducts = useCallback(async () => {
        if (isLoadingMore || products.length >= totalProducts) return;
        
        setIsLoadingMore(true);
        try {
            const nextPage = currentPage + 1;
            const response = await fetchProducts(nextPage, 20, { isActive: true });
            setProducts(prev => [...prev, ...response.products]);
            setCurrentPage(nextPage);
        } catch (error) {
            console.error('Error loading more products:', error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [currentPage, isLoadingMore, products.length, totalProducts]);

    const toggleProductSelection = useCallback((productId: string) => {
        setSelectedProducts(prev => 
            prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
        );
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedProducts([]);
        setIsBulkMode(false);
    }, []);

    const filteredProducts = useMemo(() => {
        let filtered = products;
        
        if (selectedFilter !== 'all') {
            filtered = filtered.filter(p => {
                switch (selectedFilter) {
                    case 'active': return p.status === 'active' || p.status === 'featured' || p.status === 'best_seller';
                    case 'draft': return p.status === 'draft';
                    case 'out_of_stock': return p.status === 'out_of_stock';
                    case 'low_stock': return p.isLowStock;
                    case 'featured': return p.status === 'featured';
                    default: return true;
                }
            });
        }
        
        if (searchText) {
            const query = searchText.toLowerCase();
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(query) ||
                p.sku.toLowerCase().includes(query) ||
                p.category.toLowerCase().includes(query) ||
                p.brand.toLowerCase().includes(query)
            );
        }
        
        return filtered;
    }, [selectedFilter, searchText, products]);

    // Handle quick action navigation
    const handleQuickAction = (actionId: string) => {
        const action = quickActions.find(a => a.id === actionId);
        if (action && action.route) {
            router.push(action.route as any);
        }
    };

    // Initial data fetch
    useEffect(() => {
        fetchDashboardData();
    }, []);

    const renderProductItem = ({ item, index }: { item: Product; index: number }) => (
        <ProductCard
            product={item}
            index={index}
            onPress={() => router.push(`../EditProductScreen?id=${item.id}`)}
            onEdit={() => router.push(`../EditProductScreen?id=${item.id}`)}
            onDelete={() => {
                Alert.alert('Delete Product', `Are you sure you want to delete ${item.name}?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => handleDeleteProduct(item.id) }
                ]);
            }}
        />
    );

    const handleDeleteProduct = async (productId: string) => {
        try {
            const response = await apiClient.delete(`/Product/admin/products/${productId}`);
            if (response.data.success) {
                setProducts(prev => prev.filter(p => p.id !== productId));
                Alert.alert('Success', 'Product deleted successfully');
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            Alert.alert('Error', 'Failed to delete product');
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ fontSize: 16, color: '#6B7280' }}>Loading Products...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

            <Animated.View style={[styles.headerContainer, headerAnimatedStyle]}>
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.headerTitle}>Products</Text>
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

            <Animated.FlatList
                data={filteredProducts}
                keyExtractor={(item) => item.id}
                renderItem={renderProductItem}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={['#3B82F6']} />
                }
                onEndReached={loadMoreProducts}
                onEndReachedThreshold={0.3}
                ListHeaderComponent={
                    <View>
                        {/* Summary Cards */}
                        <FlatList
                            data={summaryCards}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            renderItem={({ item, index }) => <SummaryCard data={item} index={index} />}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={styles.summaryList}
                            style={styles.summarySection}
                        />

                        {/* Search Bar */}
                        <View style={styles.searchSection}>
                            <View style={styles.searchContainer}>
                                <Feather name="search" size={20} color="#9CA3AF" />
                                <TextInput
                                    placeholder="Search products by name, SKU, category, brand..."
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
                        {selectedProducts.length > 0 && (
                            <Animated.View entering={FadeInDown.springify()} style={styles.bulkToolbar}>
                                <View style={styles.bulkInfo}>
                                    <Text style={styles.bulkCount}>{selectedProducts.length} selected</Text>
                                </View>
                                <View style={styles.bulkActions}>
                                    <TouchableOpacity style={styles.bulkAction}>
                                        <MaterialCommunityIcons name="delete-outline" size={20} color="#EF4444" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.bulkAction}>
                                        <MaterialCommunityIcons name="archive-outline" size={20} color="#6B7280" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.bulkAction}>
                                        <MaterialCommunityIcons name="check-circle-outline" size={20} color="#10B981" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.bulkAction} onPress={clearSelection}>
                                        <MaterialCommunityIcons name="close" size={20} color="#6B7280" />
                                    </TouchableOpacity>
                                </View>
                            </Animated.View>
                        )}

                        {/* Products Header */}
                        <SectionHeader title="All Products" count={filteredProducts.length} />

                        {/* Inventory Health Section */}
                        <View style={styles.inventoryHealthSection}>
                            <SectionHeader title="Inventory Health" showSeeAll={false} />
                            <FlatList
                                data={inventoryHealth}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                renderItem={({ item, index }) => <InventoryHealthCard item={item} index={index} />}
                                keyExtractor={(item) => item.id}
                                contentContainerStyle={styles.inventoryHealthList}
                            />
                        </View>

                        {/* Category Distribution */}
                        {categoryDistribution.length > 0 && (
                            <View style={styles.categorySection}>
                                <SectionHeader title="Category Distribution" showSeeAll={false} />
                                <View style={styles.categoryContainer}>
                                    {categoryDistribution.map((category, index) => (
                                        <CategoryRow key={category.id} category={category} index={index} />
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Recently Added */}
                        {recentlyAdded.length > 0 && (
                            <View style={styles.recentlyAddedSection}>
                                <SectionHeader title="Recently Added" />
                                <FlatList
                                    data={recentlyAdded}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    renderItem={({ item, index }) => <RecentlyAddedItem product={item} index={index} />}
                                    keyExtractor={(item) => item.id}
                                    contentContainerStyle={styles.recentlyAddedList}
                                />
                            </View>
                        )}

                        {/* Product Performance Insights */}
                        {performanceInsights.length > 0 && (
                            <View style={styles.performanceSection}>
                                <SectionHeader title="Product Performance" showSeeAll={false} />
                                <View style={styles.performanceGrid}>
                                    {performanceInsights.map((insight, index) => (
                                        <PerformanceInsightCard key={insight.id} insight={insight} index={index} />
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Quick Actions */}
                        <View style={styles.quickActionsSection}>
                            <SectionHeader title="Quick Actions" showSeeAll={false} />
                            <View style={styles.quickActionsGrid}>
                                {quickActions.map((action, index) => (
                                    <QuickActionCard 
                                        key={action.id} 
                                        action={action} 
                                        index={index} 
                                        onPress={() => handleQuickAction(action.id)}
                                    />
                                ))}
                            </View>
                        </View>

                        {/* AI Insight Card */}
                        <AIInsightCard stats={stats} />
                    </View>
                }
                ListFooterComponent={
                    <>
                        {isLoadingMore && (
                            <View style={styles.loadingMore}>
                                <Text style={styles.loadingMoreText}>Loading more products...</Text>
                            </View>
                        )}
                        <View style={[styles.footerSpacing, { height: insets.bottom + 80 }]} />
                    </>
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="package-variant" size={80} color="#D1D5DB" />
                        <Text style={styles.emptyStateTitle}>No Products Found</Text>
                        <Text style={styles.emptyStateDescription}>
                            Start by adding your first product to your store inventory.
                        </Text>
                        <TouchableOpacity style={styles.emptyStateButton} onPress={() => router.push('../AddProductScreen')}>
                            <Text style={styles.emptyStateButtonText}>Add Product</Text>
                        </TouchableOpacity>
                    </View>
                }
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
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1F2937',
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
    summarySection: {
        marginTop: 8,
        marginBottom: 16,
    },
    summaryList: {
        paddingHorizontal: 16,
    },
    summaryCardWrapper: {
        width: 110,
        marginHorizontal: 6,
    },
    summaryCard: {
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
    summaryIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    summaryCount: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1F2937',
    },
    summaryTitle: {
        fontSize: 10,
        color: '#6B7280',
        marginTop: 2,
        textAlign: 'center',
    },
    summaryTrend: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        marginTop: 4,
    },
    summaryTrendText: {
        fontSize: 8,
        fontWeight: '600',
        marginLeft: 2,
    },
    searchSection: {
        paddingHorizontal: 20,
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
        marginHorizontal: 20,
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
        paddingHorizontal: 20,
        marginBottom: 16,
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
    productCardContainer: {
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    productCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    productCardMain: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    productImage: {
        width: 80,
        height: 80,
        borderRadius: 16,
    },
    productInfo: {
        flex: 1,
        marginLeft: 12,
    },
    productHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    productName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
        flex: 1,
    },
    productStatusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    productStatusText: {
        fontSize: 9,
        fontWeight: '600',
    },
    productMeta: {
        fontSize: 11,
        color: '#6B7280',
        marginBottom: 6,
    },
    productPricing: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    productPrice: {
        fontSize: 16,
        fontWeight: '700',
        color: '#3B82F6',
    },
    productOriginalPrice: {
        fontSize: 12,
        color: '#9CA3AF',
        textDecorationLine: 'line-through',
        marginLeft: 6,
    },
    productDiscountBadge: {
        backgroundColor: '#EF4444',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: 8,
    },
    productDiscountText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    productDetails: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        marginBottom: 12,
    },
    productDetailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
        marginBottom: 4,
    },
    productDetailText: {
        fontSize: 11,
        color: '#6B7280',
        marginLeft: 4,
    },
    productFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    productDate: {
        fontSize: 10,
        color: '#9CA3AF',
    },
    productActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    productActionButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
        backgroundColor: '#F9FAFB',
    },
    lowStockWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#FEF3C7',
        backgroundColor: '#FFFBEB',
        padding: 8,
        borderRadius: 12,
    },
    lowStockWarningText: {
        fontSize: 11,
        fontWeight: '500',
        color: '#F59E0B',
        marginLeft: 6,
    },
    inventoryHealthSection: {
        marginBottom: 24,
    },
    inventoryHealthList: {
        paddingHorizontal: 16,
    },
    inventoryHealthCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        width: 100,
        marginHorizontal: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    inventoryHealthIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    inventoryHealthCount: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1F2937',
    },
    inventoryHealthTitle: {
        fontSize: 10,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 2,
    },
    categorySection: {
        marginBottom: 24,
    },
    categoryContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        marginHorizontal: 20,
    },
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    categoryInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 130,
    },
    categoryColorDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8,
    },
    categoryName: {
        fontSize: 13,
        fontWeight: '500',
        color: '#1F2937',
        marginRight: 8,
    },
    categoryCount: {
        fontSize: 11,
        color: '#6B7280',
    },
    categoryPercentageBar: {
        flex: 1,
        height: 6,
        backgroundColor: '#F3F4F6',
        borderRadius: 3,
        marginHorizontal: 12,
    },
    categoryPercentageFill: {
        height: 6,
        borderRadius: 3,
    },
    categoryPercentage: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1F2937',
        width: 45,
        textAlign: 'right',
    },
    recentlyAddedSection: {
        marginBottom: 24,
    },
    recentlyAddedList: {
        paddingHorizontal: 16,
    },
    recentlyAddedItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 10,
        marginHorizontal: 6,
        width: 200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    recentlyAddedImage: {
        width: 50,
        height: 50,
        borderRadius: 12,
    },
    recentlyAddedInfo: {
        flex: 1,
        marginLeft: 10,
    },
    recentlyAddedName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1F2937',
    },
    recentlyAddedMeta: {
        fontSize: 10,
        color: '#6B7280',
        marginTop: 2,
    },
    performanceSection: {
        marginBottom: 24,
    },
    performanceGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 12,
    },
    performanceCard: {
        width: (SCREEN_WIDTH - 48) / 3,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 10,
        marginHorizontal: 6,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    performanceImage: {
        width: 60,
        height: 60,
        borderRadius: 12,
        marginBottom: 8,
    },
    performanceInfo: {
        alignItems: 'center',
    },
    performanceTitle: {
        fontSize: 10,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 2,
    },
    performanceProductName: {
        fontSize: 11,
        fontWeight: '600',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 4,
    },
    performanceMetric: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    performanceMetricLabel: {
        fontSize: 9,
        color: '#9CA3AF',
    },
    performanceMetricValue: {
        fontSize: 10,
        fontWeight: '700',
        color: '#3B82F6',
        marginLeft: 2,
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
    aiInsightCard: {
        marginHorizontal: 20,
        marginBottom: 24,
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
    loadingMore: {
        padding: 16,
        alignItems: 'center',
    },
    loadingMoreText: {
        fontSize: 14,
        color: '#6B7280',
    },
    footerSpacing: {
        height: 40,
    },
});