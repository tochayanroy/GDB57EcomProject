// WishlistScreen.tsx
import { Feather, Ionicons, MaterialIcons, SimpleLineIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    ListRenderItemInfo,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInLeft,
    FadeInRight,
    FadeInUp,
    Layout,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// 1. TYPES & INTERFACES
// ============================================

interface WishlistProduct {
  _id: string;
  product: {
    _id: string;
    name: string;
    slug: string;
    price: number;
    discountPrice: number;
    currentPrice: number;
    thumbnail: string;
    images: string[];
    stock: number;
    averageRating: number;
    category: {
      _id: string;
      name: string;
      slug: string;
    };
  };
  variant: string | null;
  price: number;
  addedAt: string;
  inStock: boolean;
  priceChanged: boolean;
}

interface PriceDropProduct {
  id: string;
  name: string;
  image: string;
  previousPrice: number;
  newPrice: number;
  savings: number;
  discountPercentage: number;
}

interface RecommendedProduct {
  id: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  rating: number;
}

interface RecentlyViewedProduct {
  id: string;
  name: string;
  image: string;
  price: number;
}

type SortOption = 'price_low_high' | 'price_high_low' | 'newest' | 'best_rated';
type FilterCategory = 'all' | 'fashion' | 'electronics' | 'shoes' | 'beauty' | 'home';

interface WishlistResponse {
  success: boolean;
  data: {
    _id: string;
    user: string;
    totalItems: number;
    items: WishlistProduct[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

// ============================================
// 2. API SERVICE
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

// Wishlist API calls
const wishlistAPI = {
  getWishlist: (page = 1, limit = 20) =>
    apiRequest<WishlistResponse>(`/wishlist?page=${page}&limit=${limit}`),
  
  getSummary: () =>
    apiRequest<{ success: boolean; data: { totalItems: number; hasItems: boolean } }>('/wishlist/summary'),
  
  checkProduct: (productId: string) =>
    apiRequest<{ success: boolean; data: { isInWishlist: boolean; productId: string } }>(`/wishlist/check/${productId}`),
  
  addToWishlist: (productId: string, variant?: string) =>
    apiRequest<{ success: boolean; message: string; data: { totalItems: number; item: any } }>(
      `/wishlist/add/${productId}`,
      'POST',
      { variant: variant || null }
    ),
  
  removeFromWishlist: (productId: string, variant?: string) =>
    apiRequest<{ success: boolean; message: string; data: { totalItems: number } }>(
      `/wishlist/remove/${productId}${variant ? `?variant=${variant}` : ''}`,
      'DELETE'
    ),
  
  removeBulk: (productIds: string[]) =>
    apiRequest<{ success: boolean; message: string; data: { totalItems: number; removedCount: number } }>(
      '/wishlist/remove/bulk',
      'DELETE',
      { productIds }
    ),
  
  clearWishlist: () =>
    apiRequest<{ success: boolean; message: string; data: { removedCount: number } }>(
      '/wishlist/clear',
      'DELETE'
    ),
  
  moveToCart: (productId: string, variant?: string, quantity = 1) =>
    apiRequest<{ success: boolean; message: string; data: { cartItem: any; wishlistTotalItems: number } }>(
      `/wishlist/move-to-cart/${productId}`,
      'POST',
      { variant: variant || null, quantity }
    ),
  
  syncPrices: () =>
    apiRequest<{ success: boolean; message: string; data: { updatedCount: number; priceChanges: any[] } }>(
      '/wishlist/sync-prices',
      'PUT'
    ),
  
  getPriceDrops: () =>
    apiRequest<{ success: boolean; data: { priceDrops: any[]; totalDrops: number } }>(
      '/wishlist/price-drops'
    ),
  
  shareWishlist: () =>
    apiRequest<{ success: boolean; data: { shareUrl: string; shareToken: string; userName: string; totalItems: number } }>(
      '/wishlist/share'
    ),
  
  getStats: () =>
    apiRequest<{ success: boolean; data: { totalItems: number; totalValue: string; averagePrice: string; priceDrops: number; oldestItem: any; newestItem: any } }>(
      '/wishlist/stats'
    ),
};

// ============================================
// 3. OPTIMIZED COMPONENTS
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_CARD_WIDTH = SCREEN_WIDTH * 0.42;

// Memoized Product Card Component
const ProductCard = React.memo(({ 
  item, 
  onMoveToCart, 
  onRemove,
  index 
}: { 
  item: WishlistProduct; 
  onMoveToCart: (productId: string, variant?: string) => void; 
  onRemove: (productId: string, variant?: string) => void;
  index: number;
}) => {
  const scale = useSharedValue(1);
  const heartScale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98, { damping: 20, stiffness: 300 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
  }, []);

  const handleHeartPress = useCallback(() => {
    heartScale.value = withSequence(
      withSpring(1.3, { damping: 10, stiffness: 200 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );
    runOnJS(onRemove)(item.product._id, item.variant || undefined);
  }, [item.product._id, item.variant, onRemove]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const product = item.product;
  const discountPercentage = product.discountPrice && product.discountPrice > 0
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;

  const getStockStatusColor = () => {
    if (!item.inStock) return '#EF4444';
    if (product.stock < 10) return '#F59E0B';
    return '#22C55E';
  };

  const getStockStatusText = () => {
    if (!item.inStock) return 'Out of Stock';
    if (product.stock < 10) return 'Limited Stock';
    return 'In Stock';
  };

  return (
    <Animated.View
      entering={FadeInRight.delay(index * 80).springify().damping(20)}
      layout={Layout.springify()}
    >
      <TouchableWithoutFeedback onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <Animated.View style={[styles.productCard, animatedStyle]}>
          <View style={styles.productImageContainer}>
            <Image 
              source={{ uri: product.thumbnail || product.images?.[0] || 'https://via.placeholder.com/400' }} 
              style={styles.productImage} 
            />
            <TouchableOpacity style={styles.wishlistBadge} onPress={handleHeartPress}>
              <Animated.View style={heartAnimatedStyle}>
                <Ionicons name="heart" size={22} color="#EC4899" />
              </Animated.View>
            </TouchableOpacity>
            {discountPercentage > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{discountPercentage}% OFF</Text>
              </View>
            )}
            {item.priceChanged && (
              <View style={[styles.discountBadge, { backgroundColor: '#2563EB', left: 12, bottom: 52 }]}>
                <Text style={styles.discountText}>Price Dropped!</Text>
              </View>
            )}
          </View>
          
          <View style={styles.productDetails}>
            <Text style={styles.brandName}>{product.category?.name || 'Uncategorized'}</Text>
            <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
            
            {product.averageRating > 0 && (
              <View style={styles.ratingContainer}>
                <MaterialIcons name="star" size={14} color="#F59E0B" />
                <Text style={styles.ratingText}>{product.averageRating.toFixed(1)}</Text>
              </View>
            )}
            
            <View style={styles.priceContainer}>
              <Text style={styles.currentPrice}>₹{product.currentPrice.toLocaleString()}</Text>
              {product.discountPrice && product.discountPrice > 0 && (
                <Text style={styles.originalPrice}>₹{product.price.toLocaleString()}</Text>
              )}
            </View>
            
            <View style={styles.stockContainer}>
              <View style={[styles.stockDot, { backgroundColor: getStockStatusColor() }]} />
              <Text style={[styles.stockText, { color: getStockStatusColor() }]}>
                {getStockStatusText()}
              </Text>
            </View>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.moveToCartButton, !item.inStock && styles.disabledButton]}
                onPress={() => onMoveToCart(item.product._id, item.variant || undefined)}
                activeOpacity={0.8}
                disabled={!item.inStock}
              >
                <Feather name="shopping-bag" size={16} color="#FFFFFF" />
                <Text style={styles.moveToCartText}>Move to Cart</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.removeButton}
                onPress={() => onRemove(item.product._id, item.variant || undefined)}
                activeOpacity={0.7}
              >
                <SimpleLineIcons name="trash" size={16} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Animated.View>
  );
});

// Price Drop Card Component
const PriceDropCard = React.memo(({ product, index, onAddToCart }: { 
  product: PriceDropProduct; 
  index: number;
  onAddToCart: (productId: string) => void;
}) => (
  <Animated.View 
    entering={FadeInLeft.delay(index * 100).springify()}
    style={styles.priceDropCard}
  >
    <Image source={{ uri: product.image }} style={styles.priceDropImage} />
    <View style={styles.priceDropInfo}>
      <Text style={styles.priceDropName} numberOfLines={1}>{product.name}</Text>
      <Text style={styles.saveAmount}>Save ₹{product.savings.toLocaleString()}</Text>
      <View style={styles.priceDropPrices}>
        <Text style={styles.priceDropNew}>₹{product.newPrice.toLocaleString()}</Text>
        <Text style={styles.priceDropOld}>₹{product.previousPrice.toLocaleString()}</Text>
      </View>
      <View style={styles.priceDropBadge}>
        <Text style={styles.priceDropBadgeText}>{product.discountPercentage}% OFF</Text>
      </View>
    </View>
    <TouchableOpacity 
      style={styles.priceDropAddButton}
      onPress={() => onAddToCart(product.id)}
    >
      <Feather name="plus" size={20} color="#2563EB" />
    </TouchableOpacity>
  </Animated.View>
));

// Horizontal Product Card for Recommended/Recently Viewed
const HorizontalProductCard = React.memo(({ 
  product, 
  showRating = false 
}: { 
  product: RecommendedProduct | RecentlyViewedProduct; 
  showRating?: boolean;
}) => {
  const scale = useSharedValue(1);
  
  const handlePressIn = () => {
    scale.value = withSpring(0.96);
  };
  
  const handlePressOut = () => {
    scale.value = withSpring(1);
  };
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  const isRecommended = (p: any): p is RecommendedProduct => 'rating' in p && 'brand' in p;
  
  return (
    <TouchableWithoutFeedback onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.horizontalCard, animatedStyle]}>
        <Image source={{ uri: product.image }} style={styles.horizontalCardImage} />
        {isRecommended(product) && (
          <TouchableOpacity style={styles.horizontalWishlistButton}>
            <Ionicons name="heart-outline" size={18} color="#64748B" />
          </TouchableOpacity>
        )}
        <View style={styles.horizontalCardInfo}>
          <Text style={styles.horizontalCardName} numberOfLines={1}>{product.name}</Text>
          {isRecommended(product) && (
            <Text style={styles.horizontalCardBrand}>{product.brand}</Text>
          )}
          {showRating && isRecommended(product) && (
            <View style={styles.horizontalRating}>
              <MaterialIcons name="star" size={10} color="#F59E0B" />
              <Text style={styles.horizontalRatingText}>{product.rating}</Text>
            </View>
          )}
          <Text style={styles.horizontalCardPrice}>₹{product.price.toLocaleString()}</Text>
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
});

// Empty State Component
const EmptyWishlistState = React.memo(({ onStartShopping }: { onStartShopping: () => void }) => {
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);
  
  React.useEffect(() => {
    scale.value = withSpring(1, { damping: 15 });
    opacity.value = withTiming(1, { duration: 500 });
  }, []);
  
  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  
  return (
    <Animated.View style={[styles.emptyContainer, animatedContainerStyle]}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="heart-outline" size={80} color="#CBD5E1" />
      </View>
      <Text style={styles.emptyTitle}>Your Wishlist is Empty</Text>
      <Text style={styles.emptyDescription}>
        Save products you love and access them anytime, anywhere.
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={onStartShopping}>
        <Text style={styles.emptyButtonText}>Start Shopping</Text>
        <Feather name="arrow-right" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  );
});

