import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator,
    Alert,
    ScrollView,
    RefreshControl,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';

const { width, height } = Dimensions.get('window');
const SPACING = 16;

// ============================================
// TYPES
// ============================================

interface ProductImage {
  id?: string;
  url: string;
  type?: 'front' | 'side' | 'back' | 'lifestyle' | 'closeup';
}

interface ColorVariant {
  name: string;
  hex: string;
}

interface SizeVariant {
  name: string;
  inStock: boolean;
}

interface Review {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  rating: number;
  title: string;
  comment: string;
  images: string[];
  createdAt: string;
  helpfulCount: number;
}

interface Product {
  _id: string;
  name: string;
  slug: string;
  brand: string;
  description: string;
  price: number;
  discountPrice: number;
  costPrice: number;
  stock: number;
  images: string[];
  thumbnail: string;
  category: {
    _id: string;
    name: string;
    slug: string;
  };
  averageRating: number;
  totalReviews: number;
  isActive: boolean;
  isFeatured: boolean;
  isDigital: boolean;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  shippingCharge: number;
  variants?: {
    color: string;
    size: string;
    stock: number;
  }[];
  attributes?: Record<string, string>;
  highlights?: string[];
  specifications?: { label: string; value: string }[];
  deliveryInfo?: {
    free: boolean;
    estimatedDays: number;
    returnDays: number;
  };
}

interface RelatedProduct {
  _id: string;
  name: string;
  price: number;
  discountPrice: number;
  rating: number;
  thumbnail: string;
  slug: string;
}

interface ProductResponse {
  success: boolean;
  product: Product;
}

interface ReviewsResponse {
  success: boolean;
  reviews: Review[];
  total: number;
  page: number;
  pages: number;
}

interface RelatedProductsResponse {
  success: boolean;
  products: RelatedProduct[];
  total: number;
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

// Product API calls
const productAPI = {
  getProduct: (id: string) =>
    apiRequest<ProductResponse>(`/product/${id}`),
  
  getProductReviews: (productId: string, page = 1, limit = 10) =>
    apiRequest<ReviewsResponse>(`/product/${productId}/reviews?page=${page}&limit=${limit}`),
  
  getRelatedProducts: (productId: string) =>
    apiRequest<RelatedProductsResponse>(`/product/related/${productId}`),
  
  addReview: (productId: string, data: { rating: number; title: string; comment: string; images?: string[] }) =>
    apiRequest<{ success: boolean; review: any }>(`/product/${productId}/reviews`, 'POST', data),
  
  updateReview: (reviewId: string, data: { rating?: number; title?: string; comment?: string; images?: string[] }) =>
    apiRequest<{ success: boolean; review: any }>(`/product/reviews/${reviewId}`, 'PUT', data),
  
  deleteReview: (reviewId: string) =>
    apiRequest<{ success: boolean; message: string }>(`/product/reviews/${reviewId}`, 'DELETE'),
  
  markReviewHelpful: (reviewId: string) =>
    apiRequest<{ success: boolean; helpfulCount: number }>(`/product/reviews/${reviewId}/helpful`, 'POST'),
};

// Wishlist API calls
const wishlistAPI = {
  addToWishlist: (productId: string) =>
    apiRequest<{ success: boolean; message: string; data: any }>(`/wishlist/add/${productId}`, 'POST'),
  
  removeFromWishlist: (productId: string) =>
    apiRequest<{ success: boolean; message: string; data: any }>(`/wishlist/remove/${productId}`, 'DELETE'),
  
  checkProduct: (productId: string) =>
    apiRequest<{ success: boolean; data: { isInWishlist: boolean; productId: string } }>(`/wishlist/check/${productId}`),
};

// Cart API calls
const cartAPI = {
  addToCart: (productId: string, quantity = 1, variant?: string) =>
    apiRequest<{ success: boolean; message: string; data: any }>(`/cart/add/${productId}`, 'POST', {
      quantity,
      variant: variant || null,
    }),
};

// ============================================
// HELPER COMPONENTS (Memoized)
// ============================================

const RatingStars = React.memo(({ rating, size = 14 }: { rating: number; size?: number }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {[...Array(5)].map((_, i) => {
        if (i < fullStars) {
          return <Ionicons key={i} name="star" size={size} color="#F59E0B" />;
        }
        if (i === fullStars && hasHalfStar) {
          return <Ionicons key={i} name="star-half" size={size} color="#F59E0B" />;
        }
        return <Ionicons key={i} name="star-outline" size={size} color="#CBD5E1" />;
      })}
    </View>
  );
});

