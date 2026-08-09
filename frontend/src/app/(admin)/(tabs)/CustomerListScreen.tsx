import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const QUICK_ACTION_SIZE = (SCREEN_WIDTH - 48) / 4;

// ============================================
// API CONFIGURATION
// ============================================

const API_BASE_URL = 'http://10.225.180.27:5000';

// ============================================
// TYPES & INTERFACES
// ============================================

interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatar: string;
    customerId: string;
    status: 'active' | 'inactive' | 'vip' | 'blocked' | 'new' | 'premium';
    totalOrders: number;
    totalSpend: number;
    averageOrderValue: number;
    wishlistCount: number;
    rewardPoints: number;
    lastOrderDate: string;
    lastLoginDate: string;
    createdAt: string;
    city: string;
    state: string;
    country: string;
    membershipLevel: 'standard' | 'silver' | 'gold' | 'platinum' | 'crown';
    isSubscribed: boolean;
}

interface AnalyticsCardData {
    id: string;
    title: string;
    value: string;
    icon: string;
    color: string;
    trend?: number;
}

interface FilterChip {
    id: string;
    label: string;
    count?: number;
}

interface Segment {
    id: string;
    name: string;
    count: number;
    revenue: number;
    growth: number;
    color: string;
}

interface TopCustomer {
    id: string;
    name: string;
    avatar: string;
    ordersCount: number;
    totalSpend: number;
    loyaltyLevel: string;
}

interface ActivityItem {
    id: string;
    type: 'registered' | 'ordered' | 'wishlist' | 'review' | 'profile' | 'reward';
    description: string;
    customerName: string;
    timestamp: string;
    icon: string;
}

interface SupportTicket {
    id: string;
    open: number;
    resolved: number;
    pendingComplaints: number;
    refundRequests: number;
    supportRating: number;
}

interface Insight {
    id: string;
    message: string;
    type: 'positive' | 'warning' | 'neutral';
}

