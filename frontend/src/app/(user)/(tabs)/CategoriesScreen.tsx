import { Feather, FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
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
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StatusBar,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// API CONFIGURATION
// ============================================================================

const API_BASE_URL = 'http://192.168.0.103:5000';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Category {
    _id: string;
    name: string;
    slug: string;
    description?: string;
    image?: string;
    icon?: string;
    isActive: boolean;
    productCount: number;
    isPopular?: boolean;
    isFeatured?: boolean;
}

interface Brand {
    _id: string;
    name: string;
    logo: string;
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
    category: string;
}

// ============================================================================
// API SERVICE FUNCTIONS - Following Login/Register pattern
// ============================================================================

// Get All Categories
const getCategories = async (params?: {
    isActive?: boolean;
    search?: string;
    limit?: number;
    page?: number;
}): Promise<Category[]> => {
    try {
        const token = await AsyncStorage.getItem('token');
        const headers: any = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const queryParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    queryParams.append(key, String(value));
                }
            });
        }

        const response = await axios.get(
            `${API_BASE_URL}/Category/?${queryParams.toString()}`,
            { headers }
        );

        if (response.data.success && response.data.data) {
            return response.data.data;
        } else {
            return [];
        }
    } catch (error: any) {
        console.error('Get categories error:', error.response?.data || error.message);
        return [];
    }
};

// Get Category by ID
const getCategoryById = async (id: string): Promise<Category | null> => {
    try {
        const token = await AsyncStorage.getItem('token');
        const headers: any = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await axios.get(
            `${API_BASE_URL}/Category/${id}`,
            { headers }
        );

        if (response.data.success && response.data.data) {
            return response.data.data;
        } else {
            return null;
        }
    } catch (error: any) {
        console.error('Get category by ID error:', error.response?.data || error.message);
        return null;
    }
};

// Get Category Products
const getCategoryProducts = async (id: string, params?: {
    page?: number;
    limit?: number;
    sort?: string;
}): Promise<Product[]> => {
    try {
        const token = await AsyncStorage.getItem('token');
        const headers: any = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const queryParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    queryParams.append(key, String(value));
                }
            });
        }

        const response = await axios.get(
            `${API_BASE_URL}/Category/${id}/products?${queryParams.toString()}`,
            { headers }
        );

        if (response.data.success && response.data.data) {
            return response.data.data;
        } else {
            return [];
        }
    } catch (error: any) {
        console.error('Get category products error:', error.response?.data || error.message);
        return [];
    }
};

// Get All Brands
const getBrands = async (): Promise<Brand[]> => {
    try {
        const token = await AsyncStorage.getItem('token');
        const headers: any = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Try to get brands from products endpoint
        const response = await axios.get(
            `${API_BASE_URL}/Product/`,
            { headers }
        );

        if (response.data.success && response.data.data) {
            // Extract unique brands from products
            const products = response.data.data;
            const brandMap = new Map();
            
            products.forEach((product: any) => {
                if (product.brand && !brandMap.has(product.brand)) {
                    brandMap.set(product.brand, {
                        _id: product.brand.toLowerCase().replace(/\s+/g, '-'),
                        name: product.brand,
                        logo: product.image || 'https://via.placeholder.com/60',
                        productCount: 1
                    });
                } else if (product.brand && brandMap.has(product.brand)) {
                    const existing = brandMap.get(product.brand);
                    existing.productCount = (existing.productCount || 0) + 1;
                }
            });

            return Array.from(brandMap.values());
        } else {
            return [];
        }
    } catch (error: any) {
        console.error('Get brands error:', error.response?.data || error.message);
        return [];
    }
};

