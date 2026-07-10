import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const QUICK_ACTION_SIZE = (SCREEN_WIDTH - 48) / 4;

// ============================================
// TYPES & INTERFACES
// ============================================

interface Category {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  parentId: string | null;
  parentName?: string;
  level: number;
  image: string;
  icon: string;
  productCount: number;
  subcategoryCount: number;
  views: number;
  revenue: number;
  status: 'active' | 'hidden' | 'featured' | 'empty';
  isFeatured: boolean;
  hasSEO: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AnalyticsCardData {
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

interface HierarchyNode {
  id: string;
  name: string;
  children: HierarchyNode[];
  productCount: number;
}

interface FeaturedCategory {
  id: string;
  name: string;
  image: string;
  productCount: number;
  revenue: number;
}

interface TopCategory {
  id: string;
  name: string;
  image: string;
  metric: string;
  value: string;
  growth: number;
}

interface Insight {
  id: string;
  message: string;
  type: 'positive' | 'warning' | 'neutral';
}

interface ValidationItem {
  id: string;
  label: string;
  completed: boolean;
  warning?: boolean;
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

const categories: Category[] = [
  {
    id: '1', name: 'Electronics', slug: 'electronics', categoryId: 'CAT-1001', parentId: null, level: 1,
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200', icon: 'cellphone',
    productCount: 456, subcategoryCount: 12, views: 15420, revenue: 125000, status: 'active', isFeatured: true,
    hasSEO: true, createdAt: '2024-01-15', updatedAt: '2024-06-10',
  },
  {
    id: '2', name: 'Smartphones', slug: 'smartphones', categoryId: 'CAT-1002', parentId: '1', parentName: 'Electronics', level: 2,
    image: 'https://images.unsplash.com/photo-1592899677977-9e10ca58899d?w=200', icon: 'cellphone',
    productCount: 234, subcategoryCount: 5, views: 8920, revenue: 68000, status: 'active', isFeatured: true,
    hasSEO: true, createdAt: '2024-01-20', updatedAt: '2024-06-08',
  },
  {
    id: '3', name: 'Laptops', slug: 'laptops', categoryId: 'CAT-1003', parentId: '1', parentName: 'Electronics', level: 2,
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200', icon: 'laptop',
    productCount: 156, subcategoryCount: 4, views: 6830, revenue: 125000, status: 'active', isFeatured: false,
    hasSEO: true, createdAt: '2024-01-25', updatedAt: '2024-06-05',
  },
  {
    id: '4', name: 'Fashion', slug: 'fashion', categoryId: 'CAT-2001', parentId: null, level: 1,
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=200', icon: 'tshirt-crew',
    productCount: 324, subcategoryCount: 15, views: 12340, revenue: 89000, status: 'active', isFeatured: true,
    hasSEO: true, createdAt: '2024-01-18', updatedAt: '2024-06-09',
  },
  {
    id: '5', name: "Men's Clothing", slug: 'men-clothing', categoryId: 'CAT-2002', parentId: '4', parentName: 'Fashion', level: 2,
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200', icon: 'tshirt-crew',
    productCount: 189, subcategoryCount: 8, views: 7230, revenue: 45000, status: 'active', isFeatured: false,
    hasSEO: true, createdAt: '2024-01-22', updatedAt: '2024-06-07',
  },
  {
    id: '6', name: "Women's Clothing", slug: 'women-clothing', categoryId: 'CAT-2003', parentId: '4', parentName: 'Fashion', level: 2,
    image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=200', icon: 'tshirt-crew',
    productCount: 135, subcategoryCount: 7, views: 5110, revenue: 44000, status: 'active', isFeatured: true,
    hasSEO: true, createdAt: '2024-01-24', updatedAt: '2024-06-06',
  },
  {
    id: '7', name: 'Home & Living', slug: 'home-living', categoryId: 'CAT-3001', parentId: null, level: 1,
    image: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=200', icon: 'sofa',
    productCount: 189, subcategoryCount: 10, views: 5670, revenue: 34000, status: 'active', isFeatured: false,
    hasSEO: false, createdAt: '2024-02-01', updatedAt: '2024-06-04',
  },
  {
    id: '8', name: 'Sports', slug: 'sports', categoryId: 'CAT-4001', parentId: null, level: 1,
    image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=200', icon: 'basketball',
    productCount: 98, subcategoryCount: 6, views: 3450, revenue: 21000, status: 'hidden', isFeatured: false,
    hasSEO: false, createdAt: '2024-02-10', updatedAt: '2024-06-01',
  },
  {
    id: '9', name: 'Beauty', slug: 'beauty', categoryId: 'CAT-5001', parentId: null, level: 1,
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200', icon: 'face-woman',
    productCount: 0, subcategoryCount: 0, views: 0, revenue: 0, status: 'empty', isFeatured: false,
    hasSEO: false, createdAt: '2024-03-01', updatedAt: '2024-05-15',
  },
];

const analyticsCards: AnalyticsCardData[] = [
  { id: '1', title: 'Total Categories', count: 245, icon: 'format-list-bulleted', color: '#3B82F6', trend: 12 },
  { id: '2', title: 'Active', count: 189, icon: 'check-circle', color: '#10B981', trend: 8 },
  { id: '3', title: 'Hidden', count: 23, icon: 'eye-off', color: '#6B7280', trend: -3 },
  { id: '4', title: 'Subcategories', count: 156, icon: 'sort-alphabetical-ascending', color: '#8B5CF6', trend: 15 },
  { id: '5', title: 'Featured', count: 12, icon: 'star', color: '#F59E0B', trend: 5 },
  { id: '6', title: 'Empty Categories', count: 8, icon: 'alert-circle', color: '#EF4444', trend: -2 },
];

const filterChips: FilterChip[] = [
  { id: 'all', label: 'All', count: 245 },
  { id: 'active', label: 'Active', count: 189 },
  { id: 'hidden', label: 'Hidden', count: 23 },
  { id: 'featured', label: 'Featured', count: 12 },
  { id: 'parent', label: 'Parent Categories', count: 89 },
  { id: 'subcategories', label: 'Subcategories', count: 156 },
  { id: 'empty', label: 'Empty Categories', count: 8 },
  { id: 'recent', label: 'Recently Added', count: 15 },
  { id: 'updated', label: 'Recently Updated', count: 34 },
];

const hierarchyData: HierarchyNode[] = [
  {
    id: '1', name: 'Electronics', productCount: 456, children: [
      { id: '2', name: 'Smartphones', productCount: 234, children: [] },
      { id: '3', name: 'Laptops', productCount: 156, children: [] },
      { id: '10', name: 'Accessories', productCount: 66, children: [] },
    ],
  },
  {
    id: '4', name: 'Fashion', productCount: 324, children: [
      { id: '5', name: "Men's Clothing", productCount: 189, children: [] },
      { id: '6', name: "Women's Clothing", productCount: 135, children: [] },
    ],
  },
  { id: '7', name: 'Home & Living', productCount: 189, children: [] },
  { id: '8', name: 'Sports', productCount: 98, children: [] },
];

const featuredCategories: FeaturedCategory[] = [
  { id: '1', name: 'Electronics', image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200', productCount: 456, revenue: 125000 },
  { id: '2', name: 'Fashion', image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=200', productCount: 324, revenue: 89000 },
  { id: '4', name: "Women's Clothing", image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=200', productCount: 135, revenue: 44000 },
];

const topCategories: TopCategory[] = [
  { id: '1', name: 'Electronics', image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200', metric: 'Most Products', value: '456', growth: 12 },
  { id: '2', name: 'Smartphones', image: 'https://images.unsplash.com/photo-1592899677977-9e10ca58899d?w=200', metric: 'Highest Revenue', value: '$68K', growth: 18 },
  { id: '3', name: 'Fashion', image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=200', metric: 'Most Viewed', value: '12.4K', growth: 24 },
  { id: '4', name: "Men's Clothing", image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200', metric: 'Fastest Growing', value: '+28%', growth: 28 },
];

const insights: Insight[] = [
  { id: '1', message: 'Electronics generates 42% of total revenue. Consider adding more subcategories.', type: 'positive' },
  { id: '2', message: '8 categories currently have no products. Add products or archive these categories.', type: 'warning' },
  { id: '3', message: 'Fashion category grew by 18% this month. Great momentum!', type: 'positive' },
];

const validationItems: ValidationItem[] = [
  { id: '1', label: 'Categories have images', completed: true, warning: false },
  { id: '2', label: 'SEO configured for top categories', completed: false, warning: true },
  { id: '3', label: 'Products assigned to categories', completed: false, warning: true },
  { id: '4', label: 'Visibility configured', completed: true, warning: false },
  { id: '5', label: 'Featured categories selected', completed: true, warning: false },
];

const quickActions: QuickAction[] = [
  { id: '1', title: 'Add Category', icon: 'plus-circle', color: '#3B82F6' },
  { id: '2', title: 'Subcategories', icon: 'sort-alphabetical-ascending', color: '#8B5CF6' },
  { id: '3', title: 'Import', icon: 'download', color: '#10B981' },
  { id: '4', title: 'Export', icon: 'upload', color: '#F59E0B' },
  { id: '5', title: 'SEO Settings', icon: 'google', color: '#EC4899' },
  { id: '6', title: 'Visibility', icon: 'eye', color: '#6366F1' },
  { id: '7', title: 'Featured', icon: 'star', color: '#14B8A6' },
  { id: '8', title: 'Reports', icon: 'chart-line', color: '#EF4444' },
];

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
    <Animated.View entering={FadeInLeft.delay(index * 40).springify()} style={styles.analyticsCardWrapper}>
      <TouchableOpacity activeOpacity={0.9} onPressIn={onPressIn} onPressOut={onPressOut}>
        <Animated.View style={[styles.analyticsCard, animatedStyle]}>
          <View style={[styles.analyticsIconContainer, { backgroundColor: `${data.color}15` }]}>
            <MaterialCommunityIcons name={data.icon as any} size={22} color={data.color} />
          </View>
          <Text style={styles.analyticsCount}>{data.count.toLocaleString()}</Text>
          <Text style={styles.analyticsTitle}>{data.title}</Text>
          {data.trend !== undefined && (
            <View style={[styles.analyticsTrend, { backgroundColor: data.trend >= 0 ? '#D1FAE5' : '#FEE2E2' }]}>
              <Ionicons name={data.trend >= 0 ? 'arrow-up' : 'arrow-down'} size={10} color={data.trend >= 0 ? '#10B981' : '#EF4444'} />
              <Text style={[styles.analyticsTrendText, { color: data.trend >= 0 ? '#10B981' : '#EF4444' }]}>{Math.abs(data.trend)}%</Text>
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

const StatusBadge = ({ status }: { status: Category['status'] }) => {
  const config = {
    active: { label: 'Active', color: '#10B981', bg: '#D1FAE5' },
    hidden: { label: 'Hidden', color: '#6B7280', bg: '#F3F4F6' },
    featured: { label: 'Featured', color: '#F59E0B', bg: '#FEF3C7' },
    empty: { label: 'Empty', color: '#EF4444', bg: '#FEE2E2' },
  };
  const { label, color, bg } = config[status];
  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
};

const CategoryCard = ({ category, index, onPress, onEdit, onDelete }: { 
  category: Category; index: number; onPress: () => void; onEdit: () => void; onDelete: () => void;
}) => {
  const scale = useSharedValue(1);
  
  const onPressIn = () => { scale.value = withSpring(0.99); };
  const onPressOut = () => { scale.value = withSpring(1); };
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeInUp.delay(index * 30).springify()} style={styles.categoryCardContainer}>
      <TouchableOpacity activeOpacity={0.95} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <Animated.View style={[styles.categoryCard, animatedStyle]}>
          <View style={styles.categoryCardMain}>
            <Image source={{ uri: category.image }} style={styles.categoryImage} />
            <View style={styles.categoryInfo}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryName}>{category.name}</Text>
                <StatusBadge status={category.status} />
              </View>
              <Text style={styles.categorySlug}>{category.slug}</Text>
              <Text style={styles.categoryMeta}>ID: {category.categoryId}</Text>
              {category.parentName && (
                <Text style={styles.categoryParent}>Parent: {category.parentName}</Text>
              )}
            </View>
          </View>
          
          <View style={styles.categoryStats}>
            <View style={styles.categoryStat}>
              <MaterialCommunityIcons name="package-variant" size={14} color="#6B7280" />
              <Text style={styles.categoryStatText}>{category.productCount} Products</Text>
            </View>
            <View style={styles.categoryStat}>
              <MaterialCommunityIcons name="sort-alphabetical-ascending" size={14} color="#6B7280" />
              <Text style={styles.categoryStatText}>{category.subcategoryCount} Subcategories</Text>
            </View>
            <View style={styles.categoryStat}>
              <MaterialCommunityIcons name="eye" size={14} color="#6B7280" />
              <Text style={styles.categoryStatText}>{category.views.toLocaleString()} Views</Text>
            </View>
            <View style={styles.categoryStat}>
              <MaterialCommunityIcons name="currency-usd" size={14} color="#6B7280" />
              <Text style={styles.categoryStatText}>${category.revenue.toLocaleString()}</Text>
            </View>
          </View>
          
          <View style={styles.categoryFooter}>
            <Text style={styles.categoryDate}>Updated: {category.updatedAt}</Text>
            <View style={styles.categoryActions}>
              <TouchableOpacity onPress={onEdit} style={styles.categoryActionButton}>
                <Ionicons name="create-outline" size={18} color="#3B82F6" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onDelete} style={styles.categoryActionButton}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.categoryActionButton}>
                <Ionicons name="ellipsis-horizontal" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
          
          {category.isFeatured && (
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={styles.featuredBadgeText}>Featured</Text>
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const HierarchyNodeComponent = ({ node, level = 0 }: { node: HierarchyNode; level?: number }) => {
  const [expanded, setExpanded] = useState(true);
  
  return (
    <View style={[styles.hierarchyNode, { marginLeft: level * 16 }]}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.hierarchyNodeHeader}>
        {node.children.length > 0 && (
          <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={16} color="#6B7280" />
        )}
        <MaterialCommunityIcons name="folder" size={18} color="#F59E0B" />
        <Text style={styles.hierarchyNodeName}>{node.name}</Text>
        <Text style={styles.hierarchyNodeCount}>({node.productCount} products)</Text>
      </TouchableOpacity>
      {expanded && node.children.map((child) => (
        <HierarchyNodeComponent key={child.id} node={child} level={level + 1} />
      ))}
    </View>
  );
};

const FeaturedCategoryCard = ({ category, index }: { category: FeaturedCategory; index: number }) => (
  <Animated.View entering={FadeInRight.delay(index * 60).springify()} style={styles.featuredCard}>
    <Image source={{ uri: category.image }} style={styles.featuredImage} />
    <View style={styles.featuredInfo}>
      <Text style={styles.featuredName}>{category.name}</Text>
      <View style={styles.featuredStats}>
        <Text style={styles.featuredStat}>{category.productCount} products</Text>
        <Text style={styles.featuredRevenue}>${category.revenue.toLocaleString()}</Text>
      </View>
    </View>
  </Animated.View>
);

const TopCategoryCard = ({ category, index }: { category: TopCategory; index: number }) => (
  <Animated.View entering={FadeInUp.delay(index * 70).springify()} style={styles.topCategoryCard}>
    <Image source={{ uri: category.image }} style={styles.topCategoryImage} />
    <View style={styles.topCategoryInfo}>
      <Text style={styles.topCategoryName}>{category.name}</Text>
      <Text style={styles.topCategoryMetric}>{category.metric}</Text>
      <Text style={styles.topCategoryValue}>{category.value}</Text>
      <View style={[styles.topCategoryGrowth, { backgroundColor: category.growth >= 0 ? '#D1FAE5' : '#FEE2E2' }]}>
        <Ionicons name={category.growth >= 0 ? 'arrow-up' : 'arrow-down'} size={10} color={category.growth >= 0 ? '#10B981' : '#EF4444'} />
        <Text style={[styles.topCategoryGrowthText, { color: category.growth >= 0 ? '#10B981' : '#EF4444' }]}>{Math.abs(category.growth)}%</Text>
      </View>
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
        <Ionicons name={getIcon()} size={22} color={getBgColor()} />
      </View>
      <View style={styles.insightContent}>
        <Text style={styles.insightText}>{insight.message}</Text>
      </View>
    </Animated.View>
  );
};

const ValidationChecklist = ({ items }: { items: ValidationItem[] }) => (
  <View style={styles.validationContainer}>
    {items.map((item) => (
      <View key={item.id} style={styles.validationItem}>
        <View style={[styles.validationCircle, item.completed && styles.validationCircleCompleted, item.warning && styles.validationCircleWarning]}>
          {item.completed ? <Ionicons name="checkmark" size={12} color="#FFFFFF" /> : item.warning && <Ionicons name="warning" size={12} color="#FFFFFF" />}
        </View>
        <Text style={[styles.validationLabel, item.completed && styles.validationLabelCompleted, item.warning && styles.validationLabelWarning]}>
          {item.label}
        </Text>
      </View>
    ))}
  </View>
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

// ============================================
// MAIN CATEGORY LIST SCREEN
// ============================================

export default function CategoryListScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const toggleCategorySelection = useCallback((categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]
    );
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCategories([]);
    setIsBulkMode(false);
  }, []);

  const filteredCategories = useMemo(() => {
    let filtered = categories;
    
    if (selectedFilter !== 'all') {
      if (selectedFilter === 'active') filtered = filtered.filter(c => c.status === 'active');
      else if (selectedFilter === 'hidden') filtered = filtered.filter(c => c.status === 'hidden');
      else if (selectedFilter === 'featured') filtered = filtered.filter(c => c.isFeatured);
      else if (selectedFilter === 'parent') filtered = filtered.filter(c => c.level === 1);
      else if (selectedFilter === 'subcategories') filtered = filtered.filter(c => c.level > 1);
      else if (selectedFilter === 'empty') filtered = filtered.filter(c => c.status === 'empty');
    }
    
    if (searchText) {
      const query = searchText.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.slug.toLowerCase().includes(query) ||
        c.categoryId.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [selectedFilter, searchText]);

  const renderCategoryItem = ({ item, index }: { item: Category; index: number }) => (
    <CategoryCard
      category={item}
      index={index}
      onPress={() => {}}
      onEdit={() => {}}
      onDelete={() => {}}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      <Animated.View style={[styles.headerContainer, headerAnimatedStyle]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Categories</Text>
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

      <Animated.FlatList
        data={filteredCategories}
        keyExtractor={(item) => item.id}
        renderItem={renderCategoryItem}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={['#3B82F6']} />
        }
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
                  placeholder="Search categories by name, slug, or ID..."
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
            {selectedCategories.length > 0 && (
              <Animated.View entering={FadeInDown.springify()} style={styles.bulkToolbar}>
                <View style={styles.bulkInfo}>
                  <Text style={styles.bulkCount}>{selectedCategories.length} selected</Text>
                </View>
                <View style={styles.bulkActions}>
                  <TouchableOpacity style={styles.bulkAction}>
                    <MaterialCommunityIcons name="eye-off" size={20} color="#6B7280" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.bulkAction}>
                    <MaterialCommunityIcons name="delete-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.bulkAction}>
                    <MaterialCommunityIcons name="star-outline" size={20} color="#F59E0B" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.bulkAction} onPress={clearSelection}>
                    <MaterialCommunityIcons name="close" size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            {/* Categories Header */}
            <SectionHeader title="All Categories" count={filteredCategories.length} />

            {/* Category Hierarchy Visualization */}
            <View style={styles.hierarchySection}>
              <SectionHeader title="Category Structure" showSeeAll={false} />
              <View style={styles.hierarchyContainer}>
                {hierarchyData.map((node) => (
                  <HierarchyNodeComponent key={node.id} node={node} />
                ))}
              </View>
            </View>

            {/* Featured Categories */}
            <View style={styles.featuredSection}>
              <SectionHeader title="Featured Categories" />
              <FlatList
                data={featuredCategories}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item, index }) => <FeaturedCategoryCard category={item} index={index} />}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.featuredList}
              />
            </View>

            {/* Top Performing Categories */}
            <View style={styles.topCategoriesSection}>
              <SectionHeader title="Top Categories" />
              <FlatList
                data={topCategories}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item, index }) => <TopCategoryCard category={item} index={index} />}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.topCategoriesList}
              />
            </View>

            {/* Category Insights */}
            <View style={styles.insightsSection}>
              <SectionHeader title="Category Insights" showSeeAll={false} />
              {insights.map((insight, index) => (
                <InsightCard key={insight.id} insight={insight} index={index} />
              ))}
            </View>

            {/* Validation & Health */}
            <View style={styles.validationSection}>
              <SectionHeader title="Category Health" showSeeAll={false} />
              <ValidationChecklist items={validationItems} />
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
          </View>
        }
        ListFooterComponent={<View style={[styles.footerSpacing, { height: insets.bottom + 80 }]} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="folder-open" size={80} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>No Categories Found</Text>
            <Text style={styles.emptyStateDescription}>
              Create your first category to organize your products efficiently.
            </Text>
            <TouchableOpacity style={styles.emptyStateButton}>
              <Text style={styles.emptyStateButtonText}>Create Category</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 24 }]}>
        <LinearGradient
          colors={['#3B82F6', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
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
  analyticsSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  analyticsList: {
    paddingHorizontal: 16,
  },
  analyticsCardWrapper: {
    width: 110,
    marginHorizontal: 6,
  },
  analyticsCard: {
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
  analyticsIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  analyticsCount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
  },
  analyticsTitle: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
  },
  analyticsTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
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
  categoryCardContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryCardMain: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  categoryImage: {
    width: 70,
    height: 70,
    borderRadius: 16,
  },
  categoryInfo: {
    flex: 1,
    marginLeft: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  categorySlug: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  categoryMeta: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  categoryParent: {
    fontSize: 10,
    color: '#3B82F6',
    marginTop: 2,
  },
  categoryStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginBottom: 12,
    gap: 12,
  },
  categoryStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryStatText: {
    fontSize: 11,
    color: '#6B7280',
  },
  categoryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  categoryDate: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  featuredBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#F59E0B',
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
  hierarchySection: {
    marginBottom: 24,
  },
  hierarchyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
  },
  hierarchyNode: {
    marginBottom: 8,
  },
  hierarchyNodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  hierarchyNodeName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  hierarchyNodeCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  featuredSection: {
    marginBottom: 24,
  },
  featuredList: {
    paddingHorizontal: 16,
  },
  featuredCard: {
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
  featuredImage: {
    width: 50,
    height: 50,
    borderRadius: 12,
  },
  featuredInfo: {
    flex: 1,
    marginLeft: 12,
  },
  featuredName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  featuredStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  featuredStat: {
    fontSize: 10,
    color: '#6B7280',
  },
  featuredRevenue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  topCategoriesSection: {
    marginBottom: 24,
  },
  topCategoriesList: {
    paddingHorizontal: 16,
  },
  topCategoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 6,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  topCategoryImage: {
    width: 50,
    height: 50,
    borderRadius: 12,
  },
  topCategoryInfo: {
    flex: 1,
    marginLeft: 12,
  },
  topCategoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  topCategoryMetric: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  topCategoryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 2,
  },
  topCategoryGrowth: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
    gap: 2,
  },
  topCategoryGrowthText: {
    fontSize: 9,
    fontWeight: '600',
  },
  insightsSection: {
    marginBottom: 24,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
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
  validationSection: {
    marginBottom: 24,
  },
  validationContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    gap: 12,
  },
  validationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  validationCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  validationCircleCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  validationCircleWarning: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  validationLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  validationLabelCompleted: {
    color: '#10B981',
    textDecorationLine: 'line-through',
  },
  validationLabelWarning: {
    color: '#F59E0B',
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