interface CustomerStats {
    totalCustomers: number;
    activeCustomers: number;
    newCustomers: number;
    vipCustomers: number;
    inactiveCustomers: number;
    blockedCustomers: number;
    returningCustomers: number;
    premiumCustomers: number;
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
const fetchCustomers = async (page: number = 1, limit: number = 20, filters: any = {}): Promise<{ customers: Customer[], total: number }> => {
    try {
        const params = { page, limit, ...filters };
        const response = await apiClient.get('/User/admin/users', { params });
        
        if (response.data.success) {
            const customers = response.data.data.map((user: any) => ({
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone || 'N/A',
                avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3B82F6&color=fff&size=100`,
                customerId: `CUST-${user._id.slice(0, 8).toUpperCase()}`,
                status: user.role === 'admin' ? 'vip' : 'active',
                totalOrders: user.orders?.length || 0,
                totalSpend: 0, // Will be calculated from orders
                averageOrderValue: 0,
                wishlistCount: user.wishlist?.length || 0,
                rewardPoints: 0,
                lastOrderDate: user.orders?.[user.orders.length - 1]?.createdAt || '',
                lastLoginDate: user.updatedAt || '',
                createdAt: new Date(user.createdAt).toLocaleDateString(),
                city: user.addresses?.[0]?.city || 'N/A',
                state: user.addresses?.[0]?.state || 'N/A',
                country: user.addresses?.[0]?.country || 'India',
                membershipLevel: user.totalOrders > 20 ? 'platinum' : user.totalOrders > 10 ? 'gold' : 'standard',
                isSubscribed: true,
            }));
            
            return {
                customers,
                total: response.data.pagination?.total || customers.length,
            };
        }
        throw new Error('Failed to fetch customers');
    } catch (error) {
        console.error('Error fetching customers:', error);
        throw error;
    }
};

const fetchCustomerStats = async (): Promise<CustomerStats> => {
    try {
        const response = await apiClient.get('/User/admin/stats');
        if (response.data.success) {
            const data = response.data.data;
            return {
                totalCustomers: data.totalUsers || 0,
                activeCustomers: data.totalUsers - (data.inactiveUsers || 0),
                newCustomers: data.newUsersToday || 0,
                vipCustomers: data.adminUsers || 0,
                inactiveCustomers: data.inactiveUsers || 0,
                blockedCustomers: data.blockedUsers || 0,
                returningCustomers: data.returningUsers || 0,
                premiumCustomers: data.premiumUsers || 0,
            };
        }
        throw new Error('Failed to fetch customer stats');
    } catch (error) {
        console.error('Error fetching customer stats:', error);
        throw error;
    }
};

const fetchRecentActivities = async (limit: number = 5): Promise<ActivityItem[]> => {
    try {
        const response = await apiClient.get(`/Order/admin/orders?page=1&limit=${limit}&sort=-createdAt`);
        if (response.data.success) {
            return response.data.data.map((order: any) => ({
                id: order._id,
                type: 'ordered',
                description: `Placed order ${order.orderId}`,
                customerName: order.addresses?.[0]?.fullName || 'Unknown Customer',
                timestamp: new Date(order.createdAt).toLocaleString(),
                icon: 'cart',
            }));
        }
        throw new Error('Failed to fetch activities');
    } catch (error) {
        console.error('Error fetching activities:', error);
        return [];
    }
};

const fetchTopCustomers = async (limit: number = 4): Promise<TopCustomer[]> => {
    try {
        const response = await apiClient.get('/User/admin/users');
        if (response.data.success) {
            const users = response.data.data;
            // Sort by orders length
            const sorted = users.sort((a: any, b: any) => (b.orders?.length || 0) - (a.orders?.length || 0));
            return sorted.slice(0, limit).map((user: any) => ({
                id: user._id,
                name: user.name,
                avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3B82F6&color=fff&size=100`,
                ordersCount: user.orders?.length || 0,
                totalSpend: 0, // Will be calculated
                loyaltyLevel: user.orders?.length > 20 ? 'diamond' : user.orders?.length > 10 ? 'Gold' : 'Silver',
            }));
        }
        throw new Error('Failed to fetch top customers');
    } catch (error) {
        console.error('Error fetching top customers:', error);
        return [];
    }
};

const fetchSupportData = async (): Promise<SupportTicket> => {
    try {
        // Placeholder - implement actual support API when available
        return {
            id: '1',
            open: 12,
            resolved: 234,
            pendingComplaints: 3,
            refundRequests: 5,
            supportRating: 4.8,
        };
    } catch (error) {
        console.error('Error fetching support data:', error);
        return {
            id: '1',
            open: 0,
            resolved: 0,
            pendingComplaints: 0,
            refundRequests: 0,
            supportRating: 0,
        };
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
                        <Feather name={data.icon as any} size={20} color={data.color} />
                    </View>
                    <Text style={styles.analyticsValue}>{data.value}</Text>
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
                    <Text style={[styles.filterChipCountText, isSelected && styles.filterChipCountTextSelected]}>{chip.count.toLocaleString()}</Text>
                </View>
            )}
        </View>
    </TouchableOpacity>
);

const StatusBadge = ({ status }: { status: Customer['status'] }) => {
    const config = {
        active: { label: 'Active', color: '#10B981', bg: '#D1FAE5' },
        inactive: { label: 'Inactive', color: '#6B7280', bg: '#F3F4F6' },
        vip: { label: 'VIP', color: '#EC4899', bg: '#FCE7F3' },
        blocked: { label: 'Blocked', color: '#EF4444', bg: '#FEE2E2' },
        new: { label: 'New', color: '#3B82F6', bg: '#DBEAFE' },
        premium: { label: 'Premium', color: '#F59E0B', bg: '#FEF3C7' },
    };
    const { label, color, bg } = config[status] || config.active;
    return (
        <View style={[styles.statusBadge, { backgroundColor: bg }]}>
            <Text style={[styles.statusText, { color }]}>{label}</Text>
        </View>
    );
};

