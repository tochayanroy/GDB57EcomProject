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
    TextInput,
    TouchableOpacity,
    View,
    ScrollView
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
    Layout
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

// ============================================================================
// API CONFIGURATION
// ============================================================================

const API_BASE_URL = 'http://10.225.180.27:5000';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Category {
    _id: string;
    name: string;
    slug: string;
    description: string;
    image: string;
    parentCategory: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface Product {
    _id: string;
    name: string;
    brand: string;
    price: number;
    discountPrice: number;
    costPrice: number;
    thumbnail: string;
    images: string[] | string; // Can be array or string
    description: string;
    stock: number;
    averageRating: number;
    totalReviews: number;
    isActive: boolean;
    isFeatured: boolean;
    category: {
        _id: string;
        name: string;
        slug: string;
    };
    soldCount: number;
    createdAt: string;
    updatedAt: string;
    isFavorite: boolean;
}

interface CategoryResponse {
    success: boolean;
    data: Category;
}

interface ProductsResponse {
    success: boolean;
    data: Product[];
}

// ============================================================================
// API SERVICE FUNCTIONS
// ============================================================================

// Get Category by ID
const getCategoryById = async (categoryId: string): Promise<Category> => {
    try {
        const token = await AsyncStorage.getItem('token');
        const headers: any = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await axios.get(
            `${API_BASE_URL}/Category/${categoryId}`,
            { headers }
        );

        if (response.data.success) {
            return response.data.data;
        } else {
            throw new Error(response.data.message || 'Failed to fetch category');
        }
    } catch (error: any) {
        console.error('Get category error:', error.response?.data || error.message);
        throw error;
    }
};

// Get Products by Category ID
const getProductsByCategory = async (categoryId: string): Promise<Product[]> => {
    try {
        const token = await AsyncStorage.getItem('token');
        const headers: any = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Using the Product endpoint with category filter
        const response = await axios.get(
            `${API_BASE_URL}/Product/?category=${categoryId}`,
            { headers }
        );

        if (response.data.success) {
            return response.data.data;
        } else {
            throw new Error(response.data.message || 'Failed to fetch products');
        }
    } catch (error: any) {
        console.error('Get products by category error:', error.response?.data || error.message);
        throw error;
    }
};

// Get Wishlist Product IDs
const getWishlistProductIds = async (): Promise<string[]> => {
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
            const data = response.data.data;
            
            if (Array.isArray(data)) {
                return data.map((item: any) => {
                    if (item.productId) return item.productId;
                    if (item.product && item.product._id) return item.product._id;
                    return null;
                }).filter(id => id !== null);
            } else if (data && data.items && Array.isArray(data.items)) {
                return data.items.map((item: any) => {
                    if (item.productId) return item.productId;
                    if (item.product && item.product._id) return item.product._id;
                    return null;
                }).filter(id => id !== null);
            } else if (data && data.userWishlist && Array.isArray(data.userWishlist)) {
                return data.userWishlist.map((product: any) => product._id).filter(id => id !== null);
            }
            
            return [];
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
// PRODUCT CARD COMPONENT WITH IMAGE SLIDER
// ============================================================================

const ProductCard = React.memo(({ 
    product, 
    onPress, 
    onFavorite 
}: { 
    product: Product; 
    onPress: () => void; 
    onFavorite: () => void;
}) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const [isSliding, setIsSliding] = useState(false);

    // Get all images array (thumbnail + images)
    const getAllImages = useCallback(() => {
        const imageList: string[] = [];
        
        // Add thumbnail if exists
        if (product.thumbnail) {
            const thumbnailUrl = product.thumbnail.startsWith('http') 
                ? product.thumbnail 
                : `${API_BASE_URL}${product.thumbnail}`;
            imageList.push(thumbnailUrl);
        }
        
        // Add images if they exist - handle both array and string cases
        if (product.images) {
            let imagesArray: string[] = [];
            
            // Check if images is already an array
            if (Array.isArray(product.images)) {
                imagesArray = product.images;
            } 
            // If images is a string, try to parse it as JSON or treat as single image
            else if (typeof product.images === 'string') {
                try {
                    // Try to parse as JSON array
                    const parsed = JSON.parse(product.images);
                    if (Array.isArray(parsed)) {
                        imagesArray = parsed;
                    } else {
                        imagesArray = [product.images];
                    }
                } catch {
                    // If parsing fails, treat as single image string
                    imagesArray = [product.images];
                }
            }
            // Process each image
            imagesArray.forEach(img => {
                if (img) {
                    const imageUrl = `${API_BASE_URL}${img.url}`
                    // Avoid duplicates
                    if (!imageList.includes(imageUrl)) {
                        imageList.push(imageUrl);
                    }
                }
            });
        }
        // If no images at all, add placeholder
        if (imageList.length === 0) {
            imageList.push('https://via.placeholder.com/300');
        }
        
        return imageList;
    }, [product.thumbnail, product.images]);

    const images = getAllImages();
    const hasMultipleImages = images.length > 1;

    // Auto-slide effect
    useEffect(() => {
        if (!hasMultipleImages) return;

        const interval = setInterval(() => {
            if (!isSliding) {
                setCurrentImageIndex((prevIndex) => {
                    const nextIndex = (prevIndex + 1) % images.length;
                    flatListRef.current?.scrollToIndex({
                        index: nextIndex,
                        animated: true
                    });
                    return nextIndex;
                });
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [images.length, hasMultipleImages, isSliding]);

    const renderImageItem = ({ item }: { item: string }) => (
        <Image source={{ uri: item }} style={styles.productImage} />
    );

    const onScrollBeginDrag = () => {
        setIsSliding(true);
    };

    const onScrollEndDrag = () => {
        setIsSliding(false);
    };

    const onMomentumScrollEnd = (event: any) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffsetX / (CARD_WIDTH));
        setCurrentImageIndex(index);
    };

    const currentPrice = product.discountPrice || product.price;
    const discount = product.discountPrice && product.price 
        ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
        : 0;

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.productCard}>
            <View style={styles.productImageContainer}>
                <FlatList
                    ref={flatListRef}
                    data={images}
                    renderItem={renderImageItem}
                    keyExtractor={(item, index) => `${item}-${index}`}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScrollBeginDrag={onScrollBeginDrag}
                    onScrollEndDrag={onScrollEndDrag}
                    onMomentumScrollEnd={onMomentumScrollEnd}
                    scrollEnabled={hasMultipleImages}
                    style={styles.imageSlider}
                />

                {/* Image Indicators */}
                {hasMultipleImages && (
                    <View style={styles.imageIndicatorsContainer}>
                        {images.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.imageIndicator,
                                    currentImageIndex === index && styles.imageIndicatorActive
                                ]}
                            />
                        ))}
                    </View>
                )}

                {discount > 0 && (
                    <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>-{discount}%</Text>
                    </View>
                )}
                
                <TouchableOpacity onPress={onFavorite} style={styles.favoriteButton}>
                    <Ionicons 
                        name={product.isFavorite ? 'heart' : 'heart-outline'} 
                        size={18} 
                        color={product.isFavorite ? '#EF4444' : '#64748B'} 
                    />
                </TouchableOpacity>

                {!product.isActive && (
                    <View style={styles.inactiveOverlay}>
                        <Text style={styles.inactiveText}>Inactive</Text>
                    </View>
                )}
            </View>
            <View style={styles.productInfo}>
                <Text style={styles.productBrand}>{product.brand || 'Unknown Brand'}</Text>
                <Text style={styles.productTitle} numberOfLines={2}>{product.name}</Text>
                <View style={styles.productRatingContainer}>
                    <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={12} color="#FBBF24" />
                        <Text style={styles.ratingText}>{product.averageRating?.toFixed(1) || '0.0'}</Text>
                    </View>
                    <Text style={styles.reviewCount}>({product.totalReviews || 0})</Text>
                </View>
                <View style={styles.priceRow}>
                    <Text style={styles.currentPrice}>₹{currentPrice.toLocaleString()}</Text>
                    {discount > 0 && (
                        <Text style={styles.oldPrice}>₹{product.price.toLocaleString()}</Text>
                    )}
                </View>
                <View style={styles.stockContainer}>
                    {product.stock > 0 ? (
                        <Text style={[styles.stockText, { color: product.stock < 10 ? '#F59E0B' : '#22C55E' }]}>
                            {product.stock < 10 ? `Only ${product.stock} left` : 'In Stock'}
                        </Text>
                    ) : (
                        <Text style={[styles.stockText, { color: '#EF4444' }]}>Out of Stock</Text>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
});

