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

interface BannerKPI {
  id: string;
  title: string;
  value: string;
  icon: string;
  color: string;
  trend?: number;
  subtitle: string;
}

interface Banner {
  id: string;
  name: string;
  campaignName: string;
  bannerId: string;
  type: 'homepage_hero' | 'category_page' | 'product_page' | 'offer_section' | 'flash_sale' | 'custom';
  placement: string;
  imageUrl: string;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  revenue: number;
  startDate: string;
  endDate: string;
  duration: number;
  status: 'active' | 'scheduled' | 'paused' | 'draft' | 'expired';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface Alert {
  id: string;
  type: 'expiring_soon' | 'low_ctr' | 'inactive' | 'missing_schedule' | 'high_performing' | 'draft';
  count: number;
  severity: 'low' | 'medium' | 'high';
  action: string;
}

interface PlacementMetric {
  id: string;
  name: string;
  bannerCount: number;
  views: number;
  clicks: number;
  ctr: number;
}

interface ScheduledCampaign {
  id: string;
  name: string;
  launchDate: string;
  duration: string;
  placement: string;
  expectedReach: string;
}

interface Activity {
  id: string;
  type: 'created' | 'updated' | 'activated' | 'paused' | 'scheduled' | 'deleted';
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

const bannerKpis: BannerKPI[] = [
  { id: '1', title: 'Total Banners', value: '348', icon: 'view-dashboard', color: '#3B82F6', trend: 12.5, subtitle: '+28 this month' },
  { id: '2', title: 'Active Banners', value: '89', icon: 'check-circle', color: '#10B981', trend: 8.2, subtitle: '+12 active' },
  { id: '3', title: 'Scheduled', value: '23', icon: 'calendar-clock', color: '#F59E0B', trend: 0, subtitle: 'Starting soon' },
  { id: '4', title: 'Draft', value: '34', icon: 'file-document', color: '#6B7280', trend: -3.2, subtitle: 'Pending approval' },
  { id: '5', title: 'Impressions', value: '2.45M', icon: 'eye', color: '#8B5CF6', trend: 18.3, subtitle: '+345K views' },
  { id: '6', title: 'Clicks', value: '89.2K', icon: 'cursor-default-click', color: '#EC4899', trend: 15.8, subtitle: '+12.4K clicks' },
  { id: '7', title: 'Avg CTR', value: '3.64%', icon: 'chart-line', color: '#06B6D4', trend: 2.1, subtitle: '+0.32%' },
  { id: '8', title: 'Revenue', value: '$1.28M', icon: 'currency-usd', color: '#6366F1', trend: 24.5, subtitle: '+$253K' },
];

const banners: Banner[] = [
  {
    id: '1', name: 'Summer Mega Sale', campaignName: 'Summer Campaign 2024', bannerId: 'BNR-1001',
    type: 'homepage_hero', placement: 'Homepage Hero', imageUrl: 'https://picsum.photos/id/20/400/200',
    impressions: 125000, clicks: 6250, ctr: 5.00, conversions: 1250, revenue: 87500,
    startDate: '2024-06-01', endDate: '2024-07-31', duration: 28, status: 'active',
    createdAt: '2024-05-15', updatedAt: '2024-06-01', createdBy: 'Sarah Chen',
  },
  {
    id: '2', name: 'Electronics Fest', campaignName: 'Tech Week 2024', bannerId: 'BNR-1002',
    type: 'category_page', placement: 'Electronics Category', imageUrl: 'https://picsum.photos/id/0/400/200',
    impressions: 89000, clicks: 3560, ctr: 4.00, conversions: 712, revenue: 124600,
    startDate: '2024-06-10', endDate: '2024-06-30', duration: 12, status: 'active',
    createdAt: '2024-06-01', updatedAt: '2024-06-10', createdBy: 'Mike Johnson',
  },
  {
    id: '3', name: 'Free Shipping Week', campaignName: 'Shipping Promo', bannerId: 'BNR-1003',
    type: 'offer_section', placement: 'Header Banner', imageUrl: 'https://picsum.photos/id/26/400/200',
    impressions: 234000, clicks: 11700, ctr: 5.00, conversions: 2340, revenue: 46800,
    startDate: '2024-06-15', endDate: '2024-06-22', duration: 3, status: 'active',
    createdAt: '2024-06-10', updatedAt: '2024-06-15', createdBy: 'Lisa Wong',
  },
  {
    id: '4', name: 'Back to School', campaignName: 'School Season', bannerId: 'BNR-1004',
    type: 'product_page', placement: 'Product Page', imageUrl: 'https://picsum.photos/id/15/400/200',
    impressions: 45000, clicks: 1800, ctr: 4.00, conversions: 360, revenue: 16200,
    startDate: '2024-07-01', endDate: '2024-08-15', duration: 45, status: 'scheduled',
    createdAt: '2024-06-20', updatedAt: '2024-06-20', createdBy: 'John Smith',
  },
  {
    id: '5', name: 'Flash Sale 50%', campaignName: 'Limited Time', bannerId: 'BNR-1005',
    type: 'flash_sale', placement: 'Flash Sale Section', imageUrl: 'https://picsum.photos/id/1/400/200',
    impressions: 312000, clicks: 18720, ctr: 6.00, conversions: 3744, revenue: 299520,
    startDate: '2024-05-01', endDate: '2024-05-31', duration: 0, status: 'expired',
    createdAt: '2024-04-25', updatedAt: '2024-05-01', createdBy: 'Sarah Chen',
  },
];

const alerts: Alert[] = [
  { id: '1', type: 'expiring_soon', count: 8, severity: 'high', action: 'Extend Campaign' },
  { id: '2', type: 'low_ctr', count: 12, severity: 'medium', action: 'Review Creative' },
  { id: '3', type: 'draft', count: 34, severity: 'low', action: 'Review Drafts' },
  { id: '4', type: 'high_performing', count: 5, severity: 'low', action: 'Analyze Success' },
  { id: '5', type: 'inactive', count: 23, severity: 'medium', action: 'Activate' },
];

const placementMetrics: PlacementMetric[] = [
  { id: '1', name: 'Homepage Hero', bannerCount: 12, views: 890000, clicks: 44500, ctr: 5.00 },
  { id: '2', name: 'Category Pages', bannerCount: 45, views: 456000, clicks: 18240, ctr: 4.00 },
  { id: '3', name: 'Product Pages', bannerCount: 89, views: 678000, clicks: 20340, ctr: 3.00 },
  { id: '4', name: 'Checkout', bannerCount: 8, views: 234000, clicks: 11700, ctr: 5.00 },
];

const scheduledCampaigns: ScheduledCampaign[] = [
  { id: '1', name: 'Independence Day Sale', launchDate: '2024-07-01', duration: '15 days', placement: 'Homepage Hero', expectedReach: '500K' },
  { id: '2', name: 'Summer Clearance', launchDate: '2024-07-15', duration: '30 days', placement: 'Category Pages', expectedReach: '350K' },
  { id: '3', name: 'Back to School', launchDate: '2024-08-01', duration: '45 days', placement: 'Product Pages', expectedReach: '280K' },
];

const activities: Activity[] = [
  { id: '1', type: 'created', description: 'Banner "Summer Mega Sale" created', timestamp: '1 hour ago', performedBy: 'Sarah Chen', icon: 'plus' },
  { id: '2', type: 'activated', description: 'Campaign "Electronics Fest" activated', timestamp: '3 hours ago', performedBy: 'Mike Johnson', icon: 'play' },
  { id: '3', type: 'updated', description: 'Banner creative updated', timestamp: '5 hours ago', performedBy: 'Lisa Wong', icon: 'pencil' },
  { id: '4', type: 'paused', description: 'Underperforming banner paused', timestamp: '1 day ago', performedBy: 'John Smith', icon: 'pause' },
  { id: '5', type: 'scheduled', description: 'Back to School campaign scheduled', timestamp: '2 days ago', performedBy: 'Sarah Chen', icon: 'calendar' },
];

const quickActions: QuickAction[] = [
  { id: '1', title: 'Create Banner', icon: 'plus-circle', color: '#3B82F6' },
  { id: '2', title: 'Schedule', icon: 'calendar', color: '#F59E0B' },
  { id: '3', title: 'Upload', icon: 'upload', color: '#8B5CF6' },
  { id: '4', title: 'Placements', icon: 'view-dashboard', color: '#EC4899' },
  { id: '5', title: 'Reports', icon: 'chart-line', color: '#06B6D4' },
  { id: '6', title: 'Asset Library', icon: 'image-multiple', color: '#6366F1' },
  { id: '7', title: 'Export', icon: 'download', color: '#10B981' },
  { id: '8', title: 'Settings', icon: 'cog', color: '#6B7280' },
];

// ============================================
// REUSABLE COMPONENTS
// ============================================

const SectionHeader = ({ title, icon, onAction, actionText, count }: { title: string; icon?: string; onAction?: () => void; actionText?: string; count?: number }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionTitleContainer}>
      {icon && <MaterialCommunityIcons name={icon as any} size={20} color="#3B82F6" style={styles.sectionIcon} />}
      <Text style={styles.sectionTitle}>{title}</Text>
      {count !== undefined && <Text style={styles.sectionCount}>{count}</Text>}
    </View>
    {onAction && actionText && (
      <TouchableOpacity onPress={onAction}>
        <Text style={styles.sectionActionText}>{actionText}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const KPICard = ({ data, index }: { data: BannerKPI; index: number }) => {
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

const StatusBadge = ({ status }: { status: Banner['status'] }) => {
  const config = {
    active: { label: 'Active', color: '#10B981', bg: '#D1FAE5' },
    scheduled: { label: 'Scheduled', color: '#F59E0B', bg: '#FEF3C7' },
    paused: { label: 'Paused', color: '#6B7280', bg: '#F3F4F6' },
    draft: { label: 'Draft', color: '#3B82F6', bg: '#DBEAFE' },
    expired: { label: 'Expired', color: '#EF4444', bg: '#FEE2E2' },
  };
  const { label, color, bg } = config[status];
  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
};

const BannerCard = ({ banner, index }: { banner: Banner; index: number }) => {
  const getTypeLabel = () => {
    switch (banner.type) {
      case 'homepage_hero': return 'Homepage Hero';
      case 'category_page': return 'Category Page';
      case 'product_page': return 'Product Page';
      case 'offer_section': return 'Offer Section';
      case 'flash_sale': return 'Flash Sale';
      default: return 'Custom';
    }
  };

  return (
    <Animated.View entering={FadeInUp.delay(index * 30).springify()} style={styles.bannerCard}>
      <Image source={{ uri: banner.imageUrl }} style={styles.bannerImage} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={styles.bannerOverlay}
      />
      <View style={styles.bannerContent}>
        <View style={styles.bannerHeader}>
          <View>
            <Text style={styles.bannerName}>{banner.name}</Text>
            <Text style={styles.bannerCampaign}>{banner.campaignName}</Text>
          </View>
          <StatusBadge status={banner.status} />
        </View>
        
        <View style={styles.bannerStats}>
          <View style={styles.bannerStat}>
            <Text style={styles.bannerStatValue}>{(banner.impressions / 1000).toFixed(0)}K</Text>
            <Text style={styles.bannerStatLabel}>Impressions</Text>
          </View>
          <View style={styles.bannerStat}>
            <Text style={styles.bannerStatValue}>{(banner.clicks / 1000).toFixed(1)}K</Text>
            <Text style={styles.bannerStatLabel}>Clicks</Text>
          </View>
          <View style={styles.bannerStat}>
            <Text style={styles.bannerStatValue}>{banner.ctr}%</Text>
            <Text style={styles.bannerStatLabel}>CTR</Text>
          </View>
          <View style={styles.bannerStat}>
            <Text style={styles.bannerStatValue}>${(banner.revenue / 1000).toFixed(0)}K</Text>
            <Text style={styles.bannerStatLabel}>Revenue</Text>
          </View>
        </View>

        <View style={styles.bannerFooter}>
          <View>
            <Text style={styles.bannerPlacement}>{banner.placement}</Text>
            <Text style={styles.bannerDate}>Valid: {banner.startDate} - {banner.endDate}</Text>
          </View>
          <View style={styles.bannerActions}>
            <TouchableOpacity style={styles.bannerActionButton}>
              <Ionicons name="eye-outline" size={16} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.bannerActionButton}>
              <MaterialCommunityIcons name="pencil" size="156" color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.bannerActionButton}>
              <MaterialCommunityIcons name="content-copy" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const AlertCard = ({ alert, index }: { alert: Alert; index: number }) => {
  const getTypeConfig = () => {
    switch (alert.type) {
      case 'expiring_soon': return { label: 'Expiring Soon', icon: 'calendar-alert', color: '#EF4444' };
      case 'low_ctr': return { label: 'Low CTR', icon: 'chart-line', color: '#F59E0B' };
      case 'inactive': return { label: 'Inactive Banners', icon: 'eye-off', color: '#6B7280' };
      case 'high_performing': return { label: 'High Performing', icon: 'chart-line', color: '#10B981' };
      default: return { label: 'Draft Banners', icon: 'file-document', color: '#3B82F6' };
    }
  };
  const config = getTypeConfig();
  const severityColor = alert.severity === 'high' ? '#EF4444' : alert.severity === 'medium' ? '#F59E0B' : '#3B82F6';
  
  return (
    <Animated.View entering={FadeInRight.delay(index * 40).springify()} style={styles.alertCard}>
      <View style={[styles.alertIcon, { backgroundColor: `${config.color}15` }]}>
        <MaterialCommunityIcons name={config.icon as any} size={20} color={config.color} />
      </View>
      <View style={styles.alertInfo}>
        <Text style={styles.alertType}>{config.label}</Text>
        <Text style={styles.alertCount}>{alert.count} banners</Text>
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

const PlacementCard = ({ metric, index }: { metric: PlacementMetric; index: number }) => (
  <Animated.View entering={FadeInDown.delay(index * 50).springify()} style={styles.placementCard}>
    <Text style={styles.placementName}>{metric.name}</Text>
    <View style={styles.placementStats}>
      <Text style={styles.placementBanners}>{metric.bannerCount} banners</Text>
      <Text style={styles.placementViews}>{(metric.views / 1000).toFixed(0)}K views</Text>
    </View>
    <View style={styles.placementCtr}>
      <Text style={styles.placementCtrLabel}>CTR</Text>
      <Text style={styles.placementCtrValue}>{metric.ctr}%</Text>
    </View>
    <View style={styles.placementProgressBar}>
      <View style={[styles.placementProgressFill, { width: `${(metric.ctr / 6) * 100}%`, backgroundColor: metric.ctr > 4 ? '#10B981' : metric.ctr > 2 ? '#F59E0B' : '#EF4444' }]} />
    </View>
  </Animated.View>
);

const ScheduledCard = ({ campaign, index }: { campaign: ScheduledCampaign; index: number }) => (
  <Animated.View entering={FadeInRight.delay(index * 60).springify()} style={styles.scheduledCard}>
    <Text style={styles.scheduledName}>{campaign.name}</Text>
    <View style={styles.scheduledDetails}>
      <Text style={styles.scheduledDate}>📅 {campaign.launchDate}</Text>
      <Text style={styles.scheduledDuration}>⏱️ {campaign.duration}</Text>
    </View>
    <Text style={styles.scheduledPlacement}>📍 {campaign.placement}</Text>
    <Text style={styles.scheduledReach}>🎯 Expected Reach: {campaign.expectedReach}</Text>
    <TouchableOpacity style={styles.scheduledButton}>
      <Text style={styles.scheduledButtonText}>Manage Campaign</Text>
    </TouchableOpacity>
  </Animated.View>
);

const ActivityItem = ({ activity, index }: { activity: Activity; index: number }) => {
  const getIconColor = () => {
    switch (activity.type) {
      case 'created': return '#10B981';
      case 'activated': return '#3B82F6';
      case 'updated': return '#F59E0B';
      case 'paused': return '#6B7280';
      default: return '#8B5CF6';
    }
  };
  return (
    <Animated.View entering={FadeInLeft.delay(index * 30).springify()} style={styles.activityItem}>
      <View style={[styles.activityIcon, { backgroundColor: `${getIconColor()}15` }]}>
        <MaterialCommunityIcons name={activity.icon as any} size={16} color={getIconColor()} />
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
          <MaterialCommunityIcons name={action.icon as any} size={24} color={action.color} />
        </View>
        <Text style={styles.quickActionTitle}>{action.title}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

const BannerHealthScore = () => (
  <View style={styles.healthCard}>
    <View style={styles.healthHeader}>
      <Text style={styles.healthTitle}>Banner Performance Health</Text>
      <View style={styles.healthScore}>
        <Text style={styles.healthScoreValue}>91</Text>
        <Text style={styles.healthScoreMax}>/100</Text>
      </View>
    </View>
    <View style={styles.healthIndicator}>
      <View style={[styles.healthIndicatorBar, { width: '91%', backgroundColor: '#3B82F6' }]} />
    </View>
    <Text style={styles.healthStatus}>Excellent - Above Target</Text>
    <View style={styles.healthBreakdown}>
      <View style={styles.healthMetric}><Text style={styles.healthMetricLabel}>Banner Visibility</Text><Text style={styles.healthMetricValue}>94%</Text></View>
      <View style={styles.healthMetric}><Text style={styles.healthMetricLabel}>Engagement Rate</Text><Text style={styles.healthMetricValue}>88%</Text></View>
      <View style={styles.healthMetric}><Text style={styles.healthMetricLabel}>Click Performance</Text><Text style={styles.healthMetricValue}>92%</Text></View>
      <View style={styles.healthMetric}><Text style={styles.healthMetricLabel}>Campaign Coverage</Text><Text style={styles.healthMetricValue}>85%</Text></View>
    </View>
  </View>
);

const RevenueImpactCard = () => (
  <View style={styles.revenueCard}>
    <View style={styles.revenueMetric}>
      <Text style={styles.revenueLabel}>Revenue Generated</Text>
      <Text style={styles.revenueValue}>$1.28M</Text>
    </View>
    <View style={styles.revenueMetric}>
      <Text style={styles.revenueLabel}>Attributed Sales</Text>
      <Text style={styles.revenueValue}>12,845</Text>
    </View>
    <View style={styles.revenueMetric}>
      <Text style={styles.revenueLabel}>Conversion Revenue</Text>
      <Text style={styles.revenueValue}>$892K</Text>
    </View>
    <View style={styles.revenueMetric}>
      <Text style={styles.revenueLabel}>Campaign ROI</Text>
      <Text style={[styles.revenueValue, styles.revenuePositive]}>324%</Text>
    </View>
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
          <Text style={styles.aiInsightTitle}>AI Marketing Insight</Text>
          <Text style={styles.aiInsightMessage}>
            Homepage hero banner generated 32% more clicks than average. 3 campaigns are underperforming
            and may require new creatives. Category page banners show the highest conversion rate.
            Banner engagement increased by 18% this month.
          </Text>
        </View>
      </View>
    </LinearGradient>
  </Animated.View>
);

// ============================================
// MAIN BANNER LIST SCREEN
// ============================================

export default function BannerListScreen() {
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

  const filteredBanners = banners.filter(banner => {
    if (selectedFilter !== 'all') {
      if (banner.status !== selectedFilter) return false;
    }
    if (searchText) {
      const query = searchText.toLowerCase();
      return banner.name.toLowerCase().includes(query) || 
             banner.campaignName.toLowerCase().includes(query) ||
             banner.bannerId.toLowerCase().includes(query);
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
            <Text style={styles.headerTitle}>Banner Management</Text>
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
          data={bannerKpis}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item, index }) => <KPICard data={item} index={index} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.kpiList}
          style={styles.kpiSection}
        />

        {/* Banner Health Score */}
        <BannerHealthScore />

        {/* Search Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Feather name="search" size={20} color="#9CA3AF" />
            <TextInput
              placeholder="Search banners, campaigns, placements..."
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
            data={[
              { id: 'all', label: 'All Banners', count: banners.length },
              { id: 'active', label: 'Active', count: banners.filter(b => b.status === 'active').length },
              { id: 'scheduled', label: 'Scheduled', count: banners.filter(b => b.status === 'scheduled').length },
              { id: 'draft', label: 'Draft', count: banners.filter(b => b.status === 'draft').length },
              { id: 'expired', label: 'Expired', count: banners.filter(b => b.status === 'expired').length },
            ]}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => setSelectedFilter(item.id)}>
                <View style={[styles.filterChip, selectedFilter === item.id && styles.filterChipSelected]}>
                  <Text style={[styles.filterChipLabel, selectedFilter === item.id && styles.filterChipLabelSelected]}>{item.label}</Text>
                  <View style={[styles.filterChipCount, selectedFilter === item.id && styles.filterChipCountSelected]}>
                    <Text style={[styles.filterChipCountText, selectedFilter === item.id && styles.filterChipCountTextSelected]}>{item.count}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.filterList}
          />
        </View>

        {/* Campaign Alerts */}
        <View style={styles.alertsSection}>
          <SectionHeader title="Campaign Alerts" icon="bell" onAction={() => {}} actionText="View All" />
          {alerts.map((alert, index) => (
            <AlertCard key={alert.id} alert={alert} index={index} />
          ))}
        </View>

        {/* Banner List */}
        <View style={styles.bannerSection}>
          <SectionHeader title="All Banners" icon="view-dashboard" count={filteredBanners.length} />
          {filteredBanners.map((banner, index) => (
            <BannerCard key={banner.id} banner={banner} index={index} />
          ))}
        </View>

        {/* Performance Insights */}
        <View style={styles.insightsSection}>
          <SectionHeader title="Performance Insights" icon="chart-line" showSeeAll={false} />
          <View style={styles.insightsContainer}>
            <View style={styles.insightMetric}>
              <Text style={styles.insightLabel}>Avg CTR</Text>
              <Text style={styles.insightValue}>3.64%</Text>
              <Text style={styles.insightTrend}>+0.32% vs last month</Text>
            </View>
            <View style={styles.insightMetric}>
              <Text style={styles.insightLabel}>Conversion Rate</Text>
              <Text style={styles.insightValue}>2.85%</Text>
              <Text style={styles.insightTrend}>+0.41% vs last month</Text>
            </View>
            <View style={styles.insightMetric}>
              <Text style={styles.insightLabel}>Revenue Contribution</Text>
              <Text style={styles.insightValue}>18.4%</Text>
              <Text style={styles.insightTrend}>+3.2% vs last month</Text>
            </View>
          </View>
        </View>

        {/* Top Performing Banners */}
        <View style={styles.topSection}>
          <SectionHeader title="Top Performing Banners" icon="trophy" onAction={() => {}} actionText="View All" />
          <FlatList
            data={banners.filter(b => b.status === 'active').slice(0, 3)}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <View style={styles.topBannerCard}>
                <Text style={styles.topBannerRank}>#{index + 1}</Text>
                <Text style={styles.topBannerName}>{item.name}</Text>
                <Text style={styles.topBannerCtr}>CTR: {item.ctr}%</Text>
                <Text style={styles.topBannerRevenue}>${(item.revenue / 1000).toFixed(0)}K</Text>
              </View>
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.topList}
          />
        </View>

        {/* Placement Distribution */}
        <View style={styles.placementSection}>
          <SectionHeader title="Placement Overview" icon="view-dashboard" showSeeAll={false} />
          {placementMetrics.map((metric, index) => (
            <PlacementCard key={metric.id} metric={metric} index={index} />
          ))}
        </View>

        {/* Scheduled Campaigns */}
        <View style={styles.scheduledSection}>
          <SectionHeader title="Upcoming Campaigns" icon="calendar" onAction={() => {}} actionText="Schedule" />
          <FlatList
            data={scheduledCampaigns}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item, index }) => <ScheduledCard campaign={item} index={index} />}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.scheduledList}
          />
        </View>

        {/* Revenue Impact */}
        <View style={styles.revenueSection}>
          <SectionHeader title="Revenue Analysis" icon="currency-usd" showSeeAll={false} />
          <RevenueImpactCard />
        </View>

        {/* Recent Activities */}
        <View style={styles.activitySection}>
          <SectionHeader title="Recent Activities" icon="history" onAction={() => {}} actionText="View All" />
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

        {/* Banner Validation */}
        <View style={styles.validationSection}>
          <SectionHeader title="Campaign Readiness" icon="check-circle" showSeeAll={false} />
          <View style={styles.validationContainer}>
            {[
              { label: 'Banner Images Uploaded', completed: true },
              { label: 'Placements Assigned', completed: true },
              { label: 'Schedule Configured', completed: false },
              { label: 'Tracking Enabled', completed: true },
              { label: 'Status Assigned', completed: true },
              { label: 'Campaign Linked', completed: true },
            ].map((item, index) => (
              <View key={index} style={styles.validationItem}>
                <View style={[styles.validationCircle, item.completed && styles.validationCircleCompleted]}>
                  {item.completed && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
                </View>
                <Text style={[styles.validationLabel, item.completed && styles.validationLabelCompleted]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </Animated.ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 24 }]}>
        <LinearGradient
          colors={['#3B82F6', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
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
  sectionCount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 8,
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
    width: 125,
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
    color: '#3B82F6',
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
    color: '#3B82F6',
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
  bannerSection: {
    marginBottom: 16,
  },
  bannerCard: {
    height: 200,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  bannerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
  },
  bannerContent: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 16,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bannerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bannerCampaign: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
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
  bannerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  bannerStat: {
    alignItems: 'center',
  },
  bannerStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bannerStatLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  bannerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerPlacement: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  bannerDate: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  bannerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  bannerActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightsSection: {
    marginBottom: 16,
  },
  insightsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 16,
    gap: 12,
  },
  insightMetric: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  insightLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  insightTrend: {
    fontSize: 9,
    color: '#10B981',
    marginTop: 4,
  },
  topSection: {
    marginBottom: 16,
  },
  topList: {
    paddingHorizontal: 12,
  },
  topBannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: 150,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  topBannerRank: {
    fontSize: 24,
    fontWeight: '800',
    color: '#3B82F6',
    marginBottom: 8,
  },
  topBannerName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  topBannerCtr: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  topBannerRevenue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  placementSection: {
    marginBottom: 16,
  },
  placementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
  },
  placementName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  placementStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  placementBanners: {
    fontSize: 11,
    color: '#6B7280',
  },
  placementViews: {
    fontSize: 11,
    color: '#6B7280',
  },
  placementCtr: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  placementCtrLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  placementCtrValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  placementProgressBar: {
    height: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    overflow: 'hidden',
  },
  placementProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  scheduledSection: {
    marginBottom: 16,
  },
  scheduledList: {
    paddingHorizontal: 12,
  },
  scheduledCard: {
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
  scheduledName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  scheduledDetails: {
    marginBottom: 6,
  },
  scheduledDate: {
    fontSize: 11,
    color: '#6B7280',
  },
  scheduledDuration: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  scheduledPlacement: {
    fontSize: 11,
    color: '#3B82F6',
    marginBottom: 4,
  },
  scheduledReach: {
    fontSize: 11,
    color: '#10B981',
    marginBottom: 12,
  },
  scheduledButton: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  scheduledButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#3B82F6',
  },
  revenueSection: {
    marginBottom: 16,
  },
  revenueCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 16,
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
  revenuePositive: {
    color: '#10B981',
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
  validationSection: {
    marginBottom: 16,
  },
  validationContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 16,
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