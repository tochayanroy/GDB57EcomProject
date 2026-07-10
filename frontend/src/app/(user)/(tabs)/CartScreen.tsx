// CartScreen.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    Platform,
    RefreshControl,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HORIZONTAL_CARD_WIDTH = 140;

// ============================================================================
// API CONFIGURATION
// ============================================================================

const API_BASE_URL = 'http://192.168.0.103:5000';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface CartItem {
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
        brand: string;
        isActive: boolean;
    };
    variant: string | null;
    quantity: number;
    discountPrice: number;
    shippingCharge: number;
    totalPrice: number;
    currentTotalPrice: number;
    stockAvailable: boolean;
    priceChanged: boolean;
}

interface CartSummary {
    subtotal: number;
    totalShipping: number;
    totalDiscount: number;
    grandTotal: number;
    itemCount: number;
}

interface CartResponse {
    success: boolean;
    data: {
        items: CartItem[];
        summary: CartSummary;
        unavailableRemoved: boolean;
        unavailableCount: number;
    };
}

interface CouponResponse {
    success: boolean;
    message: string;
    data: {
        couponCode: string;
        discountAmount: number;
        subtotal: number;
        grandTotal: number;
    };
}

interface UserProfile {
    _id: string;
    name: string;
    email: string;
    phone: string;
    addresses: {
        fullName: string;
        phone: string;
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    }[];
}

interface Product {
    _id: string;
    name: string;
    brand: string;
    price: number;
    discountPrice: number;
    thumbnail: string;
    images: string[];
    stock: number;
}

// ============================================================================
// API SERVICE FUNCTIONS - Following CategoriesScreen pattern
// ============================================================================

// Get Cart
const getCart = async (): Promise<CartResponse> => {
    try {
        const token = await AsyncStorage.getItem('token');
        const headers: any = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await axios.get(
            `${API_BASE_URL}/Cart/`,
            { headers }
        );

        if (response.data.success) {
            return response.data;
        } else {
            throw new Error(response.data.message || 'Failed to fetch cart');
        }
    } catch (error: any) {
        console.error('Get cart error:', error.response?.data || error.message);
        throw error;
    }
};

// Get Cart Summary
const getCartSummary = async (): Promise<{ itemCount: number; subtotal: string; cartCount: number }> => {
    try {
        const token = await AsyncStorage.getItem('token');
        const headers: any = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await axios.get(
            `${API_BASE_URL}/Cart/summary`,
            { headers }
        );

        if (response.data.success) {
            return response.data.data;
        } else {
            return { itemCount: 0, subtotal: '0', cartCount: 0 };
        }
    } catch (error: any) {
        console.error('Get cart summary error:', error.response?.data || error.message);
        return { itemCount: 0, subtotal: '0', cartCount: 0 };
    }
};

// Update Cart Item Quantity
const updateCartQuantity = async (cartItemId: string, quantity: number): Promise<{ item: CartItem; summary: CartSummary }> => {
    try {
        const token = await AsyncStorage.getItem('token');
        const headers: any = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await axios.put(
            `${API_BASE_URL}/Cart/update/${cartItemId}`,
            { quantity },
            { headers }
        );

        if (response.data.success) {
            return response.data.data;
        } else {
            throw new Error(response.data.message || 'Failed to update quantity');
        }
    } catch (error: any) {
        console.error('Update cart quantity error:', error.response?.data || error.message);
        throw error;
    }
};

// Remove Item from Cart
const removeCartItem = async (cartItemId: string): Promise<{ summary: CartSummary }> => {
    try {
        const token = await AsyncStorage.getItem('token');
        const headers: any = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await axios.delete(
            `${API_BASE_URL}/Cart/remove/${cartItemId}`,
            { headers }
        );

        if (response.data.success) {
            return response.data.data;
        } else {
            throw new Error(response.data.message || 'Failed to remove item');
        }
    } catch (error: any) {
        console.error('Remove cart item error:', error.response?.data || error.message);
        throw error;
    }
};

