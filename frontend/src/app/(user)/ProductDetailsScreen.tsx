import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    Platform,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const SPACING = 16;

// ============================================================================
// API CONFIGURATION
// ============================================================================

const API_BASE_URL = 'http://10.225.180.27:5000';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

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
    images: { url: string; altText: string }[] | string[];
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
    attributes?: Record<string, string | { name: string; value: string; _id: string }>;
    highlights?: string[];
    specifications?: { label: string; value: string }[];
    deliveryInfo?: {
        free: boolean;
        estimatedDays: number;
        returnDays: number;
    };
    createdAt: string;
    updatedAt: string;
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

interface RelatedProduct {
    _id: string;
    name: string;
    price: number;
    discountPrice: number;
    averageRating: number;
    thumbnail: string;
    slug: string;
}

interface ColorVariant {
    name: string;
    hex: string;
}

interface SizeVariant {
    name: string;
    inStock: boolean;
}

// ============================================================================
// API SERVICE FUNCTIONS
// ============================================================================

// Get Product by ID
const getProductById = async (id: string): Promise<Product | null> => {
    try {
        const token = await AsyncStorage.getItem('token');
        const headers: any = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await axios.get(
            `${API_BASE_URL}/Product/${id}`,
            { headers }
        );

        if (response.data.success && response.data.data) {
            return response.data.data;
        } else {
            return null;
        }
    } catch (error: any) {
        console.error('Get product by ID error:', error.response?.data || error.message);
        return null;
    }
};

// Get Product Reviews
const getProductReviews = async (productId: string, page: number = 1, limit: number = 10): Promise<{ reviews: Review[]; total: number; page: number; pages: number }> => {
    try {
        const token = await AsyncStorage.getItem('token');
        const headers: any = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await axios.get(
            `${API_BASE_URL}/Product/${productId}`,
            { headers }
        );

        if (response.data.success && response.data.data) {
            const productData = response.data.data;
            if (productData.reviews && Array.isArray(productData.reviews)) {
                return {
                    reviews: productData.reviews,
                    total: productData.reviews.length,
                    page: 1,
                    pages: 1
                };
            }
            return { reviews: [], total: 0, page: 1, pages: 1 };
        } else {
            return { reviews: [], total: 0, page: 1, pages: 1 };
        }
    } catch (error: any) {
        console.error('Get product reviews error:', error.response?.data || error.message);
        return { reviews: [], total: 0, page: 1, pages: 1 };
    }
};

// Get Related Products
const getRelatedProducts = async (productId: string): Promise<RelatedProduct[]> => {
    try {
        const token = await AsyncStorage.getItem('token');
        const headers: any = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await axios.get(
            `${API_BASE_URL}/Product/`,
            { headers }
        );

        if (response.data.success && response.data.data) {
            const allProducts = response.data.data.filter((p: any) => p._id !== productId);
            const shuffled = allProducts.sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, 10);

            return selected.map((apiProduct: any) => ({
                _id: apiProduct._id,
                name: apiProduct.name,
                price: apiProduct.price,
                discountPrice: apiProduct.discountPrice,
                averageRating: apiProduct.averageRating || 0,
                thumbnail: apiProduct.thumbnail || 'https://via.placeholder.com/200',
                slug: apiProduct.slug || apiProduct.name?.toLowerCase().replace(/\s+/g, '-')
            }));
        } else {
            return [];
        }
    } catch (error: any) {
        console.error('Get related products error:', error.response?.data || error.message);
        return [];
    }
};

// Check if product is in wishlist
const checkWishlistStatus = async (productId: string): Promise<boolean> => {
    try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
            return false;
        }

        const response = await axios.get(
            `${API_BASE_URL}/Wishlist/check/${productId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            }
        );

        if (response.data.success) {
            return response.data.data?.inWishlist || false;
        } else {
            return false;
        }
    } catch (error: any) {
        console.error('Check wishlist status error:', error.response?.data || error.message);
        return false;
    }
};

// Add to Wishlist
const addToWishlist = async (productId: string): Promise<boolean> => {
    try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
            Alert.alert('Error', 'Please login to add items to wishlist');
            return false;
        }

        const response = await axios.post(
            `${API_BASE_URL}/Wishlist/add/${productId}`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            }
        );

        if (response.data.success) {
            return true;
        } else {
            if (response.data.message && response.data.message.includes('already in wishlist')) {
                return false;
            }
            throw new Error(response.data.message || 'Failed to add to wishlist');
        }
    } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message;
        if (errorMessage && errorMessage.includes('already in wishlist')) {
            return false;
        }
        console.error('Add to wishlist error:', error.response?.data || error.message);
        Alert.alert('Error', error.response?.data?.message || 'Failed to add to wishlist');
        return false;
    }
};

// Remove from Wishlist
const removeFromWishlist = async (productId: string): Promise<boolean> => {
    try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
            return false;
        }

        const response = await axios.delete(
            `${API_BASE_URL}/Wishlist/remove/${productId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            }
        );

        if (response.data.success) {
            return true;
        } else {
            throw new Error(response.data.message || 'Failed to remove from wishlist');
        }
    } catch (error: any) {
        console.error('Remove from wishlist error:', error.response?.data || error.message);
        Alert.alert('Error', error.response?.data?.message || 'Failed to remove from wishlist');
        return false;
    }
};