const MembershipBadge = ({ level }: { level: Customer['membershipLevel'] }) => {
    const config = {
        standard: { label: 'Standard', color: '#6B7280', bg: '#F3F4F6' },
        silver: { label: 'Silver', color: '#94A3B8', bg: '#F1F5F9' },
        gold: { label: 'Gold', color: '#F59E0B', bg: '#FEF3C7' },
        platinum: { label: 'Platinum', color: '#06B6D4', bg: '#CFFAFE' },
        diamond: { label: 'diamond', color: '#8B5CF6', bg: '#EDE9FE' },
    };
    const { label, color, bg } = config[level] || config.standard;
    return (
        <View style={[styles.membershipBadge, { backgroundColor: bg }]}>
            <Text style={[styles.membershipText, { color }]}>{label}</Text>
        </View>
    );
};

const CustomerCard = ({ customer, index, onPress, onContact }: { customer: Customer; index: number; onPress: () => void; onContact: () => void }) => {
    const scale = useSharedValue(1);
    
    const onPressIn = () => { scale.value = withSpring(0.99); };
    const onPressOut = () => { scale.value = withSpring(1); };
    
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View entering={FadeInUp.delay(index * 30).springify()} style={styles.customerCardContainer}>
            <TouchableOpacity activeOpacity={0.95} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
                <Animated.View style={[styles.customerCard, animatedStyle]}>
                    <View style={styles.customerCardHeader}>
                        <Image source={{ uri: customer.avatar ? `${API_BASE_URL}${customer.avatar}` : 'https://via.placeholder.com/200' }} style={styles.customerAvatar} />

                        <View style={styles.customerHeaderInfo}>
                            <View style={styles.customerNameRow}>
                                <Text style={styles.customerName}>{customer.name}</Text>
                                <StatusBadge status={customer.status} />
                            </View>
                            <Text style={styles.customerId}>ID: {customer.customerId}</Text>
                            <Text style={styles.customerEmail}>{customer.email}</Text>
                            <Text style={styles.customerPhone}>{customer.phone}</Text>
                        </View>
                    </View>

                    <View style={styles.customerStats}>
                        <View style={styles.customerStat}>
                            <Text style={styles.customerStatValue}>{customer.totalOrders}</Text>
                            <Text style={styles.customerStatLabel}>Orders</Text>
                        </View>
                        <View style={styles.customerStat}>
                            <Text style={styles.customerStatValue}>${customer.totalSpend.toFixed(0)}</Text>
                            <Text style={styles.customerStatLabel}>Spent</Text>
                        </View>
                        <View style={styles.customerStat}>
                            <Text style={styles.customerStatValue}>${customer.averageOrderValue.toFixed(0)}</Text>
                            <Text style={styles.customerStatLabel}>Avg Order</Text>
                        </View>
                        <View style={styles.customerStat}>
                            <Text style={styles.customerStatValue}>{customer.rewardPoints}</Text>
                            <Text style={styles.customerStatLabel}>Points</Text>
                        </View>
                    </View>

                    <View style={styles.customerFooter}>
                        <View style={styles.customerLocation}>
                            <Ionicons name="location-outline" size={12} color="#6B7280" />
                            <Text style={styles.customerLocationText}>{customer.city}, {customer.state}</Text>
                        </View>
                        <MembershipBadge level={customer.membershipLevel} />
                    </View>

                    <View style={styles.customerCardActions}>
                        <TouchableOpacity onPress={onContact} style={styles.customerActionButton}>
                            <Ionicons name="chatbubble-outline" size={16} color="#3B82F6" />
                            <Text style={styles.customerActionText}>Contact</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.customerActionButton} onPress={onPress}>
                            <Ionicons name="eye-outline" size={16} color="#6B7280" />
                            <Text style={styles.customerActionText}>Profile</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const SegmentCard = ({ segment, index }: { segment: Segment; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()} style={styles.segmentCard}>
        <View style={styles.segmentHeader}>
            <View style={[styles.segmentColor, { backgroundColor: segment.color }]} />
            <Text style={styles.segmentName}>{segment.name}</Text>
        </View>
        <Text style={styles.segmentCount}>{segment.count.toLocaleString()} customers</Text>
        <Text style={styles.segmentRevenue}>${(segment.revenue / 1000).toFixed(0)}K revenue</Text>
        <View style={[styles.segmentGrowth, { backgroundColor: segment.growth >= 0 ? '#D1FAE5' : '#FEE2E2' }]}>
            <Ionicons name={segment.growth >= 0 ? 'arrow-up' : 'arrow-down'} size={12} color={segment.growth >= 0 ? '#10B981' : '#EF4444'} />
            <Text style={[styles.segmentGrowthText, { color: segment.growth >= 0 ? '#10B981' : '#EF4444' }]}>{Math.abs(segment.growth)}%</Text>
        </View>
    </Animated.View>
);

