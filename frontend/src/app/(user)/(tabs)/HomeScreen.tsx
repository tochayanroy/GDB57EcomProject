import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
    Image,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    Extrapolate,
    FadeInLeft,
    FadeInRight,
    FadeInUp,
    interpolate,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.42;
const BANNER_WIDTH = SCREEN_WIDTH - 32;

// ============================================================================
// API CONFIGURATION
// ============================================================================

const API_BASE_URL = 'http://192.168.0.103:5000';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface User {
    _id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    avatar?: string;
}

interface Category {
    _id: string;
    name: string;
    icon: string;
    image: string;
    productCount?: number;
}

interface Product {
    _id: string;
    title: string;
    brand: string;
    price: number;
    oldPrice: number;
    discount: number;
    rating: number;
    reviewCount: number;
    image: string;
    isFavorite: boolean;
}

interface WishlistItem {
    productId: string;
    product: Product;
}

// ============================================================================
// API SERVICE FUNCTIONS - Following Login/Register pattern
// ============================================================================

// Get User Profile
const getUserProfile = async (): Promise<User> => {
    try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
            throw new Error('No authentication token found');
        }

        const response = await axios.get(
            `${API_BASE_URL}/User/profile`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            }
        );

        if (response.data.success) {
            return response.data.data;
        } else {
            throw new Error(response.data.message || 'Failed to fetch user profile');
        }
    } catch (error: any) {
        console.error('Get user profile error:', error.response?.data || error.message);
        throw error;
    }
};

// Get All Categories
const getCategories = async (): Promise<Category[]> => {
    try {
        const token = await AsyncStorage.getItem('token');
        const headers: any = {
            'Content-Type': 'application/json',
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await axios.get(
            `${API_BASE_URL}/Category/`,
            { headers }
        );

        if (response.data.success) {
            return response.data.data;
        } else {
            throw new Error(response.data.message || 'Failed to fetch categories');
        }
    } catch (error: any) {
        console.error('Get categories error:', error.response?.data || error.message);
        throw error;
    }
};

// Get All Products
const getProducts = async (): Promise<Product[]> => {
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

        if (response.data.success) {
            return response.data.data;
        } else {
            throw new Error(response.data.message || 'Failed to fetch products');
        }
    } catch (error: any) {
        console.error('Get products error:', error.response?.data || error.message);
        throw error;
    }
};

// Get Wishlist
const getWishlist = async (): Promise<WishlistItem[]> => {
    try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
            return [];
        }

        const response = await axios.get(
            `${API_BASE_URL}/Wishlist/`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            }
        );

        if (response.data.success) {
            return response.data.data;
        } else {
            return [];
        }
    } catch (error: any) {
        console.error('Get wishlist error:', error.response?.data || error.message);
        return [];
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
            throw new Error(response.data.message || 'Failed to add to wishlist');
        }
    } catch (error: any) {
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

// ============================================================================
// REUSABLE COMPONENTS
// ============================================================================

const RatingStars = ({ rating, size = 12 }: { rating: number; size?: number }) => {
    return (
        <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                    key={star}
                    name={star <= rating ? 'star' : star - 0.5 <= rating ? 'star-half' : 'star-outline'}
                    size={size}
                    color="#FBBF24"
                    style={styles.ratingStar}
                />
            ))}
        </View>
    );
};

const SectionHeader = ({ title, showSeeAll = true, onSeeAll }: { title: string; showSeeAll?: boolean; onSeeAll?: () => void }) => (
    <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderTitle}>{title}</Text>
        {showSeeAll && (
            <TouchableOpacity onPress={onSeeAll}>
                <Text style={styles.sectionHeaderSeeAll}>See All</Text>
            </TouchableOpacity>
        )}
    </View>
);

