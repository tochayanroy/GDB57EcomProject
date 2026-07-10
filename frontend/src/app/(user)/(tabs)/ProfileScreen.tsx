// ProfileScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import FontAwesome from 'react-native-vector-icons/FontAwesome5';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';

// ============================================
// TYPES & INTERFACES
// ============================================

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  role: string;
  addresses: Address[];
  wishlist: string[];
  orders: string[];
  cart: string | null;
  notifications: string[];
  reviews: string[];
  createdAt: string;
  updatedAt: string;
}

interface Address {
  _id: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault?: boolean;
}

interface Order {
  _id: string;
  orderId: string;
  status: string;
  totalPrice: number;
  createdAt: string;
}

interface PaymentMethod {
  _id: string;
  type: 'Visa' | 'MasterCard' | 'UPI' | 'PayPal';
  last4?: string;
  upiId?: string;
  expiry?: string;
  isDefault?: boolean;
}

interface Coupon {
  _id: string;
  code: string;
  discount: string;
  description: string;
  expiresAt: string;
}

interface Activity {
  _id: string;
  type: 'order' | 'view' | 'coupon' | 'profile';
  title: string;
  description: string;
  createdAt: string;
}

interface OrderSummary {
  totalOrders: number;
  wishlistItems: number;
  savedAddresses: number;
  rewardPoints: number;
}

interface OrderStatus {
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  count: number;
  icon: string;
  color: string;
  label: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

// ============================================
// API SERVICE
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

// User API
const userAPI = {
  getProfile: () =>
    apiRequest<ApiResponse<User>>('/users/profile'),
  
  updateProfile: (data: Partial<User>) =>
    apiRequest<ApiResponse<User>>('/users/profile', 'PUT', data),
  
  getAddresses: () =>
    apiRequest<ApiResponse<Address[]>>('/users/addresses'),
  
  addAddress: (address: Partial<Address>) =>
    apiRequest<ApiResponse<Address>>('/users/address', 'POST', address),
  
  updateAddress: (id: string, address: Partial<Address>) =>
    apiRequest<ApiResponse<Address>>(`/users/address/${id}`, 'PUT', address),
  
  deleteAddress: (id: string) =>
    apiRequest<ApiResponse<null>>(`/users/address/${id}`, 'DELETE'),
};

// Order API
const orderAPI = {
  getMyOrders: (page = 1, limit = 10) =>
    apiRequest<{ success: boolean; data: { orders: Order[]; pagination: any } }>(
      `/order/my-orders?page=${page}&limit=${limit}`
    ),
  
  getOrderStats: () =>
    apiRequest<{ success: boolean; data: any }>('/order/stats/my-stats'),
};

// Wishlist API
const wishlistAPI = {
  getWishlist: () =>
    apiRequest<{ success: boolean; data: any }>('/wishlist'),
  
  getSummary: () =>
    apiRequest<{ success: boolean; data: { totalItems: number; hasItems: boolean } }>('/wishlist/summary'),
};

// Notification API
const notificationAPI = {
  getNotifications: (page = 1, limit = 20) =>
    apiRequest<{ success: boolean; data: { notifications: any[]; unreadCount: number; pagination: any } }>(
      `/notification?page=${page}&limit=${limit}`
    ),
  
  getSummary: () =>
    apiRequest<{ success: boolean; data: any }>('/notification/preferences/summary'),
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const getOrderStatusInfo = (status: string): { label: string; icon: string; color: string } => {
  const statusMap: Record<string, { label: string; icon: string; color: string }> = {
    'pending': { label: 'Pending', icon: 'clock', color: '#F59E0B' },
    'confirmed': { label: 'Confirmed', icon: 'check-circle', color: '#2563EB' },
    'processing': { label: 'Processing', icon: 'refresh-cw', color: '#60A5FA' },
    'shipped': { label: 'Shipped', icon: 'truck', color: '#8B5CF6' },
    'delivered': { label: 'Delivered', icon: 'check-circle', color: '#22C55E' },
    'cancelled': { label: 'Cancelled', icon: 'x-circle', color: '#EF4444' },
    'returned': { label: 'Returned', icon: 'rotate-ccw', color: '#F59E0B' },
  };
  return statusMap[status] || { label: status, icon: 'circle', color: '#64748B' };
};

const formatDate = (date: string): string => {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
};

// ============================================
// COMPONENTS
// ============================================

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const EmptyState: React.FC<{ title: string; description: string; icon: string; onPress: () => void }> = ({
  title,
  description,
  icon,
  onPress,
}) => (
  <Animated.View entering={FadeInDown.delay(200)} style={styles.emptyStateContainer}>
    <View style={styles.emptyStateIconContainer}>
      <Icon name={icon} size={48} color="#94A3B8" />
    </View>
    <Text style={styles.emptyStateTitle}>{title}</Text>
    <Text style={styles.emptyStateDescription}>{description}</Text>
    <TouchableOpacity style={styles.emptyStateButton} onPress={onPress}>
      <Text style={styles.emptyStateButtonText}>Add Now</Text>
    </TouchableOpacity>
  </Animated.View>
);

const ProfileCard: React.FC<{ user: User; onEditPress: () => void }> = ({ user, onEditPress }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.97, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 100 });
  };

  const avatarUrl = user.avatar || 'https://via.placeholder.com/80';
  const membership = user.role === 'admin' ? 'Premium' : 'Gold';

  return (
    <Animated.View entering={FadeInDown.delay(100)} style={styles.profileCard}>
      <View style={styles.profileHeader}>
        <Image source={{ uri: avatarUrl }} style={styles.profileImage} />
        <View style={styles.profileInfo}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <Text style={styles.userPhone}>{user.phone}</Text>
          <View style={styles.badgeContainer}>
            <View style={[styles.membershipBadge, { backgroundColor: '#8B5CF6' + '15' }]}>
              <Text style={[styles.membershipText, { color: '#8B5CF6' }]}>{membership} Member</Text>
            </View>
          </View>
        </View>
      </View>
      <AnimatedTouchable
        style={[styles.editButton, animatedStyle]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onEditPress}
        activeOpacity={1}
      >
        <Text style={styles.editButtonText}>Edit Profile</Text>
      </AnimatedTouchable>
    </Animated.View>
  );
};

