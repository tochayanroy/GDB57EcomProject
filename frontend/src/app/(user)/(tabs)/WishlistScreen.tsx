// WishlistScreen.tsx
import { Feather, Ionicons, MaterialIcons, SimpleLineIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    ListRenderItemInfo,
    Platform,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_CARD_WIDTH = SCREEN_WIDTH * 0.42;

// ============================================================================
// API CONFIGURATION
// ============================================================================

const API_BASE_URL = 'http://10.225.180.27:5000';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface WishlistItem {
    _id: string;
    product: {
        _id: string;
        name: string;
        slug: string;
        price: number;
        discountPrice: number;
        thumbnail: string;
        images: string[];
        stock: number;
        averageRating: number;
        brand: string;
        category: {
            _id: string;
            name: string;
            slug: string;
        };
        isActive: boolean;
        shippingCharge: number;
        description: string;
        totalReviews: number;
    };
    variant: string | null;
    price: number;
    addedAt: string;
}

interface WishlistResponse {
    success: boolean;
    data: {
        _id: string;
        user: string;
        items: WishlistItem[];
        totalItems: number;
        createdAt: string;
        updatedAt: string;
    };
}

// ============================================================================
// API SERVICE FUNCTIONS - BASED ON WISHLIST ROUTES
// ============================================================================

// Get Wishlist
const getWishlist = async (): Promise<any> => {
    try {
        const token = await AsyncStorage.getItem('token');
        const headers: any = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await axios.get(
            `${API_BASE_URL}/Wishlist/`,
            { headers }
        );

        if (response.data.success) {
            return response.data;
        } else {
            throw new Error(response.data.message || 'Failed to fetch wishlist');
        }
    } catch (error: any) {
        console.error('Get wishlist error:', error.response?.data || error.message);
        throw error;
    }
};

// Add to Wishlist
const addToWishlist = async (productId: string, variant?: string): Promise<boolean> => {
    try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
            Alert.alert('Error', 'Please login to add items to wishlist');
            return false;
        }

        const response = await axios.post(
            `${API_BASE_URL}/Wishlist/add/${productId}`,
            { variant: variant || null },
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
const removeFromWishlist = async (productId: string, variant?: string): Promise<boolean> => {
    try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
            return false;
        }

        let url = `${API_BASE_URL}/Wishlist/remove/${productId}`;
        if (variant) {
            url += `?variant=${encodeURIComponent(variant)}`;
        }

        const response = await axios.delete(
            url,
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

// Clear Wishlist
const clearWishlist = async (): Promise<boolean> => {
    try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
            return false;
        }

        const response = await axios.delete(
            `${API_BASE_URL}/Wishlist/clear`,
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
            throw new Error(response.data.message || 'Failed to clear wishlist');
        }
    } catch (error: any) {
        console.error('Clear wishlist error:', error.response?.data || error.message);
        Alert.alert('Error', error.response?.data?.message || 'Failed to clear wishlist');
        return false;
    }
};

// Move Wishlist Item to Cart
const moveToCart = async (productId: string, variant?: string): Promise<boolean> => {
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
                quantity: 1,
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
            // Remove from wishlist after adding to cart
            await removeFromWishlist(productId, variant);
            return true;
        } else {
            throw new Error(response.data.message || 'Failed to add to cart');
        }
    } catch (error: any) {
        console.error('Move to cart error:', error.response?.data || error.message);
        Alert.alert('Error', error.response?.data?.message || 'Failed to move to cart');
        return false;
    }
};

// ============================================================================
// COMPONENTS
// ============================================================================