const ProductCard = React.memo(({ product, onPress, onFavorite, variant = 'grid' }: { product: Product; onPress: () => void; onFavorite: () => void; variant?: 'grid' | 'horizontal' }) => {
    if (variant === 'horizontal') {
        return (
            <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.horizontalProductCard}>
                <Image source={{ uri: product.image }} style={styles.horizontalProductImage} />
                <View style={styles.horizontalProductContent}>
                    <View style={styles.horizontalProductInfo}>
                        <Text style={styles.horizontalProductTitle} numberOfLines={1}>{product.title}</Text>
                        <Text style={styles.horizontalProductBrand}>{product.brand}</Text>
                        <View style={styles.ratingRow}>
                            <RatingStars rating={product.rating} size={10} />
                            <Text style={styles.reviewCount}>({product.reviewCount})</Text>
                        </View>
                    </View>
                    <View style={styles.horizontalProductFooter}>
                        <View style={styles.priceRow}>
                            <Text style={styles.currentPrice}>${product.price}</Text>
                            <Text style={styles.oldPrice}>${product.oldPrice}</Text>
                        </View>
                        <TouchableOpacity onPress={onFavorite} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name={product.isFavorite ? 'heart' : 'heart-outline'} size={20} color={product.isFavorite ? '#EF4444' : '#94A3B8'} />
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.productCard}>
            <View style={styles.productImageContainer}>
                <Image source={{ uri: product.image }} style={styles.productImage} />
                {product.discount > 0 && (
                    <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>-{product.discount}%</Text>
                    </View>
                )}
                <TouchableOpacity onPress={onFavorite} style={styles.favoriteButton}>
                    <Ionicons name={product.isFavorite ? 'heart' : 'heart-outline'} size={16} color={product.isFavorite ? '#EF4444' : '#64748B'} />
                </TouchableOpacity>
            </View>
            <View style={styles.productInfo}>
                <Text style={styles.productTitle} numberOfLines={1}>{product.title}</Text>
                <Text style={styles.productBrand}>{product.brand}</Text>
                <View style={styles.ratingRow}>
                    <RatingStars rating={product.rating} size={10} />
                </View>
                <View style={styles.priceRow}>
                    <Text style={styles.currentPrice}>${product.price}</Text>
                    <Text style={styles.oldPrice}>${product.oldPrice}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
});