const TopCustomerCard = ({ customer, index }: { customer: TopCustomer; index: number }) => (
    <Animated.View entering={FadeInRight.delay(index * 60).springify()} style={styles.topCustomerCard}>
        <Image source={{ uri: customer.avatar ? `${API_BASE_URL}${customer.avatar}` : 'https://via.placeholder.com/200' }} style={styles.topCustomerAvatar} />
        
        <View style={styles.topCustomerInfo}>
            <Text style={styles.topCustomerName}>{customer.name}</Text>
            <View style={styles.topCustomerStats}>
                <Text style={styles.topCustomerStat}>{customer.ordersCount} orders</Text>
                <Text style={styles.topCustomerSpend}>${customer.totalSpend.toLocaleString()}</Text>
            </View>
            <View style={styles.topCustomerLoyalty}>
                <MaterialCommunityIcons name="diamond" size={12} color="#F59E0B" />
                <Text style={styles.topCustomerLoyaltyText}>{customer.loyaltyLevel}</Text>
            </View>
        </View>
    </Animated.View>
);

const ActivityItem = ({ activity, index }: { activity: ActivityItem; index: number }) => (
    <Animated.View entering={FadeInLeft.delay(index * 40).springify()} style={styles.activityItem}>
        <View style={styles.activityIcon}>
            <Ionicons name={activity.icon as any} size={16} color="#3B82F6" />
        </View>
        <View style={styles.activityContent}>
            <Text style={styles.activityDescription}>
                <Text style={styles.activityCustomer}>{activity.customerName}</Text> {activity.description}
            </Text>
            <Text style={styles.activityTime}>{activity.timestamp}</Text>
        </View>
    </Animated.View>
);


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
        <Animated.View entering={FadeInLeft.delay(index * 50).springify()} style={styles.insightCard}>
            <View style={[styles.insightIcon, { backgroundColor: `${getBgColor()}15` }]}>
                <Ionicons name={getIcon()} size={20} color={getBgColor()} />
            </View>
            <View style={styles.insightContent}>
                <Text style={styles.insightText}>{insight.message}</Text>
            </View>
        </Animated.View>
    );
};

const CustomerValueAnalytics = ({ stats }: { stats: CustomerStats }) => (
    <View style={styles.valueAnalyticsContainer}>
        <View style={styles.valueMetric}>
            <Text style={styles.valueMetricLabel}>Avg Customer Value</Text>
            <Text style={styles.valueMetricValue}>$245</Text>
        </View>
        <View style={styles.valueMetric}>
            <Text style={styles.valueMetricLabel}>Highest Value</Text>
            <Text style={styles.valueMetricValue}>$8,750</Text>
        </View>
        <View style={styles.valueMetric}>
            <Text style={styles.valueMetricLabel}>Retention Rate</Text>
            <Text style={styles.valueMetricValue}>{stats.totalCustomers > 0 ? Math.round((stats.returningCustomers / stats.totalCustomers) * 100) : 0}%</Text>
        </View>
        <View style={styles.valueMetric}>
            <Text style={styles.valueMetricLabel}>Repeat Rate</Text>
            <Text style={styles.valueMetricValue}>{stats.totalCustomers > 0 ? Math.round((stats.returningCustomers / stats.totalCustomers) * 100) : 0}%</Text>
        </View>
    </View>
);

