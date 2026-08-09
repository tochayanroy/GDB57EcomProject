import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    FadeInUp,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================
// API CONFIGURATION
// ============================================

const API_BASE_URL = 'http://10.225.180.27:5000';

// ============================================
// TYPES & INTERFACES
// ============================================

interface ProductImage {
    id: string;
    uri: string;
    isCover: boolean;
}

interface ProductVariant {
    id: string;
    name: string;
    options: string[];
}

interface ProductAttribute {
    id: string;
    name: string;
    value: string;
}

interface Category {
    _id: string;
    name: string;
    slug: string;
}

interface ProductFormData {
    name: string;
    description: string;
    price: number;
    discountPrice: number;
    costPrice: number;
    stock: number;
    brand: string;
    category: string;
    isActive: boolean;
    isFeatured: boolean;
    isDigital: boolean;
    weight: number;
    shippingCharge: number;
    variants: ProductVariant[];
    attributes: ProductAttribute[];
}

// ============================================
// API SERVICE FUNCTIONS
// ============================================

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
});

apiClient.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Fetch categories for dropdown
const fetchCategories = async (): Promise<Category[]> => {
    try {
        const response = await apiClient.get('/Category');
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error('Failed to fetch categories');
    } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
    }
};

// Create product API function
const createProduct = async (formData: FormData): Promise<any> => {
    try {
        const response = await apiClient.post('/Product/admin/products', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        console.log('Product creation response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error creating product:', error);
        throw error;
    }
};

// ============================================
// INITIAL FORM DATA
// ============================================

const initialFormData: ProductFormData = {
    name: '',
    description: '',
    price: 0,
    discountPrice: 0,
    costPrice: 0,
    stock: 0,
    brand: '',
    category: '',
    isActive: true,
    isFeatured: false,
    isDigital: false,
    weight: 0,
    shippingCharge: 0,
    variants: [],
    attributes: [],
};

const brandOptions = ['Apple', 'Samsung', 'Sony', 'Nike', 'Adidas', 'LG', 'Bose', 'Dell', 'HP', 'Canon'];

// ============================================
// REUSABLE COMPONENTS
// ============================================

const SectionCard = ({ title, icon, children, onEdit }: { title: string; icon?: string; children: React.ReactNode; onEdit?: () => void }) => (
    <Animated.View entering={FadeInUp.springify().damping(15)} style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
                {icon && <MaterialCommunityIcons name={icon as any} size={20} color="#3B82F6" style={styles.sectionIcon} />}
                <Text style={styles.sectionTitle}>{title}</Text>
            </View>
            {onEdit && (
                <TouchableOpacity onPress={onEdit}>
                    <Text style={styles.sectionEditText}>Edit</Text>
                </TouchableOpacity>
            )}
        </View>
        {children}
    </Animated.View>
);

const InputField = ({ label, value, onChangeText, placeholder, multiline, keyboardType, rightElement, required }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    multiline?: boolean;
    keyboardType?: any;
    rightElement?: React.ReactNode;
    required?: boolean;
}) => (
    <View style={styles.inputContainer}>
        <View style={styles.inputLabelContainer}>
            <Text style={styles.inputLabel}>{label}</Text>
            {required && <Text style={styles.requiredStar}>*</Text>}
        </View>
        <View style={styles.inputWrapper}>
            <TextInput
                style={[styles.input, multiline && styles.textArea]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#9CA3AF"
                multiline={multiline}
                numberOfLines={multiline ? 4 : 1}
                keyboardType={keyboardType}
                textAlignVertical={multiline ? 'top' : 'center'}
            />
            {rightElement}
        </View>
    </View>
);

const DropdownField = ({ label, value, onPress, options, required, placeholder, loading }: {
    label: string;
    value: string;
    onPress: () => void;
    options: string[] | { value: string; label: string }[] | Category[];
    required?: boolean;
    placeholder?: string;
    loading?: boolean;
}) => {
    const getDisplayValue = () => {
        if (!value) return placeholder || `Select ${label}`;
        
        if (options.length > 0) {
            const firstItem = options[0];
            
            if (typeof firstItem === 'object' && firstItem !== null && 'name' in firstItem) {
                const found = (options as Category[]).find(o => o._id === value);
                return found ? found.name : value;
            }
            
            if (typeof firstItem === 'object' && firstItem !== null && 'label' in firstItem) {
                const found = (options as { value: string; label: string }[]).find(o => o.value === value);
                return found ? found.label : value;
            }
        }
        
        return value;
    };

    return (
        <TouchableOpacity onPress={onPress} style={styles.dropdownContainer} disabled={loading}>
            <View style={styles.inputLabelContainer}>
                <Text style={styles.inputLabel}>{label}</Text>
                {required && <Text style={styles.requiredStar}>*</Text>}
            </View>
            <View style={styles.dropdown}>
                <Text style={[styles.dropdownText, !value && styles.placeholderText]}>
                    {loading ? 'Loading...' : getDisplayValue()}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </View>
        </TouchableOpacity>
    );
};

const ToggleRow = ({ label, value, onValueChange, description }: {
    label: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    description?: string;
}) => (
    <View style={styles.toggleContainer}>
        <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>{label}</Text>
            {description && <Text style={styles.toggleDescription}>{description}</Text>}
        </View>
        <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
            thumbColor="#FFFFFF"
        />
    </View>
);

const ImageUploadCard = ({ images, onAddImage, onRemoveImage, onSetCover, loading }: {
    images: ProductImage[];
    onAddImage: () => void;
    onRemoveImage: (id: string) => void;
    onSetCover: (id: string) => void;
    loading?: boolean;
}) => (
    <View style={styles.imageUploadSection}>
        <View style={styles.imagesGrid}>
            {images.map((image) => (
                <View key={image.id} style={styles.imageCard}>
                    <Image source={{ uri: image.uri }} style={styles.imageCardImage} />
                    {image.isCover && (
                        <View style={styles.coverBadge}>
                            <Text style={styles.coverBadgeText}>Cover</Text>
                        </View>
                    )}
                    <View style={styles.imageCardActions}>
                        {!image.isCover && (
                            <TouchableOpacity onPress={() => onSetCover(image.id)} style={styles.imageActionButton}>
                                <Ionicons name="star-outline" size={14} color="#FFFFFF" />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => onRemoveImage(image.id)} style={[styles.imageActionButton, styles.imageActionButtonDanger]}>
                            <Ionicons name="trash-outline" size={14} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </View>
            ))}
            <TouchableOpacity style={styles.addImageButton} onPress={onAddImage} disabled={loading}>
                {loading ? (
                    <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                    <>
                        <Ionicons name="add" size={32} color="#3B82F6" />
                        <Text style={styles.addImageText}>Add Image</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
        <Text style={styles.helperText}>Recommended: 1200x1200px, JPG or PNG. Add at least 5 images for better conversion.</Text>
    </View>
);

const VariantCard = ({ variant, onEdit, onDelete }: { variant: ProductVariant; onEdit: () => void; onDelete: () => void }) => (
    <View style={styles.variantCard}>
        <View style={styles.variantInfo}>
            <Text style={styles.variantName}>{variant.name}</Text>
            <Text style={styles.variantOptions}>{variant.options.join(' • ')}</Text>
        </View>
        <View style={styles.variantActions}>
            <TouchableOpacity onPress={onEdit} style={styles.variantActionButton}>
                <Ionicons name="create-outline" size={18} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} style={styles.variantActionButton}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
        </View>
    </View>
);

const AttributeCard = ({ attribute, onEdit, onDelete }: { attribute: ProductAttribute; onEdit: () => void; onDelete: () => void }) => (
    <View style={styles.attributeCard}>
        <View style={styles.attributeInfo}>
            <Text style={styles.attributeName}>{attribute.name}</Text>
            <Text style={styles.attributeValue}>{attribute.value}</Text>
        </View>
        <View style={styles.attributeActions}>
            <TouchableOpacity onPress={onEdit} style={styles.attributeActionButton}>
                <Ionicons name="create-outline" size={16} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} style={styles.attributeActionButton}>
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
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
                    <Text style={styles.aiInsightTitle}>AI Product Recommendations</Text>
                    <Text style={styles.aiInsightMessage}>
                        Products with 5+ images convert 24% better. Adding detailed descriptions and specifications 
                        can improve search visibility by 40%. Consider setting a competitive sale price.
                    </Text>
                </View>
            </View>
        </LinearGradient>
    </Animated.View>
);

// ============================================
// MAIN ADD PRODUCT SCREEN
// ============================================

export default function AddProductScreen() {
    const insets = useSafeAreaInsets();
    const [formData, setFormData] = useState<ProductFormData>(initialFormData);
    const [images, setImages] = useState<ProductImage[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [showBrandPicker, setShowBrandPicker] = useState(false);
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

    // Load categories on mount
    useEffect(() => {
        loadCategories();
        requestPermissions();
    }, []);

    const requestPermissions = async () => {
        if (Platform.OS !== 'web') {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Needed', 'Please grant camera roll permissions to upload product images.');
            }
        }
    };

    const loadCategories = async () => {
        setLoading(true);
        try {
            const data = await fetchCategories();
            setCategories(data);
        } catch (error) {
            console.error('Error loading categories:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateField = useCallback((field: keyof ProductFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const pickImage = useCallback(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            const newImage: ProductImage = {
                id: Date.now().toString(),
                uri: result.assets[0].uri,
                isCover: images.length === 0,
            };
            setImages(prev => [...prev, newImage]);
        }
    }, [images.length]);

    const removeImage = useCallback((id: string) => {
        setImages(prev => {
            const newImages = prev.filter(img => img.id !== id);
            if (newImages.length > 0 && !newImages.some(img => img.isCover)) {
                newImages[0].isCover = true;
            }
            return newImages;
        });
    }, []);

    const setCoverImage = useCallback((id: string) => {
        setImages(prev => prev.map(img => ({
            ...img,
            isCover: img.id === id
        })));
    }, []);

    const addVariant = useCallback(() => {
        const newVariant: ProductVariant = {
            id: Date.now().toString(),
            name: 'New Variant',
            options: ['Option 1', 'Option 2'],
        };
        setFormData(prev => ({
            ...prev,
            variants: [...prev.variants, newVariant]
        }));
    }, []);

    const removeVariant = useCallback((id: string) => {
        setFormData(prev => ({
            ...prev,
            variants: prev.variants.filter(v => v.id !== id)
        }));
    }, []);

    const addAttribute = useCallback(() => {
        const newAttribute: ProductAttribute = {
            id: Date.now().toString(),
            name: 'New Attribute',
            value: 'Value',
        };
        setFormData(prev => ({
            ...prev,
            attributes: [...prev.attributes, newAttribute]
        }));
    }, []);

    const removeAttribute = useCallback((id: string) => {
        setFormData(prev => ({
            ...prev,
            attributes: prev.attributes.filter(a => a.id !== id)
        }));
    }, []);

    const handleSubmit = useCallback(async () => {
        // Validate required fields
        if (!formData.name.trim()) {
            Alert.alert('Validation Error', 'Product name is required');
            return;
        }
        if (!formData.description.trim()) {
            Alert.alert('Validation Error', 'Product description is required');
            return;
        }
        if (formData.price <= 0) {
            Alert.alert('Validation Error', 'Valid price is required');
            return;
        }
        if (!formData.category) {
            Alert.alert('Validation Error', 'Please select a category');
            return;
        }
        if (images.length === 0) {
            Alert.alert('Validation Error', 'Please add at least one product image');
            return;
        }

        setIsSaving(true);

        try {
            const formDataToSend = new FormData();

            // Append basic fields
            formDataToSend.append('name', formData.name);
            formDataToSend.append('description', formData.description);
            formDataToSend.append('price', String(formData.price));
            formDataToSend.append('discountPrice', String(formData.discountPrice || 0));
            formDataToSend.append('costPrice', String(formData.costPrice || 0));
            formDataToSend.append('stock', String(formData.stock || 0));
            formDataToSend.append('brand', formData.brand || '');
            formDataToSend.append('category', formData.category);
            formDataToSend.append('isActive', String(formData.isActive));
            formDataToSend.append('isFeatured', String(formData.isFeatured));
            formDataToSend.append('isDigital', String(formData.isDigital));
            formDataToSend.append('weight', String(formData.weight || 0));
            formDataToSend.append('shippingCharge', String(formData.shippingCharge || 0));

            // Append variants if any
            if (formData.variants.length > 0) {
                const variantData = formData.variants.map(v => ({
                    name: v.name,
                    options: v.options,
                    price: 0,
                    stock: 0
                }));
                formDataToSend.append('variants', JSON.stringify(variantData));
            }

            // Append attributes if any
            if (formData.attributes.length > 0) {
                const attributeData = formData.attributes.map(a => ({
                    name: a.name,
                    value: a.value
                }));
                formDataToSend.append('attributes', JSON.stringify(attributeData));
            }

            // Append images
            images.forEach((image, index) => {
                formDataToSend.append('images', {
                    uri: image.uri,
                    type: 'image/jpeg',
                    name: `product_image_${index}.jpg`,
                } as any);
            });

            const response = await createProduct(formDataToSend);
            if (response.success) {
                Alert.alert(
                    'Success',
                    'Product created successfully!');
            } else {
                Alert.alert('Error', response.message || 'Failed to create product');
            }
        } catch (error: any) {
            console.error('Submit error:', error);
            Alert.alert(
                'Error',
                error.response?.data?.message || 'Failed to create product. Please try again.'
            );
        } finally {
            setIsSaving(false);
        }
    }, [formData, images]);

    // Render picker modal
    const renderPickerModal = (title: string, items: any[], selectedId: string | null, onSelect: (id: any) => void, onClose: () => void, labelKey: string = 'name', valueKey: string = '_id') => {
        return (
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{title}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#1F2937" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalList}>
                        {items.map((item) => (
                            <TouchableOpacity
                                key={item[valueKey] || item.value || item}
                                style={[
                                    styles.modalItem,
                                    selectedId === (item[valueKey] || item.value || item) && styles.modalItemSelected
                                ]}
                                onPress={() => {
                                    onSelect(item[valueKey] || item.value || item);
                                    onClose();
                                }}
                            >
                                <Text style={[
                                    styles.modalItemText,
                                    selectedId === (item[valueKey] || item.value || item) && styles.modalItemTextSelected
                                ]}>
                                    {item[labelKey] || item.label || item.name || item}
                                </Text>
                                {selectedId === (item[valueKey] || item.value || item) && (
                                    <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                                )}
                            </TouchableOpacity>
                        ))}
                        {items.length === 0 && (
                            <Text style={styles.modalEmptyText}>No options available</Text>
                        )}
                    </ScrollView>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

            <Animated.View style={[styles.headerContainer, headerAnimatedStyle]}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Add Product</Text>
                    <TouchableOpacity 
                        onPress={handleSubmit} 
                        style={[styles.headerButton, styles.headerSaveButton]}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color="#3B82F6" />
                        ) : (
                            <MaterialCommunityIcons name="content-save-outline" size={24} color="#3B82F6" />
                        )}
                    </TouchableOpacity>
                </View>
            </Animated.View>

            <Animated.ScrollView
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
            >
                {/* Product Preview Overview */}
                <SectionCard title="Product Preview" icon="eye-outline">
                    <View style={styles.previewContainer}>
                        <View style={styles.previewImagePlaceholder}>
                            {images.length > 0 ? (
                                <Image source={{ uri: images.find(i => i.isCover)?.uri || images[0].uri }} style={styles.previewImage} />
                            ) : (
                                <MaterialCommunityIcons name="image-plus" size={32} color="#9CA3AF" />
                            )}
                        </View>
                        <View style={styles.previewInfo}>
                            <Text style={styles.previewName}>{formData.name || 'New Product'}</Text>
                            <Text style={styles.previewMeta}>
                                {categories.find(c => c._id === formData.category)?.name || 'No Category'} 
                                {formData.brand ? ` • ${formData.brand}` : ''}
                            </Text>
                            <View style={styles.previewStatus}>
                                <View style={[styles.previewStatusDot, { backgroundColor: formData.isActive ? '#10B981' : '#EF4444' }]} />
                                <Text style={styles.previewStatusText}>{formData.isActive ? 'Active' : 'Inactive'}</Text>
                            </View>
                        </View>
                    </View>
                </SectionCard>

                {/* Product Images */}
                <SectionCard title="Product Images" icon="image-multiple">
                    <ImageUploadCard
                        images={images}
                        onAddImage={pickImage}
                        onRemoveImage={removeImage}
                        onSetCover={setCoverImage}
                        loading={loading}
                    />
                </SectionCard>

                {/* Basic Information */}
                <SectionCard title="Basic Information" icon="information-outline">
                    <InputField
                        label="Product Name"
                        value={formData.name}
                        onChangeText={(v) => updateField('name', v)}
                        placeholder="Enter product name"
                        required
                    />
                    <InputField
                        label="Description"
                        value={formData.description}
                        onChangeText={(v) => updateField('description', v)}
                        placeholder="Detailed product description"
                        multiline
                        required
                    />
                    <View style={styles.rowFields}>
                        <DropdownField
                            label="Brand"
                            value={formData.brand}
                            onPress={() => setShowBrandPicker(true)}
                            options={brandOptions}
                            loading={loading}
                        />
                        <DropdownField
                            label="Category"
                            value={formData.category}
                            onPress={() => setShowCategoryPicker(true)}
                            options={categories}
                            required
                            loading={loading}
                        />
                    </View>
                    <ToggleRow
                        label="Digital Product"
                        value={formData.isDigital}
                        onValueChange={(v) => updateField('isDigital', v)}
                        description="Toggle if this is a digital/downloadable product"
                    />
                </SectionCard>

                {/* Pricing Management */}
                <SectionCard title="Pricing" icon="currency-usd">
                    <View style={styles.rowFields}>
                        <InputField
                            label="Regular Price"
                            value={formData.price.toString()}
                            onChangeText={(v) => updateField('price', parseFloat(v) || 0)}
                            placeholder="0.00"
                            keyboardType="numeric"
                            required
                        />
                        <InputField
                            label="Discount Price"
                            value={formData.discountPrice.toString()}
                            onChangeText={(v) => updateField('discountPrice', parseFloat(v) || 0)}
                            placeholder="0.00"
                            keyboardType="numeric"
                        />
                    </View>
                    <View style={styles.rowFields}>
                        <InputField
                            label="Cost Price"
                            value={formData.costPrice.toString()}
                            onChangeText={(v) => updateField('costPrice', parseFloat(v) || 0)}
                            placeholder="0.00"
                            keyboardType="numeric"
                        />
                        <InputField
                            label="Shipping Charge"
                            value={formData.shippingCharge.toString()}
                            onChangeText={(v) => updateField('shippingCharge', parseFloat(v) || 0)}
                            placeholder="0.00"
                            keyboardType="numeric"
                        />
                    </View>
                    {formData.price > 0 && formData.discountPrice > 0 && formData.discountPrice < formData.price && (
                        <View style={styles.discountBadge}>
                            <MaterialCommunityIcons name="sale" size={16} color="#10B981" />
                            <Text style={styles.discountText}>
                                Save ${(formData.price - formData.discountPrice).toFixed(2)} ({Math.round((1 - formData.discountPrice / formData.price) * 100)}% off)
                            </Text>
                        </View>
                    )}
                </SectionCard>

                {/* Inventory Management */}
                <SectionCard title="Inventory" icon="package-variant">
                    <InputField
                        label="Stock Quantity"
                        value={formData.stock.toString()}
                        onChangeText={(v) => updateField('stock', parseInt(v) || 0)}
                        placeholder="0"
                        keyboardType="numeric"
                        required
                    />
                    <InputField
                        label="Weight (kg)"
                        value={formData.weight.toString()}
                        onChangeText={(v) => updateField('weight', parseFloat(v) || 0)}
                        placeholder="0"
                        keyboardType="numeric"
                    />
                </SectionCard>

                {/* Product Variants */}
                <SectionCard title="Variants" icon="view-grid">
                    {formData.variants.map((variant) => (
                        <VariantCard
                            key={variant.id}
                            variant={variant}
                            onEdit={() => {}}
                            onDelete={() => removeVariant(variant.id)}
                        />
                    ))}
                    <TouchableOpacity style={styles.addButton} onPress={addVariant}>
                        <Ionicons name="add" size={20} color="#3B82F6" />
                        <Text style={styles.addButtonText}>Add Variant</Text>
                    </TouchableOpacity>
                </SectionCard>

                {/* Product Attributes */}
                <SectionCard title="Attributes" icon="format-list-bulleted">
                    {formData.attributes.map((attribute) => (
                        <AttributeCard
                            key={attribute.id}
                            attribute={attribute}
                            onEdit={() => {}}
                            onDelete={() => removeAttribute(attribute.id)}
                        />
                    ))}
                    <TouchableOpacity style={styles.addButton} onPress={addAttribute}>
                        <Ionicons name="add" size={20} color="#3B82F6" />
                        <Text style={styles.addButtonText}>Add Attribute</Text>
                    </TouchableOpacity>
                </SectionCard>

                {/* Visibility & Status */}
                <SectionCard title="Visibility & Status" icon="eye">
                    <ToggleRow
                        label="Active Product"
                        value={formData.isActive}
                        onValueChange={(v) => updateField('isActive', v)}
                        description="Make product visible on the store"
                    />
                    <ToggleRow
                        label="Featured Product"
                        value={formData.isFeatured}
                        onValueChange={(v) => updateField('isFeatured', v)}
                        description="Display on homepage featured section"
                    />
                </SectionCard>

                {/* AI Recommendations */}
                <AIInsightCard />
            </Animated.ScrollView>

            {/* Sticky Bottom Action Bar */}
            <Animated.View entering={FadeInUp.springify()} style={[styles.bottomActionBar, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity 
                    style={styles.secondaryButton} 
                    onPress={() => {
                        setFormData(initialFormData);
                        setImages([]);
                    }}
                >
                    <Text style={styles.secondaryButtonText}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={styles.primaryButton} 
                    onPress={handleSubmit}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.primaryButtonText}>Create Product</Text>
                    )}
                </TouchableOpacity>
            </Animated.View>

            {/* Picker Modals */}
            {showCategoryPicker && renderPickerModal(
                'Select Category',
                categories,
                formData.category,
                (id) => updateField('category', id),
                () => setShowCategoryPicker(false)
            )}

            {showBrandPicker && renderPickerModal(
                'Select Brand',
                brandOptions.map(b => ({ name: b, value: b })),
                formData.brand,
                (value) => updateField('brand', value),
                () => setShowBrandPicker(false),
                'name',
                'value'
            )}
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
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerSaveButton: {
        backgroundColor: '#EFF6FF',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 16,
    },
    sectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionIcon: {
        marginRight: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    sectionEditText: {
        fontSize: 13,
        color: '#3B82F6',
        fontWeight: '500',
    },
    inputContainer: {
        marginBottom: 16,
    },
    inputLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: '#374151',
    },
    requiredStar: {
        color: '#EF4444',
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        color: '#1F2937',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    textArea: {
        minHeight: 80,
    },
    inputRightElement: {
        position: 'absolute',
        right: 14,
        fontSize: 14,
        color: '#6B7280',
    },
    dropdownContainer: {
        flex: 1,
        marginBottom: 16,
    },
    dropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    dropdownText: {
        fontSize: 14,
        color: '#1F2937',
    },
    placeholderText: {
        color: '#9CA3AF',
    },
    rowFields: {
        flexDirection: 'row',
        gap: 12,
    },
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    toggleInfo: {
        flex: 1,
    },
    toggleLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1F2937',
    },
    toggleDescription: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 16,
    },
    previewContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    previewImagePlaceholder: {
        width: 70,
        height: 70,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    previewInfo: {
        flex: 1,
        marginLeft: 16,
    },
    previewName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    previewMeta: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    previewStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    previewStatusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    previewStatusText: {
        fontSize: 11,
        color: '#6B7280',
    },
    imageUploadSection: {
        marginBottom: 16,
    },
    imagesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    imageCard: {
        width: (SCREEN_WIDTH - 80) / 4,
        height: (SCREEN_WIDTH - 80) / 4,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    imageCardImage: {
        width: '100%',
        height: '100%',
    },
    coverBadge: {
        position: 'absolute',
        top: 4,
        left: 4,
        backgroundColor: '#10B981',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    coverBadgeText: {
        fontSize: 8,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    imageCardActions: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        flexDirection: 'row',
        gap: 4,
    },
    imageActionButton: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageActionButtonDanger: {
        backgroundColor: '#EF4444',
    },
    addImageButton: {
        width: (SCREEN_WIDTH - 80) / 4,
        height: (SCREEN_WIDTH - 80) / 4,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    addImageText: {
        fontSize: 10,
        color: '#6B7280',
        marginTop: 4,
    },
    helperText: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 12,
    },
    discountBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#D1FAE5',
        padding: 10,
        borderRadius: 12,
        gap: 8,
        marginTop: 8,
    },
    discountText: {
        fontSize: 13,
        color: '#10B981',
        fontWeight: '500',
    },
    variantCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
    },
    variantInfo: {
        flex: 1,
    },
    variantName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
    },
    variantOptions: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    variantActions: {
        flexDirection: 'row',
        gap: 8,
    },
    variantActionButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    attributeCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
    },
    attributeInfo: {
        flex: 1,
    },
    attributeName: {
        fontSize: 13,
        fontWeight: '500',
        color: '#1F2937',
    },
    attributeValue: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    attributeActions: {
        flexDirection: 'row',
        gap: 8,
    },
    attributeActionButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#3B82F6',
        borderStyle: 'dashed',
        marginTop: 8,
        gap: 8,
    },
    addButtonText: {
        fontSize: 14,
        color: '#3B82F6',
        fontWeight: '500',
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
    bottomActionBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 16,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 8,
    },
    primaryButton: {
        flex: 2,
        backgroundColor: '#3B82F6',
        paddingVertical: 14,
        borderRadius: 30,
        alignItems: 'center',
    },
    primaryButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    secondaryButton: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        paddingVertical: 14,
        borderRadius: 30,
        alignItems: 'center',
    },
    secondaryButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    tertiaryButton: {
        flex: 1,
        backgroundColor: '#EFF6FF',
        paddingVertical: 14,
        borderRadius: 30,
        alignItems: 'center',
    },
    tertiaryButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#3B82F6',
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        width: SCREEN_WIDTH - 40,
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    modalList: {
        maxHeight: 400,
    },
    modalItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    modalItemSelected: {
        backgroundColor: '#EFF6FF',
        borderRadius: 8,
    },
    modalItemText: {
        fontSize: 15,
        color: '#1F2937',
    },
    modalItemTextSelected: {
        color: '#3B82F6',
        fontWeight: '600',
    },
    modalEmptyText: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        paddingVertical: 20,
    },
});