ProductCard.displayName = 'ProductCard';

// ============================================================================
// MAIN CATEGORY DETAILS SCREEN
// ============================================================================

export default function CategoriesDetailsScreen() {
    const params = useLocalSearchParams();
    const categoryId = params.id as string;
    
    const [category, setCategory] = useState<Category | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [wishlistIds, setWishlistIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState<'popular' | 'price-low' | 'price-high' | 'rating'>('popular');

    // ============================================================================
    // FETCH DATA FUNCTIONS
    // ============================================================================

    const loadCategoryData = async () => {
        try {
            const categoryData = await getCategoryById(categoryId);
            setCategory(categoryData);
        } catch (error: any) {
            console.error('Load category error:', error.response?.data || error.message);
            Alert.alert('Error', 'Failed to load category details');
        }
    };

    const loadProducts = async () => {
        try {
            const productsData = await getProductsByCategory(categoryId);
            
            // Get wishlist status
            const wishlistIdsData = await getWishlistProductIds();
            setWishlistIds(wishlistIdsData);
            
            // Apply wishlist status to products
            const productsWithWishlist = productsData.map(product => ({
                ...product,
                isFavorite: wishlistIdsData.includes(product._id)
            }));
            
            setProducts(productsWithWishlist);
            setFilteredProducts(productsWithWishlist);
        } catch (error: any) {
            console.error('Load products error:', error.response?.data || error.message);
            Alert.alert('Error', 'Failed to load products');
        }
    };

    const loadWishlistOnly = async () => {
        try {
            const wishlistIdsData = await getWishlistProductIds();
            setWishlistIds(wishlistIdsData);
            
            // Update products with new wishlist status - FIXED: properly map products
            if (products.length > 0) {
                const updatedProducts = products.map((product) => ({
                    ...product,
                    isFavorite: wishlistIdsData.includes(product._id)
                }));
                
                setProducts(updatedProducts);
                setFilteredProducts(prev => 
                    prev.map((product) => ({
                        ...product,
                        isFavorite: wishlistIdsData.includes(product._id)
                    }))
                );
            }
        } catch (error: any) {
            console.error('Load wishlist error:', error.response?.data || error.message);
        }
    };

    const loadAllData = async () => {
        setLoading(true);
        try {
            await loadCategoryData();
            await loadProducts();
        } catch (error: any) {
            console.error('Load all data error:', error.response?.data || error.message);
        } finally {
            setLoading(false);
        }
    };

    const refreshData = async () => {
        setRefreshing(true);
        try {
            await loadCategoryData();
            await loadProducts();
        } catch (error: any) {
            console.error('Refresh data error:', error.response?.data || error.message);
        } finally {
            setRefreshing(false);
        }
    };

    // ============================================================================
    // FILTER AND SORT FUNCTIONS
    // ============================================================================

    const applyFiltersAndSort = useCallback(() => {
        let filtered = [...products];

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(product => 
                product.name.toLowerCase().includes(query) ||
                product.brand.toLowerCase().includes(query) ||
                product.category.name.toLowerCase().includes(query)
            );
        }

        // Apply sorting
        switch (sortOption) {
            case 'popular':
                filtered.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
                break;
            case 'price-low':
                filtered.sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
                break;
            case 'price-high':
                filtered.sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
                break;
            case 'rating':
                filtered.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
                break;
            default:
                break;
        }

        setFilteredProducts(filtered);
    }, [products, searchQuery, sortOption]);

    // ============================================================================
    // HANDLER FUNCTIONS
    // ============================================================================

    const handleToggleFavorite = useCallback(async (productId: string) => {
        const isCurrentlyFavorite = wishlistIds.includes(productId);
        let success = false;

        if (isCurrentlyFavorite) {
            success = await removeFromWishlist(productId);
        } else {
            success = await addToWishlist(productId);
        }

        if (success) {
            const newFavoriteStatus = !isCurrentlyFavorite;
            
            setWishlistIds(prev => 
                newFavoriteStatus 
                    ? [...prev, productId] 
                    : prev.filter(id => id !== productId)
            );

            const updateProductList = (list: Product[]): Product[] => {
                return list.map((p) => 
                    p._id === productId 
                        ? { ...p, isFavorite: newFavoriteStatus } 
                        : p
                );
            };

            setProducts(prev => updateProductList(prev));
            setFilteredProducts(prev => updateProductList(prev));
        }
    }, [wishlistIds]);

    const handleProductPress = (productId: string) => {
        router.push({
            pathname: '/ProductDetailsScreen',
            params: { productId }
        });
    };

    const handleBack = () => {
        router.back();
    };

    const handleSortChange = (option: 'popular' | 'price-low' | 'price-high' | 'rating') => {
        setSortOption(option);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
    };

    // ============================================================================
    // USE EFFECTS
    // ============================================================================

    useEffect(() => {
        loadAllData();
    }, [categoryId]);

    useEffect(() => {
        applyFiltersAndSort();
    }, [products, searchQuery, sortOption, applyFiltersAndSort]);

    // ============================================================================
    // RENDER FUNCTIONS
    // ============================================================================

    const renderProductItem = ({ item, index }: { item: Product; index: number }) => (
        <Animated.View
            entering={FadeInUp.delay(index * 50).springify().damping(15)}
            layout={Layout.springify()}
            style={styles.productItemWrapper}
        >
            <ProductCard
                product={item}
                onPress={() => handleProductPress(item._id)}
                onFavorite={() => handleToggleFavorite(item._id)}
            />
        </Animated.View>
    );

    const SortButton = ({ label, value }: { label: string; value: typeof sortOption }) => (
        <TouchableOpacity
            style={[
                styles.sortButton,
                sortOption === value && styles.sortButtonActive
            ]}
            onPress={() => handleSortChange(value)}
            activeOpacity={0.7}
        >
            <Text style={[
                styles.sortButtonText,
                sortOption === value && styles.sortButtonTextActive
            ]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    // ============================================================================
    // LOADING STATE
    // ============================================================================

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={24} color="#0F172A" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Category</Text>
                    <View style={styles.placeholderButton} />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={styles.loadingText}>Loading category...</Text>
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

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {category?.name || 'Category'}
                </Text>
                <TouchableOpacity style={styles.cartButton} onPress={() => router.push('/CartScreen')} activeOpacity={0.7}>
                    <Feather name="shopping-bag" size={22} color="#0F172A" />
                </TouchableOpacity>
            </View>

            {/* Products Grid */}
            <FlatList
                data={filteredProducts}
                renderItem={renderProductItem}
                keyExtractor={(item) => item._id}
                numColumns={2}
                contentContainerStyle={styles.productsList}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={refreshData}
                        colors={['#2563EB']}
                        tintColor="#2563EB"
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="package-variant" size={60} color="#CBD5E1" />
                        <Text style={styles.emptyTitle}>No Products Found</Text>
                        <Text style={styles.emptyDescription}>
                            {searchQuery 
                                ? `No products matching "${searchQuery}" in this category` 
                                : 'This category has no products yet'}
                        </Text>
                        {searchQuery && (
                            <TouchableOpacity style={styles.clearSearchButton} onPress={handleClearSearch} activeOpacity={0.7}>
                                <Text style={styles.clearSearchButtonText}>Clear Search</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
                ListFooterComponent={<View style={styles.footerSpacing} />}
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F8FAFC',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        flex: 1,
        textAlign: 'center',
        paddingHorizontal: 8,
    },
    placeholderButton: {
        width: 40,
        height: 40,
    },
    cartButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
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
    categoryBanner: {
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        position: 'relative',
    },
    categoryBannerImage: {
        width: '100%',
        height: 160,
        resizeMode: 'cover',
    },
    categoryBannerOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 50,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    categoryBannerName: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    categoryBannerDescription: {
        fontSize: 14,
        color: '#FFFFFF',
        opacity: 0.9,
    },
    categoryBannerStats: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    categoryBannerStatsText: {
        fontSize: 12,
        color: '#FFFFFF',
        opacity: 0.8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    searchFilterContainer: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#0F172A',
        paddingHorizontal: 10,
        paddingVertical: 0,
    },
    sortContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    sortButton: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    sortButtonActive: {
        backgroundColor: '#2563EB',
        borderColor: '#2563EB',
    },
    sortButtonText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#64748B',
    },
    sortButtonTextActive: {
        color: '#FFFFFF',
    },
    productsList: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 20,
    },
    productItemWrapper: {
        width: '50%',
        paddingHorizontal: 6,
        marginBottom: 12,
    },
    productCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    productImageContainer: {
        position: 'relative',
        width: '100%',
        height: 180,
        backgroundColor: '#F8FAFC',
        overflow: 'hidden',
    },
    imageSlider: {
        width: '100%',
        height: '100%',
    },
    productImage: {
        width: CARD_WIDTH,
        height: 180,
        resizeMode: 'cover',
    },
    imageIndicatorsContainer: {
        position: 'absolute',
        bottom: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        gap: 4,
    },
    imageIndicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    imageIndicatorActive: {
        backgroundColor: '#FFFFFF',
        width: 16,
    },
    discountBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: '#EF4444',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    inactiveOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    inactiveText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    productInfo: {
        padding: 12,
    },
    productBrand: {
        fontSize: 10,
        fontWeight: '500',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    productTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0F172A',
        marginTop: 4,
        lineHeight: 20,
        minHeight: 40,
    },
    productRatingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        gap: 4,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    ratingText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#0F172A',
    },
    reviewCount: {
        fontSize: 10,
        color: '#94A3B8',
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        gap: 8,
    },
    currentPrice: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2563EB',
    },
    oldPrice: {
        fontSize: 12,
        color: '#94A3B8',
        textDecorationLine: 'line-through',
    },
    stockContainer: {
        marginTop: 4,
    },
    stockText: {
        fontSize: 11,
        fontWeight: '500',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 32,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        marginTop: 16,
    },
    emptyDescription: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 8,
    },
    clearSearchButton: {
        marginTop: 20,
        backgroundColor: '#2563EB',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 12,
    },
    clearSearchButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    footerSpacing: {
        height: 20,
    },
});