// Clear Cart
const clearCart = async (): Promise<{ deletedCount: number }> => {
    try {
        const token = await AsyncStorage.getItem('token');
        const headers: any = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await axios.delete(
            `${API_BASE_URL}/Cart/clear`,
            { headers }
        );

        if (response.data.success) {
            return response.data.data;
        } else {
            throw new Error(response.data.message || 'Failed to clear cart');
        }
    } catch (error: any) {
        console.error('Clear cart error:', error.response?.data || error.message);
        throw error;
    }
};

// Apply Coupon
const applyCoupon = async (couponCode: string): Promise<CouponResponse> => {
    try {
        const token = await AsyncStorage.getItem('token');
        const headers: any = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await axios.post(
            `${API_BASE_URL}/Cart/apply-coupon`,
            { couponCode },
            { headers }
        );

        if (response.data.success) {
            return response.data;
        } else {
            throw new Error(response.data.message || 'Failed to apply coupon');
        }
    } catch (error: any) {
        console.error('Apply coupon error:', error.response?.data || error.message);
        throw error;
    }
};

// Remove Coupon
const removeCoupon = async (): Promise<{ modifiedCount: number }> => {
    try {
        const token = await AsyncStorage.getItem('token');
        const headers: any = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await axios.delete(
            `${API_BASE_URL}/Cart/remove-coupon`,
            { headers }
        );

        if (response.data.success) {
            return response.data.data;
        } else {
            throw new Error(response.data.message || 'Failed to remove coupon');
        }
    } catch (error: any) {
        console.error('Remove coupon error:', error.response?.data || error.message);
        throw error;
    }
};

// Sync Prices
const syncCartPrices = async (): Promise<{ updatedCount: number; priceChanges: any[]; summary: CartSummary }> => {
    try {
        const token = await AsyncStorage.getItem('token');
        const headers: any = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await axios.put(
            `${API_BASE_URL}/Cart/sync-prices`,
            {},
            { headers }
        );

        if (response.data.success) {
            return response.data.data;
        } else {
            throw new Error(response.data.message || 'Failed to sync prices');
        }
    } catch (error: any) {
        console.error('Sync cart prices error:', error.response?.data || error.message);
        throw error;
    }
};

// Validate Cart
const validateCart = async (): Promise<{ valid: boolean; items: any[]; unavailableItems: any[]; outOfStockItems: any[]; priceChangedItems: any[] }> => {
    try {
        const token = await AsyncStorage.getItem('token');
        const headers: any = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await axios.get(
            `${API_BASE_URL}/Cart/validate`,
            { headers }
        );

        if (response.data.success) {
            return response.data.data;
        } else {
            return { valid: false, items: [], unavailableItems: [], outOfStockItems: [], priceChangedItems: [] };
        }
    } catch (error: any) {
        console.error('Validate cart error:', error.response?.data || error.message);
        return { valid: false, items: [], unavailableItems: [], outOfStockItems: [], priceChangedItems: [] };
    }
};

// Move to Wishlist
const moveToWishlist = async (cartItemId: string): Promise<{ message: string }> => {
    try {
        const token = await AsyncStorage.getItem('token');
        const headers: any = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await axios.post(
            `${API_BASE_URL}/Cart/move-to-wishlist/${cartItemId}`,
            {},
            { headers }
        );

        if (response.data.success) {
            return response.data;
        } else {
            throw new Error(response.data.message || 'Failed to move to wishlist');
        }
    } catch (error: any) {
        console.error('Move to wishlist error:', error.response?.data || error.message);
        throw error;
    }
};