// Get Featured Categories
const getFeaturedCategories = async (): Promise<Category[]> => {
    try {
        const categories = await getCategories({ isActive: true, limit: 100 });
        return categories.filter(c => c.isFeatured === true).slice(0, 5);
    } catch (error: any) {
        console.error('Get featured categories error:', error.response?.data || error.message);
        return [];
    }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getCategoryIcon = (name: string): string => {
    const iconMap: Record<string, string> = {
        'fashion': 'tshirt',
        'electronics': 'laptop',
        'shoes': 'shoe-prints',
        'beauty': 'spa',
        'groceries': 'shopping-basket',
        'furniture': 'couch',
        'watches': 'watch',
        'sports': 'sports-soccer',
        'books': 'book',
        'toys': 'robot',
        'home decor': 'home',
        'automotive': 'car',
        'jewelry': 'gem',
        'kids': 'child-care',
        'pets': 'pets',
        'office supplies': 'briefcase',
    };
    return iconMap[name.toLowerCase()] || 'tag';
};

const getIconComponent = (iconName: string, size: number = 22, color: string = '#2563EB') => {
    const iconMap: Record<string, React.ReactNode> = {
        'tshirt': <Ionicons name="shirt-outline" size={size} color={color} />,
        'laptop': <Ionicons name="laptop-outline" size={size} color={color} />,
        'shoe-prints': <FontAwesome5 name="shoe-prints" size={size - 2} color={color} />,
        'spa': <MaterialIcons name="spa" size={size} color={color} />,
        'shopping-basket': <Feather name="shopping-bag" size={size - 2} color={color} />,
        'couch': <MaterialIcons name="weekend" size={size} color={color} />,
        'watch': <FontAwesome5 name="clock" size={size - 2} color={color} />,
        'sports-soccer': <MaterialIcons name="sports-soccer" size={size} color={color} />,
        'book': <Feather name="book-open" size={size - 2} color={color} />,
        'robot': <FontAwesome5 name="robot" size={size - 2} color={color} />,
        'home': <Feather name="home" size={size - 2} color={color} />,
        'car': <FontAwesome5 name="car" size={size - 2} color={color} />,
        'gem': <FontAwesome5 name="gem" size={size - 2} color={color} />,
        'child-care': <MaterialIcons name="child-care" size={size} color={color} />,
        'pets': <MaterialIcons name="pets" size={size} color={color} />,
        'briefcase': <Feather name="briefcase" size={size - 2} color={color} />,
    };
    return iconMap[iconName] || <Feather name="tag" size={size - 2} color={color} />;
};

// ============================================================================
// REUSABLE COMPONENTS
// ============================================================================

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface CategoryCardProps {
    category: Category;
    onPress: (category: Category) => void;
    index: number;
}

const CategoryCard = React.memo(({ category, onPress, index }: CategoryCardProps) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    };

    const imageUrl = category.image || 'https://via.placeholder.com/200';

    return (
        <AnimatedTouchable
            entering={FadeInUp.delay(index * 50).duration(400).springify().damping(15)}
            style={[styles.categoryCard, animatedStyle]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={() => onPress(category)}
            activeOpacity={0.9}
        >
            <Image source={{ uri: imageUrl }} style={styles.categoryImage} />
            <View style={styles.categoryOverlay}>
                <View style={styles.categoryIconContainer}>
                    {getIconComponent(getCategoryIcon(category.name), 22, '#2563EB')}
                </View>
                <Text style={styles.categoryName} numberOfLines={1}>
                    {category.name}
                </Text>
                <Text style={styles.categoryProductCount}>{category.productCount?.toLocaleString() || 0}+ Products</Text>
                <Feather name="chevron-right" size={18} color="#64748B" style={styles.categoryArrow} />
            </View>
        </AnimatedTouchable>
    );
});

interface HorizontalCategoryCardProps {
    category: Category;
    onPress: (category: Category) => void;
}

const HorizontalCategoryCard = React.memo(({ category, onPress }: HorizontalCategoryCardProps) => {
    const imageUrl = category.image || 'https://via.placeholder.com/110';

    return (
        <TouchableOpacity style={styles.horizontalCategoryCard} onPress={() => onPress(category)} activeOpacity={0.8}>
            <Image source={{ uri: imageUrl }} style={styles.horizontalCategoryImage} />
            <Text style={styles.horizontalCategoryName}>{category.name}</Text>
            <Text style={styles.horizontalCategoryCount}>{category.productCount?.toLocaleString() || 0}+</Text>
        </TouchableOpacity>
    );
});