// ============================================================================
// MAIN HOME SCREEN
// ============================================================================

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const scrollY = useSharedValue(0);
    const [notificationCount, setNotificationCount] = useState(3);
    const [searchText, setSearchText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // State for API data
    const [user, setUser] = useState<User | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [flashProducts, setFlashProducts] = useState<Product[]>([]);
    const [topProducts, setTopProducts] = useState<Product[]>([]);
    const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
    const [wishlistIds, setWishlistIds] = useState<string[]>([]);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    const headerAnimatedStyle = useAnimatedStyle(() => {
        return {
            opacity: interpolate(scrollY.value, [0, 80], [1, 0.95], Extrapolate.CLAMP),
            transform: [{ translateY: interpolate(scrollY.value, [0, 100], [0, -20], Extrapolate.CLAMP) }],
        };
    });

    // ============================================================================
    // FETCH DATA FUNCTIONS - Following Register/Login pattern
    // ============================================================================

    const getGreeting = (): string => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        if (hour < 21) return 'Good Evening';
        return 'Good Night';
    };

    const loadUserProfile = async () => {
        try {
            const userData = await getUserProfile();
            setUser(userData);
        } catch (error: any) {
            console.log('Load user profile error:', error.response?.data || error.message);
            // Don't show alert for profile error as it might be a guest user
        }
    };

    const loadCategories = async () => {
        try {
            const categoriesData = await getCategories();
            setCategories(categoriesData);
        } catch (error: any) {
            console.log('Load categories error:', error.response?.data || error.message);
            Alert.alert('Error', 'Failed to load categories. Please try again.');
        }
    };

    const loadProducts = async () => {
        try {
            const productsData = await getProducts();
            setAllProducts(productsData);

            // Split products into sections
            const flash = productsData
                .filter(p => p.discount >= 25)
                .slice(0, 10);
            setFlashProducts(flash);

            const top = productsData
                .filter(p => p.rating >= 4.5)
                .slice(0, 10);
            setTopProducts(top);

            const recommended = productsData
                .filter(p => p.discount < 25 && p.rating < 4.5)
                .slice(0, 10);
            setRecommendedProducts(recommended);
        } catch (error: any) {
            console.log('Load products error:', error.response?.data || error.message);
            Alert.alert('Error', 'Failed to load products. Please try again.');
        }
    };

    const loadWishlist = async () => {
        try {
            const wishlistData = await getWishlist();
            const wishlistProductIds = wishlistData.map((item: WishlistItem) => item.productId);
            setWishlistIds(wishlistProductIds);

            // Update all product lists with favorite status
            const updateWishlistStatus = (products: Product[]): Product[] => {
                return products.map(p => ({
                    ...p,
                    isFavorite: wishlistProductIds.includes(p._id)
                }));
            };

            setAllProducts(prev => updateWishlistStatus(prev));
            setFlashProducts(prev => updateWishlistStatus(prev));
            setTopProducts(prev => updateWishlistStatus(prev));
            setRecommendedProducts(prev => updateWishlistStatus(prev));
        } catch (error: any) {
            console.log('Load wishlist error:', error.response?.data || error.message);
            // Don't show alert for wishlist error
        }
    };

    const loadAllData = async () => {
        setIsLoading(true);
        try {
            await Promise.all([
                loadUserProfile(),
                loadCategories(),
                loadProducts(),
                loadWishlist(),
            ]);
        } catch (error: any) {
            console.log('Load all data error:', error.response?.data || error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const refreshData = async () => {
        setRefreshing(true);
        try {
            await loadAllData();
        } catch (error: any) {
            console.log('Refresh data error:', error.response?.data || error.message);
        } finally {
            setRefreshing(false);
        }
    };

    // ============================================================================
    // HANDLER FUNCTIONS
    // ============================================================================

    const handleToggleFavorite = useCallback(async (productId: string) => {
        // Find the product in any of the lists
        const product = [...allProducts, ...flashProducts, ...topProducts, ...recommendedProducts]
            .find(p => p._id === productId);
        
        if (!product) return;

        const isCurrentlyFavorite = product.isFavorite;
        let success = false;

        if (isCurrentlyFavorite) {
            success = await removeFromWishlist(productId);
        } else {
            success = await addToWishlist(productId);
        }

        if (success) {
            const newFavoriteStatus = !isCurrentlyFavorite;
            
            // Update wishlist IDs
            setWishlistIds(prev =>
                newFavoriteStatus
                    ? [...prev, productId]
                    : prev.filter(id => id !== productId)
            );

            // Update all product lists
            const updateProductList = (list: Product[]): Product[] =>
                list.map(p => p._id === productId ? { ...p, isFavorite: newFavoriteStatus } : p);

            setAllProducts(prev => updateProductList(prev));
            setFlashProducts(prev => updateProductList(prev));
            setTopProducts(prev => updateProductList(prev));
            setRecommendedProducts(prev => updateProductList(prev));
        }
    }, [allProducts, flashProducts, topProducts, recommendedProducts]);

    const handleProductPress = (productId: string) => {
        router.push(`/ProductDetailScreen?id=${productId}`);
    };

    const handleCategoryPress = (categoryId: string) => {
        router.push(`/CategoryScreen?id=${categoryId}`);
    };

    const handleSeeAllProducts = (type: string) => {
        router.push(`/ProductListScreen?type=${type}`);
    };

    const handleSearch = () => {
        if (searchText.trim()) {
            router.push(`/SearchScreen?q=${encodeURIComponent(searchText)}`);
        } else {
            Alert.alert('Search', 'Please enter a search term');
        }
    };

    const handleNotificationPress = () => {
        setNotificationCount(0);
        router.push('/NotificationsScreen');
    };

    // ============================================================================
    // USE EFFECTS
    // ============================================================================

    useEffect(() => {
        loadAllData();
    }, []);

    // ============================================================================
    // RENDER FUNCTIONS
    // ============================================================================

    const renderCategoryItem = ({ item, index }: { item: Category; index: number }) => (
        <Animated.View entering={FadeInUp.delay(index * 50).springify().damping(15)}>
            <TouchableOpacity 
                activeOpacity={0.7} 
                style={styles.categoryItem}
                onPress={() => handleCategoryPress(item._id)}
            >
                <View style={styles.categoryIconContainer}>
                    <MaterialCommunityIcons name={item.icon as any} size={28} color="#2563EB" />
                </View>
                <Text style={styles.categoryName}>{item.name}</Text>
            </TouchableOpacity>
        </Animated.View>
    );

    // ============================================================================
    // LOADING STATE
    // ============================================================================

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, styles.loadingContainer]}>
                <View style={styles.loadingContent}>
                    <View style={styles.loadingLogo}>
                        <MaterialCommunityIcons name="shopping" size={60} color="#2563EB" />
                    </View>
                    <Text style={styles.loadingText}>Loading Shoply...</Text>
                    <ActivityIndicator size="large" color="#2563EB" style={styles.loadingIndicator} />
                </View>
            </SafeAreaView>
        );
    }

    // ============================================================================
    // MAIN RENDER
    // ============================================================================

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

            <Animated.View style={[styles.headerContainer, headerAnimatedStyle]}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.userInfo}>
                        <Image 
                            source={{ 
                                uri: user?.avatar || 'https://randomuser.me/api/portraits/men/32.jpg' 
                            }} 
                            style={styles.userAvatar} 
                        />
                        <View style={styles.userTextContainer}>
                            <Text style={styles.userGreeting}>{getGreeting()} 👋</Text>
                            <Text style={styles.userName}>{user?.name || 'Guest'}</Text>
                        </View>
                    </View>
                    <TouchableOpacity 
                        onPress={handleNotificationPress} 
                        style={styles.notificationButton}
                    >
                        <Ionicons name="notifications-outline" size={26} color="#0F172A" />
                        {notificationCount > 0 && (
                            <View style={styles.notificationBadge}>
                                <Text style={styles.notificationBadgeText}>{notificationCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <Feather name="search" size={20} color="#94A3B8" />
                        <TextInput
                            placeholder="Search products..."
                            placeholderTextColor="#94A3B8"
                            value={searchText}
                            onChangeText={setSearchText}
                            onSubmitEditing={handleSearch}
                            style={styles.searchInput}
                            returnKeyType="search"
                        />
                        <TouchableOpacity onPress={handleSearch}>
                            <Feather name="mic" size={20} color="#2563EB" />
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>

            <Animated.FlatList
                data={[]}
                keyExtractor={() => 'main'}
                renderItem={null}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                refreshing={refreshing}
                onRefresh={refreshData}
                ListHeaderComponent={
                    <View>
                        {/* Banner Carousel */}
                        <FlatList
                            data={[]}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            renderItem={() => null}
                            keyExtractor={(item, index) => index.toString()}
                            contentContainerStyle={styles.bannerCarouselContent}
                            style={styles.bannerCarousel}
                            ListEmptyComponent={
                                <View style={[styles.bannerCard, { backgroundColor: '#EFF6FF', marginHorizontal: 16 }]}>
                                    <View style={styles.bannerContent}>
                                        <Text style={styles.bannerTitle}>Welcome to Shoply</Text>
                                        <Text style={styles.bannerDescription}>Discover amazing products at great prices</Text>
                                        <View style={styles.bannerButton}>
                                            <Text style={styles.bannerButtonText}>Shop Now</Text>
                                        </View>
                                    </View>
                                    <MaterialCommunityIcons name="shopping" size={80} color="#93C5FD" />
                                </View>
                            }
                        />

                        {/* Categories */}
                        <SectionHeader title="Categories" />
                        <FlatList
                            data={categories}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            renderItem={renderCategoryItem}
                            keyExtractor={(item) => item._id}
                            contentContainerStyle={styles.categoriesList}
                            style={styles.categoriesSection}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>No categories available</Text>
                                </View>
                            }
                        />

                        {/* Flash Sale */}
                        {flashProducts.length > 0 && (
                            <View style={styles.flashSaleSection}>
                                <View style={styles.flashSaleHeader}>
                                    <View style={styles.flashSaleTitleContainer}>
                                        <Text style={styles.sectionHeaderTitle}>Flash Sale</Text>
                                        <View style={styles.flashSaleTimer}>
                                            <Text style={styles.flashSaleTimerText}>🔥 Limited Time</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity onPress={() => handleSeeAllProducts('flash')}>
                                        <Text style={styles.sectionHeaderSeeAll}>See All</Text>
                                    </TouchableOpacity>
                                </View>
                                <FlatList
                                    data={flashProducts}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    renderItem={({ item }) => (
                                        <ProductCard 
                                            product={item} 
                                            onPress={() => handleProductPress(item._id)} 
                                            onFavorite={() => handleToggleFavorite(item._id)} 
                                            variant="grid" 
                                        />
                                    )}
                                    keyExtractor={(item) => item._id}
                                    contentContainerStyle={styles.productsList}
                                />
                            </View>
                        )}

                        {/* Top Selling */}
                        {topProducts.length > 0 && (
                            <>
                                <SectionHeader title="Top Selling" />
                                <FlatList
                                    data={topProducts}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    renderItem={({ item }) => (
                                        <ProductCard 
                                            product={item} 
                                            onPress={() => handleProductPress(item._id)} 
                                            onFavorite={() => handleToggleFavorite(item._id)} 
                                            variant="grid" 
                                        />
                                    )}
                                    keyExtractor={(item) => item._id}
                                    contentContainerStyle={styles.productsList}
                                    style={styles.topSellingSection}
                                />
                            </>
                        )}

                        {/* Recommended Products - Vertical Grid */}
                        <SectionHeader title="Recommended For You" />
                        <View style={styles.recommendedGrid}>
                            {recommendedProducts.length > 0 ? (
                                recommendedProducts.map((product, index) => (
                                    <Animated.View 
                                        key={product._id} 
                                        entering={FadeInUp.delay(index * 50).springify()} 
                                        style={styles.recommendedGridItem}
                                    >
                                        <ProductCard 
                                            product={product} 
                                            onPress={() => handleProductPress(product._id)} 
                                            onFavorite={() => handleToggleFavorite(product._id)} 
                                            variant="grid" 
                                        />
                                    </Animated.View>
                                ))
                            ) : (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>No products available</Text>
                                </View>
                            )}
                        </View>

                        {/* Feature Highlights */}
                        <View style={styles.featuresContainer}>
                            <View style={styles.featureWrapper}>
                                <View style={styles.featureItem}>
                                    <View style={styles.featureIconContainer}>
                                        <MaterialCommunityIcons name="truck" size={24} color="#2563EB" />
                                    </View>
                                    <Text style={styles.featureTitle}>Free Delivery</Text>
                                    <Text style={styles.featureDescription}>On orders over $50</Text>
                                </View>
                            </View>
                            <View style={styles.featureWrapper}>
                                <View style={styles.featureItem}>
                                    <View style={styles.featureIconContainer}>
                                        <MaterialCommunityIcons name="shield-check" size={24} color="#2563EB" />
                                    </View>
                                    <Text style={styles.featureTitle}>Secure Payment</Text>
                                    <Text style={styles.featureDescription}>100% secure</Text>
                                </View>
                            </View>
                            <View style={styles.featureWrapper}>
                                <View style={styles.featureItem}>
                                    <View style={styles.featureIconContainer}>
                                        <MaterialCommunityIcons name="refresh" size={24} color="#2563EB" />
                                    </View>
                                    <Text style={styles.featureTitle}>Easy Returns</Text>
                                    <Text style={styles.featureDescription}>30-day return</Text>
                                </View>
                            </View>
                            <View style={styles.featureWrapper}>
                                <View style={styles.featureItem}>
                                    <View style={styles.featureIconContainer}>
                                        <MaterialCommunityIcons name="headphones" size={24} color="#2563EB" />
                                    </View>
                                    <Text style={styles.featureTitle}>24/7 Support</Text>
                                    <Text style={styles.featureDescription}>Customer service</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                }
                ListFooterComponent={<View style={[styles.footerSpacing, { height: insets.bottom + 80 }]} />}
            />
        </SafeAreaView>
    );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContent: {
        alignItems: 'center',
    },
    loadingLogo: {
        marginBottom: 20,
    },
    loadingText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#0F172A',
        marginBottom: 20,
    },
    loadingIndicator: {
        marginTop: 10,
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        width: SCREEN_WIDTH - 32,
    },
    emptyText: {
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center',
    },
    headerContainer: {
        backgroundColor: '#F8FAFC',
        paddingTop: Platform.OS === 'android' ? 8 : 0,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    userTextContainer: {
        marginLeft: 12,
    },
    userGreeting: {
        fontSize: 14,
        color: '#64748B',
    },
    userName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    notificationButton: {
        position: 'relative',
    },
    notificationBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    notificationBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    searchContainer: {
        paddingHorizontal: 16,
        marginTop: 8,
        marginBottom: 16,
    },
    searchBar: {
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
        fontSize: 16,
        color: '#0F172A',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    sectionHeaderTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
    },
    sectionHeaderSeeAll: {
        fontSize: 14,
        fontWeight: '500',
        color: '#2563EB',
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingStar: {
        marginRight: 2,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    reviewCount: {
        fontSize: 10,
        color: '#64748B',
        marginLeft: 4,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    currentPrice: {
        fontSize: 14,
        fontWeight: '700',
        color: '#2563EB',
    },
    oldPrice: {
        fontSize: 11,
        color: '#94A3B8',
        textDecorationLine: 'line-through',
        marginLeft: 6,
    },
    bannerCarousel: {
        marginBottom: 24,
    },
    bannerCarouselContent: {
        paddingRight: 16,
    },
    bannerCard: {
        width: BANNER_WIDTH,
        borderRadius: 20,
        marginHorizontal: 16,
        overflow: 'hidden',
        flexDirection: 'row',
        padding: 20,
        minHeight: 140,
    },
    bannerContent: {
        flex: 1,
        justifyContent: 'center',
    },
    bannerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#0F172A',
    },
    bannerDescription: {
        fontSize: 13,
        color: '#475569',
        marginTop: 4,
    },
    bannerButton: {
        backgroundColor: '#2563EB',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 25,
        alignSelf: 'flex-start',
        marginTop: 12,
    },
    bannerButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    categoriesSection: {
        marginBottom: 24,
    },
    categoriesList: {
        paddingLeft: 16,
        paddingRight: 8,
    },
    categoryItem: {
        alignItems: 'center',
        marginHorizontal: 12,
        width: 70,
    },
    categoryIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    categoryName: {
        fontSize: 12,
        fontWeight: '500',
        color: '#0F172A',
        marginTop: 8,
        textAlign: 'center',
    },
    flashSaleSection: {
        marginBottom: 24,
    },
    flashSaleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    flashSaleTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    flashSaleTimer: {
        backgroundColor: '#EF4444',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 20,
        marginLeft: 12,
    },
    flashSaleTimerText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    productsList: {
        paddingLeft: 8,
        paddingRight: 8,
    },
    topSellingSection: {
        marginBottom: 24,
    },
    productCard: {
        width: CARD_WIDTH,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginHorizontal: 8,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        overflow: 'hidden',
    },
    productImageContainer: {
        position: 'relative',
    },
    productImage: {
        width: CARD_WIDTH,
        height: CARD_WIDTH,
        resizeMode: 'cover',
    },
    discountBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: '#EF4444',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 20,
    },
    discountText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    favoriteButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: 6,
        borderRadius: 20,
    },
    productInfo: {
        padding: 10,
    },
    productTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0F172A',
    },
    productBrand: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 2,
    },
    horizontalProductCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginHorizontal: 8,
        marginVertical: 4,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    horizontalProductImage: {
        width: 80,
        height: 80,
        borderRadius: 12,
    },
    horizontalProductContent: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'space-between',
    },
    horizontalProductInfo: {
        flex: 1,
    },
    horizontalProductTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0F172A',
    },
    horizontalProductBrand: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    horizontalProductFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    recommendedGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    recommendedGridItem: {
        width: (SCREEN_WIDTH - 48) / 2,
        marginBottom: 16,
    },
    featuresContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginBottom: 24,
        paddingVertical: 20,
        borderRadius: 20,
    },
    featureWrapper: {
        width: '25%',
    },
    featureItem: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    featureIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#0F172A',
        marginTop: 8,
        textAlign: 'center',
    },
    featureDescription: {
        fontSize: 10,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 2,
    },
    footerSpacing: {
        height: 80,
    },
});

// Import ActivityIndicator for loading state
import { ActivityIndicator } from 'react-native';