// Get User Profile
const getUserProfile = async (): Promise<UserProfile> => {
    try {
        const token = await AsyncStorage.getItem('token');
        const headers: any = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await axios.get(
            `${API_BASE_URL}/User/profile`,
            { headers }
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

// Get Recommended Products
const getRecommendedProducts = async (): Promise<Product[]> => {
    try {
        const token = await AsyncStorage.getItem('token');
        const headers: any = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await axios.get(
            `${API_BASE_URL}/Product/?limit=6`,
            { headers }
        );

        if (response.data.success) {
            return response.data.data;
        } else {
            return [];
        }
    } catch (error: any) {
        console.error('Get recommended products error:', error.response?.data || error.message);
        return [];
    }
};

// ============================================================================
// CART ITEM COMPONENT
// ============================================================================

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface CartItemCardProps {
    item: CartItem;
    onQuantityChange: (id: string, newQuantity: number) => void;
    onRemove: (id: string) => void;
    onMoveToWishlist: (item: CartItem) => void;
    isUpdating: boolean;
}

const CartItemCard = React.memo(({ item, onQuantityChange, onRemove, onMoveToWishlist, isUpdating }: CartItemCardProps) => {
    const scale = useSharedValue(1);
    const product = item.product;
    const currentPrice = product.discountPrice && product.discountPrice > 0 
        ? product.discountPrice 
        : product.price;
    const originalPrice = product.price;
    const discountPercent = originalPrice > currentPrice 
        ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
        : 0;

    const handlePressIn = () => {
        scale.value = withSpring(0.98);
    };

    const handlePressOut = () => {
        scale.value = withSpring(1);
    };

    const handleDecrease = () => {
        if (item.quantity > 1) {
            onQuantityChange(item._id, item.quantity - 1);
        } else {
            onRemove(item._id);
        }
    };

    const handleIncrease = () => {
        if (product.stock > item.quantity) {
            onQuantityChange(item._id, item.quantity + 1);
        } else {
            Alert.alert('Out of Stock', 'Cannot add more than available stock');
        }
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <AnimatedTouchable
            activeOpacity={0.9}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[styles.cartItemCard, animatedStyle]}
        >
            <Image 
                source={{ uri: product.thumbnail || product.images?.[0] || 'https://via.placeholder.com/100' }} 
                style={styles.cartItemImage} 
            />
            
            <View style={styles.cartItemDetails}>
                <View style={styles.cartItemHeader}>
                    <Text style={styles.brandName}>{product.brand || 'Unbranded'}</Text>
                    {item.priceChanged && (
                        <View style={styles.priceChangedBadge}>
                            <Text style={styles.priceChangedText}>Price Changed</Text>
                        </View>
                    )}
                </View>
                
                <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                
                {item.variant && (
                    <View style={styles.variantContainer}>
                        <Text style={styles.variantText}>Variant: {item.variant}</Text>
                    </View>
                )}
                
                <View style={styles.priceContainer}>
                    <Text style={styles.currentPrice}>₹{currentPrice.toLocaleString()}</Text>
                    {discountPercent > 0 && (
                        <>
                            <Text style={styles.originalPrice}>₹{originalPrice.toLocaleString()}</Text>
                            <View style={styles.discountBadge}>
                                <Text style={styles.discountText}>{discountPercent}% OFF</Text>
                            </View>
                        </>
                    )}
                </View>
                
                <View style={styles.stockContainer}>
                    {item.stockAvailable ? (
                        product.stock <= 5 ? (
                            <Text style={styles.limitedStockText}>Only {product.stock} left in stock</Text>
                        ) : (
                            <Text style={styles.inStockText}>✓ In Stock</Text>
                        )
                    ) : (
                        <Text style={styles.outOfStockText}>Out of Stock</Text>
                    )}
                </View>
                
                <View style={styles.actionRow}>
                    <View style={styles.quantityControl}>
                        <TouchableOpacity onPress={handleDecrease} style={styles.quantityButton} activeOpacity={0.7} disabled={isUpdating}>
                            <Ionicons name="remove" size={18} color="#64748B" />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{item.quantity}</Text>
                        <TouchableOpacity onPress={handleIncrease} style={styles.quantityButton} activeOpacity={0.7} disabled={isUpdating}>
                            <Ionicons name="add" size={18} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.actionButtons}>
                        <TouchableOpacity onPress={() => onMoveToWishlist(item)} style={styles.actionButton} activeOpacity={0.7}>
                            <Feather name="heart" size={14} color="#8B5CF6" />
                            <Text style={[styles.actionButtonText, { color: '#8B5CF6' }]}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => onRemove(item._id)} style={styles.actionButton} activeOpacity={0.7}>
                            <Feather name="trash-2" size={14} color="#EF4444" />
                            <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Remove</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </AnimatedTouchable>
    );
});

CartItemCard.displayName = 'CartItemCard';

// ============================================================================
// HORIZONTAL PRODUCT CARD
// ============================================================================