const SupportOverview = ({ data }: { data: SupportTicket }) => (
    <View style={styles.supportContainer}>
        <View style={styles.supportMetric}>
            <Text style={styles.supportMetricValue}>{data.open}</Text>
            <Text style={styles.supportMetricLabel}>Open Tickets</Text>
        </View>
        <View style={styles.supportMetric}>
            <Text style={styles.supportMetricValue}>{data.resolved}</Text>
            <Text style={styles.supportMetricLabel}>Resolved</Text>
        </View>
        <View style={styles.supportMetric}>
            <Text style={styles.supportMetricValue}>{data.pendingComplaints}</Text>
            <Text style={styles.supportMetricLabel}>Complaints</Text>
        </View>
        <View style={styles.supportMetric}>
            <Text style={styles.supportMetricValue}>{data.refundRequests}</Text>
            <Text style={styles.supportMetricLabel}>Refunds</Text>
        </View>
        <View style={styles.supportMetric}>
            <Text style={styles.supportMetricValue}>{data.supportRating}</Text>
            <Text style={styles.supportMetricLabel}>Rating</Text>
        </View>
    </View>
);

// ============================================
// MAIN CUSTOMER LIST SCREEN
// ============================================

export default function CustomerListScreen() {
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('all');
    const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [notificationCount] = useState(3);
    const scrollY = useSharedValue(0);

    // State for data
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [totalCustomers, setTotalCustomers] = useState(0);
    const [stats, setStats] = useState<CustomerStats>({
        totalCustomers: 0,
        activeCustomers: 0,
        newCustomers: 0,
        vipCustomers: 0,
        inactiveCustomers: 0,
        blockedCustomers: 0,
        returningCustomers: 0,
        premiumCustomers: 0,
    });
    const [analyticsCards, setAnalyticsCards] = useState<AnalyticsCardData[]>([]);
    const [filterChips, setFilterChips] = useState<FilterChip[]>([]);
    const [segments, setSegments] = useState<Segment[]>([]);
    const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
    const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
    const [supportData, setSupportData] = useState<SupportTicket>({
        id: '1',
        open: 0,
        resolved: 0,
        pendingComplaints: 0,
        refundRequests: 0,
        supportRating: 0,
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

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
                customerStats,
                customersData,
                activities,
                topCustomersData,
                support,
            ] = await Promise.all([
                fetchCustomerStats(),
                fetchCustomers(1, 20),
                fetchRecentActivities(5),
                fetchTopCustomers(4),
                fetchSupportData(),
            ]);

            setStats(customerStats);
            setCustomers(customersData.customers);
            setTotalCustomers(customersData.total);
            setRecentActivities(activities);
            setTopCustomers(topCustomersData);
            setSupportData(support);

            // Update analytics cards based on real stats
            setAnalyticsCards([
                { id: '1', title: 'Total Customers', value: customerStats.totalCustomers.toLocaleString(), icon: 'users', color: '#3B82F6', trend: 12 },
                { id: '2', title: 'New Customers', value: customerStats.newCustomers.toLocaleString(), icon: 'user-plus', color: '#10B981', trend: 18 },
                { id: '3', title: 'Active Customers', value: customerStats.activeCustomers.toLocaleString(), icon: 'user-check', color: '#8B5CF6', trend: 8 },
                { id: '4', title: 'Returning', value: customerStats.returningCustomers.toLocaleString(), icon: 'repeat', color: '#F59E0B', trend: 15 },
                { id: '5', title: 'VIP Customers', value: customerStats.vipCustomers.toLocaleString(), icon: 'diamond', color: '#EC4899', trend: 22 },
                { id: '6', title: 'Inactive', value: customerStats.inactiveCustomers.toLocaleString(), icon: 'user-minus', color: '#6B7280', trend: -5 },
                { id: '7', title: 'Blocked', value: customerStats.blockedCustomers.toLocaleString(), icon: 'user', color: '#EF4444', trend: -3 },
                { id: '8', title: 'Growth Rate', value: `+${Math.round((customerStats.newCustomers / (customerStats.totalCustomers || 1)) * 100)}%`, icon: 'trending-up', color: '#6366F1', trend: 0 },
            ]);

            // Update filter chips
            setFilterChips([
                { id: 'all', label: 'All Customers', count: customerStats.totalCustomers },
                { id: 'new', label: 'New', count: customerStats.newCustomers },
                { id: 'active', label: 'Active', count: customerStats.activeCustomers },
                { id: 'vip', label: 'VIP', count: customerStats.vipCustomers },
                { id: 'returning', label: 'Returning', count: customerStats.returningCustomers },
                { id: 'premium', label: 'Premium', count: customerStats.premiumCustomers },
                { id: 'inactive', label: 'Inactive', count: customerStats.inactiveCustomers },
                { id: 'blocked', label: 'Blocked', count: customerStats.blockedCustomers },
            ]);

            // Update segments
            setSegments([
                { id: '1', name: 'VIP Customers', count: customerStats.vipCustomers || 0, revenue: customerStats.vipCustomers * 500, growth: 22, color: '#EC4899' },
                { id: '2', name: 'Premium Users', count: customerStats.premiumCustomers || 0, revenue: customerStats.premiumCustomers * 300, growth: 18, color: '#F59E0B' },
                { id: '3', name: 'Active Customers', count: customerStats.activeCustomers || 0, revenue: customerStats.activeCustomers * 200, growth: 15, color: '#10B981' },
                { id: '4', name: 'At-Risk', count: customerStats.inactiveCustomers || 0, revenue: customerStats.inactiveCustomers * 50, growth: -8, color: '#EF4444' },
            ]);

        } catch (error) {
            console.error('Error fetching customer data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchDashboardData();
        setRefreshing(false);
    }, [fetchDashboardData]);

    const loadMoreCustomers = useCallback(async () => {
        if (isLoadingMore || customers.length >= totalCustomers) return;
        
        setIsLoadingMore(true);
        try {
            const nextPage = currentPage + 1;
            const response = await fetchCustomers(nextPage, 20);
            setCustomers(prev => [...prev, ...response.customers]);
            setCurrentPage(nextPage);
        } catch (error) {
            console.error('Error loading more customers:', error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [currentPage, isLoadingMore, customers.length, totalCustomers]);

    const toggleCustomerSelection = useCallback((customerId: string) => {
        setSelectedCustomers(prev => 
            prev.includes(customerId) ? prev.filter(id => id !== customerId) : [...prev, customerId]
        );
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedCustomers([]);
        setIsBulkMode(false);
    }, []);

    const filteredCustomers = useMemo(() => {
        let filtered = customers;
        
        if (selectedFilter !== 'all') {
            filtered = filtered.filter(c => c.status === selectedFilter);
        }
        
        if (searchText) {
            const query = searchText.toLowerCase();
            filtered = filtered.filter(c => 
                c.name.toLowerCase().includes(query) ||
                c.email.toLowerCase().includes(query) ||
                c.phone.includes(query) ||
                c.customerId.toLowerCase().includes(query)
            );
        }
        
        return filtered;
    }, [selectedFilter, searchText, customers]);


    // Initial data fetch
    useEffect(() => {
        fetchDashboardData();
    }, []);

    const renderCustomerItem = ({ item, index }: { item: Customer; index: number }) => (
        <CustomerCard
            customer={item}
            index={index}

        />
    );

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ fontSize: 16, color: '#6B7280' }}>Loading Customers...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

            <Animated.View style={[styles.headerContainer, headerAnimatedStyle]}>
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.headerTitle}>Customers</Text>
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
                data={filteredCustomers}
                keyExtractor={(item) => item.id}
                renderItem={renderCustomerItem}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={['#3B82F6']} />
                }
                onEndReached={loadMoreCustomers}
                onEndReachedThreshold={0.3}
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
                                    placeholder="Search customers by name, email, phone, or ID..."
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
                        {selectedCustomers.length > 0 && (
                            <Animated.View entering={FadeInDown.springify()} style={styles.bulkToolbar}>
                                <View style={styles.bulkInfo}>
                                    <Text style={styles.bulkCount}>{selectedCustomers.length} selected</Text>
                                </View>
                                <View style={styles.bulkActions}>
                                    <TouchableOpacity style={styles.bulkAction}>
                                        <Feather name="mail" size={18} color="#3B82F6" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.bulkAction}>
                                        <Feather name="download" size={18} color="#10B981" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.bulkAction}>
                                        <Feather name="user-x" size={18} color="#EF4444" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.bulkAction} onPress={clearSelection}>
                                        <Ionicons name="close" size={18} color="#6B7280" />
                                    </TouchableOpacity>
                                </View>
                            </Animated.View>
                        )}

                        {/* Customers Header */}
                        <SectionHeader title="All Customers" count={filteredCustomers.length} />

                        {/* Customer Segments */}
                        <View style={styles.segmentsSection}>
                            <SectionHeader title="Customer Segments" showSeeAll={false} />
                            <FlatList
                                data={segments}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                renderItem={({ item, index }) => <SegmentCard segment={item} index={index} />}
                                keyExtractor={(item) => item.id}
                                contentContainerStyle={styles.segmentsList}
                            />
                        </View>

                        {/* Top Customers */}
                        {topCustomers.length > 0 && (
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
                        )}

                        {/* Customer Activity Feed */}
                        {recentActivities.length > 0 && (
                            <View style={styles.activitySection}>
                                <SectionHeader title="Recent Customer Activity" showSeeAll={false} />
                                <View style={styles.activityContainer}>
                                    {recentActivities.map((activity, index) => (
                                        <ActivityItem key={activity.id} activity={activity} index={index} />
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Customer Lifetime Value */}
                        <View style={styles.valueSection}>
                            <SectionHeader title="Customer Value Analytics" showSeeAll={false} />
                            <CustomerValueAnalytics stats={stats} />
                        </View>

                        {/* Support Overview */}
                        <View style={styles.supportSection}>
                            <SectionHeader title="Support Status" showSeeAll={false} />
                            <SupportOverview data={supportData} />
                        </View>

                        {/* AI Insights */}
                        <View style={styles.insightsSection}>
                            <SectionHeader title="AI Customer Insights" showSeeAll={false} />
                            <InsightCard 
                                insight={{ 
                                    id: '1', 
                                    message: `VIP customers contributed ${stats.totalCustomers > 0 ? Math.round((stats.vipCustomers / stats.totalCustomers) * 100) : 0}% of customer base. Great engagement.`, 
                                    type: 'positive' 
                                }} 
                                index={0} 
                            />
                            <InsightCard 
                                insight={{ 
                                    id: '2', 
                                    message: `Customer retention increased by ${stats.totalCustomers > 0 ? Math.round((stats.returningCustomers / stats.totalCustomers) * 100) : 0}% this month.`, 
                                    type: 'positive' 
                                }} 
                                index={1} 
                            />
                            <InsightCard 
                                insight={{ 
                                    id: '3', 
                                    message: `${stats.inactiveCustomers} customers are at risk of churn based on activity patterns.`, 
                                    type: 'warning' 
                                }} 
                                index={2} 
                            />
                        </View>

                        {/* CRM Health Checklist */}
                        <View style={styles.healthSection}>
                            <SectionHeader title="Customer Database Health" showSeeAll={false} />
                            <View style={styles.healthContainer}>
                                {[
                                    { id: '1', label: 'Customer Profiles Complete', completed: stats.totalCustomers > 0 },
                                    { id: '2', label: 'Email Verification Enabled', completed: true },
                                    { id: '3', label: 'Loyalty Program Active', completed: stats.vipCustomers > 0 },
                                    { id: '4', label: 'CRM Sync Completed', completed: stats.totalCustomers > 10 },
                                    { id: '5', label: 'Customer Segments Updated', completed: segments.length > 0 },
                                ].map((item) => (
                                    <View key={item.id} style={styles.healthItem}>
                                        <View style={[styles.healthCircle, item.completed && styles.healthCircleCompleted]}>
                                            {item.completed && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
                                        </View>
                                        <Text style={[styles.healthLabel, item.completed && styles.healthLabelCompleted]}>{item.label}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                }
                ListFooterComponent={
                    <>
                        {isLoadingMore && (
                            <View style={styles.loadingMore}>
                                <Text style={styles.loadingMoreText}>Loading more customers...</Text>
                            </View>
                        )}
                        <View style={[styles.footerSpacing, { height: insets.bottom + 80 }]} />
                    </>
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Feather name="users" size={80} color="#D1D5DB" />
                        <Text style={styles.emptyStateTitle}>No Customers Found</Text>
                        <Text style={styles.emptyStateDescription}>
                            Customer records will appear here as users register and place orders.
                        </Text>
                       
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
        width: 105,
        marginHorizontal: 6,
    },
    analyticsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 12,
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
        marginBottom: 8,
    },
    analyticsValue: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1F2937',
    },
    analyticsTitle: {
        fontSize: 9,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 2,
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
    customerCardContainer: {
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    customerCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    customerCardHeader: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    customerAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        marginRight: 12,
    },
    customerHeaderInfo: {
        flex: 1,
    },
    customerNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    customerName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    customerId: {
        fontSize: 11,
        color: '#6B7280',
        marginBottom: 2,
    },
    customerEmail: {
        fontSize: 12,
        color: '#4B5563',
    },
    customerPhone: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 9,
        fontWeight: '600',
    },
    customerStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
    },
    customerStat: {
        alignItems: 'center',
    },
    customerStatValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    customerStatLabel: {
        fontSize: 10,
        color: '#6B7280',
        marginTop: 2,
    },
    customerFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    customerLocation: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    customerLocationText: {
        fontSize: 11,
        color: '#6B7280',
    },
    membershipBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    membershipText: {
        fontSize: 9,
        fontWeight: '600',
    },
    customerCardActions: {
        flexDirection: 'row',
        gap: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    customerActionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#F9FAFB',
        paddingVertical: 8,
        borderRadius: 12,
    },
    customerActionText: {
        fontSize: 12,
        color: '#6B7280',
    },
    segmentsSection: {
        marginBottom: 24,
    },
    segmentsList: {
        paddingHorizontal: 16,
    },
    segmentCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        marginHorizontal: 6,
        width: 150,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    segmentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    segmentColor: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    segmentName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1F2937',
    },
    segmentCount: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 2,
    },
    segmentRevenue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#10B981',
        marginBottom: 8,
    },
    segmentGrowth: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        gap: 2,
    },
    segmentGrowthText: {
        fontSize: 10,
        fontWeight: '600',
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
        width: 220,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    topCustomerAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    topCustomerStat: {
        fontSize: 11,
        color: '#6B7280',
    },
    topCustomerSpend: {
        fontSize: 12,
        fontWeight: '600',
        color: '#3B82F6',
    },
    topCustomerLoyalty: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    topCustomerLoyaltyText: {
        fontSize: 10,
        color: '#F59E0B',
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
    activityDescription: {
        fontSize: 13,
        color: '#1F2937',
    },
    activityCustomer: {
        fontWeight: '600',
        color: '#3B82F6',
    },
    activityTime: {
        fontSize: 10,
        color: '#9CA3AF',
        marginTop: 2,
    },
    valueSection: {
        marginBottom: 24,
    },
    valueAnalyticsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        marginHorizontal: 16,
        padding: 16,
        gap: 12,
    },
    valueMetric: {
        flex: 1,
        minWidth: '45%',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 12,
    },
    valueMetricLabel: {
        fontSize: 11,
        color: '#6B7280',
        marginBottom: 4,
    },
    valueMetricValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    supportSection: {
        marginBottom: 24,
    },
    supportContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        marginHorizontal: 16,
        padding: 16,
        gap: 12,
    },
    supportMetric: {
        flex: 1,
        minWidth: '30%',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 12,
    },
    supportMetricValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    supportMetricLabel: {
        fontSize: 10,
        color: '#6B7280',
        marginTop: 4,
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
    healthSection: {
        marginBottom: 24,
    },
    healthContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        marginHorizontal: 16,
        padding: 16,
        gap: 12,
    },
    healthItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    healthCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    healthCircleCompleted: {
        backgroundColor: '#10B981',
        borderColor: '#10B981',
    },
    healthLabel: {
        fontSize: 13,
        color: '#6B7280',
    },
    healthLabelCompleted: {
        color: '#10B981',
        textDecorationLine: 'line-through',
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