interface BrandCardProps {
    brand: Brand;
    onPress: (brand: Brand) => void;
}

const BrandCard = React.memo(({ brand, onPress }: BrandCardProps) => {
    const logoUrl = brand.logo || 'https://via.placeholder.com/60';

    return (
        <TouchableOpacity style={styles.brandCard} onPress={() => onPress(brand)} activeOpacity={0.7}>
            <Image source={{ uri: logoUrl }} style={styles.brandLogo} />
            <Text style={styles.brandName}>{brand.name}</Text>
            {brand.productCount && <Text style={styles.brandProductCount}>{brand.productCount}+ Products</Text>}
        </TouchableOpacity>
    );
});

// ============================================================================
// MAIN CATEGORIES SCREEN
// ============================================================================

const CategoriesScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const [searchQuery, setSearchQuery] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
    const [popularCategories, setPopularCategories] = useState<Category[]>([]);
    const [featuredCategory, setFeaturedCategory] = useState<Category | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchResults, setSearchResults] = useState<Category[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [brands, setBrands] = useState<Brand[]>([]);

    const scrollViewRef = useRef<ScrollView>(null);
    const searchRef = useRef<TextInput>(null);

    // ============================================================================
    // LOAD DATA FUNCTIONS
    // ============================================================================

    const loadCategories = async () => {
        try {
            const categoriesData = await getCategories({ isActive: true, limit: 100 });
            setCategories(categoriesData || []);
            setFilteredCategories(categoriesData || []);

            // Set popular categories (those with productCount > 500 or isPopular)
            const popular = (categoriesData || [])
                .filter(c => (c.productCount || 0) > 500 || c.isPopular)
                .slice(0, 6);
            setPopularCategories(popular.length > 0 ? popular : (categoriesData || []).slice(0, 6));

            // Set featured category
            const featured = (categoriesData || []).find(c => c.isFeatured) || (categoriesData || [])[0];
            setFeaturedCategory(featured || null);
        } catch (error: any) {
            console.error('Load categories error:', error.response?.data || error.message);
            setCategories([]);
            setFilteredCategories([]);
            setPopularCategories([]);
            Alert.alert('Error', 'Failed to load categories. Please try again.');
        }
    };

    const loadBrands = async () => {
        try {
            const brandsData = await getBrands();
            setBrands(brandsData || []);
        } catch (error: any) {
            console.error('Load brands error:', error.response?.data || error.message);
            setBrands([]);
        }
    };

    const loadAllData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                loadCategories(),
                loadBrands(),
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

    const handleSearch = async (text: string) => {
        setSearchQuery(text);

        if (text.trim()) {
            try {
                setIsSearching(true);
                const results = await getCategories({
                    search: text,
                    isActive: true,
                    limit: 20
                });
                setSearchResults(results || []);
            } catch (error: any) {
                console.error('Search error:', error.response?.data || error.message);
                // Fallback to local search
                const filtered = (categories || []).filter(cat =>
                    cat.name.toLowerCase().includes(text.toLowerCase())
                );
                setSearchResults(filtered);
            } finally {
                setIsSearching(false);
            }
        } else {
            setSearchResults([]);
            setFilteredCategories(categories);
        }
    };

    const handleCategoryPress = (category: Category) => {
        router.push({
            pathname: '/category-products',
            params: {
                categoryId: category._id,
                categoryName: category.name
            }
        });
    };

    const handleBrandPress = (brand: Brand) => {
        router.push({
            pathname: '/brand-products',
            params: {
                brandId: brand._id,
                brandName: brand.name
            }
        });
    };

    const handleBackPress = () => {
        router.back();
    };

    const handleSearchPress = () => {
        searchRef.current?.focus();
    };

    const handleVoiceSearch = () => {
        Alert.alert('Voice Search', 'Voice search feature coming soon!');
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadAllData();
    };

    const handleSeeAllPopular = () => {
        router.push('/popular-categories');
    };

    const handleSeeAllBrands = () => {
        router.push('/brands');
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

    const renderCategoryGridItem = useCallback(({ item, index }: { item: Category; index: number }) => (
        <CategoryCard category={item} onPress={handleCategoryPress} index={index} />
    ), [handleCategoryPress]);

    const renderPopularCategoryItem = useCallback(({ item }: { item: Category }) => (
        <HorizontalCategoryCard category={item} onPress={handleCategoryPress} />
    ), [handleCategoryPress]);

    const renderBrandItem = useCallback(({ item }: { item: Brand }) => (
        <BrandCard brand={item} onPress={handleBrandPress} />
    ), [handleBrandPress]);

    // ============================================================================
    // LOADING STATE
    // ============================================================================

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={styles.loadingText}>Loading categories...</Text>
                </View>
            </SafeAreaView>
        );
    }

    const showSearchResults = searchQuery.trim().length > 0;
    const displayCategories = showSearchResults ? searchResults : filteredCategories;

    // ============================================================================
    // MAIN RENDER
    // ============================================================================

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

            <ScrollView
                ref={scrollViewRef}
                style={styles.container}
                showsVerticalScrollIndicator={false}
                bounces={true}
                overScrollMode="never"
                removeClippedSubviews={true}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={['#2563EB']}
                        tintColor="#2563EB"
                    />
                }
            >
                {/* Header */}
                <Animated.View entering={FadeInDown.duration(400).springify()} style={[styles.header, { paddingTop: insets.top > 0 ? 0 : 8 }]}>
                    <TouchableOpacity style={styles.headerButton} onPress={handleBackPress} activeOpacity={0.7}>
                        <Ionicons name="chevron-back" size={24} color="#0F172A" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Categories</Text>
                    <TouchableOpacity style={styles.headerButton} onPress={handleSearchPress} activeOpacity={0.7}>
                        <Feather name="search" size={22} color="#0F172A" />
                    </TouchableOpacity>
                </Animated.View>

                {/* Search Section */}
                <Animated.View entering={FadeInDown.delay(100).duration(400).springify()} style={styles.searchSection}>
                    <View style={styles.searchContainer}>
                        <Feather name="search" size={20} color="#64748B" style={styles.searchIcon} />
                        <TextInput
                            ref={searchRef}
                            style={styles.searchInput}
                            placeholder="Search categories..."
                            placeholderTextColor="#94A3B8"
                            value={searchQuery}
                            onChangeText={handleSearch}
                            returnKeyType="search"
                            clearButtonMode="while-editing"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => handleSearch('')} style={styles.searchClear}>
                                <Feather name="x" size={18} color="#64748B" />
                            </TouchableOpacity>
                        )}
                    </View>
                    <TouchableOpacity style={styles.voiceButton} onPress={handleVoiceSearch} activeOpacity={0.7}>
                        <Feather name="mic" size={20} color="#2563EB" />
                    </TouchableOpacity>
                </Animated.View>

                {!showSearchResults && (
                    <>
                        {/* Featured Category Banner */}
                        {featuredCategory && (
                            <Animated.View entering={FadeInDown.delay(200).duration(400).springify()} style={styles.featuredSection}>
                                <TouchableOpacity
                                    style={styles.featuredCard}
                                    onPress={() => handleCategoryPress(featuredCategory)}
                                    activeOpacity={0.95}
                                >
                                    <Image
                                        source={{ uri: featuredCategory.image || 'https://via.placeholder.com/400' }}
                                        style={styles.featuredImage}
                                    />
                                    <View style={styles.featuredOverlay}>
                                        <View style={styles.featuredBadgeContainer}>
                                            <Text style={styles.featuredBadge}>
                                                {featuredCategory.productCount > 1000 ? '🔥 Popular' : '✨ Featured'}
                                            </Text>
                                        </View>
                                        <Text style={styles.featuredTitle}>{featuredCategory.name} Collection</Text>
                                        <Text style={styles.featuredSubtitle}>
                                            Discover {featuredCategory.productCount?.toLocaleString() || 0}+ products
                                        </Text>
                                        <View style={styles.featuredButton}>
                                            <Text style={styles.featuredButtonText}>Explore Now</Text>
                                            <Feather name="arrow-right" size={16} color="white" />
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>
                        )}

                        {/* Popular Categories */}
                        {popularCategories.length > 0 && (
                            <>
                                <View style={styles.sectionHeader}>
                                    <View>
                                        <Text style={styles.sectionTitle}>Trending 🔥</Text>
                                        <Text style={styles.sectionSubtitle}>What's hot right now</Text>
                                    </View>
                                    <TouchableOpacity onPress={handleSeeAllPopular}>
                                        <Text style={styles.seeAllText}>See All</Text>
                                    </TouchableOpacity>
                                </View>
                                <FlatList
                                    data={popularCategories}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    keyExtractor={(item) => item._id}
                                    renderItem={renderPopularCategoryItem}
                                    contentContainerStyle={styles.popularList}
                                    snapToInterval={120}
                                    decelerationRate="fast"
                                    removeClippedSubviews={true}
                                    initialNumToRender={4}
                                    maxToRenderPerBatch={4}
                                    windowSize={5}
                                />
                            </>
                        )}

                        {/* All Categories Section */}
                        <View style={styles.sectionHeader}>
                            <View>
                                <Text style={styles.sectionTitle}>All Categories</Text>
                                <Text style={styles.sectionSubtitle}>{(displayCategories || []).length} Categories Available</Text>
                            </View>
                        </View>

                        {displayCategories && displayCategories.length > 0 ? (
                            <FlatList
                                data={displayCategories}
                                keyExtractor={(item) => item._id}
                                renderItem={renderCategoryGridItem}
                                numColumns={2}
                                scrollEnabled={false}
                                contentContainerStyle={styles.categoriesGrid}
                                columnWrapperStyle={styles.categoriesRow}
                                removeClippedSubviews={true}
                                initialNumToRender={8}
                                maxToRenderPerBatch={6}
                            />
                        ) : (
                            <View style={styles.emptyState}>
                                <Feather name="folder" size={64} color="#CBD5E1" />
                                <Text style={styles.emptyStateTitle}>No Categories Available</Text>
                                <Text style={styles.emptyStateSubtitle}>Check back later for new categories</Text>
                            </View>
                        )}

                        {/* Top Brands Section */}
                        {brands.length > 0 && (
                            <>
                                <View style={styles.sectionHeader}>
                                    <View>
                                        <Text style={styles.sectionTitle}>Top Brands</Text>
                                        <Text style={styles.sectionSubtitle}>Shop from premium brands</Text>
                                    </View>
                                    <TouchableOpacity onPress={handleSeeAllBrands}>
                                        <Text style={styles.seeAllText}>See All</Text>
                                    </TouchableOpacity>
                                </View>
                                <FlatList
                                    data={brands}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    keyExtractor={(item) => item._id}
                                    renderItem={renderBrandItem}
                                    contentContainerStyle={styles.brandsList}
                                    snapToInterval={110}
                                    decelerationRate="fast"
                                    removeClippedSubviews={true}
                                    initialNumToRender={6}
                                />
                            </>
                        )}
                    </>
                )}

                {/* Search Results */}
                {showSearchResults && (
                    <>
                        {isSearching ? (
                            <View style={styles.searchLoadingContainer}>
                                <ActivityIndicator size="small" color="#2563EB" />
                                <Text style={styles.searchLoadingText}>Searching...</Text>
                            </View>
                        ) : (searchResults || []).length === 0 ? (
                            <View style={styles.emptyState}>
                                <Feather name="search" size={64} color="#CBD5E1" />
                                <Text style={styles.emptyStateTitle}>No categories found</Text>
                                <Text style={styles.emptyStateSubtitle}>Try searching with different keywords</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={searchResults}
                                keyExtractor={(item) => item._id}
                                renderItem={({ item, index }) => (
                                    <Animated.View entering={FadeInUp.delay(index * 50).duration(300)}>
                                        <TouchableOpacity
                                            style={styles.searchResultItem}
                                            onPress={() => handleCategoryPress(item)}
                                        >
                                            <Image
                                                source={{ uri: item.image || 'https://via.placeholder.com/60' }}
                                                style={styles.searchResultImage}
                                            />
                                            <View style={styles.searchResultInfo}>
                                                <Text style={styles.searchResultName}>{item.name}</Text>
                                                <Text style={styles.searchResultCount}>
                                                    {item.productCount?.toLocaleString() || 0} products
                                                </Text>
                                            </View>
                                            <Feather name="chevron-right" size={20} color="#CBD5E1" />
                                        </TouchableOpacity>
                                    </Animated.View>
                                )}
                                scrollEnabled={true}
                                contentContainerStyle={styles.searchResultsList}
                                removeClippedSubviews={true}
                            />
                        )}
                    </>
                )}

                {/* Bottom Spacing */}
                <View style={{ height: insets.bottom + 20 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

// ============================================================================
// STYLES
// ============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 16;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_GAP * 3) / 2;

const styles: any = {
    safeArea: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
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
        letterSpacing: -0.3,
    },
    searchSection: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 8,
        marginBottom: 16,
        gap: 12,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        paddingHorizontal: 16,
        height: 52,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#0F172A',
        paddingVertical: 12,
    },
    searchClear: {
        padding: 4,
    },
    voiceButton: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    featuredSection: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    featuredCard: {
        borderRadius: 24,
        overflow: 'hidden',
        height: 220,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    featuredImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    featuredOverlay: {
        flex: 1,
        padding: 20,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    featuredBadgeContainer: {
        marginBottom: 8,
    },
    featuredBadge: {
        fontSize: 12,
        fontWeight: '600',
        color: '#22C55E',
        backgroundColor: 'rgba(255,255,255,0.95)',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        overflow: 'hidden',
    },
    featuredTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    featuredSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 16,
    },
    featuredButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#2563EB',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 30,
        alignSelf: 'flex-start',
    },
    featuredButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingHorizontal: 20,
        marginTop: 24,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
        letterSpacing: -0.3,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 2,
    },
    seeAllText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#2563EB',
    },
    popularList: {
        paddingLeft: 20,
        paddingRight: 12,
        gap: 12,
    },
    categoriesGrid: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    categoriesRow: {
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    categoryCard: {
        width: CARD_WIDTH,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    categoryImage: {
        width: '100%',
        height: CARD_WIDTH,
    },
    categoryOverlay: {
        padding: 12,
        position: 'relative',
    },
    categoryIconContainer: {
        position: 'absolute',
        top: -20,
        right: 12,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    categoryName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
        marginTop: 8,
        marginBottom: 4,
    },
    categoryProductCount: {
        fontSize: 12,
        color: '#64748B',
    },
    categoryArrow: {
        position: 'absolute',
        bottom: 12,
        right: 12,
    },
    horizontalCategoryCard: {
        width: 110,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        overflow: 'hidden',
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    horizontalCategoryImage: {
        width: '100%',
        height: 110,
    },
    horizontalCategoryName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0F172A',
        paddingHorizontal: 10,
        paddingTop: 10,
    },
    horizontalCategoryCount: {
        fontSize: 11,
        color: '#64748B',
        paddingHorizontal: 10,
        paddingBottom: 12,
    },
    brandCard: {
        width: 100,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        alignItems: 'center',
        padding: 12,
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    brandLogo: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginBottom: 8,
    },
    brandName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0F172A',
    },
    brandProductCount: {
        fontSize: 10,
        color: '#64748B',
        marginTop: 2,
    },
    brandsList: {
        paddingLeft: 20,
        paddingRight: 12,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#0F172A',
        marginTop: 16,
    },
    emptyStateSubtitle: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 8,
        textAlign: 'center',
    },
    searchLoadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    searchLoadingText: {
        fontSize: 14,
        color: '#64748B',
    },
    searchResultsList: {
        paddingHorizontal: 20,
        paddingTop: 8,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    searchResultImage: {
        width: 60,
        height: 60,
        borderRadius: 12,
    },
    searchResultInfo: {
        flex: 1,
        marginLeft: 12,
    },
    searchResultName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
    },
    searchResultCount: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
};

export default CategoriesScreen;