// Add to Cart
const addToCart = async (productId: string, quantity: number = 1, variant?: string): Promise<boolean> => {
    try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
            Alert.alert('Error', 'Please login to add items to cart');
            return false;
        }

        const response = await axios.post(
            `${API_BASE_URL}/Cart/add`,
            {
                productId: productId,
                quantity: quantity,
                variant: variant || null
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            }
        );

        if (response.data.success) {
            return true;
        } else {
            throw new Error(response.data.message || 'Failed to add to cart');
        }
    } catch (error: any) {
        console.error('Add to cart error:', error.response?.data || error.message);
        Alert.alert('Error', error.response?.data?.message || 'Failed to add to cart');
        return false;
    }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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
        'Gold': '#FCD34D',
        'Silver': '#9CA3AF',
        'Rose': '#F43F5E',
        'Teal': '#14B8A6',
        'Indigo': '#6366F1',
        'Violet': '#8B5CF6',
        'Coral': '#FB7185',
        'Beige': '#F5E6D3',
        'Olive': '#808000',
        'Maroon': '#800000',
        'Turquoise': '#40E0D0',
        'Lavender': '#E6E6FA',
        'Cyan': '#00FFFF',
        'Magenta': '#FF00FF',
    };
    return colorMap[colorName] || '#6B7280';
};

// Get image URL - handles both string and object formats
const getImageUrl = (image: any): string => {
    if (!image) return 'https://via.placeholder.com/400';

    // If it's a string, use it directly
    if (typeof image === 'string') {
        return image.startsWith('http') ? image : `${API_BASE_URL}${image}`;
    }

    // If it's an object with url property
    if (typeof image === 'object' && image.url) {
        return image.url.startsWith('http') ? image.url : `${API_BASE_URL}${image.url}`;
    }

    return 'https://via.placeholder.com/400';
};

// Get all images from product (combines thumbnail and images array, removes duplicates)
const getProductImages = (product: Product): string[] => {
    const imageSet = new Set<string>();
    const imageUrls: string[] = [];

    // Add thumbnail first (if exists)
    if (product.thumbnail) {
        const thumbnailUrl = product.thumbnail.startsWith('http')
            ? product.thumbnail
            : `${API_BASE_URL}${product.thumbnail}`;
        if (!imageSet.has(thumbnailUrl)) {
            imageSet.add(thumbnailUrl);
            imageUrls.push(thumbnailUrl);
        }
    }

    // Add images from the images array
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
        product.images.forEach((img) => {
            const url = getImageUrl(img);
            if (!imageSet.has(url)) {
                imageSet.add(url);
                imageUrls.push(url);
            }
        });
    }

    // If no images found, use placeholder
    if (imageUrls.length === 0) {
        imageUrls.push('https://via.placeholder.com/400');
    }

    return imageUrls;
};

// ============================================================================
// REUSABLE COMPONENTS
// ============================================================================

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

    const imageUrl = product.thumbnail
        ? (product.thumbnail.startsWith('http') ? product.thumbnail : `${API_BASE_URL}${product.thumbnail}`)
        : 'https://via.placeholder.com/400';

    return (
        <TouchableOpacity style={styles.relatedCard} onPress={onPress} activeOpacity={0.8}>
            <Image
                source={{ uri: imageUrl }}
                style={styles.relatedImage}
            />
            <Text style={styles.relatedTitle} numberOfLines={1}>
                {product.name}
            </Text>
            <View style={styles.relatedRating}>
                <RatingStars rating={product.averageRating || 0} size={12} />
                <Text style={styles.relatedRatingText}>{product.averageRating?.toFixed(1) || '0'}</Text>
            </View>
            <Text style={styles.relatedPrice}>₹{currentPrice.toLocaleString()}</Text>
        </TouchableOpacity>
    );
});

// ============================================================================
// MAIN PRODUCT DETAILS SCREEN
// ============================================================================