const StatCard: React.FC<{ label: string; value: number | string; icon: string }> = ({ label, value, icon }) => (
  <Animated.View entering={FadeInUp.delay(150)} style={styles.statCard}>
    <View style={styles.statIconContainer}>
      <Icon name={icon} size={20} color="#2563EB" />
    </View>
    <Text style={styles.statValue}>{typeof value === 'number' ? value : value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </Animated.View>
);

const QuickActionCard: React.FC<{ title: string; icon: string; onPress: () => void }> = ({ title, icon, onPress }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.95, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 100 });
  };

  return (
    <AnimatedTouchable
      style={[styles.quickActionCard, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      activeOpacity={1}
    >
      <View style={styles.quickActionIconContainer}>
        <Icon name={icon} size={24} color="#2563EB" />
      </View>
      <Text style={styles.quickActionTitle}>{title}</Text>
    </AnimatedTouchable>
  );
};

const OrderStatusCard: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const info = getOrderStatusInfo(status.status);
  return (
    <View style={styles.orderStatusCard}>
      <View style={[styles.orderStatusIcon, { backgroundColor: status.color + '15' }]}>
        <Icon name={info.icon} size={20} color={status.color} />
      </View>
      <Text style={styles.orderStatusCount}>{status.count}</Text>
      <Text style={styles.orderStatusLabel}>{info.label}</Text>
    </View>
  );
};

const AddressCard: React.FC<{ address: Address; onPress: () => void }> = ({ address, onPress }) => (
  <TouchableOpacity style={styles.addressCard} onPress={onPress}>
    <View style={styles.addressHeader}>
      <Icon name="home" size={18} color="#2563EB" />
      <Text style={styles.addressType}>{address.fullName}</Text>
      {address.isDefault && <View style={styles.defaultBadge}><Text style={styles.defaultText}>Default</Text></View>}
    </View>
    <Text style={styles.addressText}>{address.street}</Text>
    <Text style={styles.addressCity}>{address.city}, {address.state} - {address.zipCode}</Text>
    <Text style={styles.addressPhone}>{address.phone}</Text>
  </TouchableOpacity>
);

const ActivityItem: React.FC<{ activity: Activity }> = ({ activity }) => {
  const iconMap: Record<string, string> = {
    'order': 'package',
    'view': 'eye',
    'coupon': 'gift',
    'profile': 'user',
  };
  
  return (
    <View style={styles.activityItem}>
      <View style={styles.activityIconContainer}>
        <Icon name={iconMap[activity.type] || 'circle'} size={18} color="#2563EB" />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>{activity.title}</Text>
        <Text style={styles.activityDescription}>{activity.description}</Text>
        <Text style={styles.activityTime}>{formatDate(activity.createdAt)}</Text>
      </View>
    </View>
  );
};

