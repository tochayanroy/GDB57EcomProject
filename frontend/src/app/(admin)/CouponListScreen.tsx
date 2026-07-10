import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
    Dimensions,
    FlatList,
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

interface CouponKPI {
  id: string;
  title: string;
  value: string;
  icon: string;
  color: string;
  trend?: number;
  subtitle: string;
}

interface Coupon {
  id: string;
  name: string;
  code: string;
  campaign: string;
  description: string;
  discountType: 'percentage' | 'fixed' | 'free_shipping' | 'bogo';
  discountValue: number;
  totalRedemptions: number;
  usageLimit: number;
  remainingUses: number;
  revenueGenerated: number;
  discountGiven: number;
  averageOrderValue: number;
  conversionRate: number;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  customerSegment: 'all' | 'new' | 'returning' | 'vip' | 'loyal';
  status: 'active' | 'scheduled' | 'paused' | 'expired' | 'draft';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface Alert {
  id: string;
  type: 'expiring_soon' | 'high_performing' | 'low_usage' | 'budget_exceeded' | 'paused' | 'unused';
  count: number;
  severity: 'low' | 'medium' | 'high';
  action: string;
}

interface TopCoupon {
  id: string;
  name: string;
  code: string;
  revenue: number;
  redemptions: number;
  conversionRate: number;
}

interface SegmentPerformance {
  id: string;
  name: string;
  couponsUsed: number;
  revenue: number;
  conversionRate: number;
}

interface Activity {
  id: string;
  type: 'created' | 'updated' | 'activated' | 'redeemed' | 'paused' | 'extended';
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

const couponKpis: CouponKPI[] = [
  { id: '1', title: 'Total Coupons', value: '1,248', icon: 'ticket-percent', color: '#3B82F6', trend: 12.5, subtitle: '+138 this month' },
  { id: '2', title: 'Active Coupons', value: '89', icon: 'check-circle', color: '#10B981', trend: 8.2, subtitle: '+7 new' },
  { id: '3', title: 'Scheduled', value: '23', icon: 'calendar-clock', color: '#F59E0B', trend: 0, subtitle: 'Starting soon' },
  { id: '4', title: 'Expired', value: '156', icon: 'calendar-remove', color: '#6B7280', trend: -5.2, subtitle: 'Archived' },
  { id: '5', title: 'Redemptions', value: '45.2K', icon: 'ticket-confirmation', color: '#8B5CF6', trend: 18.3, subtitle: '+7.2K' },
  { id: '6', title: 'Revenue Generated', value: '$2.45M', icon: 'currency-usd', color: '#EC4899', trend: 24.5, subtitle: '+$489K' },
  { id: '7', title: 'Discount Given', value: '$345K', icon: 'sale', color: '#06B6D4', trend: 15.8, subtitle: '-12% ROI' },
  { id: '8', title: 'Conversion Rate', value: '18.4%', icon: 'chart-line', color: '#6366F1', trend: 3.2, subtitle: '+2.1%' },
];

const coupons: Coupon[] = [
  {
    id: '1', name: 'Summer Sale Blowout', code: 'SUMMER24', campaign: 'Summer Campaign 2024',
    description: 'Get 25% off on all summer products', discountType: 'percentage', discountValue: 25,
    totalRedemptions: 3420, usageLimit: 5000, remainingUses: 1580, revenueGenerated: 89500,
    discountGiven: 22375, averageOrderValue: 89.50, conversionRate: 22.4, startDate: '2024-06-01',
    endDate: '2024-07-31', daysRemaining: 28, customerSegment: 'all',
    status: 'active', createdAt: '2024-05-15', updatedAt: '2024-06-01', createdBy: 'Sarah Chen',
  },
  {
    id: '2', name: 'VIP Exclusive', code: 'VIP2024', campaign: 'Loyalty Program',
    description: '$20 off for VIP members', discountType: 'fixed', discountValue: 20,
    totalRedemptions: 1250, usageLimit: 2000, remainingUses: 750, revenueGenerated: 68200,
    discountGiven: 25000, averageOrderValue: 134.50, conversionRate: 28.6, startDate: '2024-05-01',
    endDate: '2024-08-31', daysRemaining: 59, customerSegment: 'vip',
    status: 'active', createdAt: '2024-04-20', updatedAt: '2024-05-01', createdBy: 'Mike Johnson',
  },
  {
    id: '3', name: 'Free Shipping Week', code: 'FREESHIP', campaign: 'Shipping Promotion',
    description: 'Free standard shipping on all orders', discountType: 'free_shipping', discountValue: 0,
    totalRedemptions: 5678, usageLimit: 10000, remainingUses: 4322, revenueGenerated: 234500,
    discountGiven: 15600, averageOrderValue: 78.40, conversionRate: 19.2, startDate: '2024-06-10',
    endDate: '2024-06-20', daysRemaining: 3, customerSegment: 'new',
    status: 'active', createdAt: '2024-06-01', updatedAt: '2024-06-10', createdBy: 'Lisa Wong',
  },
  {
    id: '4', name: 'Buy One Get One', code: 'BOGO2024', campaign: 'BOGO Campaign',
    description: 'Buy one get one free on selected items', discountType: 'bogo', discountValue: 100,
    totalRedemptions: 890, usageLimit: 1500, remainingUses: 610, revenueGenerated: 44500,
    discountGiven: 44500, averageOrderValue: 125.00, conversionRate: 15.8, startDate: '2024-06-15',
    endDate: '2024-07-15', daysRemaining: 20, customerSegment: 'returning',
    status: 'active', createdAt: '2024-06-10', updatedAt: '2024-06-15', createdBy: 'John Smith',
  },
  {
    id: '5', name: 'Back to School', code: 'BTS2024', campaign: 'School Season',
    description: '15% off back to school items', discountType: 'percentage', discountValue: 15,
    totalRedemptions: 234, usageLimit: 3000, remainingUses: 2766, revenueGenerated: 12500,
    discountGiven: 3125, averageOrderValue: 65.20, conversionRate: 12.4, startDate: '2024-07-01',
    endDate: '2024-08-15', daysRemaining: 45, customerSegment: 'all',
    status: 'scheduled', createdAt: '2024-06-20', updatedAt: '2024-06-20', createdBy: 'Sarah Chen',
  },
  {
    id: '6', name: 'Flash Sale 50%', code: 'FLASH50', campaign: 'Limited Time',
    description: '50% off selected electronics', discountType: 'percentage', discountValue: 50,
    totalRedemptions: 12500, usageLimit: 15000, remainingUses: 2500, revenueGenerated: 345000,
    discountGiven: 172500, averageOrderValue: 98.50, conversionRate: 34.2, startDate: '2024-06-01',
    endDate: '2024-06-30', daysRemaining: 0, customerSegment: 'all',
    status: 'expired', createdAt: '2024-05-25', updatedAt: '2024-06-01', createdBy: 'Mike Johnson',
  },
];

const alerts: Alert[] = [
  { id: '1', type: 'expiring_soon', count: 8, severity: 'high', action: 'Extend' },
  { id: '2', type: 'high_performing', count: 12, severity: 'low', action: 'Analyze' },
  { id: '3', type: 'low_usage', count: 23, severity: 'medium', action: 'Promote' },
  { id: '4', type: 'paused', count: 5, severity: 'medium', action: 'Review' },
  { id: '5', type: 'unused', count: 34, severity: 'low', action: 'Notify' },
];

const topCoupons: TopCoupon[] = [
  { id: '1', name: 'Flash Sale 50%', code: 'FLASH50', revenue: 345000, redemptions: 12500, conversionRate: 34.2 },
  { id: '2', name: 'Free Shipping Week', code: 'FREESHIP', revenue: 234500, redemptions: 5678, conversionRate: 19.2 },
  { id: '3', name: 'Summer Sale Blowout', code: 'SUMMER24', revenue: 89500, redemptions: 3420, conversionRate: 22.4 },
];

const segmentPerformance: SegmentPerformance[] = [
  { id: '1', name: 'VIP Customers', couponsUsed: 2450, revenue: 245000, conversionRate: 32.5 },
  { id: '2', name: 'Returning', couponsUsed: 8900, revenue: 678000, conversionRate: 24.8 },
  { id: '3', name: 'New Customers', couponsUsed: 5600, revenue: 342000, conversionRate: 18.4 },
  { id: '4', name: 'Loyal', couponsUsed: 3400, revenue: 289000, conversionRate: 28.2 },
];

const activities: Activity[] = [
  { id: '1', type: 'created', description: 'Coupon BTS2024 created for Back to School campaign', timestamp: '1 hour ago', performedBy: 'Sarah Chen', icon: 'plus' },
  { id: '2', type: 'activated', description: 'Campaign Summer Sale Blowout activated', timestamp: '3 hours ago', performedBy: 'Mike Johnson', icon: 'play' },
  { id: '3', type: 'redeemed', description: '1,250 coupons redeemed today', timestamp: '5 hours ago', performedBy: 'System', icon: 'ticket' },
  { id: '4', type: 'extended', description: 'VIP Exclusive coupon expiration extended', timestamp: '1 day ago', performedBy: 'Lisa Wong', icon: 'calendar' },
  { id: '5', type: 'paused', description: 'Low-performing coupon paused for review', timestamp: '2 days ago', performedBy: 'John Smith', icon: 'pause' },
];

const quickActions: QuickAction[] = [
  { id: '1', title: 'Create Coupon', icon: 'plus-circle', color: '#3B82F6' },
  { id: '2', title: 'Launch Campaign', icon: 'rocket', color: '#10B981' },
  { id: '3', title: 'Duplicate', icon: 'copy', color: '#8B5CF6' },
  { id: '4', title: 'Segments', icon: 'account-group', color: '#EC4899' },
  { id: '5', title: 'Reports', icon: 'chart-line', color: '#F59E0B' },
  { id: '6', title: 'Newsletter', icon: 'email', color: '#06B6D4' },
  { id: '7', title: 'Export', icon: 'download', color: '#6366F1' },
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

const KPICard = ({ data, index }: { data: CouponKPI; index: number }) => {
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

const StatusBadge = ({ status }: { status: Coupon['status'] }) => {
  const config = {
    active: { label: 'Active', color: '#10B981', bg: '#D1FAE5' },
    scheduled: { label: 'Scheduled', color: '#F59E0B', bg: '#FEF3C7' },
    paused: { label: 'Paused', color: '#6B7280', bg: '#F3F4F6' },
    expired: { label: 'Expired', color: '#EF4444', bg: '#FEE2E2' },
    draft: { label: 'Draft', color: '#3B82F6', bg: '#DBEAFE' },
  };
  const { label, color, bg } = config[status];
  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
};

const CouponCard = ({ coupon, index }: { coupon: Coupon; index: number }) => {
  const getDiscountDisplay = () => {
    switch (coupon.discountType) {
      case 'percentage': return `${coupon.discountValue}% OFF`;
      case 'fixed': return `$${coupon.discountValue} OFF`;
      case 'free_shipping': return 'FREE SHIPPING';
      case 'bogo': return 'BUY ONE GET ONE';
      default: return `${coupon.discountValue}% OFF`;
    }
  };

  return (
    <Animated.View entering={FadeInUp.delay(index * 30).springify()} style={styles.couponCard}>
      <View style={styles.couponHeader}>
        <View>
          <Text style={styles.couponName}>{coupon.name}</Text>
          <Text style={styles.couponCode}>{coupon.code}</Text>
        </View>
        <StatusBadge status={coupon.status} />
      </View>
      
      <View style={styles.couponDiscount}>
        <LinearGradient
          colors={['#8B5CF6', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.discountBadge}
        >
          <Text style={styles.discountText}>{getDiscountDisplay()}</Text>
        </LinearGradient>
      </View>

      <View style={styles.couponStats}>
        <View style={styles.couponStat}>
          <Text style={styles.couponStatValue}>{coupon.totalRedemptions.toLocaleString()}</Text>
          <Text style={styles.couponStatLabel}>Redemptions</Text>
        </View>
        <View style={styles.couponStat}>
          <Text style={styles.couponStatValue}>${(coupon.revenueGenerated / 1000).toFixed(0)}K</Text>
          <Text style={styles.couponStatLabel}>Revenue</Text>
        </View>
        <View style={styles.couponStat}>
          <Text style={styles.couponStatValue}>{coupon.conversionRate}%</Text>
          <Text style={styles.couponStatLabel}>Conversion</Text>
        </View>
        <View style={styles.couponStat}>
          <Text style={styles.couponStatValue}>{coupon.remainingUses}</Text>
          <Text style={styles.couponStatLabel}>Remaining</Text>
        </View>
      </View>

      <View style={styles.couponProgressBar}>
        <View style={[styles.couponProgressFill, { width: `${(coupon.totalRedemptions / coupon.usageLimit) * 100}%`, backgroundColor: '#8B5CF6' }]} />
      </View>

      <View style={styles.couponFooter}>
        <View style={styles.couponDates}>
          <Text style={styles.couponDateLabel}>Valid until:</Text>
          <Text style={[styles.couponDateValue, coupon.daysRemaining < 7 && styles.couponExpiringSoon]}>
            {coupon.endDate} {coupon.daysRemaining > 0 && `(${coupon.daysRemaining}d left)`}
          </Text>
        </View>
        <View style={styles.couponActions}>
          <TouchableOpacity style={styles.couponActionButton}>
            <MaterialCommunityIcons name="pencil" size={18} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.couponActionButton}>
            <MaterialCommunityIcons name="content-copy" size={18} color="#8B5CF6" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.couponActionButton}>
            <Ionicons name="ellipsis-horizontal" size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const AlertCard = ({ alert, index }: { alert: Alert; index: number }) => {
  const getTypeConfig = () => {
    switch (alert.type) {
      case 'expiring_soon': return { label: 'Expiring Soon', icon: 'calendar-alert', color: '#EF4444' };
      case 'high_performing': return { label: 'High Performing', icon: 'chart-line', color: '#10B981' };
      case 'low_usage': return { label: 'Low Usage', icon: 'chart-line', color: '#F59E0B' };
      case 'paused': return { label: 'Paused Campaigns', icon: 'pause', color: '#6B7280' };
      default: return { label: 'Unused Coupons', icon: 'ticket', color: '#3B82F6' };
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
        <Text style={styles.alertCount}>{alert.count} coupons</Text>
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

const TopCouponCard = ({ coupon, index }: { coupon: TopCoupon; index: number }) => (
  <Animated.View entering={FadeInRight.delay(index * 60).springify()} style={styles.topCouponCard}>
    <View style={styles.topCouponRank}>
      <Text style={styles.topCouponRankText}>#{index + 1}</Text>
    </View>
    <View style={styles.topCouponInfo}>
      <Text style={styles.topCouponName}>{coupon.name}</Text>
      <Text style={styles.topCouponCode}>{coupon.code}</Text>
      <View style={styles.topCouponStats}>
        <Text style={styles.topCouponRevenue}>${(coupon.revenue / 1000).toFixed(0)}K</Text>
        <Text style={styles.topCouponRedemptions}>{coupon.redemptions} uses</Text>
      </View>
    </View>
  </Animated.View>
);

const SegmentCard = ({ segment, index }: { segment: SegmentPerformance; index: number }) => (
  <Animated.View entering={FadeInDown.delay(index * 50).springify()} style={styles.segmentCard}>
    <Text style={styles.segmentName}>{segment.name}</Text>
    <View style={styles.segmentStats}>
      <Text style={styles.segmentCoupons}>{segment.couponsUsed.toLocaleString()} coupons</Text>
      <Text style={styles.segmentRevenue}>${(segment.revenue / 1000).toFixed(0)}K</Text>
    </View>
    <View style={styles.segmentConversion}>
      <Text style={styles.segmentConversionLabel}>Conversion</Text>
      <Text style={styles.segmentConversionValue}>{segment.conversionRate}%</Text>
    </View>
    <View style={styles.segmentProgressBar}>
      <View style={[styles.segmentProgressFill, { width: `${(segment.conversionRate / 40) * 100}%`, backgroundColor: '#8B5CF6' }]} />
    </View>
  </Animated.View>
);

const ActivityItem = ({ activity, index }: { activity: Activity; index: number }) => {
  const getIconColor = () => {
    switch (activity.type) {
      case 'created': return '#10B981';
      case 'activated': return '#3B82F6';
      case 'redeemed': return '#8B5CF6';
      case 'extended': return '#F59E0B';
      default: return '#6B7280';
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

const PromotionHealthScore = () => (
  <View style={styles.healthCard}>
    <View style={styles.healthHeader}>
      <Text style={styles.healthTitle}>Promotion Health</Text>
      <View style={styles.healthScore}>
        <Text style={styles.healthScoreValue}>89</Text>
        <Text style={styles.healthScoreMax}>/100</Text>
      </View>
    </View>
    <View style={styles.healthIndicator}>
      <View style={[styles.healthIndicatorBar, { width: '89%', backgroundColor: '#8B5CF6' }]} />
    </View>
    <Text style={styles.healthStatus}>Excellent - Above Target</Text>
    <View style={styles.healthBreakdown}>
      <View style={styles.healthMetric}><Text style={styles.healthMetricLabel}>Active Campaigns</Text><Text style={styles.healthMetricValue}>89%</Text></View>
      <View style={styles.healthMetric}><Text style={styles.healthMetricLabel}>Utilization Rate</Text><Text style={styles.healthMetricValue}>76%</Text></View>
      <View style={styles.healthMetric}><Text style={styles.healthMetricLabel}>Conversion Impact</Text><Text style={styles.healthMetricValue}>84%</Text></View>
      <View style={styles.healthMetric}><Text style={styles.healthMetricLabel}>Revenue Impact</Text><Text style={styles.healthMetricValue}>92%</Text></View>
    </View>
  </View>
);

const RevenueImpactCard = () => (
  <View style={styles.revenueCard}>
    <View style={styles.revenueMetric}>
      <Text style={styles.revenueLabel}>Total Revenue</Text>
      <Text style={styles.revenueValue}>$2.45M</Text>
    </View>
    <View style={styles.revenueMetric}>
      <Text style={styles.revenueLabel}>Discount Cost</Text>
      <Text style={styles.revenueValue}>$345K</Text>
    </View>
    <View style={styles.revenueMetric}>
      <Text style={styles.revenueLabel}>Net Revenue</Text>
      <Text style={[styles.revenueValue, styles.revenuePositive]}>$2.10M</Text>
    </View>
    <View style={styles.revenueMetric}>
      <Text style={styles.revenueLabel}>ROI</Text>
      <Text style={[styles.revenueValue, styles.revenuePositive]}>508%</Text>
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
            Flash Sale 50% generated 24% more revenue than average campaigns. 3 high-performing coupons expiring within 48 hours.
            VIP customer campaigns achieved a 32% higher conversion rate. Revenue from promotions increased by 18% this month.
          </Text>
        </View>
      </View>
    </LinearGradient>
  </Animated.View>
);

// ============================================
// MAIN COUPON LIST SCREEN
// ============================================

export default function CouponListScreen() {
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

  const filteredCoupons = coupons.filter(coupon => {
    if (selectedFilter !== 'all') {
      if (coupon.status !== selectedFilter) return false;
    }
    if (searchText) {
      const query = searchText.toLowerCase();
      return coupon.name.toLowerCase().includes(query) || 
             coupon.code.toLowerCase().includes(query) ||
             coupon.campaign.toLowerCase().includes(query);
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
            <Text style={styles.headerTitle}>Coupons</Text>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" colors={['#8B5CF6']} />}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* KPI Cards */}
        <FlatList
          data={couponKpis}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item, index }) => <KPICard data={item} index={index} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.kpiList}
          style={styles.kpiSection}
        />

        {/* Promotion Health Score */}
        <PromotionHealthScore />

        {/* Search Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Feather name="search" size={20} color="#9CA3AF" />
            <TextInput
              placeholder="Search coupons, codes, campaigns..."
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
              { id: 'all', label: 'All Coupons', count: coupons.length },
              { id: 'active', label: 'Active', count: coupons.filter(c => c.status === 'active').length },
              { id: 'scheduled', label: 'Scheduled', count: coupons.filter(c => c.status === 'scheduled').length },
              { id: 'expired', label: 'Expired', count: coupons.filter(c => c.status === 'expired').length },
              { id: 'paused', label: 'Paused', count: coupons.filter(c => c.status === 'paused').length },
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
          <SectionHeader title="Promotion Alerts" icon="bell" onAction={() => {}} actionText="View All" />
          {alerts.map((alert, index) => (
            <AlertCard key={alert.id} alert={alert} index={index} />
          ))}
        </View>

        {/* Coupon Inventory */}
        <View style={styles.couponSection}>
          <SectionHeader title="Coupon Inventory" icon="ticket-percent" count={filteredCoupons.length} />
          {filteredCoupons.map((coupon, index) => (
            <CouponCard key={coupon.id} coupon={coupon} index={index} />
          ))}
        </View>

        {/* Usage Insights */}
        <View style={styles.insightsSection}>
          <SectionHeader title="Usage Insights" icon="chart-line" showSeeAll={false} />
          <View style={styles.insightsContainer}>
            <View style={styles.insightMetric}>
              <Text style={styles.insightLabel}>Redemption Rate</Text>
              <Text style={styles.insightValue}>58.3%</Text>
              <Text style={styles.insightTrend}>+12.5% vs last month</Text>
            </View>
            <View style={styles.insightMetric}>
              <Text style={styles.insightLabel}>Conversion Rate</Text>
              <Text style={styles.insightValue}>22.6%</Text>
              <Text style={styles.insightTrend}>+3.2% vs last month</Text>
            </View>
            <View style={styles.insightMetric}>
              <Text style={styles.insightLabel}>Avg Order Value</Text>
              <Text style={styles.insightValue}>$89.50</Text>
              <Text style={styles.insightTrend}>+$12.40 vs average</Text>
            </View>
          </View>
        </View>

        {/* Top Performing Coupons */}
        <View style={styles.topCouponsSection}>
          <SectionHeader title="Top Performing Promotions" icon="trophy" onAction={() => {}} actionText="View All" />
          <FlatList
            data={topCoupons}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item, index }) => <TopCouponCard coupon={item} index={index} />}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.topCouponsList}
          />
        </View>

        {/* Expiring Soon */}
        <View style={styles.expiringSection}>
          <SectionHeader title="Expiring Soon" icon="calendar-alert" onAction={() => {}} actionText="Manage" />
          {coupons.filter(c => c.daysRemaining > 0 && c.daysRemaining < 7).map((coupon, index) => (
            <View key={coupon.id} style={styles.expiringCard}>
              <View style={styles.expiringInfo}>
                <Text style={styles.expiringName}>{coupon.name}</Text>
                <Text style={styles.expiringCode}>{coupon.code}</Text>
                <Text style={styles.expiringDays}>{coupon.daysRemaining} days remaining</Text>
              </View>
              <View style={styles.expiringStats}>
                <Text style={styles.expiringUses}>{coupon.totalRedemptions.toLocaleString()} uses</Text>
                <Text style={styles.expiringRevenue}>${(coupon.revenueGenerated / 1000).toFixed(0)}K</Text>
              </View>
              <TouchableOpacity style={styles.expiringButton}>
                <Text style={styles.expiringButtonText}>Extend</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Audience Performance */}
        <View style={styles.segmentSection}>
          <SectionHeader title="Audience Performance" icon="account-group" showSeeAll={false} />
          {segmentPerformance.map((segment, index) => (
            <SegmentCard key={segment.id} segment={segment} index={index} />
          ))}
        </View>

        {/* Revenue Impact */}
        <View style={styles.revenueSection}>
          <SectionHeader title="Promotion Revenue Analysis" icon="currency-usd" showSeeAll={false} />
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

        {/* Campaign Health Check */}
        <View style={styles.complianceSection}>
          <SectionHeader title="Campaign Health Check" icon="check-circle" showSeeAll={false} />
          <View style={styles.complianceContainer}>
            {[
              { label: 'Active Campaigns Monitored', completed: true },
              { label: 'Expiration Dates Reviewed', completed: false },
              { label: 'Usage Limits Configured', completed: true },
              { label: 'Customer Segments Assigned', completed: true },
              { label: 'Performance Tracking Enabled', completed: true },
              { label: 'Revenue Attribution Active', completed: true },
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

      {/* Floating Action Button */}
      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 24 }]}>
        <LinearGradient
          colors={['#8B5CF6', '#6366F1']}
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
    color: '#8B5CF6',
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
    color: '#8B5CF6',
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
    color: '#8B5CF6',
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
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
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
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  alertActionText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },
  couponSection: {
    marginBottom: 16,
  },
  couponCard: {
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
  couponHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  couponName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  couponCode: {
    fontSize: 12,
    color: '#8B5CF6',
    fontFamily: 'monospace',
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
  couponDiscount: {
    marginBottom: 12,
  },
  discountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  discountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  couponStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  couponStat: {
    alignItems: 'center',
  },
  couponStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  couponStatLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  couponProgressBar: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  couponProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  couponFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  couponDates: {
    flexDirection: 'column',
  },
  couponDateLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  couponDateValue: {
    fontSize: 11,
    fontWeight: '500',
    color: '#1F2937',
  },
  couponExpiringSoon: {
    color: '#EF4444',
  },
  couponActions: {
    flexDirection: 'row',
    gap: 8,
  },
  couponActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
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
  topCouponsSection: {
    marginBottom: 16,
  },
  topCouponsList: {
    paddingHorizontal: 12,
  },
  topCouponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    width: 200,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  topCouponRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B5CF615',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  topCouponRankText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  topCouponInfo: {
    flex: 1,
  },
  topCouponName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  topCouponCode: {
    fontSize: 10,
    color: '#8B5CF6',
    marginTop: 2,
  },
  topCouponStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  topCouponRevenue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  topCouponRedemptions: {
    fontSize: 10,
    color: '#6B7280',
  },
  expiringSection: {
    marginBottom: 16,
  },
  expiringCard: {
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
  expiringInfo: {
    flex: 2,
  },
  expiringName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  expiringCode: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  expiringDays: {
    fontSize: 10,
    color: '#EF4444',
    marginTop: 4,
  },
  expiringStats: {
    flex: 1,
    alignItems: 'flex-end',
  },
  expiringUses: {
    fontSize: 11,
    color: '#6B7280',
  },
  expiringRevenue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 2,
  },
  expiringButton: {
    backgroundColor: '#EF444415',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 12,
  },
  expiringButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  segmentSection: {
    marginBottom: 16,
  },
  segmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
  },
  segmentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  segmentStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  segmentCoupons: {
    fontSize: 12,
    color: '#6B7280',
  },
  segmentRevenue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  segmentConversion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  segmentConversionLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  segmentConversionValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  segmentProgressBar: {
    height: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    overflow: 'hidden',
  },
  segmentProgressFill: {
    height: '100%',
    borderRadius: 2,
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