// Memoized Product Card Component
const ProductCard = React.memo(({ 
    item, 
    onMoveToCart, 
    onRemove,
    index 
}: { 
    item: WishlistItem; 
    onMoveToCart: (productId: string, variant?: string) => void; 
    onRemove: (productId: string, variant?: string) => void;
    index: number;
}) => {
    const scale = useSharedValue(1);
    const heartScale = useSharedValue(1);
    const product = item.product;

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
        runOnJS(onRemove)(product._id, item.variant || undefined);
    }, [product._id, item.variant, onRemove]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const heartAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: heartScale.value }],
    }));

    const currentPrice = product.discountPrice && product.discountPrice > 0
        ? product.discountPrice
        : product.price;

    const discountPercentage = product.discountPrice && product.discountPrice > 0
        ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
        : 0;

    const getStockStatusColor = () => {
        if (product.stock <= 0) return '#EF4444';
        if (product.stock < 10) return '#F59E0B';
        return '#22C55E';
    };

    const getStockStatusText = () => {
        if (product.stock <= 0) return 'Out of Stock';
        if (product.stock < 10) return 'Limited Stock';
        return 'In Stock';
    };

    // Get image URL
    const getImageUrl = (): string => {
        if (product.thumbnail) {
            return product.thumbnail.startsWith('http') 
                ? product.thumbnail 
                : `${API_BASE_URL}${product.thumbnail}`;
        }
        if (product.images && product.images.length > 0) {
            const img = product.images[0];
            if (typeof img === 'string') {
                return img.startsWith('http') ? img : `${API_BASE_URL}${img}`;
            }
            if (typeof img === 'object' && img.url) {
                return img.url.startsWith('http') ? img.url : `${API_BASE_URL}${img.url}`;
            }
        }
        return 'https://via.placeholder.com/400';
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
                            source={{ uri: getImageUrl() }} 
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
                    </View>
                    
                    <View style={styles.productDetails}>
                        <Text style={styles.brandName}>{product.category?.name || 'Uncategorized'}</Text>
                        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                        
                        {product.averageRating > 0 && (
                            <View style={styles.ratingContainer}>
                                <MaterialIcons name="star" size={14} color="#F59E0B" />
                                <Text style={styles.ratingText}>{product.averageRating.toFixed(1)}</Text>
                                <Text style={styles.reviewCount}>({product.totalReviews || 0})</Text>
                            </View>
                        )}
                        
                        <View style={styles.priceContainer}>
                            <Text style={styles.currentPrice}>₹{currentPrice.toLocaleString()}</Text>
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
                                style={[styles.moveToCartButton, product.stock <= 0 && styles.disabledButton]}
                                onPress={() => onMoveToCart(product._id, item.variant || undefined)}
                                activeOpacity={0.8}
                                disabled={product.stock <= 0}
                            > 
                                <Feather name="shopping-bag" size={16} color="#FFFFFF" />
                                <Text style={styles.moveToCartText}>Move to Cart</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={styles.removeButton}
                                onPress={() => onRemove(product._id, item.variant || undefined)}
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

ProductCard.displayName = 'ProductCard';

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

EmptyWishlistState.displayName = 'EmptyWishlistState';

// ============================================================================
// MAIN SCREEN COMPONENT
// ============================================================================

const WishlistScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    
    // State
    const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionInProgress, setActionInProgress] = useState<string | null>(null);
    
    const flatListRef = useRef<FlatList>(null);
    const headerOpacity = useSharedValue(0);
    

     useFocusEffect(
            useCallback(() => {
                loadWishlist();
            }, [])
        );

    // Animation on mount
    useEffect(() => {
        headerOpacity.value = withTiming(1, { duration: 600 });
    }, []);
    
    const headerAnimatedStyle = useAnimatedStyle(() => ({
        opacity: headerOpacity.value,
    }));
    
    // Load wishlist data
    const loadWishlist = useCallback(async (refresh = false) => {
        try {
            if (refresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            
            const response = await getWishlist();
            
            if (response.success) {
                // Handle both data structures
                let items: WishlistItem[] = [];
                let total = 0;
                
                // Check if we have wishlist.items (from the wishlist object)
                if (response.data && response.data.items && Array.isArray(response.data.items)) {
                    items = response.data.items;
                    total = response.data.totalItems || response.data.items.length;
                } 
                // Check if we have userWishlist (from the user object)
                else if (response.data && response.data.userWishlist && Array.isArray(response.data.userWishlist)) {
                    // Convert userWishlist to WishlistItem format
                    items = response.data.userWishlist.map((product: any) => ({
                        _id: product._id || product.product?._id || `temp_${Math.random()}`,
                        product: {
                            _id: product._id,
                            name: product.name,
                            slug: product.slug,
                            price: product.price,
                            discountPrice: product.discountPrice || 0,
                            thumbnail: product.thumbnail,
                            images: product.images || [],
                            stock: product.stock || 0,
                            averageRating: product.averageRating || 0,
                            brand: product.brand || '',
                            category: product.category || { _id: '', name: 'Uncategorized', slug: '' },
                            isActive: product.isActive !== undefined ? product.isActive : true,
                            shippingCharge: product.shippingCharge || 0,
                            description: product.description || '',
                            totalReviews: product.totalReviews || 0
                        },
                        variant: null,
                        price: product.discountPrice || product.price || 0,
                        addedAt: new Date().toISOString()
                    }));
                    total = items.length;
                }
                // Check if we have data directly as an array
                else if (Array.isArray(response.data)) {
                    items = response.data.map((product: any) => ({
                        _id: product._id || `temp_${Math.random()}`,
                        product: {
                            _id: product._id,
                            name: product.name,
                            slug: product.slug,
                            price: product.price,
                            discountPrice: product.discountPrice || 0,
                            thumbnail: product.thumbnail,
                            images: product.images || [],
                            stock: product.stock || 0,
                            averageRating: product.averageRating || 0,
                            brand: product.brand || '',
                            category: product.category || { _id: '', name: 'Uncategorized', slug: '' },
                            isActive: product.isActive !== undefined ? product.isActive : true,
                            shippingCharge: product.shippingCharge || 0,
                            description: product.description || '',
                            totalReviews: product.totalReviews || 0
                        },
                        variant: null,
                        price: product.discountPrice || product.price || 0,
                        addedAt: new Date().toISOString()
                    }));
                    total = items.length;
                }
                
                setWishlistItems(items);
                setTotalItems(total);
            }
        } catch (error) {
            console.error('Error loading wishlist:', error);
            // Don't show alert for empty wishlist
            if (error instanceof Error && !error.message.includes('not found')) {
                Alert.alert('Error', 'Failed to load wishlist');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);
    
    
    // Filter and sort logic
    const filteredItems = useMemo(() => {
        let filtered = [...wishlistItems];
        
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                item => item.product.name.toLowerCase().includes(query) || 
                        item.product.category?.name?.toLowerCase().includes(query)
            );
        }
        
        // Sort by added date (newest first)
        filtered.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
        
        return filtered;
    }, [wishlistItems, searchQuery]);
    
    // Handlers
    const handleMoveToCart = useCallback(async (productId: string, variant?: string) => {
        if (actionInProgress) return;
        
        setActionInProgress(productId);
        try {
            const success = await moveToCart(productId, variant);
            if (success) {
                setWishlistItems(prev => prev.filter(item => item.product._id !== productId));
                setTotalItems(prev => prev - 1);
                Alert.alert('Success', 'Product moved to cart');
            }
        } catch (error) {
            console.error('Error moving to cart:', error);
        } finally {
            setActionInProgress(null);
        }
    }, [actionInProgress]);
    
    const handleRemoveItem = useCallback(async (productId: string, variant?: string) => {
        if (actionInProgress) return;
        
        setActionInProgress(productId);
        try {
            const success = await removeFromWishlist(productId, variant);
            if (success) {
                setWishlistItems(prev => prev.filter(item => item.product._id !== productId));
                setTotalItems(prev => prev - 1);
            }
        } catch (error) {
            console.error('Error removing item:', error);
        } finally {
            setActionInProgress(null);
        }
    }, [actionInProgress]);
    
    const handleMoveAllToCart = useCallback(async () => {
        if (wishlistItems.length === 0) return;
        
        Alert.alert(
            'Move All to Cart',
            `Are you sure you want to move all ${wishlistItems.length} items to cart?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Move All',
                    onPress: async () => {
                        setActionInProgress('all');
                        try {
                            let successCount = 0;
                            for (const item of wishlistItems) {
                                const success = await moveToCart(item.product._id, item.variant || undefined);
                                if (success) successCount++;
                            }
                            setWishlistItems([]);
                            setTotalItems(0);
                            Alert.alert('Success', `${successCount} items moved to cart`);
                        } catch (error) {
                            console.error('Error moving all to cart:', error);
                            Alert.alert('Error', 'Failed to move all items to cart');
                        } finally {
                            setActionInProgress(null);
                        }
                    }
                }
            ]
        );
    }, [wishlistItems]);
    
    const handleClearWishlist = useCallback(async () => {
        if (wishlistItems.length === 0) return;
        
        Alert.alert(
            'Clear Wishlist',
            'Are you sure you want to remove all items from your wishlist?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: async () => {
                        setActionInProgress('clear');
                        try {
                            const success = await clearWishlist();
                            if (success) {
                                setWishlistItems([]);
                                setTotalItems(0);
                                Alert.alert('Success', 'Wishlist cleared successfully');
                            }
                        } catch (error) {
                            console.error('Error clearing wishlist:', error);
                            Alert.alert('Error', 'Failed to clear wishlist');
                        } finally {
                            setActionInProgress(null);
                        }
                    }
                }
            ]
        );
    }, [wishlistItems]);
    
    const handleStartShopping = useCallback(() => {
        router.push('/');
    }, []);
    
    const handleBack = useCallback(() => {
        router.back();
    }, []);
    
    const handleCartPress = useCallback(() => {
        router.push('/CartScreen');
    }, []);
    
    const handleRefresh = useCallback(() => {
        loadWishlist(true);
    }, [loadWishlist]);
    
    const handleProductPress = useCallback((productId: string) => {
        router.push({
            pathname: '/ProductDetailsScreen',
            params: { productId }
        });
    }, []);
    
    // Render helpers
    const renderWishlistItem = useCallback(({ item, index }: ListRenderItemInfo<WishlistItem>) => (
        <TouchableOpacity 
            activeOpacity={0.9}
            onPress={() => handleProductPress(item.product._id)}
        >
            <ProductCard 
                item={item} 
                onMoveToCart={handleMoveToCart} 
                onRemove={handleRemoveItem}
                index={index}
            />
        </TouchableOpacity>
    ), [handleMoveToCart, handleRemoveItem, handleProductPress]);
    
    const keyExtractor = useCallback((item: WishlistItem) => item._id || item.product._id, []);
    
    const ListHeaderComponent = useMemo(() => (
        <>
            {/* Summary Section */}
            <Animated.View style={[styles.summarySection, headerAnimatedStyle]}>
                <View>
                    <Text style={styles.summaryTitle}>Saved Items</Text>
                    <Text style={styles.summaryCount}>{filteredItems.length} Products</Text>
                </View>
                {filteredItems.length > 0 && (
                    <View style={styles.summaryBadges}>
                        <View style={styles.summaryBadge}>
                            <Ionicons name="heart" size={14} color="#EC4899" />
                            <Text style={[styles.summaryBadgeText, { color: '#EC4899' }]}>
                                {filteredItems.length} Saved
                            </Text>
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
        </>
    ), [filteredItems.length, searchQuery, headerAnimatedStyle]);
    
    // Loading state
    if (loading && wishlistItems.length === 0) {
        return (
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
                <View style={styles.header}>
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
                <Text style={styles.headerTitle}>Wishlist</Text>
                <TouchableOpacity style={styles.headerButton} onPress={handleCartPress}>
                    <Feather name="shopping-bag" size={22} color="#0F172A" />
                    {totalItems > 0 && (
                        <View style={styles.cartBadge}>
                            <Text style={styles.cartBadgeText}>{totalItems}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>
            
            {/* Main FlatList */}
            <FlatList
                ref={flatListRef}
                data={filteredItems}
                renderItem={renderWishlistItem}
                keyExtractor={keyExtractor}
                ListHeaderComponent={ListHeaderComponent}
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
            />
            
            {/* Sticky Bottom Action Bar */}
            {filteredItems.length > 0 && (
                <Animated.View 
                    entering={FadeInUp.delay(500).springify()}
                    style={[styles.bottomBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}
                >
                    <TouchableOpacity 
                        style={styles.moveAllButton} 
                        onPress={handleMoveAllToCart}
                        disabled={actionInProgress === 'all'}
                    >
                        <Feather name="shopping-bag" size={18} color="#FFFFFF" />
                        <Text style={styles.moveAllButtonText}>
                            {actionInProgress === 'all' ? 'Moving...' : `Move All (${filteredItems.length})`}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.clearButton} 
                        onPress={handleClearWishlist}
                        disabled={actionInProgress === 'clear'}
                    >
                        <Feather name="trash-2" size={18} color="#EF4444" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.continueButton} onPress={handleStartShopping}>
                        <Text style={styles.continueButtonText}>Shop</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}
        </SafeAreaView>
    );
};

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
        backgroundColor: '#FDF2F8',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    summaryBadgeText: {
        fontSize: 12,
        fontWeight: '500',
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
        flex: 1,
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
    clearButton: {
        width: 50,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEE2E2',
        borderRadius: 14,
    },
    continueButton: {
        width: 60,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 14,
    },
    continueButtonText: {
        color: '#2563EB',
        fontSize: 13,
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