const SectionHeader = React.memo(({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {onSeeAll && (
      <TouchableOpacity onPress={onSeeAll}>
        <Text style={styles.seeAllText}>See All</Text>
      </TouchableOpacity>
    )}
  </View>
));

const ProductCard = React.memo(({ product, onPress }: { product: RelatedProduct; onPress: () => void }) => {
  const currentPrice = product.discountPrice && product.discountPrice > 0 
    ? product.discountPrice 
    : product.price;

  return (
    <TouchableOpacity style={styles.relatedCard} onPress={onPress} activeOpacity={0.8}>
      <Image source={{ uri: product.thumbnail || 'https://via.placeholder.com/400' }} style={styles.relatedImage} />
      <Text style={styles.relatedTitle} numberOfLines={1}>
        {product.name}
      </Text>
      <View style={styles.relatedRating}>
        <RatingStars rating={product.rating || 0} size={12} />
        <Text style={styles.relatedRatingText}>{product.rating?.toFixed(1) || '0'}</Text>
      </View>
      <Text style={styles.relatedPrice}>₹{currentPrice.toLocaleString()}</Text>
    </TouchableOpacity>
  );
});

// ============================================
// MAIN PRODUCT DETAILS SCREEN
// ============================================

export default function ProductDetailsScreen() {
  const params = useLocalSearchParams();
  const productId = (params as any)?.productId;

  // State
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedColor, setSelectedColor] = useState<ColorVariant | null>(null);
  const [selectedSize, setSelectedSize] = useState<SizeVariant | null>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [reviewPage, setReviewPage] = useState(1);
  const [hasMoreReviews, setHasMoreReviews] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(false);
  
  const heartScale = useSharedValue(1);
  const scrollY = useSharedValue(0);
  const flatListRef = useRef<FlatList>(null);

  const wishlistAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  // Load product data
  const loadProduct = useCallback(async () => {
    if (!productId) return;
    
    try {
      setLoading(true);
      
      // Get product details
      const productResponse = await productAPI.getProduct(productId);
      if (productResponse.success) {
        setProduct(productResponse.product);
        
        // Extract variants from product
        if (productResponse.product.variants && productResponse.product.variants.length > 0) {
          // Create color and size options from variants
          const colors = [...new Set(productResponse.product.variants.map(v => v.color))].map(c => ({
            name: c,
            hex: getColorHex(c),
          }));
          const sizes = [...new Set(productResponse.product.variants.map(v => v.size))].map(s => ({
            name: s,
            inStock: productResponse.product.variants.some(v => v.size === s && v.stock > 0),
          }));
          
          if (colors.length > 0) setSelectedColor(colors[0]);
          if (sizes.length > 0) setSelectedSize(sizes.find(s => s.inStock) || sizes[0]);
        }
      }
      
      // Check if product is in wishlist
      try {
        const wishlistCheck = await wishlistAPI.checkProduct(productId);
        if (wishlistCheck.success) {
          setIsWishlisted(wishlistCheck.data.isInWishlist);
        }
      } catch (error) {
        console.log('Wishlist check failed:', error);
      }
      
      // Load reviews
      await loadReviews(productId, 1);
      
      // Load related products
      await loadRelatedProducts(productId);
      
    } catch (error) {
      console.error('Error loading product:', error);
      Alert.alert('Error', 'Failed to load product details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [productId]);

  const loadReviews = async (pid: string, page: number) => {
    try {
      setLoadingReviews(true);
      const response = await productAPI.getProductReviews(pid, page, 5);
      if (response.success) {
        if (page === 1) {
          setReviews(response.reviews);
        } else {
          setReviews(prev => [...prev, ...response.reviews]);
        }
        setHasMoreReviews(page < response.pages);
        setReviewPage(page);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const loadRelatedProducts = async (pid: string) => {
    try {
      const response = await productAPI.getRelatedProducts(pid);
      if (response.success) {
        setRelatedProducts(response.products || []);
      }
    } catch (error) {
      console.error('Error loading related products:', error);
    }
  };

  // Helper to get color hex
  const getColorHex = (colorName: string): string => {
    const colorMap: Record<string, string> = {
      'Black': '#1A1A1A',
      'White': '#F5F5F5',
      'Blue': '#2563EB',
      'Red': '#EF4444',
      'Green': '#22C55E',
      'Yellow': '#F59E0B',
      'Purple': '#8B5CF6',
      'Pink': '#EC4899',
      'Orange': '#F97316',
      'Gray': '#6B7280',
      'Navy': '#1E293B',
      'Brown': '#78350F',
    };
    return colorMap[colorName] || '#6B7280';
  };

  // Initial load
  useEffect(() => {
    if (productId) {
      loadProduct();
    }
  }, [productId]);

  // Handlers
  const handleWishlistPress = async () => {
    if (!product) return;
    
    heartScale.value = withSpring(1.2, { damping: 4 }, () => {
      heartScale.value = withSpring(1);
    });
    
    try {
      if (isWishlisted) {
        await wishlistAPI.removeFromWishlist(product._id);
        setIsWishlisted(false);
        Alert.alert('Removed', 'Product removed from wishlist');
      } else {
        await wishlistAPI.addToWishlist(product._id);
        setIsWishlisted(true);
        Alert.alert('Added', 'Product added to wishlist');
      }
    } catch (error) {
      console.error('Error updating wishlist:', error);
      Alert.alert('Error', 'Failed to update wishlist');
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    
    try {
      const variant = selectedColor && selectedSize 
        ? `${selectedColor.name}-${selectedSize.name}`
        : undefined;
      
      await cartAPI.addToCart(product._id, 1, variant);
      Alert.alert('Success', 'Product added to cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add to cart');
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    
    try {
      await handleAddToCart();
      // Navigate to cart
      router.push('/cart');
    } catch (error) {
      console.error('Error buying now:', error);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleShare = async () => {
    try {
      // Implement share functionality
      console.log('Share product:', product?._id);
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleLoadMoreReviews = () => {
    if (!hasMoreReviews || loadingReviews || !product) return;
    loadReviews(product._id, reviewPage + 1);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadProduct();
  };

  const handleRelatedProductPress = (productId: string) => {
    router.push({
      pathname: '/product-details',
      params: { productId }
    });
  };

  // Render helpers
  const renderImageItem = ({ item }: { item: string; index: number }) => (
    <Image source={{ uri: item }} style={styles.galleryImage} resizeMode="cover" />
  );

  const renderRelatedItem = ({ item }: { item: RelatedProduct }) => (
    <ProductCard product={item} onPress={() => handleRelatedProductPress(item._id)} />
  );

  const renderReviewItem = ({ item }: { item: Review }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewAvatarPlaceholder}>
          <Text style={styles.reviewAvatarText}>
            {item.user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={styles.reviewUserInfo}>
          <Text style={styles.reviewUserName}>{item.user?.name || 'Anonymous'}</Text>
          <View style={styles.reviewRatingRow}>
            <RatingStars rating={item.rating} size={12} />
            <Text style={styles.reviewDate}>
              {new Date(item.createdAt).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              })}
            </Text>
          </View>
        </View>
      </View>
      {item.title && <Text style={styles.reviewTitle}>{item.title}</Text>}
      <Text style={styles.reviewComment} numberOfLines={3}>
        {item.comment}
      </Text>
      {item.helpfulCount > 0 && (
        <View style={styles.reviewHelpful}>
          <Ionicons name="thumbs-up-outline" size={14} color="#64748B" />
          <Text style={styles.reviewHelpfulText}>{item.helpfulCount} helpful</Text>
        </View>
      )}
    </View>
  );

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Product Details</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading product...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (!product) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Product Details</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#EF4444" />
          <Text style={styles.errorTitle}>Product Not Found</Text>
          <Text style={styles.errorText}>The product you're looking for doesn't exist or has been removed.</Text>
          <TouchableOpacity style={styles.errorButton} onPress={handleBack}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const images = product.images && product.images.length > 0 
    ? product.images 
    : [product.thumbnail || 'https://via.placeholder.com/400'];

  const currentPrice = product.discountPrice && product.discountPrice > 0 
    ? product.discountPrice 
    : product.price;

  const discountPercent = product.discountPrice && product.discountPrice > 0
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;

  const getStockStatus = () => {
    if (product.stock <= 0) return { label: 'Out of Stock', color: '#EF4444' };
    if (product.stock < 10) return { label: 'Limited Stock', color: '#F59E0B' };
    return { label: 'In Stock', color: '#22C55E' };
  };

  const stockStatus = getStockStatus();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={(e) => {
          scrollY.value = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        bounces={true}
        overScrollMode="never"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#2563EB']}
            tintColor="#2563EB"
          />
        }
      >
        {/* Image Gallery Section */}
        <View style={styles.galleryContainer}>
          <FlatList
            ref={flatListRef}
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setActiveImageIndex(index);
            }}
            renderItem={renderImageItem}
            keyExtractor={(item, index) => `${index}`}
            initialNumToRender={2}
            maxToRenderPerBatch={2}
            windowSize={3}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
          />
          
          {/* Pagination Dots */}
          {images.length > 1 && (
            <View style={styles.paginationContainer}>
              {images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    activeImageIndex === index && styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>
          )}

          {/* Floating Buttons */}
          <View style={styles.floatingButtons}>
            <TouchableOpacity style={styles.floatingBtn} onPress={handleBack}>
              <Ionicons name="chevron-back" size={24} color="#0F172A" />
            </TouchableOpacity>
            <View style={styles.floatingRightBtns}>
              <Animated.View style={wishlistAnimatedStyle}>
                <TouchableOpacity style={styles.floatingBtn} onPress={handleWishlistPress}>
                  <Ionicons
                    name={isWishlisted ? 'heart' : 'heart-outline'}
                    size={22}
                    color={isWishlisted ? '#EF4444' : '#0F172A'}
                  />
                </TouchableOpacity>
              </Animated.View>
              <TouchableOpacity style={styles.floatingBtn} onPress={handleShare}>
                <Feather name="share-2" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Product Info Section */}
        <Animated.View style={styles.contentContainer} entering={FadeInUp.delay(150).duration(400)}>
          {product.brand && <Text style={styles.brandName}>{product.brand}</Text>}
          <Text style={styles.productTitle}>{product.name}</Text>
          
          {/* Rating Section */}
          <View style={styles.ratingRow}>
            <View style={styles.ratingContainer}>
              <RatingStars rating={product.averageRating || 0} />
              <Text style={styles.ratingValue}>{product.averageRating?.toFixed(1) || '0'}</Text>
            </View>
            <Text style={styles.reviewCount}>({product.totalReviews || 0} Reviews)</Text>
            {product.stock > 0 && (
              <View style={styles.soldBadge}>
                <MaterialCommunityIcons name="fire" size={14} color="#F59E0B" />
                <Text style={styles.soldText}>In Stock</Text>
              </View>
            )}
          </View>

          {/* Price Section */}
          <View style={styles.priceRow}>
            <Text style={styles.currentPrice}>₹{currentPrice.toLocaleString()}</Text>
            {product.discountPrice && product.discountPrice > 0 && (
              <>
                <Text style={styles.originalPrice}>₹{product.price.toLocaleString()}</Text>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{discountPercent}% OFF</Text>
                </View>
              </>
            )}
          </View>

          {/* Variants Section - Only if variants exist */}
          {product.variants && product.variants.length > 0 && (
            <>
              <View style={styles.sectionSpacing}>
                <Text style={styles.variantTitle}>Select Color</Text>
                <View style={styles.colorContainer}>
                  {[...new Set(product.variants.map(v => v.color))].map((colorName) => {
                    const hex = getColorHex(colorName);
                    const isSelected = selectedColor?.name === colorName;
                    return (
                      <TouchableOpacity
                        key={colorName}
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: hex },
                          isSelected && styles.colorSwatchSelected,
                        ]}
                        onPress={() => setSelectedColor({ name: colorName, hex })}
                      >
                        {isSelected && (
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.sectionSpacing}>
                <Text style={styles.variantTitle}>Select Size</Text>
                <View style={styles.sizeContainer}>
                  {[...new Set(product.variants.map(v => v.size))].map((sizeName) => {
                    const inStock = product.variants?.some(v => v.size === sizeName && v.stock > 0) || false;
                    const isSelected = selectedSize?.name === sizeName;
                    return (
                      <TouchableOpacity
                        key={sizeName}
                        style={[
                          styles.sizeBtn,
                          isSelected && styles.sizeBtnSelected,
                          !inStock && styles.sizeBtnDisabled,
                        ]}
                        onPress={() => inStock && setSelectedSize({ name: sizeName, inStock })}
                        disabled={!inStock}
                      >
                        <Text
                          style={[
                            styles.sizeText,
                            isSelected && styles.sizeTextSelected,
                            !inStock && styles.sizeTextDisabled,
                          ]}
                        >
                          {sizeName}
                        </Text>
                        {!inStock && <Text style={styles.outOfStockText}>Out</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </>
          )}

          {/* Stock Status */}
          <View style={styles.stockContainer}>
            <View style={styles.stockIndicator}>
              <View style={[styles.stockDot, { backgroundColor: stockStatus.color }]} />
              <Text style={[styles.stockText, { color: stockStatus.color }]}>
                {stockStatus.label}
              </Text>
            </View>
            {product.stock > 0 && product.stock < 10 && (
              <Text style={styles.stockCountText}>Only {product.stock} left</Text>
            )}
          </View>

          {/* Delivery Info */}
          {product.shippingCharge !== undefined && (
            <View style={styles.deliveryCard}>
              <View style={styles.deliveryRow}>
                <Feather name="truck" size={20} color="#2563EB" />
                <View style={styles.deliveryTextContainer}>
                  <Text style={styles.deliveryTitle}>
                    {product.shippingCharge === 0 ? 'Free Delivery' : 'Delivery Charges Apply'}
                  </Text>
                  <Text style={styles.deliverySubtitle}>
                    {product.shippingCharge === 0 
                      ? 'No shipping charges' 
                      : `Shipping: ₹${product.shippingCharge.toLocaleString()}`}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Description */}
          {product.description && (
            <View style={styles.sectionSpacing}>
              <SectionHeader title="Product Description" />
              <Text style={styles.descriptionText}>{product.description}</Text>
            </View>
          )}

          {/* Specifications */}
          {product.attributes && Object.keys(product.attributes).length > 0 && (
            <View style={styles.sectionSpacing}>
              <SectionHeader title="Specifications" />
              <View style={styles.specsContainer}>
                {Object.entries(product.attributes).map(([key, value]) => (
                  <View key={key} style={styles.specRow}>
                    <Text style={styles.specLabel}>{key}</Text>
                    <Text style={styles.specValue}>{value}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Reviews Section */}
          <View style={styles.sectionSpacing}>
            <SectionHeader 
              title={`Customer Reviews (${product.totalReviews || 0})`} 
              onSeeAll={() => router.push('/reviews')}
            />
            {reviews.length > 0 ? (
              <>
                {reviews.map((review) => renderReviewItem({ item: review }))}
                {hasMoreReviews && (
                  <TouchableOpacity 
                    style={styles.loadMoreReviews} 
                    onPress={handleLoadMoreReviews}
                    disabled={loadingReviews}
                  >
                    {loadingReviews ? (
                      <ActivityIndicator size="small" color="#2563EB" />
                    ) : (
                      <Text style={styles.loadMoreText}>Load More Reviews</Text>
                    )}
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.noReviewsContainer}>
                <Text style={styles.noReviewsText}>No reviews yet</Text>
                <Text style={styles.noReviewsSubtext}>Be the first to review this product</Text>
              </View>
            )}
          </View>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <View style={styles.sectionSpacing}>
              <SectionHeader title="You May Also Like" />
              <FlatList
                horizontal
                data={relatedProducts}
                renderItem={renderRelatedItem}
                keyExtractor={(item) => item._id}
                showsHorizontalScrollIndicator={false}
                snapToInterval={width * 0.4 + SPACING}
                decelerationRate="fast"
                contentContainerStyle={{ paddingHorizontal: SPACING }}
                initialNumToRender={3}
                maxToRenderPerBatch={3}
                windowSize={5}
              />
            </View>
          )}

          <View style={styles.bottomPadding} />
        </Animated.View>
      </Animated.ScrollView>

      {/* Sticky Bottom Action Bar */}
      <Animated.View style={styles.bottomBar} entering={FadeIn.delay(300).duration(400)}>
        <View style={styles.pricePreview}>
          <Text style={styles.previewLabel}>Total Price</Text>
          <Text style={styles.previewPrice}>₹{currentPrice.toLocaleString()}</Text>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.cartBtn, product.stock <= 0 && styles.disabledBtn]} 
            onPress={handleAddToCart}
            disabled={product.stock <= 0}
            activeOpacity={0.8}
          >
            <Feather name="shopping-bag" size={20} color="#FFFFFF" />
            <Text style={styles.cartBtnText}>
              {product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.buyBtn, product.stock <= 0 && styles.disabledBtn]} 
            onPress={handleBuyNow}
            disabled={product.stock <= 0}
            activeOpacity={0.8}
          >
            <Text style={styles.buyBtnText}>Buy Now</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

// ============================================
// STYLES (Optimized for Performance)
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
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
  errorText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
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
  galleryContainer: {
    position: 'relative',
    height: height * 0.45,
    backgroundColor: '#FFFFFF',
  },
  galleryImage: {
    width: width,
    height: height * 0.45,
  },
  paginationContainer: {
    position: 'absolute',
    bottom: SPACING,
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    width: 18,
    backgroundColor: '#FFFFFF',
  },
  floatingButtons: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: SPACING,
    right: SPACING,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  floatingRightBtns: {
    flexDirection: 'row',
    gap: 12,
  },
  floatingBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  contentContainer: {
    paddingHorizontal: SPACING,
    paddingTop: SPACING,
    paddingBottom: 100,
  },
  bottomPadding: {
    height: 20,
  },
  brandName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  productTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 30,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  reviewCount: {
    fontSize: 13,
    color: '#64748B',
  },
  soldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  soldText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#D97706',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  currentPrice: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  originalPrice: {
    fontSize: 16,
    fontWeight: '500',
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  discountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  variantTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
  },
  sectionSpacing: {
    marginTop: 24,
  },
  colorContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSwatchSelected: {
    borderColor: '#2563EB',
    borderWidth: 2,
    transform: [{ scale: 1.05 }],
  },
  sizeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sizeBtn: {
    minWidth: 60,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeBtnSelected: {
    backgroundColor: '#2563EB',
  },
  sizeBtnDisabled: {
    backgroundColor: '#F1F5F9',
    opacity: 0.5,
  },
  sizeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
  },
  sizeTextSelected: {
    color: '#FFFFFF',
  },
  sizeTextDisabled: {
    color: '#94A3B8',
  },
  outOfStockText: {
    fontSize: 10,
    color: '#EF4444',
    marginTop: 2,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  stockIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stockText: {
    fontSize: 14,
    fontWeight: '500',
  },
  stockCountText: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '500',
  },
  deliveryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deliveryTextContainer: {
    flex: 1,
  },
  deliveryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  deliverySubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  descriptionText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2563EB',
  },
  specsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  specLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  specValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  reviewAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reviewUserInfo: {
    flex: 1,
  },
  reviewUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  reviewRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  reviewDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  reviewComment: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  reviewHelpful: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  reviewHelpfulText: {
    fontSize: 12,
    color: '#64748B',
  },
  loadMoreReviews: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    marginBottom: 8,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563EB',
  },
  noReviewsContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  noReviewsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  noReviewsSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  relatedCard: {
    width: width * 0.4,
    marginRight: SPACING,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  relatedImage: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    marginBottom: 8,
  },
  relatedTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  relatedRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  relatedRatingText: {
    fontSize: 11,
    color: '#64748B',
  },
  relatedPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SPACING,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  pricePreview: {
    alignItems: 'flex-start',
  },
  previewLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  previewPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 40,
  },
  cartBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buyBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 40,
  },
  buyBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledBtn: {
    opacity: 0.5,
  },
});