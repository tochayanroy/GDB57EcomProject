import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
    Dimensions,
    FlatList,
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

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  alternatePhone: string;
  avatar: string;
  customerId: string;
  status: 'active' | 'vip' | 'premium' | 'inactive' | 'blocked';
  loyaltyLevel: 'silver' | 'gold' | 'platinum' | 'diamond';
  createdAt: string;
  membershipDuration: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  language: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  identityVerified: boolean;
  totalOrders: number;
  lifetimeSpend: number;
  averageOrderValue: number;
  rewardPoints: number;
  redeemedPoints: number;
  wishlistCount: number;
  reviewsCount: number;
  averageRating: number;
}

interface Address {
  id: string;
  type: 'home' | 'office' | 'other';
  recipientName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  lastUsed: string;
}

interface Order {
  id: string;
  orderId: string;
  date: string;
  status: 'delivered' | 'processing' | 'shipped' | 'cancelled';
  itemsCount: number;
  totalAmount: number;
  paymentStatus: 'paid' | 'pending' | 'failed';
  shippingStatus: string;
}

interface Activity {
  id: string;
  type: 'account' | 'order' | 'review' | 'wishlist' | 'profile' | 'reward' | 'support';
  description: string;
  timestamp: string;
  icon: string;
}

interface WishlistProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
}

interface Review {
  id: string;
  productName: string;
  productImage: string;
  rating: number;
  reviewText: string;
  date: string;
}

interface SupportTicket {
  id: string;
  ticketId: string;
  issueType: string;
  status: 'open' | 'resolved' | 'pending';
  createdAt: string;
}

interface Note {
  id: string;
  text: string;
  createdAt: string;
  createdBy: string;
}

// ============================================
// DUMMY DATA
// ============================================

const customer: Customer = {
  id: '1',
  name: 'Sarah Johnson',
  email: 'sarah.johnson@example.com',
  phone: '+1 (555) 123-4567',
  alternatePhone: '+1 (555) 123-4568',
  avatar: 'https://randomuser.me/api/portraits/women/1.jpg',
  customerId: 'CUST-10458',
  status: 'vip',
  loyaltyLevel: 'platinum',
  createdAt: '2024-01-15',
  membershipDuration: '5 months',
  dateOfBirth: '1988-06-15',
  gender: 'female',
  language: 'English',
  emailVerified: true,
  phoneVerified: true,
  identityVerified: false,
  totalOrders: 24,
  lifetimeSpend: 5680.50,
  averageOrderValue: 236.69,
  rewardPoints: 3450,
  redeemedPoints: 1250,
  wishlistCount: 12,
  reviewsCount: 8,
  averageRating: 4.8,
};

const addresses: Address[] = [
  {
    id: '1', type: 'home', recipientName: 'Sarah Johnson', phone: '+1 (555) 123-4567',
    address: '123 Main Street, Apt 4B', city: 'New York', state: 'NY', postalCode: '10001',
    country: 'United States', isDefault: true, lastUsed: '2024-06-15',
  },
  {
    id: '2', type: 'office', recipientName: 'Sarah Johnson (Work)', phone: '+1 (555) 123-4568',
    address: '456 Business Avenue, Floor 12', city: 'New York', state: 'NY', postalCode: '10002',
    country: 'United States', isDefault: false, lastUsed: '2024-05-20',
  },
];

const orders: Order[] = [
  { id: '1', orderId: '#ORD-10458', date: '2024-06-15', status: 'delivered', itemsCount: 3, totalAmount: 329.96, paymentStatus: 'paid', shippingStatus: 'Delivered' },
  { id: '2', orderId: '#ORD-10342', date: '2024-06-01', status: 'delivered', itemsCount: 2, totalAmount: 159.98, paymentStatus: 'paid', shippingStatus: 'Delivered' },
  { id: '3', orderId: '#ORD-10234', date: '2024-05-15', status: 'delivered', itemsCount: 5, totalAmount: 89.95, paymentStatus: 'paid', shippingStatus: 'Delivered' },
  { id: '4', orderId: '#ORD-10156', date: '2024-04-28', status: 'processing', itemsCount: 1, totalAmount: 49.99, paymentStatus: 'paid', shippingStatus: 'Processing' },
];