interface HorizontalProductCardProps {
    item: Product;
    onPress?: (item: Product) => void;
}

const HorizontalProductCard = React.memo(({ item, onPress }: HorizontalProductCardProps) => {
    const imageUrl = item.thumbnail || item.images?.[0] || 'https://via.placeholder.com/140';
    const price = item.discountPrice || item.price;
    
    return (
        <TouchableOpacity style={styles.horizontalCard} activeOpacity={0.8} onPress={() => onPress?.(item)}>
            <Image source={{ uri: imageUrl }} style={styles.horizontalCardImage} />
            <View style={styles.horizontalCardContent}>
                <Text style={styles.horizontalCardBrand}>{item.brand || 'Unbranded'}</Text>
                <Text style={styles.horizontalCardTitle} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.horizontalCardPrice}>₹{price.toLocaleString()}</Text>
            </View>
        </TouchableOpacity>
    );
});

HorizontalProductCard.displayName = 'HorizontalProductCard';

// ============================================================================
// MAIN CART SCREEN
// ============================================================================

const CartScreen = () => {
    const router = useRouter();
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [summary, setSummary] = useState<CartSummary>({
        subtotal: 0,
        totalShipping: 0,
        totalDiscount: 0,
        grandTotal: 0,
        itemCount: 0,
    });
    const [address, setAddress] = useState<UserProfile['addresses'][0] | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [updatingItem, setUpdatingItem] = useState<string | null>(null);
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
    const [isCouponApplied, setIsCouponApplied] = useState(false);
    const [couponDiscount, setCouponDiscount] = useState(0);
    const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
    
    const flatListRef = useRef<FlatList>(null);

    // ============================================================================
    // LOAD DATA FUNCTIONS
    // ============================================================================

    const loadCartData = async () => {
        try {
            const cartResponse = await getCart();
            if (cartResponse.success) {
                setCartItems(cartResponse.data.items || []);
                setSummary(cartResponse.data.summary);
                
                if (cartResponse.data.unavailableRemoved) {
                    Alert.alert(
                        'Cart Updated',
                        `${cartResponse.data.unavailableCount} item(s) were removed as they are no longer available`
                    );
                }
            }
        } catch (error: any) {
            console.error('Load cart error:', error.response?.data || error.message);
            Alert.alert('Error', 'Failed to load cart');
        }
    };

    const loadUserAddress = async () => {
        try {
            const userResponse = await getUserProfile();
            if (userResponse.addresses && userResponse.addresses.length > 0) {
                setAddress(userResponse.addresses[0]);
            }
        } catch (error: any) {
            console.error('Load user address error:', error.response?.data || error.message);
        }
    };

    const loadRecommendedProducts = async () => {
        try {
            const products = await getRecommendedProducts();
            setRecommendedProducts(products);
        } catch (error: any) {
            console.error('Load recommended products error:', error.response?.data || error.message);
        }
    };

    const loadAllData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                loadCartData(),
                loadUserAddress(),
                loadRecommendedProducts(),
            ]);
        } catch (error: any) {
            console.error('Load all data error:', error.response?.data || error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // ============================================================================
    // HANDLER FUNCTIONS
    // ============================================================================

    const handleQuantityChange = async (cartItemId: string, newQuantity: number) => {
        try {
            setUpdatingItem(cartItemId);
            const response = await updateCartQuantity(cartItemId, newQuantity);
            setCartItems(prev => 
                prev.map(item => 
                    item._id === cartItemId 
                        ? { ...item, quantity: newQuantity, totalPrice: response.item.totalPrice }
                        : item
                )
            );
            setSummary(response.summary);
        } catch (error: any) {
            console.error('Update quantity error:', error.response?.data || error.message);
            Alert.alert('Error', 'Failed to update quantity');
        } finally {
            setUpdatingItem(null);
        }
    };

    const handleRemoveItem = (cartItemId: string) => {
        Alert.alert(
            'Remove Item',
            'Are you sure you want to remove this item from cart?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const response = await removeCartItem(cartItemId);
                            setCartItems(prev => prev.filter(item => item._id !== cartItemId));
                            setSummary(response.summary);
                        } catch (error: any) {
                            console.error('Remove item error:', error.response?.data || error.message);
                            Alert.alert('Error', 'Failed to remove item');
                        }
                    }
                }
            ]
        );
    };

    const handleMoveToWishlist = async (item: CartItem) => {
        try {
            await moveToWishlist(item._id);
            setCartItems(prev => prev.filter(i => i._id !== item._id));
            Alert.alert('Success', 'Item moved to wishlist');
            await loadCartData();
        } catch (error: any) {
            console.error('Move to wishlist error:', error.response?.data || error.message);
            Alert.alert('Error', 'Failed to move to wishlist');
        }
    };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) {
            Alert.alert('Error', 'Please enter a coupon code');
            return;
        }

        try {
            const response = await applyCoupon(couponCode.trim());
            if (response.success) {
                setAppliedCoupon(response.data.couponCode);
                setIsCouponApplied(true);
                setCouponDiscount(response.data.discountAmount);
                setSummary(prev => ({
                    ...prev,
                    grandTotal: response.data.grandTotal,
                }));
                Alert.alert('Success', `Coupon ${response.data.couponCode} applied!`);
                setCouponCode('');
            }
        } catch (error: any) {
            console.error('Apply coupon error:', error.response?.data || error.message);
            Alert.alert('Error', 'Invalid or expired coupon code');
        }
    };

    const handleRemoveCoupon = async () => {
        try {
            await removeCoupon();
            setAppliedCoupon(null);
            setIsCouponApplied(false);
            setCouponDiscount(0);
            await loadCartData();
            Alert.alert('Removed', 'Coupon removed successfully');
        } catch (error: any) {
            console.error('Remove coupon error:', error.response?.data || error.message);
            Alert.alert('Error', 'Failed to remove coupon');
        }
    };

    const handleSyncPrices = async () => {
        try {
            const response = await syncCartPrices();
            setSummary(response.summary);
            if (response.updatedCount > 0) {
                Alert.alert('Prices Updated', `${response.updatedCount} item(s) prices updated`);
            }
            await loadCartData();
        } catch (error: any) {
            console.error('Sync prices error:', error.response?.data || error.message);
            Alert.alert('Error', 'Failed to sync prices');
        }
    };

    const handleCheckout = () => {
        if (cartItems.length === 0) {
            Alert.alert('Error', 'Your cart is empty');
            return;
        }
        router.push('/payment');
    };

    const handleContinueShopping = () => {
        router.push('/');
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadAllData();
    };

    const handleProductPress = (product: Product) => {
        router.push(`/product/${product._id}`);
    };

    // ============================================================================
    // USE EFFECTS
    // ============================================================================

    useFocusEffect(
        useCallback(() => {
            loadAllData();
        }, [])
    );

    // ============================================================================
    // RENDER FUNCTIONS
    // ============================================================================

    const renderCartItem = useCallback(({ item }: { item: CartItem }) => (
        <CartItemCard
            item={item}
            onQuantityChange={handleQuantityChange}
            onRemove={handleRemoveItem}
            onMoveToWishlist={handleMoveToWishlist}
            isUpdating={updatingItem === item._id}
        />
    ), [handleQuantityChange, handleRemoveItem, handleMoveToWishlist, updatingItem]);

    const renderRecommendedItem = useCallback(({ item }: { item: Product }) => (
        <HorizontalProductCard 
            item={item} 
            onPress={handleProductPress}
        />
    ), []);

    const keyExtractor = useCallback((item: any) => item._id, []);

    // ============================================================================
    // LOADING STATE
    // ============================================================================

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={24} color="#0F172A" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Cart</Text>
                    <View style={styles.wishlistButton} />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={styles.loadingText}>Loading your cart...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // ============================================================================
    // EMPTY STATE
    // ============================================================================

    if (cartItems.length === 0) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={24} color="#0F172A" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Cart</Text>
                    <TouchableOpacity style={styles.wishlistButton} onPress={() => router.push('/wishlist')} activeOpacity={0.7}>
                        <Ionicons name="heart-outline" size={24} color="#0F172A" />
                    </TouchableOpacity>
                </View>
                
                <Animated.View entering={FadeInUp.duration(500)} style={styles.emptyStateContainer}>
                    <View style={styles.emptyStateIconContainer}>
                        <Feather name="shopping-bag" size={80} color="#CBD5E1" />
                    </View>
                    <Text style={styles.emptyStateTitle}>Your Cart is Empty</Text>
                    <Text style={styles.emptyStateDescription}>
                        Looks like you haven't added anything yet.
                    </Text>
                    <TouchableOpacity style={styles.continueShoppingButton} onPress={handleContinueShopping} activeOpacity={0.8}>
                        <Text style={styles.continueShoppingText}>Continue Shopping</Text>
                    </TouchableOpacity>
                </Animated.View>
            </SafeAreaView>
        );
    }

    const totalSavings = summary.totalDiscount || 0;
    const grandTotal = summary.grandTotal || 0;
    const shippingFee = summary.totalShipping || 0;

    // ============================================================================
    // MAIN RENDER
    // ============================================================================

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
            
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Cart ({summary.itemCount})</Text>
                <TouchableOpacity style={styles.wishlistButton} onPress={() => router.push('/wishlist')} activeOpacity={0.7}>
                    <Ionicons name="heart-outline" size={24} color="#0F172A" />
                </TouchableOpacity>
            </View>
            
            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
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
                {/* Cart Summary Card */}
                <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryText}>{cartItems.length} Items in Cart</Text>
                        <TouchableOpacity onPress={handleSyncPrices}>
                            <Text style={styles.syncPricesText}>↻ Sync Prices</Text>
                        </TouchableOpacity>
                    </View>
                    {totalSavings > 0 && (
                        <View style={styles.savingsContainer}>
                            <Feather name="gift" size={14} color="#22C55E" />
                            <Text style={styles.savingsText}>You're saving ₹{totalSavings.toLocaleString()}</Text>
                        </View>
                    )}
                </Animated.View>
                
                {/* Delivery Address */}
                {address && (
                    <Animated.View entering={FadeInUp.duration(400).delay(150)} style={styles.addressCard}>
                        <View style={styles.addressHeader}>
                            <Feather name="map-pin" size={18} color="#2563EB" />
                            <Text style={styles.addressHeaderText}>Deliver To</Text>
                        </View>
                        <View style={styles.addressContent}>
                            <Text style={styles.addressName}>{address.fullName}</Text>
                            <Text style={styles.addressLine}>
                                {address.street}, {address.city}, {address.state} - {address.zipCode}
                            </Text>
                            <Text style={styles.addressPhone}>{address.phone}</Text>
                        </View>
                        <TouchableOpacity style={styles.changeAddressButton} onPress={() => router.push('/address')} activeOpacity={0.7}>
                            <Text style={styles.changeAddressText}>Change</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}
                
                {/* Cart Items */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Cart Items</Text>
                    {cartItems.map((item) => (
                        <CartItemCard
                            key={item._id}
                            item={item}
                            onQuantityChange={handleQuantityChange}
                            onRemove={handleRemoveItem}
                            onMoveToWishlist={handleMoveToWishlist}
                            isUpdating={updatingItem === item._id}
                        />
                    ))}
                </View>
                
                {/* Coupon Section */}
                <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.couponCard}>
                    <Text style={styles.couponHeader}>Apply Coupon</Text>
                    
                    {!isCouponApplied ? (
                        <View style={styles.couponInputContainer}>
                            <TextInput
                                style={styles.couponInput}
                                placeholder="Enter coupon code"
                                placeholderTextColor="#94A3B8"
                                value={couponCode}
                                onChangeText={setCouponCode}
                                autoCapitalize="characters"
                            />
                            <TouchableOpacity style={styles.applyButton} onPress={handleApplyCoupon} activeOpacity={0.7}>
                                <Text style={styles.applyButtonText}>Apply</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.appliedCouponContainer}>
                            <View style={styles.appliedCouponInfo}>
                                <MaterialIcons name="local-offer" size={20} color="#8B5CF6" />
                                <Text style={styles.appliedCouponCode}>{appliedCoupon}</Text>
                                <Text style={styles.appliedCouponDiscount}>
                                    -₹{couponDiscount.toLocaleString()}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={handleRemoveCoupon} activeOpacity={0.7}>
                                <Feather name="x" size={18} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                    )}
                </Animated.View>
                
                {/* Order Summary */}
                <Animated.View entering={FadeInUp.duration(400).delay(300)} style={styles.orderSummaryCard}>
                    <Text style={styles.orderSummaryHeader}>Order Summary</Text>
                    
                    <View style={styles.summaryRowItem}>
                        <Text style={styles.summaryLabel}>Subtotal</Text>
                        <Text style={styles.summaryValue}>₹{summary.subtotal?.toLocaleString() || 0}</Text>
                    </View>
                    
                    {totalSavings > 0 && (
                        <View style={styles.summaryRowItem}>
                            <Text style={[styles.summaryLabel, styles.discountLabel]}>Discount</Text>
                            <Text style={[styles.summaryValue, styles.discountValue]}>-₹{totalSavings.toLocaleString()}</Text>
                        </View>
                    )}
                    
                    <View style={styles.summaryRowItem}>
                        <Text style={styles.summaryLabel}>Shipping Fee</Text>
                        <Text style={styles.summaryValue}>
                            {shippingFee === 0 ? 'Free' : `₹${shippingFee.toLocaleString()}`}
                        </Text>
                    </View>
                    
                    {couponDiscount > 0 && (
                        <View style={styles.summaryRowItem}>
                            <Text style={[styles.summaryLabel, styles.couponLabel]}>Coupon Discount</Text>
                            <Text style={[styles.summaryValue, styles.couponValue]}>-₹{couponDiscount.toLocaleString()}</Text>
                        </View>
                    )}
                    
                    <View style={styles.divider} />
                    
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total Amount</Text>
                        <Text style={styles.totalValue}>₹{grandTotal.toLocaleString()}</Text>
                    </View>
                </Animated.View>
                
                {/* Recommended Products */}
                {recommendedProducts.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>You May Also Like</Text>
                        <FlatList
                            data={recommendedProducts}
                            renderItem={renderRecommendedItem}
                            keyExtractor={(item) => item._id}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.horizontalListContent}
                            removeClippedSubviews={Platform.OS === 'android'}
                        />
                    </View>
                )}
                
                <View style={styles.bottomPadding} />
            </Animated.ScrollView>
            
            {/* Sticky Checkout Bar */}
            <Animated.View
                entering={FadeInUp.duration(400)}
                style={styles.checkoutBar}
            >
                <View style={styles.checkoutContent}>
                    <View>
                        <Text style={styles.checkoutTotalLabel}>Total Amount</Text>
                        <Text style={styles.checkoutTotalPrice}>₹{grandTotal.toLocaleString()}</Text>
                    </View>
                    <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout} activeOpacity={0.8}>
                        <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
                        <Feather name="arrow-right" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </Animated.View>
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
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
    },
    wishlistButton: {
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
    scrollContent: {
        paddingBottom: 100,
    },
    summaryCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginTop: 16,
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    summaryText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0F172A',
    },
    syncPricesText: {
        fontSize: 12,
        color: '#2563EB',
        fontWeight: '500',
    },
    savingsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F0FDF4',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    savingsText: {
        fontSize: 12,
        color: '#22C55E',
        fontWeight: '500',
    },
    addressCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginTop: 12,
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    addressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    addressHeaderText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2563EB',
    },
    addressContent: {
        marginBottom: 12,
    },
    addressName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0F172A',
        marginBottom: 4,
    },
    addressLine: {
        fontSize: 13,
        color: '#64748B',
        marginBottom: 2,
    },
    addressPhone: {
        fontSize: 13,
        color: '#64748B',
    },
    changeAddressButton: {
        alignSelf: 'flex-start',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#2563EB',
    },
    changeAddressText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#2563EB',
    },
    sectionContainer: {
        marginTop: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#0F172A',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    cartItemCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 12,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    cartItemImage: {
        width: 100,
        height: 120,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
    },
    cartItemDetails: {
        flex: 1,
        marginLeft: 12,
    },
    cartItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    brandName: {
        fontSize: 12,
        fontWeight: '500',
        color: '#64748B',
    },
    priceChangedBadge: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    priceChangedText: {
        fontSize: 8,
        color: '#F59E0B',
        fontWeight: '500',
    },
    productName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0F172A',
        marginBottom: 4,
    },
    variantContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 6,
    },
    variantText: {
        fontSize: 11,
        color: '#64748B',
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 6,
    },
    currentPrice: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
    },
    originalPrice: {
        fontSize: 12,
        color: '#94A3B8',
        textDecorationLine: 'line-through',
    },
    discountBadge: {
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 12,
    },
    discountText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#EF4444',
    },
    stockContainer: {
        marginBottom: 8,
    },
    inStockText: {
        fontSize: 11,
        color: '#22C55E',
        fontWeight: '500',
    },
    limitedStockText: {
        fontSize: 11,
        color: '#F59E0B',
        fontWeight: '500',
    },
    outOfStockText: {
        fontSize: 11,
        color: '#EF4444',
        fontWeight: '500',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    quantityControl: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 24,
        paddingHorizontal: 4,
    },
    quantityButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quantityText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0F172A',
        minWidth: 28,
        textAlign: 'center',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    actionButtonText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
    },
    horizontalListContent: {
        paddingLeft: 16,
        paddingRight: 8,
        gap: 12,
    },
    horizontalCard: {
        width: HORIZONTAL_CARD_WIDTH,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
        overflow: 'hidden',
    },
    horizontalCardImage: {
        width: HORIZONTAL_CARD_WIDTH,
        height: 120,
        backgroundColor: '#F1F5F9',
    },
    horizontalCardContent: {
        padding: 10,
    },
    horizontalCardBrand: {
        fontSize: 10,
        color: '#64748B',
        marginBottom: 2,
    },
    horizontalCardTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#0F172A',
        marginBottom: 4,
    },
    horizontalCardPrice: {
        fontSize: 14,
        fontWeight: '700',
        color: '#2563EB',
    },
    couponCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginTop: 16,
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    couponHeader: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0F172A',
        marginBottom: 12,
    },
    couponInputContainer: {
        flexDirection: 'row',
        gap: 10,
    },
    couponInput: {
        flex: 1,
        height: 44,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 14,
        fontSize: 14,
        color: '#0F172A',
        backgroundColor: '#F8FAFC',
    },
    applyButton: {
        backgroundColor: '#2563EB',
        paddingHorizontal: 20,
        borderRadius: 12,
        justifyContent: 'center',
    },
    applyButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    appliedCouponContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F3E8FF',
        padding: 12,
        borderRadius: 12,
    },
    appliedCouponInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    appliedCouponCode: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8B5CF6',
    },
    appliedCouponDiscount: {
        fontSize: 12,
        color: '#8B5CF6',
        fontWeight: '500',
    },
    orderSummaryCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginTop: 16,
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    orderSummaryHeader: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
        marginBottom: 12,
    },
    summaryRowItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    summaryLabel: {
        fontSize: 14,
        color: '#64748B',
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#0F172A',
    },
    discountLabel: {
        color: '#22C55E',
    },
    discountValue: {
        color: '#22C55E',
    },
    couponLabel: {
        color: '#8B5CF6',
    },
    couponValue: {
        color: '#8B5CF6',
    },
    divider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 12,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
    },
    totalValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#2563EB',
    },
    bottomPadding: {
        height: 20,
    },
    checkoutBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 28 : 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 8,
    },
    checkoutContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    checkoutTotalLabel: {
        fontSize: 12,
        color: '#64748B',
    },
    checkoutTotalPrice: {
        fontSize: 20,
        fontWeight: '700',
        color: '#2563EB',
    },
    checkoutButton: {
        backgroundColor: '#2563EB',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 40,
        gap: 8,
    },
    checkoutButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    emptyStateContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingTop: SCREEN_HEIGHT * 0.15,
    },
    emptyStateIconContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyStateTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 8,
    },
    emptyStateDescription: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 32,
    },
    continueShoppingButton: {
        backgroundColor: '#2563EB',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 40,
    },
    continueShoppingText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default CartScreen;