export default function ProductDetailsScreen() {
    const params = useLocalSearchParams();
    const productId = (params as any)?.productId || (params as any)?.id;

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
    const [hasMoreReviews, setHasMoreReviews] = useState(false);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [totalReviews, setTotalReviews] = useState(0);

    const heartScale = useSharedValue(1);
    const flatListRef = useRef<FlatList>(null);

    const wishlistAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: heartScale.value }],
    }));

    // ============================================================================
    // LOAD DATA FUNCTIONS
    // ============================================================================

    const loadProduct = useCallback(async () => {
        if (!productId) return;

        try {
            setLoading(true);

            const productData = await getProductById(productId);
            if (productData) {
                setProduct(productData);

                if (productData.variants && productData.variants.length > 0) {
                    const colors = [...new Set(productData.variants.map(v => v.color))].map(c => ({
                        name: c,
                        hex: getColorHex(c),
                    }));
                    const sizes = [...new Set(productData.variants.map(v => v.size))].map(s => ({
                        name: s,
                        inStock: productData.variants?.some(v => v.size === s && v.stock > 0) || false,
                    }));

                    if (colors.length > 0) setSelectedColor(colors[0]);
                    if (sizes.length > 0) setSelectedSize(sizes.find(s => s.inStock) || sizes[0]);
                }
            } else {
                Alert.alert('Error', 'Product not found');
            }

            const wishlistStatus = await checkWishlistStatus(productId);
            setIsWishlisted(wishlistStatus);

            await loadReviews(productId, 1);
            await loadRelatedProducts(productId);

        } catch (error: any) {
            console.error('Load product error:', error.response?.data || error.message);
            Alert.alert('Error', 'Failed to load product details');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [productId]);

    const loadReviews = async (pid: string, page: number) => {
        try {
            setLoadingReviews(true);
            const response = await getProductReviews(pid, page, 5);
            if (response) {
                if (page === 1) {
                    setReviews(response.reviews);
                } else {
                    setReviews(prev => [...prev, ...response.reviews]);
                }
                setTotalReviews(response.total);
                setHasMoreReviews(page < response.pages);
                setReviewPage(page);
            }
        } catch (error: any) {
            console.error('Load reviews error:', error.response?.data || error.message);
        } finally {
            setLoadingReviews(false);
        }
    };

    const loadRelatedProducts = async (pid: string) => {
        try {
            const products = await getRelatedProducts(pid);
            setRelatedProducts(products);
        } catch (error: any) {
            console.error('Load related products error:', error.response?.data || error.message);
        }
    };

    const loadAllData = async () => {
        await loadProduct();
    };

    // ============================================================================
    // HANDLER FUNCTIONS
    // ============================================================================

    const handleWishlistPress = async () => {
        if (!product) return;

        heartScale.value = withSpring(1.2, { damping: 4 }, () => {
            heartScale.value = withSpring(1);
        });

        if (isWishlisted) {
            const success = await removeFromWishlist(product._id);
            if (success) {
                setIsWishlisted(false);
            }
        } else {
            const success = await addToWishlist(product._id);
            if (success) {
                setIsWishlisted(true);
            } else {
                const status = await checkWishlistStatus(product._id);
                setIsWishlisted(status);
            }
        }
    };

    const handleAddToCart = async () => {
        if (!product) return;

        if (product.stock <= 0) {
            Alert.alert('Out of Stock', 'This product is currently out of stock.');
            return;
        }

        const variant = selectedColor && selectedSize
            ? `${selectedColor.name}-${selectedSize.name}`
            : undefined;

        const success = await addToCart(product._id, 1, variant);
        if (success) {
            Alert.alert('Success', 'Product added to cart');
        }
    };

    const handleBuyNow = async () => {
        if (!product) return;

        if (product.stock <= 0) {
            Alert.alert('Out of Stock', 'This product is currently out of stock.');
            return;
        }

        router.push('/AddressScreen');
    };

    const handleBack = () => {
        router.push('/');
    };

    const handleCartPress = () => {
        router.push('/CartScreen');
    };

    const handleShare = async () => {
        try {
            Alert.alert('Share', 'Share functionality coming soon');
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
        loadAllData();
    };

    const handleRelatedProductPress = (productId: string) => {
        router.push({
            pathname: '/ProductDetailsScreen',
            params: { productId }
        });
    };

    // ============================================================================
    // USE EFFECTS
    // ============================================================================

    useEffect(() => {
        if (productId) {
            loadAllData();
        }
    }, [productId]);

    // ============================================================================
    // RENDER FUNCTIONS
    // ============================================================================

    const renderImageItem = ({ item }: { item: string }) => (
        <Image
            source={{ uri: item }}
            style={styles.galleryImage}
            resizeMode="cover"
        />
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

    // ============================================================================
    // LOADING STATE
    // ============================================================================

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Product Details</Text>
                    <TouchableOpacity style={styles.headerButton} onPress={handleCartPress}>
                        <Feather name="shopping-bag" size={22} color="#0F172A" />
                    </TouchableOpacity>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={styles.loadingText}>Loading product...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // ============================================================================
    // ERROR STATE
    // ============================================================================

    if (!product) {
        return (
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Product Details</Text>
                    <TouchableOpacity style={styles.headerButton} onPress={handleCartPress}>
                        <Feather name="shopping-bag" size={22} color="#0F172A" />
                    </TouchableOpacity>
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

    // ============================================================================
    // MAIN RENDER
    // ============================================================================

    // Get all images (thumbnail + images array, no duplicates)
    const images = getProductImages(product);

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

    // Get unique colors and sizes safely
    const uniqueColors = product.variants && product.variants.length > 0
        ? [...new Set(product.variants.map(v => v.color))]
        : [];

    const uniqueSizes = product.variants && product.variants.length > 0
        ? [...new Set(product.variants.map(v => v.size))]
        : [];

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

            {/* Header - Same style as WishlistScreen and ProfileScreen */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.floatingBtn} onPress={handleBack}>
                    <Ionicons name="chevron-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Product Details</Text>
                <Animated.View style={wishlistAnimatedStyle}>
                    <TouchableOpacity style={styles.floatingBtn} onPress={handleWishlistPress}>
                        <Ionicons
                            name={isWishlisted ? 'heart' : 'heart-outline'}
                            size={22}
                            color={isWishlisted ? '#EF4444' : '#0F172A'}
                        />
                    </TouchableOpacity>
                </Animated.View>
            </View>

            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
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
                </View>

                <Animated.View style={styles.contentContainer} entering={FadeInUp.delay(150).duration(400)}>
                    {product.brand && <Text style={styles.brandName}>{product.brand}</Text>}
                    <Text style={styles.productTitle}>{product.name}</Text>

                    <View style={styles.ratingRow}>
                        <View style={styles.ratingContainer}>
                            <RatingStars rating={product.averageRating || 0} />
                            <Text style={styles.ratingValue}>{product.averageRating?.toFixed(1) || '0'}</Text>
                        </View>
                        <Text style={styles.reviewCount}>({totalReviews || 0} Reviews)</Text>
                        {product.stock > 0 && (
                            <View style={styles.soldBadge}>
                                <MaterialCommunityIcons name="fire" size={14} color="#F59E0B" />
                                <Text style={styles.soldText}>In Stock</Text>
                            </View>
                        )}
                    </View>

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

                    {uniqueColors.length > 0 && (
                        <View style={styles.sectionSpacing}>
                            <Text style={styles.variantTitle}>Select Color</Text>
                            <View style={styles.colorContainer}>
                                {uniqueColors.map((colorName) => {
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
                    )}

                    {uniqueSizes.length > 0 && (
                        <View style={styles.sectionSpacing}>
                            <Text style={styles.variantTitle}>Select Size</Text>
                            <View style={styles.sizeContainer}>
                                {uniqueSizes.map((sizeName) => {
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
                    )}

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

                    {product.description && (
                        <View style={styles.sectionSpacing}>
                            <SectionHeader title="Product Description" />
                            <Text style={styles.descriptionText}>{product.description}</Text>
                        </View>
                    )}

                    {product.attributes && Object.keys(product.attributes).length > 0 && (
                        <View style={styles.sectionSpacing}>
                            <SectionHeader title="Specifications" />
                            <View style={styles.specsContainer}>
                                {Object.entries(product.attributes).map(([key, value]) => {
                                    let displayValue: string = '';
                                    if (typeof value === 'string') {
                                        displayValue = value;
                                    } else if (typeof value === 'object' && value !== null) {
                                        if ('value' in value) {
                                            displayValue = String((value as any).value);
                                        } else if ('name' in value) {
                                            displayValue = String((value as any).name);
                                        } else {
                                            displayValue = JSON.stringify(value);
                                        }
                                    } else {
                                        displayValue = String(value);
                                    }

                                    return (
                                        <View key={key} style={styles.specRow}>
                                            <Text style={styles.specLabel}>{key}</Text>
                                            <Text style={styles.specValue}>{displayValue}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    <View style={styles.sectionSpacing}>
                        <SectionHeader
                            title={`Customer Reviews (${totalReviews || 0})`}
                            onSeeAll={() => alert('Under Development')}
                        />
                        {reviews.length > 0 ? (
                            <>
                                {reviews.map((review) => (
                                    <View key={review._id}>
                                        {renderReviewItem({ item: review })}
                                    </View>
                                ))}
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

// ============================================================================
// STYLES
// ============================================================================

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
        flexWrap: 'wrap',
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
        flex: 1,
        textAlign: 'right',
        marginLeft: 10,
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