const activities: Activity[] = [
  { id: '1', type: 'order', description: 'Placed order #ORD-10458 for $329.96', timestamp: '2 days ago', icon: 'cart' },
  { id: '2', type: 'reward', description: 'Redeemed 500 reward points', timestamp: '5 days ago', icon: 'gift' },
  { id: '3', type: 'review', description: 'Left 5-star review for Premium Headphones', timestamp: '1 week ago', icon: 'star' },
  { id: '4', type: 'wishlist', description: 'Added 3 items to wishlist', timestamp: '2 weeks ago', icon: 'heart' },
  { id: '5', type: 'profile', description: 'Updated profile information', timestamp: '3 weeks ago', icon: 'person' },
];

const wishlistProducts: WishlistProduct[] = [
  { id: '1', name: 'Premium Wireless Headphones Pro', price: 299.99, category: 'Electronics', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200' },
  { id: '2', name: 'Smart Watch Ultra', price: 449.99, category: 'Electronics', image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=200' },
  { id: '3', name: 'Designer Handbag', price: 199.99, category: 'Fashion', image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=200' },
];

const reviews: Review[] = [
  { id: '1', productName: 'Premium Wireless Headphones Pro', productImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200', rating: 5, reviewText: 'Amazing sound quality! Best headphones I\'ve ever owned.', date: '2024-06-18' },
  { id: '2', productName: 'Smart Watch Ultra', productImage: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=200', rating: 5, reviewText: 'Great battery life and features.', date: '2024-06-05' },
  { id: '3', productName: 'Premium Cotton T-Shirt', productImage: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200', rating: 4, reviewText: 'Very comfortable, runs slightly small.', date: '2024-05-20' },
];

const supportTickets: SupportTicket[] = [
  { id: '1', ticketId: 'TKT-1001', issueType: 'Shipping Delay', status: 'resolved', createdAt: '2024-06-10' },
  { id: '2', ticketId: 'TKT-1002', issueType: 'Product Question', status: 'resolved', createdAt: '2024-05-25' },
  { id: '3', ticketId: 'TKT-1003', issueType: 'Return Request', status: 'pending', createdAt: '2024-06-14' },
];

const notes: Note[] = [
  { id: '1', text: 'VIP customer - priority support. Frequently buys electronics.', createdAt: '2024-01-20', createdBy: 'Support Team' },
  { id: '2', text: 'Customer prefers email communication over phone calls.', createdAt: '2024-02-15', createdBy: 'CRM Admin' },
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

const StatusBadge = ({ status }: { status: Customer['status'] }) => {
  const config = {
    active: { label: 'Active', color: '#10B981', bg: '#D1FAE5' },
    vip: { label: 'VIP', color: '#EC4899', bg: '#FCE7F3' },
    premium: { label: 'Premium', color: '#F59E0B', bg: '#FEF3C7' },
    inactive: { label: 'Inactive', color: '#6B7280', bg: '#F3F4F6' },
    blocked: { label: 'Blocked', color: '#EF4444', bg: '#FEE2E2' },
  };
  const { label, color, bg } = config[status];
  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
};

const LoyaltyBadge = ({ level }: { level: Customer['loyaltyLevel'] }) => {
  const config = {
    silver: { label: 'Silver', color: '#94A3B8', bg: '#F1F5F9' },
    gold: { label: 'Gold', color: '#F59E0B', bg: '#FEF3C7' },
    platinum: { label: 'Platinum', color: '#06B6D4', bg: '#CFFAFE' },
    diamond: { label: 'Diamond', color: '#8B5CF6', bg: '#EDE9FE' },
  };
  const { label, color, bg } = config[level];
  return (
    <View style={[styles.loyaltyBadge, { backgroundColor: bg }]}>
      <MaterialCommunityIcons name="crown" size={12} color={color} />
      <Text style={[styles.loyaltyText, { color }]}>{label}</Text>
    </View>
  );
};

const AnalyticsCard = ({ label, value, icon, color, trend }: { label: string; value: string; icon: string; color: string; trend?: number }) => (
  <View style={styles.analyticsCard}>
    <View style={[styles.analyticsIcon, { backgroundColor: `${color}15` }]}>
      <Feather name={icon as any} size={18} color={color} />
    </View>
    <Text style={styles.analyticsValue}>{value}</Text>
    <Text style={styles.analyticsLabel}>{label}</Text>
    {trend !== undefined && (
      <View style={[styles.analyticsTrend, { backgroundColor: trend >= 0 ? '#D1FAE5' : '#FEE2E2' }]}>
        <Ionicons name={trend >= 0 ? 'arrow-up' : 'arrow-down'} size={10} color={trend >= 0 ? '#10B981' : '#EF4444'} />
        <Text style={[styles.analyticsTrendText, { color: trend >= 0 ? '#10B981' : '#EF4444' }]}>{Math.abs(trend)}%</Text>
      </View>
    )}
  </View>
);

const ActivityItem = ({ activity, index }: { activity: Activity; index: number }) => {
  const getIconColor = () => {
    switch (activity.type) {
      case 'order': return '#3B82F6';
      case 'reward': return '#F59E0B';
      case 'review': return '#10B981';
      case 'wishlist': return '#EC4899';
      default: return '#6B7280';
    }
  };
  return (
    <Animated.View entering={FadeInLeft.delay(index * 30).springify()} style={styles.activityItem}>
      <View style={[styles.activityIcon, { backgroundColor: `${getIconColor()}15` }]}>
        <Ionicons name={activity.icon as any} size={16} color={getIconColor()} />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityDescription}>{activity.description}</Text>
        <Text style={styles.activityTime}>{activity.timestamp}</Text>
      </View>
    </Animated.View>
  );
};

const AddressCard = ({ address, index }: { address: Address; index: number }) => (
  <Animated.View entering={FadeInRight.delay(index * 50).springify()} style={styles.addressCard}>
    <View style={styles.addressHeader}>
      <View style={styles.addressTypeContainer}>
        <MaterialCommunityIcons name={address.type === 'home' ? 'home' : address.type === 'office' ? 'office-building' : 'map-marker'} size={16} color="#3B82F6" />
        <Text style={styles.addressType}>{address.type.charAt(0).toUpperCase() + address.type.slice(1)}</Text>
      </View>
      {address.isDefault && <View style={styles.defaultBadge}><Text style={styles.defaultText}>Default</Text></View>}
    </View>
    <Text style={styles.addressName}>{address.recipientName}</Text>
    <Text style={styles.addressPhone}>{address.phone}</Text>
    <Text style={styles.addressText}>{address.address}</Text>
    <Text style={styles.addressText}>{address.city}, {address.state} {address.postalCode}</Text>
    <Text style={styles.addressText}>{address.country}</Text>
    <Text style={styles.addressLastUsed}>Last used: {address.lastUsed}</Text>
    <View style={styles.addressActions}>
      <TouchableOpacity style={styles.addressAction}>
        <Ionicons name="copy-outline" size={14} color="#3B82F6" />
        <Text style={styles.addressActionText}>Copy</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.addressAction}>
        <Ionicons name="map-outline" size={14} color="#3B82F6" />
        <Text style={styles.addressActionText}>Map</Text>
      </TouchableOpacity>
    </View>
  </Animated.View>
);

const OrderCard = ({ order, index }: { order: Order; index: number }) => (
  <Animated.View entering={FadeInLeft.delay(index * 40).springify()} style={styles.orderCard}>
    <View style={styles.orderHeader}>
      <Text style={styles.orderId}>{order.orderId}</Text>
      <View style={[styles.orderStatusBadge, { backgroundColor: order.status === 'delivered' ? '#D1FAE5' : order.status === 'processing' ? '#FEF3C7' : '#FEE2E2' }]}>
        <Text style={[styles.orderStatusText, { color: order.status === 'delivered' ? '#10B981' : order.status === 'processing' ? '#F59E0B' : '#EF4444' }]}>
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </Text>
      </View>
    </View>
    <Text style={styles.orderDate}>{order.date}</Text>
    <View style={styles.orderDetails}>
      <Text style={styles.orderItems}>{order.itemsCount} items</Text>
      <Text style={styles.orderAmount}>${order.totalAmount.toFixed(2)}</Text>
    </View>
    <TouchableOpacity style={styles.viewOrderButton}>
      <Text style={styles.viewOrderText}>View Order</Text>
    </TouchableOpacity>
  </Animated.View>
);

const WishlistProductCard = ({ product, index }: { product: WishlistProduct; index: number }) => (
  <Animated.View entering={FadeInRight.delay(index * 40).springify()} style={styles.wishlistCard}>
    <Image source={{ uri: product.image }} style={styles.wishlistImage} />
    <View style={styles.wishlistInfo}>
      <Text style={styles.wishlistName} numberOfLines={1}>{product.name}</Text>
      <Text style={styles.wishlistCategory}>{product.category}</Text>
      <Text style={styles.wishlistPrice}>${product.price.toFixed(2)}</Text>
    </View>
  </Animated.View>
);

const ReviewCard = ({ review, index }: { review: Review; index: number }) => (
  <Animated.View entering={FadeInUp.delay(index * 50).springify()} style={styles.reviewCard}>
    <View style={styles.reviewHeader}>
      <Image source={{ uri: review.productImage }} style={styles.reviewImage} />
      <View style={styles.reviewInfo}>
        <Text style={styles.reviewProductName}>{review.productName}</Text>
        <View style={styles.reviewStars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons key={star} name={star <= review.rating ? 'star' : 'star-outline'} size={14} color="#FBBF24" />
          ))}
        </View>
      </View>
    </View>
    <Text style={styles.reviewText} numberOfLines={2}>{review.reviewText}</Text>
    <Text style={styles.reviewDate}>{review.date}</Text>
  </Animated.View>
);

const SupportTicketCard = ({ ticket, index }: { ticket: SupportTicket; index: number }) => (
  <Animated.View entering={FadeInLeft.delay(index * 30).springify()} style={styles.supportCard}>
    <View style={styles.supportHeader}>
      <Text style={styles.supportTicketId}>{ticket.ticketId}</Text>
      <View style={[styles.supportStatusBadge, { backgroundColor: ticket.status === 'resolved' ? '#D1FAE5' : ticket.status === 'open' ? '#FEE2E2' : '#FEF3C7' }]}>
        <Text style={[styles.supportStatusText, { color: ticket.status === 'resolved' ? '#10B981' : ticket.status === 'open' ? '#EF4444' : '#F59E0B' }]}>
          {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
        </Text>
      </View>
    </View>
    <Text style={styles.supportIssueType}>{ticket.issueType}</Text>
    <Text style={styles.supportDate}>{ticket.createdAt}</Text>
  </Animated.View>
);

const NoteItem = ({ note, index }: { note: Note; index: number }) => (
  <Animated.View entering={FadeInDown.delay(index * 30).springify()} style={styles.noteItem}>
    <Text style={styles.noteText}>{note.text}</Text>
    <View style={styles.noteMeta}>
      <Text style={styles.noteAuthor}>{note.createdBy}</Text>
      <Text style={styles.noteDate}>{note.createdAt}</Text>
    </View>
  </Animated.View>
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
          <Text style={styles.aiInsightTitle}>AI Customer Insight</Text>
          <Text style={styles.aiInsightMessage}>
            This customer has a 92% retention probability. Spending is 35% higher than store average.
            Qualifies for VIP support. Low churn risk detected.
          </Text>
        </View>
      </View>
    </LinearGradient>
  </Animated.View>
);

const CustomerHealthScore = () => (
  <View style={styles.healthContainer}>
    <View style={styles.healthScore}>
      <Text style={styles.healthScoreLabel}>Overall Health Score</Text>
      <Text style={styles.healthScoreValue}>94/100</Text>
      <View style={styles.healthBar}>
        <View style={[styles.healthBarFill, { width: '94%' }]} />
      </View>
    </View>
    <View style={styles.healthChecklist}>
      {[
        { label: 'Active Customer', completed: true },
        { label: 'Verified Contact Details', completed: true },
        { label: 'High Engagement', completed: true },
        { label: 'Repeat Purchases', completed: true },
        { label: 'Loyalty Member', completed: true },
        { label: 'Positive Feedback', completed: true },
      ].map((item, index) => (
        <View key={index} style={styles.healthItem}>
          <View style={[styles.healthCircle, item.completed && styles.healthCircleCompleted]}>
            {item.completed && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
          </View>
          <Text style={[styles.healthLabel, item.completed && styles.healthLabelCompleted]}>{item.label}</Text>
        </View>
      ))}
    </View>
  </View>
);

// ============================================
// MAIN CUSTOMER DETAILS SCREEN
// ============================================

export default function CustomerDetailsScreen() {
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

  const handleCall = () => {
    Linking.openURL(`tel:${customer.phone}`);
  };

  const handleEmail = () => {
    Linking.openURL(`mailto:${customer.email}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      <Animated.View style={[styles.headerContainer, headerAnimatedStyle]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customer Details</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerButton}>
              <Feather name="edit-2" size={20} color="#3B82F6" />
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
        {/* Customer Profile Hero Card */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Image source={{ uri: customer.avatar }} style={styles.profileAvatar} />
            <View style={styles.profileInfo}>
              <View style={styles.profileNameRow}>
                <Text style={styles.profileName}>{customer.name}</Text>
                <StatusBadge status={customer.status} />
              </View>
              <Text style={styles.profileId}>ID: {customer.customerId}</Text>
              <LoyaltyBadge level={customer.loyaltyLevel} />
              <View style={styles.profileContact}>
                <Text style={styles.profileEmail}>{customer.email}</Text>
                <Text style={styles.profilePhone}>{customer.phone}</Text>
              </View>
              <Text style={styles.profileMeta}>Member since {customer.createdAt} • {customer.membershipDuration}</Text>
            </View>
          </View>
          <View style={styles.profileActions}>
            <TouchableOpacity onPress={handleCall} style={styles.profileActionButton}>
              <Ionicons name="call-outline" size={18} color="#3B82F6" />
              <Text style={styles.profileActionText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleEmail} style={styles.profileActionButton}>
              <Ionicons name="mail-outline" size={18} color="#3B82F6" />
              <Text style={styles.profileActionText}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileActionButton}>
              <Ionicons name="chatbubble-outline" size={18} color="#3B82F6" />
              <Text style={styles.profileActionText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileActionButton}>
              <Ionicons name="receipt-outline" size={18} color="#3B82F6" />
              <Text style={styles.profileActionText}>Orders</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Customer Overview Analytics */}
        <View style={styles.analyticsSection}>
          <SectionHeader title="Customer Overview" icon="chart-line" />
          <FlatList
            data={[
              { label: 'Total Orders', value: customer.totalOrders.toString(), icon: 'shopping-bag', color: '#3B82F6' },
              { label: 'Lifetime Spend', value: `$${customer.lifetimeSpend.toFixed(0)}`, icon: 'dollar-sign', color: '#10B981', trend: 12 },
              { label: 'Avg Order', value: `$${customer.averageOrderValue.toFixed(0)}`, icon: 'trending-up', color: '#8B5CF6' },
              { label: 'Reward Points', value: customer.rewardPoints.toString(), icon: 'gift', color: '#F59E0B' },
              { label: 'Wishlist', value: customer.wishlistCount.toString(), icon: 'heart', color: '#EC4899' },
              { label: 'Reviews', value: customer.reviewsCount.toString(), icon: 'star', color: '#06B6D4' },
            ]}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => <AnalyticsCard {...item} />}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={styles.analyticsList}
          />
        </View>

        {/* Recent Activity Timeline */}
        <View style={styles.activitySection}>
          <SectionHeader title="Recent Activity" icon="history" />
          <View style={styles.activityContainer}>
            {activities.map((activity, index) => (
              <ActivityItem key={activity.id} activity={activity} index={index} />
            ))}
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.infoCard}>
          <SectionHeader title="Contact Details" icon="account" />
          <View style={styles.contactContainer}>
            <View style={styles.contactRow}>
              <Text style={styles.contactLabel}>Full Name</Text>
              <Text style={styles.contactValue}>{customer.name}</Text>
            </View>
            <View style={styles.contactRow}>
              <Text style={styles.contactLabel}>Email</Text>
              <View style={styles.contactValueRow}>
                <Text style={styles.contactValue}>{customer.email}</Text>
                {customer.emailVerified && <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>Verified</Text></View>}
              </View>
            </View>
            <View style={styles.contactRow}>
              <Text style={styles.contactLabel}>Phone</Text>
              <View style={styles.contactValueRow}>
                <Text style={styles.contactValue}>{customer.phone}</Text>
                {customer.phoneVerified && <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>Verified</Text></View>}
              </View>
            </View>
            <View style={styles.contactRow}>
              <Text style={styles.contactLabel}>Date of Birth</Text>
              <Text style={styles.contactValue}>{customer.dateOfBirth}</Text>
            </View>
            <View style={styles.contactRow}>
              <Text style={styles.contactLabel}>Gender</Text>
              <Text style={styles.contactValue}>{customer.gender.charAt(0).toUpperCase() + customer.gender.slice(1)}</Text>
            </View>
            <View style={styles.contactRow}>
              <Text style={styles.contactLabel}>Language</Text>
              <Text style={styles.contactValue}>{customer.language}</Text>
            </View>
          </View>
          <View style={styles.contactActions}>
            <TouchableOpacity onPress={handleCall} style={styles.contactAction}>
              <Ionicons name="call-outline" size={16} color="#3B82F6" />
              <Text style={styles.contactActionText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleEmail} style={styles.contactAction}>
              <Ionicons name="mail-outline" size={16} color="#3B82F6" />
              <Text style={styles.contactActionText}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactAction}>
              <Ionicons name="copy-outline" size={16} color="#3B82F6" />
              <Text style={styles.contactActionText}>Copy</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Address Management */}
        <View style={styles.infoCard}>
          <SectionHeader title="Saved Addresses" icon="map-marker" onAction={() => {}} actionText="Add New" />
          {addresses.map((address, index) => (
            <AddressCard key={address.id} address={address} index={index} />
          ))}
        </View>

        {/* Order History */}
        <View style={styles.infoCard}>
          <SectionHeader title="Order History" icon="shopping" onAction={() => {}} actionText="View All" />
          {orders.map((order, index) => (
            <OrderCard key={order.id} order={order} index={index} />
          ))}
        </View>

        {/* Customer Value Analytics */}
        <View style={styles.infoCard}>
          <SectionHeader title="Customer Value" icon="chart-line" />
          <View style={styles.valueContainer}>
            <View style={styles.valueMetric}>
              <Text style={styles.valueLabel}>Lifetime Value</Text>
              <Text style={styles.valueNumber}>${customer.lifetimeSpend.toFixed(0)}</Text>
            </View>
            <View style={styles.valueMetric}>
              <Text style={styles.valueLabel}>Avg Frequency</Text>
              <Text style={styles.valueNumber}>4.8/month</Text>
            </View>
            <View style={styles.valueMetric}>
              <Text style={styles.valueLabel}>Basket Size</Text>
              <Text style={styles.valueNumber}>{customer.averageOrderValue.toFixed(0)}</Text>
            </View>
            <View style={styles.valueMetric}>
              <Text style={styles.valueLabel}>Retention Score</Text>
              <Text style={styles.valueNumber}>92%</Text>
            </View>
          </View>
        </View>

        {/* Loyalty & Rewards */}
        <View style={styles.infoCard}>
          <SectionHeader title="Loyalty Program" icon="crown" />
          <View style={styles.loyaltyContainer}>
            <View style={styles.loyaltyHeader}>
              <LoyaltyBadge level={customer.loyaltyLevel} />
              <Text style={styles.loyaltyPoints}>{customer.rewardPoints} points available</Text>
            </View>
            <View style={styles.loyaltyProgress}>
              <Text style={styles.loyaltyProgressLabel}>Next Tier: Diamond</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '65%' }]} />
              </View>
              <Text style={styles.loyaltyProgressText}>1,500 points to Diamond</Text>
            </View>
            <View style={styles.loyaltyStats}>
              <View style={styles.loyaltyStat}>
                <Text style={styles.loyaltyStatValue}>{customer.redeemedPoints}</Text>
                <Text style={styles.loyaltyStatLabel}>Redeemed</Text>
              </View>
              <View style={styles.loyaltyStat}>
                <Text style={styles.loyaltyStatValue}>{customer.rewardPoints}</Text>
                <Text style={styles.loyaltyStatLabel}>Available</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Wishlist */}
        <View style={styles.infoCard}>
          <SectionHeader title="Wishlist" icon="heart" onAction={() => {}} actionText={`${customer.wishlistCount} items`} />
          <FlatList
            data={wishlistProducts}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item, index }) => <WishlistProductCard product={item} index={index} />}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.wishlistList}
          />
        </View>

        {/* Reviews & Ratings */}
        <View style={styles.infoCard}>
          <SectionHeader title="Reviews & Feedback" icon="star" onAction={() => {}} actionText="View All" />
          {reviews.map((review, index) => (
            <ReviewCard key={review.id} review={review} index={index} />
          ))}
        </View>

        {/* Support History */}
        <View style={styles.infoCard}>
          <SectionHeader title="Support History" icon="headphones" onAction={() => {}} actionText="Open Ticket" />
          {supportTickets.map((ticket, index) => (
            <SupportTicketCard key={ticket.id} ticket={ticket} index={index} />
          ))}
        </View>

        {/* Marketing Engagement */}
        <View style={styles.infoCard}>
          <SectionHeader title="Marketing Activity" icon="email" />
          <View style={styles.marketingContainer}>
            <View style={styles.marketingMetric}>
              <Text style={styles.marketingValue}>68%</Text>
              <Text style={styles.marketingLabel}>Email Open Rate</Text>
            </View>
            <View style={styles.marketingMetric}>
              <Text style={styles.marketingValue}>12</Text>
              <Text style={styles.marketingLabel}>Campaigns</Text>
            </View>
            <View style={styles.marketingMetric}>
              <Text style={styles.marketingValue}>8</Text>
              <Text style={styles.marketingLabel}>Coupons Used</Text>
            </View>
            <View style={styles.marketingMetric}>
              <Text style={styles.marketingValue}>5</Text>
              <Text style={styles.marketingLabel}>Referrals</Text>
            </View>
          </View>
        </View>

        {/* Risk & Security */}
        <View style={styles.infoCard}>
          <SectionHeader title="Risk Analysis" icon="shield-check" />
          <View style={styles.riskContainer}>
            <View style={styles.riskHeader}>
              <Text style={styles.riskScore}>Fraud Risk Score: 12/100</Text>
              <View style={styles.riskBadgeLow}><Text style={styles.riskBadgeText}>Low Risk</Text></View>
            </View>
            <View style={styles.riskChecks}>
              <View style={styles.riskCheck}><Ionicons name="checkmark-circle" size={14} color="#10B981" /><Text style={styles.riskCheckText}>No Failed Payments</Text></View>
              <View style={styles.riskCheck}><Ionicons name="checkmark-circle" size={14} color="#10B981" /><Text style={styles.riskCheckText}>Verified Identity</Text></View>
              <View style={styles.riskCheck}><Ionicons name="checkmark-circle" size={14} color="#10B981" /><Text style={styles.riskCheckText}>No Suspicious Activity</Text></View>
            </View>
          </View>
        </View>

        {/* Customer Notes */}
        <View style={styles.infoCard}>
          <SectionHeader title="Internal Notes" icon="note-text" />
          {notes.map((note, index) => (
            <NoteItem key={note.id} note={note} index={index} />
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

        {/* AI Insight */}
        <AIInsightCard />

        {/* Customer Health Score */}
        <View style={styles.infoCard}>
          <SectionHeader title="Customer Health" icon="heart" />
          <CustomerHealthScore />
        </View>
      </Animated.ScrollView>

      {/* Sticky Bottom Action Bar */}
      <Animated.View entering={FadeInUp.springify()} style={[styles.bottomActionBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Edit Customer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>View Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleCall} style={styles.tertiaryButton}>
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
  profileCard: {
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
  profileHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  profileId: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  profileContact: {
    marginTop: 8,
  },
  profileEmail: {
    fontSize: 13,
    color: '#4B5563',
  },
  profilePhone: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 2,
  },
  profileMeta: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 6,
  },
  profileActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  profileActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F9FAFB',
    paddingVertical: 10,
    borderRadius: 12,
  },
  profileActionText: {
    fontSize: 13,
    color: '#3B82F6',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  loyaltyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  loyaltyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  analyticsSection: {
    marginBottom: 16,
  },
  analyticsList: {
    paddingHorizontal: 16,
  },
  analyticsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
    width: 110,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  analyticsIcon: {
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
  analyticsLabel: {
    fontSize: 10,
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
  activityTime: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
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
  contactContainer: {
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  contactLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  contactValue: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '500',
  },
  contactValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifiedBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#10B981',
  },
  contactActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  contactAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    borderRadius: 12,
  },
  contactActionText: {
    fontSize: 12,
    color: '#3B82F6',
  },
  addressCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressType: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  defaultBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  defaultText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#10B981',
  },
  addressName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  addressPhone: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  addressText: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 17,
  },
  addressLastUsed: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 8,
  },
  addressActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  addressAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addressActionText: {
    fontSize: 11,
    color: '#3B82F6',
  },
  orderCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  orderStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  orderStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  orderDate: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 8,
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderItems: {
    fontSize: 12,
    color: '#6B7280',
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  viewOrderButton: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewOrderText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3B82F6',
  },
  valueContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  valueMetric: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  valueLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  valueNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  loyaltyContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
  },
  loyaltyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  loyaltyPoints: {
    fontSize: 12,
    color: '#6B7280',
  },
  loyaltyProgress: {
    marginBottom: 12,
  },
  loyaltyProgressLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  loyaltyProgressText: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
  },
  loyaltyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  loyaltyStat: {
    alignItems: 'center',
  },
  loyaltyStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  loyaltyStatLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  wishlistList: {
    paddingRight: 16,
  },
  wishlistCard: {
    width: 140,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
  },
  wishlistImage: {
    width: '100%',
    height: 100,
  },
  wishlistInfo: {
    padding: 10,
  },
  wishlistName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  wishlistCategory: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  wishlistPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B82F6',
    marginTop: 4,
  },
  reviewCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  reviewImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
    marginRight: 12,
  },
  reviewInfo: {
    flex: 1,
  },
  reviewProductName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewText: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  supportCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  supportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  supportTicketId: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  supportStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  supportStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  supportIssueType: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 4,
  },
  supportDate: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  marketingContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  marketingMetric: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  marketingValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  marketingLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
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
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  riskBadgeLow: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  riskBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  riskChecks: {
    gap: 6,
  },
  riskCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  riskCheckText: {
    fontSize: 12,
    color: '#6B7280',
  },
  noteItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 13,
    color: '#1F2937',
    marginBottom: 6,
  },
  noteMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  noteAuthor: {
    fontSize: 10,
    color: '#6B7280',
  },
  noteDate: {
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
  healthContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
  },
  healthScore: {
    alignItems: 'center',
    marginBottom: 16,
  },
  healthScoreLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  healthScoreValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
  },
  healthBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  healthBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  healthChecklist: {
    gap: 10,
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
    fontSize: 12,
    color: '#6B7280',
  },
  healthLabelCompleted: {
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