const SettingRow: React.FC<{ item: SettingItem; onPress: () => void }> = ({ item, onPress }) => (
  <TouchableOpacity style={styles.settingRow} onPress={onPress}>
    <View style={styles.settingIconContainer}>
      <Icon name={item.icon} size={22} color="#64748B" />
    </View>
    <View style={styles.settingContent}>
      <Text style={styles.settingTitle}>{item.title}</Text>
      <Text style={styles.settingDescription}>{item.description}</Text>
    </View>
    <Icon name="chevron-right" size={20} color="#CBD5E1" />
  </TouchableOpacity>
);

// ============================================
// SETTINGS & HELP DATA (Static)
// ============================================

interface SettingItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconType: 'Feather' | 'Material' | 'FontAwesome';
}

interface HelpItem {
  id: string;
  title: string;
  icon: string;
  iconType: 'Feather' | 'Material' | 'FontAwesome';
}

const SETTINGS_MENU: SettingItem[] = [
  { id: '1', title: 'Personal Information', description: 'Update your details', icon: 'user', iconType: 'Feather' },
  { id: '2', title: 'Security & Privacy', description: 'Password, 2FA, data', icon: 'shield', iconType: 'Feather' },
  { id: '3', title: 'Notification Settings', description: 'Manage alerts', icon: 'bell', iconType: 'Feather' },
  { id: '4', title: 'Language', description: 'English (US)', icon: 'globe', iconType: 'Feather' },
  { id: '5', title: 'Appearance', description: 'Light / Dark mode', icon: 'moon', iconType: 'Feather' },
  { id: '6', title: 'App Preferences', description: 'Units, currency', icon: 'settings', iconType: 'Feather' },
  { id: '7', title: 'Order Preferences', description: 'Auto-accept, defaults', icon: 'shopping-bag', iconType: 'Feather' },
  { id: '8', title: 'Address Book', description: 'Manage saved locations', icon: 'map-pin', iconType: 'Feather' },
];

const HELP_MENU: HelpItem[] = [
  { id: '1', title: 'Help Center', icon: 'help-circle', iconType: 'Feather' },
  { id: '2', title: 'FAQs', icon: 'message-circle', iconType: 'Feather' },
  { id: '3', title: 'Live Chat', icon: 'message-square', iconType: 'Feather' },
  { id: '4', title: 'Contact Support', icon: 'headphones', iconType: 'Feather' },
  { id: '5', title: 'Return Policy', icon: 'refresh-cw', iconType: 'Feather' },
  { id: '6', title: 'Terms & Conditions', icon: 'file-text', iconType: 'Feather' },
  { id: '7', title: 'Privacy Policy', icon: 'lock', iconType: 'Feather' },
];

// ============================================
// MAIN PROFILE SCREEN
// ============================================