// ============================================
// 4. MAIN SCREEN COMPONENT
// ============================================

const WishlistScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  
  // State
  const [wishlistItems, setWishlistItems] = useState<WishlistProduct[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSort, setSelectedSort] = useState<SortOption>('newest');
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all');
  const [priceDrops, setPriceDrops] = useState<PriceDropProduct[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<RecommendedProduct[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedProduct[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const headerOpacity = useSharedValue(0);
  
  // Animation on mount
  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 600 });
  }, []);
  
  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));
  
  // Load wishlist data
  const loadWishlist = useCallback(async (pageNum = 1, refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      }
      
      const response = await wishlistAPI.getWishlist(pageNum, 20);
      
      if (response.success) {
        const newItems = response.data.items || [];
        setTotalItems(response.data.totalItems);
        
        if (refresh || pageNum === 1) {
          setWishlistItems(newItems);
        } else {
          setWishlistItems(prev => [...prev, ...newItems]);
        }
        
        setHasMore(newItems.length === 20);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Error loading wishlist:', error);
      Alert.alert('Error', 'Failed to load wishlist');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);
  
  // Load additional data (price drops, stats, etc.)
  const loadAdditionalData = useCallback(async () => {
    try {
      // Load price drops
      const priceDropResponse = await wishlistAPI.getPriceDrops();
      if (priceDropResponse.success) {
        setPriceDrops(priceDropResponse.data.priceDrops || []);
      }
      
      // Load wishlist stats
      const statsResponse = await wishlistAPI.getStats();
      if (statsResponse.success) {
        // Use stats for additional insights
        console.log('Wishlist stats:', statsResponse.data);
      }
    } catch (error) {
      console.error('Error loading additional data:', error);
    }
  }, []);
  
  // Initial load
  useEffect(() => {
    loadWishlist(1, false);
    loadAdditionalData();
  }, []);
  
  // Filter and sort logic
  const filteredAndSortedItems = useMemo(() => {
    let filtered = [...wishlistItems];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        item => item.product.name.toLowerCase().includes(query) || 
                item.product.category?.name?.toLowerCase().includes(query)
      );
    }
    
    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => 
        item.product.category?.slug === selectedCategory
      );
    }
    
    // Apply sorting
    switch (selectedSort) {
      case 'price_low_high':
        filtered.sort((a, b) => a.product.currentPrice - b.product.currentPrice);
        break;
      case 'price_high_low':
        filtered.sort((a, b) => b.product.currentPrice - a.product.currentPrice);
        break;
      case 'best_rated':
        filtered.sort((a, b) => (b.product.averageRating || 0) - (a.product.averageRating || 0));
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
        break;
    }
    
    return filtered;
  }, [wishlistItems, searchQuery, selectedSort, selectedCategory]);
  
  // Handlers
  const handleMoveToCart = useCallback(async (productId: string, variant?: string) => {
    try {
      const response = await wishlistAPI.moveToCart(productId, variant, 1);
      if (response.success) {
        // Remove from wishlist
        setWishlistItems(prev => prev.filter(item => item.product._id !== productId));
        setTotalItems(prev => prev - 1);
        Alert.alert('Success', 'Product moved to cart');
      }
    } catch (error) {
      console.error('Error moving to cart:', error);
      Alert.alert('Error', 'Failed to move product to cart');
    }
  }, []);
  
  const handleRemoveItem = useCallback(async (productId: string, variant?: string) => {
    try {
      const response = await wishlistAPI.removeFromWishlist(productId, variant);
      if (response.success) {
        setWishlistItems(prev => prev.filter(item => item.product._id !== productId));
        setTotalItems(prev => prev - 1);
      }
    } catch (error) {
      console.error('Error removing item:', error);
      Alert.alert('Error', 'Failed to remove item');
    }
  }, []);
  
  const handleMoveAllToCart = useCallback(async () => {
    const productIds = wishlistItems.map(item => item.product._id);
    try {
      // Move each item to cart
      for (const productId of productIds) {
        await wishlistAPI.moveToCart(productId, undefined, 1);
      }
      // Clear wishlist locally
      setWishlistItems([]);
      setTotalItems(0);
      Alert.alert('Success', 'All items moved to cart');
    } catch (error) {
      console.error('Error moving all to cart:', error);
      Alert.alert('Error', 'Failed to move all items to cart');
    }
  }, [wishlistItems]);
  
  const handleStartShopping = useCallback(() => {
    // Navigate to home/shop
    console.log('Navigate to home/shop');
  }, []);
  
  const handleBack = useCallback(() => {
    console.log('Navigate back');
  }, []);
  
  const handleCartPress = useCallback(() => {
    console.log('Open cart');
  }, []);
  
  const handleRefresh = useCallback(() => {
    loadWishlist(1, true);
  }, [loadWishlist]);
  
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      loadWishlist(page + 1, false);
    }
  }, [loadingMore, hasMore, page, loadWishlist]);
  
  const handleAddToCartFromPriceDrop = useCallback(async (productId: string) => {
    try {
      await wishlistAPI.addToWishlist(productId);
      Alert.alert('Success', 'Added to wishlist');
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      Alert.alert('Error', 'Failed to add to wishlist');
    }
  }, []);
  
  // Render helpers
  const renderWishlistItem = useCallback(({ item, index }: ListRenderItemInfo<WishlistProduct>) => (
    <ProductCard 
      item={item} 
      onMoveToCart={handleMoveToCart} 
      onRemove={handleRemoveItem}
      index={index}
    />
  ), [handleMoveToCart, handleRemoveItem]);
  
  const keyExtractor = useCallback((item: WishlistProduct) => item._id, []);
  
  const ListHeaderComponent = useMemo(() => (
    <>
      {/* Summary Section */}
      <Animated.View style={[styles.summarySection, headerAnimatedStyle]}>
        <View>
          <Text style={styles.summaryTitle}>Saved Items</Text>
          <Text style={styles.summaryCount}>{filteredAndSortedItems.length} Products</Text>
        </View>
        {priceDrops.length > 0 && (
          <View style={styles.summaryBadges}>
            <View style={styles.summaryBadge}>
              <Ionicons name="pricetag-outline" size={14} color="#22C55E" />
              <Text style={styles.summaryBadgeText}>{priceDrops.length} Price Drops</Text>
            </View>
          </View>
        )}
      </Animated.View>
      
      {/* Search Bar */}
      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.searchContainer}>
        <Feather name="search" size={20} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search wishlist products..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </Animated.View>
      
      {/* Filter & Sort Section */}
      <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.sortPills}>
            {(['price_low_high', 'price_high_low', 'newest', 'best_rated'] as SortOption[]).map(option => (
              <TouchableOpacity
                key={option}
                style={[styles.sortPill, selectedSort === option && styles.sortPillActive]}
                onPress={() => setSelectedSort(option)}
              >
                <Text style={[styles.sortPillText, selectedSort === option && styles.sortPillTextActive]}>
                  {option === 'price_low_high' ? 'Price: Low to High' :
                   option === 'price_high_low' ? 'Price: High to Low' :
                   option === 'newest' ? 'Newest' : 'Best Rated'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {(['all', 'fashion', 'electronics', 'shoes', 'beauty', 'home'] as FilterCategory[]).map(category => (
            <TouchableOpacity
              key={category}
              style={[styles.categoryPill, selectedCategory === category && styles.categoryPillActive]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[styles.categoryPillText, selectedCategory === category && styles.categoryPillTextActive]}>
                {category === 'all' ? 'All' :
                 category === 'fashion' ? 'Fashion' :
                 category === 'electronics' ? 'Electronics' :
                 category === 'shoes' ? 'Shoes' :
                 category === 'beauty' ? 'Beauty' : 'Home'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
      
      {/* Price Drop Alert Section */}
      {priceDrops.length > 0 && (
        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔥 Price Drops</Text>
            <TouchableOpacity>
              <Text style={styles.sectionSeeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.priceDropScroll}>
            {priceDrops.map((product, idx) => (
              <PriceDropCard 
                key={product.id} 
                product={product} 
                index={idx}
                onAddToCart={handleAddToCartFromPriceDrop}
              />
            ))}
          </ScrollView>
        </Animated.View>
      )}
    </>
  ), [filteredAndSortedItems.length, priceDrops, searchQuery, selectedSort, selectedCategory, headerAnimatedStyle, handleAddToCartFromPriceDrop]);
  
  const ListFooterComponent = useMemo(() => {
    if (loadingMore) {
      return (
        <View style={styles.loadingMoreContainer}>
          <ActivityIndicator size="small" color="#2563EB" />
        </View>
      );
    }
    return null;
  }, [loadingMore]);
  
  // Loading state
  if (loading && wishlistItems.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wishlist</Text>
          <TouchableOpacity style={styles.headerButton} onPress={handleCartPress}>
            <Feather name="shopping-bag" size={22} color="#0F172A" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading your wishlist...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Empty state
  if (wishlistItems.length === 0 && !loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wishlist</Text>
          <TouchableOpacity style={styles.headerButton} onPress={handleCartPress}>
            <Feather name="shopping-bag" size={22} color="#0F172A" />
          </TouchableOpacity>
        </View>
        <EmptyWishlistState onStartShopping={handleStartShopping} />
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wishlist</Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleCartPress}>
          <Feather name="shopping-bag" size={22} color="#0F172A" />
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{totalItems}</Text>
          </View>
        </TouchableOpacity>
      </View>
      
      {/* Main FlatList */}
      <FlatList
        ref={flatListRef}
        data={filteredAndSortedItems}
        renderItem={renderWishlistItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={50}
        initialNumToRender={4}
        windowSize={7}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#2563EB']}
            tintColor="#2563EB"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
      />
      
      {/* Sticky Bottom Action Bar */}
      {filteredAndSortedItems.length > 0 && (
        <Animated.View 
          entering={FadeInUp.delay(500).springify()}
          style={[styles.bottomBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}
        >
          <TouchableOpacity style={styles.moveAllButton} onPress={handleMoveAllToCart}>
            <Feather name="shopping-bag" size={18} color="#FFFFFF" />
            <Text style={styles.moveAllButtonText}>Move All to Cart ({filteredAndSortedItems.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.continueButton} onPress={handleStartShopping}>
            <Text style={styles.continueButtonText}>Continue Shopping</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

// ============================================
// 5. STYLES (Same as before)
// ============================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EC4899',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
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
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  summarySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  summaryCount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
  },
  summaryBadges: {
    flexDirection: 'row',
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  summaryBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#22C55E',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    padding: 0,
  },
  filterSection: {
    marginBottom: 16,
  },
  sortPills: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  sortPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
  },
  sortPillActive: {
    backgroundColor: '#2563EB',
  },
  sortPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  sortPillTextActive: {
    color: '#FFFFFF',
  },
  categoryScroll: {
    paddingHorizontal: 16,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  categoryPillActive: {
    backgroundColor: '#2563EB',
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSeeAll: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2563EB',
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  productImageContainer: {
    position: 'relative',
    width: '100%',
    height: 220,
    backgroundColor: '#F8FAFC',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  wishlistBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  discountBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: '#EC4899',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  productDetails: {
    padding: 14,
  },
  brandName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 4,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
    lineHeight: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  reviewCount: {
    fontSize: 12,
    color: '#64748B',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 8,
  },
  currentPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  originalPrice: {
    fontSize: 14,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  moveToCartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#94A3B8',
  },
  moveToCartText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  removeButton: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
  },
  priceDropScroll: {
    paddingLeft: 16,
  },
  priceDropCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    width: SCREEN_WIDTH * 0.85,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  priceDropImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  priceDropInfo: {
    flex: 1,
    marginLeft: 12,
  },
  priceDropName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  saveAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22C55E',
    marginBottom: 4,
  },
  priceDropPrices: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  priceDropNew: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  priceDropOld: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  priceDropBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  priceDropBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#EF4444',
  },
  priceDropAddButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontalScroll: {
    paddingLeft: 16,
  },
  horizontalCard: {
    width: HORIZONTAL_CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginRight: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  horizontalCardImage: {
    width: '100%',
    height: HORIZONTAL_CARD_WIDTH * 1.1,
    resizeMode: 'cover',
  },
  horizontalWishlistButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontalCardInfo: {
    padding: 10,
  },
  horizontalCardName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  horizontalCardBrand: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  horizontalRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  horizontalRatingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0F172A',
  },
  horizontalCardPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  lastSection: {
    marginBottom: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  moveAllButton: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  moveAllButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  continueButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 14,
  },
  continueButtonText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WishlistScreen;