const ProfileScreen: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderStats, setOrderStats] = useState<any>(null);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orderStatusCounts, setOrderStatusCounts] = useState<OrderStatus[]>([]);
  
  const scrollViewRef = useRef<ScrollView>(null);

  // Load profile data
  const loadProfileData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get user profile
      const userResponse = await userAPI.getProfile();
      if (userResponse.success && userResponse.data) {
        setUser(userResponse.data);
        if (userResponse.data.addresses) {
          setAddresses(userResponse.data.addresses);
        }
      }
      
      // Get wishlist summary
      try {
        const wishlistResponse = await wishlistAPI.getSummary();
        if (wishlistResponse.success) {
          setWishlistCount(wishlistResponse.data.totalItems || 0);
        }
      } catch (error) {
        console.log('Error loading wishlist:', error);
      }
      
      // Get order stats
      try {
        const statsResponse = await orderAPI.getOrderStats();
        if (statsResponse.success) {
          setOrderStats(statsResponse.data);
        }
      } catch (error) {
        console.log('Error loading order stats:', error);
      }
      
      // Get orders
      try {
        const ordersResponse = await orderAPI.getMyOrders(1, 5);
        if (ordersResponse.success) {
          setOrders(ordersResponse.data.orders || []);
          
          // Calculate order status counts
          const statusMap: Record<string, number> = {};
          (ordersResponse.data.orders || []).forEach((order: Order) => {
            statusMap[order.status] = (statusMap[order.status] || 0) + 1;
          });
          
          const statuses: OrderStatus[] = [
            'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'
          ].map(status => ({
            status: status as any,
            count: statusMap[status] || 0,
            icon: getOrderStatusInfo(status).icon,
            color: getOrderStatusInfo(status).color,
            label: getOrderStatusInfo(status).label,
          }));
          setOrderStatusCounts(statuses);
        }
      } catch (error) {
        console.log('Error loading orders:', error);
      }
      
      // Get notifications as activities
      try {
        const notifResponse = await notificationAPI.getNotifications(1, 5);
        if (notifResponse.success) {
          const activities = notifResponse.data.notifications.map((n: any) => ({
            _id: n._id,
            type: n.type || 'profile',
            title: n.title || 'Notification',
            description: n.message || '',
            createdAt: n.createdAt,
          }));
          setActivities(activities);
        }
      } catch (error) {
        console.log('Error loading notifications:', error);
      }
      
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadProfileData();
  }, []);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [])
  );

  // Handlers
  const handleEditProfile = useCallback(() => {
    router.push('/edit-profile');
  }, []);

  const handleAddAddress = useCallback(() => {
    router.push('/add-address');
  }, []);

  const handleAddPayment = useCallback(() => {
    router.push('/add-payment');
  }, []);

  const handleLogout = useCallback(async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('authToken');
              router.replace('/login');
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
  }, []);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Implement account deletion
            Alert.alert('Account Deletion', 'Your account deletion request has been submitted.');
          }
        }
      ]
    );
  }, []);

  const handleRefer = useCallback(() => {
    Alert.alert('Refer & Earn', 'Share your referral code with friends');
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfileData();
  }, [loadProfileData]);

  const quickActions = useMemo(() => [
    { title: 'My Orders', icon: 'package', onPress: () => router.push('/orders') },
    { title: 'Wishlist', icon: 'heart', onPress: () => router.push('/wishlist') },
    { title: 'Notifications', icon: 'bell', onPress: () => router.push('/notifications') },
    { title: 'Addresses', icon: 'map-pin', onPress: () => router.push('/address-book') },
  ], []);

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <Icon name="arrow-left" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/settings')}>
            <Icon name="settings" size={24} color="#0F172A" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <Icon name="arrow-left" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/settings')}>
            <Icon name="settings" size={24} color="#0F172A" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={60} color="#EF4444" />
          <Text style={styles.errorTitle}>Failed to load profile</Text>
          <TouchableOpacity style={styles.errorButton} onPress={loadProfileData}>
            <Text style={styles.errorButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const totalOrders = orderStats?.stats?.totalOrders || 0;
  const totalSpent = orderStats?.stats?.totalSpent || 0;
  const rewardPoints = Math.floor(totalSpent / 100) || 0;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        
        <Animated.View entering={FadeIn.delay(300)} style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <Icon name="arrow-left" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/settings')}>
            <Icon name="settings" size={24} color="#0F172A" />
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
          {/* Profile Card */}
          <ProfileCard user={user} onEditPress={handleEditProfile} />

          {/* Account Overview */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Overview</Text>
            <View style={styles.statsGrid}>
              <StatCard label="Total Orders" value={totalOrders} icon="shopping-bag" />
              <StatCard label="Wishlist" value={wishlistCount} icon="heart" />
              <StatCard label="Addresses" value={addresses.length} icon="map-pin" />
              <StatCard label="Reward Points" value={rewardPoints} icon="star" />
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <FlatList
              data={quickActions}
              renderItem={({ item }) => <QuickActionCard {...item} />}
              keyExtractor={(item) => item.title}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickActionsContainer}
              removeClippedSubviews={true}
              maxToRenderPerBatch={4}
              windowSize={5}
            />
          </View>

          {/* My Orders Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Orders</Text>
              <TouchableOpacity onPress={() => router.push('/orders')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.orderStatusGrid}>
              {orderStatusCounts.map((status) => (
                <OrderStatusCard key={status.status} status={status} />
              ))}
            </View>
          </View>

          {/* Saved Addresses */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Saved Addresses</Text>
              <TouchableOpacity onPress={handleAddAddress}>
                <Icon name="plus" size={20} color="#2563EB" />
              </TouchableOpacity>
            </View>
            {addresses.length > 0 ? (
              <View style={styles.addressesContainer}>
                {addresses.slice(0, 2).map((address) => (
                  <AddressCard key={address._id} address={address} onPress={() => router.push({ pathname: '/address-detail', params: { addressId: address._id } })} />
                ))}
                {addresses.length > 2 && (
                  <TouchableOpacity style={styles.viewAllAddresses} onPress={() => router.push('/address-book')}>
                    <Text style={styles.viewAllAddressesText}>View all {addresses.length} addresses</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <EmptyState
                title="No Addresses"
                description="Add your first address for faster checkout"
                icon="map-pin"
                onPress={handleAddAddress}
              />
            )}
          </View>

          {/* Recent Activity */}
          {activities.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                <TouchableOpacity onPress={() => router.push('/notifications')}>
                  <Text style={styles.seeAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.activitiesContainer}>
                {activities.map((activity) => (
                  <ActivityItem key={activity._id} activity={activity} />
                ))}
              </View>
            </View>
          )}

          {/* Refer & Earn Card */}
          <Animated.View entering={FadeInDown.delay(200)} style={styles.referCard}>
            <View style={styles.referContent}>
              <View>
                <Text style={styles.referTitle}>Refer & Earn</Text>
                <Text style={styles.referDescription}>Invite friends and get ₹500 credits</Text>
                <TouchableOpacity style={styles.referButton} onPress={handleRefer}>
                  <Text style={styles.referButtonText}>Invite Friends</Text>
                </TouchableOpacity>
              </View>
              <Icon name="gift" size={60} color="#8B5CF6" style={styles.referIcon} />
            </View>
          </Animated.View>

          {/* Account Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Settings</Text>
            <View style={styles.settingsContainer}>
              {SETTINGS_MENU.map((item) => (
                <SettingRow key={item.id} item={item} onPress={() => router.push(`/${item.title.toLowerCase().replace(/\s/g, '-')}`)} />
              ))}
            </View>
          </View>

          {/* Help & Support */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Help & Support</Text>
            <View style={styles.helpContainer}>
              {HELP_MENU.map((item) => (
                <HelpRow key={item.id} item={item} onPress={() => {}} />
              ))}
            </View>
          </View>

          {/* Logout Section */}
          <View style={styles.logoutSection}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Icon name="log-out" size={20} color="#EF4444" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
              <Text style={styles.deleteText}>Delete Account</Text>
            </TouchableOpacity>
          </View>

          {/* App Version */}
          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>Version 1.0.0</Text>
            <Text style={styles.footerText}>Made with ❤️ for your shopping experience</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

// ============================================
// HELP ROW COMPONENT
// ============================================

const HelpRow: React.FC<{ item: HelpItem; onPress: () => void }> = ({ item, onPress }) => (
  <TouchableOpacity style={styles.helpRow} onPress={onPress}>
    <View style={styles.helpIconContainer}>
      {item.iconType === 'Feather' && <Icon name={item.icon} size={20} color="#64748B" />}
      {item.iconType === 'FontAwesome' && <FontAwesome name={item.icon} size={20} color="#64748B" />}
    </View>
    <Text style={styles.helpTitle}>{item.title}</Text>
    <Icon name="chevron-right" size={20} color="#CBD5E1" style={{ marginLeft: 'auto' }} />
  </TouchableOpacity>
);

// ============================================
// STYLES
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
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563EB',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    marginTop: 12,
    padding: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  profileHeader: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
  },
  membershipBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  membershipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  editButton: {
    borderWidth: 1,
    borderColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 56) / 2,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  quickActionsContainer: {
    paddingRight: 20,
  },
  quickActionCard: {
    width: 100,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    marginRight: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  quickActionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
    textAlign: 'center',
  },
  orderStatusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  orderStatusCard: {
    width: (width - 56) / 3,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  orderStatusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderStatusCount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  orderStatusLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  addressesContainer: {
    gap: 12,
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  addressType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  defaultBadge: {
    backgroundColor: '#22C55E15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  defaultText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#22C55E',
  },
  addressText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  addressCity: {
    fontSize: 13,
    color: '#94A3B8',
  },
  addressPhone: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  viewAllAddresses: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  viewAllAddressesText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
  activitiesContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  activityIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#94A3B8',
  },
  settingsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#64748B',
  },
  helpContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  helpIconContainer: {
    width: 32,
    marginRight: 12,
  },
  helpTitle: {
    fontSize: 15,
    color: '#0F172A',
  },
  referCard: {
    backgroundColor: '#F3E8FF',
    marginHorizontal: 20,
    marginTop: 24,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  referContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  referTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B21A5',
    marginBottom: 4,
  },
  referDescription: {
    fontSize: 14,
    color: '#7E22CE',
    marginBottom: 16,
  },
  referButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  referButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  referIcon: {
    opacity: 0.8,
  },
  logoutSection: {
    marginTop: 32,
    paddingHorizontal: 20,
    gap: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  deleteText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 20,
  },
  versionText: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
  },
  emptyStateIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  emptyStateButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ProfileScreen;