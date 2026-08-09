import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Platform,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ScrollView
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const API_BASE_URL = 'http://10.225.180.27:5000';

interface CategoryFormData {
    name: string;
    description: string;
    shortDescription: string;
    categoryCode: string;
    parentCategory: string | null;
    collection: string;
    status: 'draft' | 'published' | 'hidden' | 'archived';
    isActive: boolean;
    isFeatured: boolean;
    showOnHomepage: boolean;
    showInNavigation: boolean;
    showInSearch: boolean;
    allowProductAssignment: boolean;
    icon: string;
    colorTheme: string;
    backgroundStyle: string;
    displayOrder: number;
    customLabel: string;
    allowAutomaticAssignment: boolean;
    allowManualAssignment: boolean;
    allowMultiCategoryAssignment: boolean;
    allowCategoryFiltering: boolean;
    productCountLimit: number;
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
    canonicalUrl: string;
    trackCategoryViews: boolean;
    trackProductClicks: boolean;
    trackConversionRate: boolean;
    trackRevenue: boolean;
    enablePerformanceReports: boolean;
    accessLevel: 'public' | 'private' | 'vip' | 'restricted';
    department: string;
    manager: string;
    vendorGroup: string;
    storeLocation: string;
    internalNotes: string;
}

interface CategoryResponse {
    _id: string;
    name: string;
    slug: string;
}

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
    (error) => Promise.reject(error)
);

const fetchCategories = async (): Promise<CategoryResponse[]> => {
    try {
        const response = await apiClient.get('/Category');
        if (response.data.success) {
            return response.data.data;
        }
        return [];
    } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
    }
};

const createCategory = async (formData: FormData): Promise<any> => {
    const response = await apiClient.post('/Category/admin/categories', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

const initialFormData: CategoryFormData = {
    name: '',
    description: '',
    shortDescription: '',
    categoryCode: '',
    parentCategory: null,
    collection: '',
    status: 'draft',
    isActive: true,
    isFeatured: false,
    showOnHomepage: false,
    showInNavigation: true,
    showInSearch: true,
    allowProductAssignment: true,
    icon: 'folder',
    colorTheme: '#3B82F6',
    backgroundStyle: 'light',
    displayOrder: 0,
    customLabel: '',
    allowAutomaticAssignment: true,
    allowManualAssignment: true,
    allowMultiCategoryAssignment: true,
    allowCategoryFiltering: true,
    productCountLimit: 0,
    metaTitle: '',
    metaDescription: '',
    metaKeywords: '',
    canonicalUrl: '',
    trackCategoryViews: true,
    trackProductClicks: true,
    trackConversionRate: true,
    trackRevenue: true,
    enablePerformanceReports: true,
    accessLevel: 'public',
    department: '',
    manager: '',
    vendorGroup: '',
    storeLocation: '',
    internalNotes: '',
};

const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'hidden', label: 'Hidden' },
    { value: 'archived', label: 'Archived' },
];

const accessOptions = [
    { value: 'public', label: 'Public' },
    { value: 'private', label: 'Private' },
    { value: 'vip', label: 'VIP Only' },
    { value: 'restricted', label: 'Restricted' },
];

const colorOptions = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#6366F1',
];

const iconOptions = [
    { id: 'folder', name: 'Folder' },
    { id: 'folder-open', name: 'Folder Open' },
    { id: 'tag', name: 'Tag' },
    { id: 'star', name: 'Star' },
    { id: 'heart', name: 'Heart' },
    { id: 'lightning', name: 'Lightning' },
];

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {children}
    </View>
);

const InputField = ({ label, value, onChangeText, placeholder, multiline, keyboardType, required }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    multiline?: boolean;
    keyboardType?: any;
    required?: boolean;
}) => (
    <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>
            {label}{required && <Text style={styles.requiredStar}>*</Text>}
        </Text>
        <TextInput
            style={[styles.input, multiline && styles.textArea]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            multiline={multiline}
            numberOfLines={multiline ? 4 : 1}
            keyboardType={keyboardType}
        />
    </View>
);

const ToggleRow = ({ label, value, onValueChange }: {
    label: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
}) => (
    <View style={styles.toggleContainer}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
            thumbColor="#FFFFFF"
        />
    </View>
);

const ImageUploadCard = ({ image, onUpload, onRemove, title }: {
    image: { uri: string; type: string } | null;
    onUpload: () => void;
    onRemove: () => void;
    title: string;
}) => (
    <View style={styles.imageUploadCard}>
        <Text style={styles.imageUploadTitle}>{title}</Text>
        {image ? (
            <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                <View style={styles.imagePreviewActions}>
                    <TouchableOpacity onPress={onUpload} style={styles.imagePreviewButton}>
                        <Ionicons name="refresh" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onRemove} style={[styles.imagePreviewButton, styles.imagePreviewButtonDanger]}>
                        <Ionicons name="trash" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </View>
        ) : (
            <TouchableOpacity onPress={onUpload} style={styles.uploadPlaceholder}>
                <MaterialCommunityIcons name="image-plus" size={40} color="#9CA3AF" />
                <Text style={styles.uploadText}>Upload {title}</Text>
                <Text style={styles.uploadSubtext}>JPG, PNG up to 5MB</Text>
            </TouchableOpacity>
        )}
    </View>
);

const ColorPicker = ({ selected, onSelect }: { selected: string; onSelect: (color: string) => void }) => (
    <View style={styles.colorPickerContainer}>
        {colorOptions.map((color) => (
            <TouchableOpacity
                key={color}
                onPress={() => onSelect(color)}
                style={[styles.colorOption, { backgroundColor: color }, selected === color && styles.colorOptionSelected]}
            />
        ))}
    </View>
);

export default function AddCategoryScreen() {
    const insets = useSafeAreaInsets();
    const [formData, setFormData] = useState<CategoryFormData>(initialFormData);
    const [coverImage, setCoverImage] = useState<{ uri: string; type: string } | null>(null);
    const [bannerImage, setBannerImage] = useState<{ uri: string; type: string } | null>(null);
    const [iconImage, setIconImage] = useState<{ uri: string; type: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [categories, setCategories] = useState<CategoryResponse[]>([]);

    React.useEffect(() => {
        loadCategories();
        requestPermissions();
    }, []);

    const requestPermissions = async () => {
        if (Platform.OS !== 'web') {
            await ImagePicker.requestMediaLibraryPermissionsAsync();
        }
    };

    const loadCategories = async () => {
        try {
            const data = await fetchCategories();
            setCategories(data);
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    };

    const updateField = useCallback((field: keyof CategoryFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const pickImage = useCallback(async (type: 'cover' | 'banner' | 'icon') => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: type === 'cover' ? [1, 1] : [16, 9],
            quality: 0.8,
        });
        
        if (!result.canceled) {
            const image = { uri: result.assets[0].uri, type };
            if (type === 'cover') setCoverImage(image);
            else if (type === 'banner') setBannerImage(image);
            else setIconImage(image);
        }
    }, []);

    const removeImage = useCallback((type: 'cover' | 'banner' | 'icon') => {
        if (type === 'cover') setCoverImage(null);
        else if (type === 'banner') setBannerImage(null);
        else setIconImage(null);
    }, []);

    const handleSubmit = useCallback(async () => {
        if (!formData.name.trim()) {
            Alert.alert('Validation Error', 'Category name is required');
            return;
        }

        setIsSaving(true);

        try {
            const formDataToSend = new FormData();

            // Required fields
            formDataToSend.append('name', formData.name);
            formDataToSend.append('description', formData.description || '');
            formDataToSend.append('shortDescription', formData.shortDescription || '');
            formDataToSend.append('categoryCode', formData.categoryCode || '');
            
            if (formData.parentCategory) {
                formDataToSend.append('parentCategory', formData.parentCategory);
            }
            
            formDataToSend.append('collection', formData.collection || '');
            formDataToSend.append('status', formData.status);
            formDataToSend.append('isActive', String(formData.isActive));
            formDataToSend.append('isFeatured', String(formData.isFeatured));
            formDataToSend.append('showOnHomepage', String(formData.showOnHomepage));
            formDataToSend.append('showInNavigation', String(formData.showInNavigation));
            formDataToSend.append('showInSearch', String(formData.showInSearch));
            formDataToSend.append('allowProductAssignment', String(formData.allowProductAssignment));
            formDataToSend.append('icon', formData.icon);
            formDataToSend.append('colorTheme', formData.colorTheme);
            formDataToSend.append('backgroundStyle', formData.backgroundStyle);
            formDataToSend.append('displayOrder', String(formData.displayOrder));
            formDataToSend.append('customLabel', formData.customLabel || '');
            formDataToSend.append('allowAutomaticAssignment', String(formData.allowAutomaticAssignment));
            formDataToSend.append('allowManualAssignment', String(formData.allowManualAssignment));
            formDataToSend.append('allowMultiCategoryAssignment', String(formData.allowMultiCategoryAssignment));
            formDataToSend.append('allowCategoryFiltering', String(formData.allowCategoryFiltering));
            formDataToSend.append('productCountLimit', String(formData.productCountLimit));
            formDataToSend.append('metaTitle', formData.metaTitle || '');
            formDataToSend.append('metaDescription', formData.metaDescription || '');
            formDataToSend.append('metaKeywords', formData.metaKeywords || '');
            formDataToSend.append('canonicalUrl', formData.canonicalUrl || '');
            formDataToSend.append('trackCategoryViews', String(formData.trackCategoryViews));
            formDataToSend.append('trackProductClicks', String(formData.trackProductClicks));
            formDataToSend.append('trackConversionRate', String(formData.trackConversionRate));
            formDataToSend.append('trackRevenue', String(formData.trackRevenue));
            formDataToSend.append('enablePerformanceReports', String(formData.enablePerformanceReports));
            formDataToSend.append('accessLevel', formData.accessLevel);
            formDataToSend.append('department', formData.department || '');
            formDataToSend.append('manager', formData.manager || '');
            formDataToSend.append('vendorGroup', formData.vendorGroup || '');
            formDataToSend.append('storeLocation', formData.storeLocation || '');
            formDataToSend.append('internalNotes', formData.internalNotes || '');

            // Append images
            if (coverImage) {
                formDataToSend.append('image', {
                    uri: coverImage.uri,
                    type: 'image/jpeg',
                    name: 'cover_image.jpg',
                } as any);
            }

            if (bannerImage) {
                formDataToSend.append('bannerImage', {
                    uri: bannerImage.uri,
                    type: 'image/jpeg',
                    name: 'banner_image.jpg',
                } as any);
            }

            if (iconImage) {
                formDataToSend.append('icon', {
                    uri: iconImage.uri,
                    type: 'image/jpeg',
                    name: 'icon_image.jpg',
                } as any);
            }

            const response = await createCategory(formDataToSend);

            if (response.success) {
                Alert.alert('Success', 'Category created successfully!', [
                    { text: 'View Categories', onPress: () => router.push('../CategoryListScreen') },
                    { text: 'Add Another', onPress: () => {
                        setFormData(initialFormData);
                        setCoverImage(null);
                        setBannerImage(null);
                        setIconImage(null);
                    }}
                ]);
            } else {
                Alert.alert('Error', response.message || 'Failed to create category');
            }
        } catch (error: any) {
            console.error('Submit error:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to create category');
        } finally {
            setIsSaving(false);
        }
    }, [formData, coverImage, bannerImage, iconImage]);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

            <View style={styles.header}>
                <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add Category</Text>
                <View style={styles.headerPlaceholder} />
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false}
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
            >
                {/* Basic Information */}
                <SectionCard title="Basic Information">
                    <InputField
                        label="Category Name"
                        value={formData.name}
                        onChangeText={(v) => updateField('name', v)}
                        placeholder="Enter category name"
                        required
                    />
                    <InputField
                        label="Category Code"
                        value={formData.categoryCode}
                        onChangeText={(v) => updateField('categoryCode', v)}
                        placeholder="CAT-1001"
                    />
                    <InputField
                        label="Short Description"
                        value={formData.shortDescription}
                        onChangeText={(v) => updateField('shortDescription', v)}
                        placeholder="Brief category description"
                    />
                    <InputField
                        label="Full Description"
                        value={formData.description}
                        onChangeText={(v) => updateField('description', v)}
                        placeholder="Detailed category description"
                        multiline
                    />
                </SectionCard>

                {/* Category Structure */}
                <SectionCard title="Category Structure">
                    <InputField
                        label="Parent Category ID"
                        value={formData.parentCategory || ''}
                        onChangeText={(v) => updateField('parentCategory', v || null)}
                        placeholder="Enter parent category ID or leave empty"
                    />
                    <InputField
                        label="Collection"
                        value={formData.collection}
                        onChangeText={(v) => updateField('collection', v)}
                        placeholder="Collection name"
                    />
                </SectionCard>

                {/* Images */}
                <SectionCard title="Images">
                    <ImageUploadCard
                        image={coverImage}
                        onUpload={() => pickImage('cover')}
                        onRemove={() => removeImage('cover')}
                        title="Cover Image"
                    />
                    <View style={styles.imageSpacer} />
                    <ImageUploadCard
                        image={bannerImage}
                        onUpload={() => pickImage('banner')}
                        onRemove={() => removeImage('banner')}
                        title="Banner Image"
                    />
                    <View style={styles.imageSpacer} />
                    <ImageUploadCard
                        image={iconImage}
                        onUpload={() => pickImage('icon')}
                        onRemove={() => removeImage('icon')}
                        title="Icon Image"
                    />
                </SectionCard>

                {/* Status & Visibility */}
                <SectionCard title="Status & Visibility">
                    <Text style={styles.inputLabel}>Status</Text>
                    <View style={styles.statusSelectorContainer}>
                        {statusOptions.map((option) => (
                            <TouchableOpacity
                                key={option.value}
                                onPress={() => updateField('status', option.value)}
                                style={[styles.statusOption, formData.status === option.value && styles.statusOptionSelected]}
                            >
                                <Text style={[styles.statusOptionText, formData.status === option.value && styles.statusOptionTextSelected]}>
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.divider} />
                    <ToggleRow
                        label="Active"
                        value={formData.isActive}
                        onValueChange={(v) => updateField('isActive', v)}
                    />
                    <ToggleRow
                        label="Featured"
                        value={formData.isFeatured}
                        onValueChange={(v) => updateField('isFeatured', v)}
                    />
                    <ToggleRow
                        label="Show on Homepage"
                        value={formData.showOnHomepage}
                        onValueChange={(v) => updateField('showOnHomepage', v)}
                    />
                    <ToggleRow
                        label="Show in Navigation"
                        value={formData.showInNavigation}
                        onValueChange={(v) => updateField('showInNavigation', v)}
                    />
                    <ToggleRow
                        label="Show in Search"
                        value={formData.showInSearch}
                        onValueChange={(v) => updateField('showInSearch', v)}
                    />
                </SectionCard>

                {/* Appearance */}
                <SectionCard title="Appearance">
                    <Text style={styles.inputLabel}>Icon</Text>
                    <View style={styles.iconSelectorContainer}>
                        {iconOptions.map((option) => (
                            <TouchableOpacity
                                key={option.id}
                                onPress={() => updateField('icon', option.id)}
                                style={[styles.iconOption, formData.icon === option.id && styles.iconOptionSelected]}
                            >
                                <MaterialCommunityIcons 
                                    name={option.id as any} 
                                    size={24} 
                                    color={formData.icon === option.id ? '#3B82F6' : '#6B7280'} 
                                />
                                <Text style={[styles.iconOptionText, formData.icon === option.id && styles.iconOptionTextSelected]}>
                                    {option.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.inputLabel}>Color Theme</Text>
                    <ColorPicker selected={formData.colorTheme} onSelect={(v) => updateField('colorTheme', v)} />

                    <Text style={styles.inputLabel}>Background Style</Text>
                    <View style={styles.statusSelectorContainer}>
                        {['light', 'dark', 'gradient'].map((style) => (
                            <TouchableOpacity
                                key={style}
                                onPress={() => updateField('backgroundStyle', style)}
                                style={[styles.statusOption, formData.backgroundStyle === style && styles.statusOptionSelected]}
                            >
                                <Text style={[styles.statusOptionText, formData.backgroundStyle === style && styles.statusOptionTextSelected]}>
                                    {style.charAt(0).toUpperCase() + style.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <InputField
                        label="Display Order"
                        value={formData.displayOrder.toString()}
                        onChangeText={(v) => updateField('displayOrder', parseInt(v) || 0)}
                        placeholder="0"
                        keyboardType="numeric"
                    />
                    <InputField
                        label="Custom Label"
                        value={formData.customLabel}
                        onChangeText={(v) => updateField('customLabel', v)}
                        placeholder="Optional display label"
                    />
                </SectionCard>

                {/* Product Management */}
                <SectionCard title="Product Management">
                    <ToggleRow
                        label="Allow Product Assignment"
                        value={formData.allowProductAssignment}
                        onValueChange={(v) => updateField('allowProductAssignment', v)}
                    />
                    <ToggleRow
                        label="Automatic Assignment"
                        value={formData.allowAutomaticAssignment}
                        onValueChange={(v) => updateField('allowAutomaticAssignment', v)}
                    />
                    <ToggleRow
                        label="Manual Assignment"
                        value={formData.allowManualAssignment}
                        onValueChange={(v) => updateField('allowManualAssignment', v)}
                    />
                    <ToggleRow
                        label="Multi-Category Assignment"
                        value={formData.allowMultiCategoryAssignment}
                        onValueChange={(v) => updateField('allowMultiCategoryAssignment', v)}
                    />
                    <ToggleRow
                        label="Category Filtering"
                        value={formData.allowCategoryFiltering}
                        onValueChange={(v) => updateField('allowCategoryFiltering', v)}
                    />
                    <InputField
                        label="Product Count Limit"
                        value={formData.productCountLimit.toString()}
                        onChangeText={(v) => updateField('productCountLimit', parseInt(v) || 0)}
                        placeholder="0 (unlimited)"
                        keyboardType="numeric"
                    />
                </SectionCard>

                {/* SEO */}
                <SectionCard title="SEO">
                    <InputField
                        label="Meta Title"
                        value={formData.metaTitle}
                        onChangeText={(v) => updateField('metaTitle', v)}
                        placeholder="SEO title"
                    />
                    <InputField
                        label="Meta Description"
                        value={formData.metaDescription}
                        onChangeText={(v) => updateField('metaDescription', v)}
                        placeholder="SEO description"
                        multiline
                    />
                    <InputField
                        label="Meta Keywords"
                        value={formData.metaKeywords}
                        onChangeText={(v) => updateField('metaKeywords', v)}
                        placeholder="keyword1, keyword2"
                    />
                    <InputField
                        label="Canonical URL"
                        value={formData.canonicalUrl}
                        onChangeText={(v) => updateField('canonicalUrl', v)}
                        placeholder="https://store.com/category/"
                    />
                </SectionCard>

                {/* Analytics */}
                <SectionCard title="Analytics">
                    <ToggleRow
                        label="Track Category Views"
                        value={formData.trackCategoryViews}
                        onValueChange={(v) => updateField('trackCategoryViews', v)}
                    />
                    <ToggleRow
                        label="Track Product Clicks"
                        value={formData.trackProductClicks}
                        onValueChange={(v) => updateField('trackProductClicks', v)}
                    />
                    <ToggleRow
                        label="Track Conversion Rate"
                        value={formData.trackConversionRate}
                        onValueChange={(v) => updateField('trackConversionRate', v)}
                    />
                    <ToggleRow
                        label="Track Revenue"
                        value={formData.trackRevenue}
                        onValueChange={(v) => updateField('trackRevenue', v)}
                    />
                    <ToggleRow
                        label="Enable Performance Reports"
                        value={formData.enablePerformanceReports}
                        onValueChange={(v) => updateField('enablePerformanceReports', v)}
                    />
                </SectionCard>

                {/* Access & Organization */}
                <SectionCard title="Access & Organization">
                    <Text style={styles.inputLabel}>Access Level</Text>
                    <View style={styles.statusSelectorContainer}>
                        {accessOptions.map((option) => (
                            <TouchableOpacity
                                key={option.value}
                                onPress={() => updateField('accessLevel', option.value)}
                                style={[styles.statusOption, formData.accessLevel === option.value && styles.statusOptionSelected]}
                            >
                                <Text style={[styles.statusOptionText, formData.accessLevel === option.value && styles.statusOptionTextSelected]}>
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <InputField
                        label="Department"
                        value={formData.department}
                        onChangeText={(v) => updateField('department', v)}
                        placeholder="e.g., Electronics"
                    />
                    <InputField
                        label="Manager"
                        value={formData.manager}
                        onChangeText={(v) => updateField('manager', v)}
                        placeholder="Category manager name"
                    />
                    <InputField
                        label="Vendor Group"
                        value={formData.vendorGroup}
                        onChangeText={(v) => updateField('vendorGroup', v)}
                        placeholder="Vendor group"
                    />
                    <InputField
                        label="Store Location"
                        value={formData.storeLocation}
                        onChangeText={(v) => updateField('storeLocation', v)}
                        placeholder="Warehouse location"
                    />
                    <InputField
                        label="Internal Notes"
                        value={formData.internalNotes}
                        onChangeText={(v) => updateField('internalNotes', v)}
                        placeholder="Private notes"
                        multiline
                    />
                </SectionCard>
            </ScrollView>

            {/* Bottom Action Bar */}
            <View style={[styles.bottomActionBar, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity 
                    style={styles.primaryButton} 
                    onPress={handleSubmit}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.primaryButtonText}>Create Category</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F9FAFB',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
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
    headerPlaceholder: {
        width: 40,
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
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 16,
    },
    inputContainer: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 6,
    },
    requiredStar: {
        color: '#EF4444',
        marginLeft: 4,
    },
    input: {
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
        textAlignVertical: 'top',
    },
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    toggleLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1F2937',
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 16,
    },
    statusSelectorContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
    },
    statusOption: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 30,
        backgroundColor: '#F3F4F6',
    },
    statusOptionSelected: {
        backgroundColor: '#3B82F6',
    },
    statusOptionText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#4B5563',
    },
    statusOptionTextSelected: {
        color: '#FFFFFF',
    },
    colorPickerContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 8,
        marginBottom: 16,
    },
    colorOption: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    colorOptionSelected: {
        borderColor: '#1F2937',
        borderWidth: 3,
    },
    iconSelectorContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    iconOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 30,
        backgroundColor: '#F3F4F6',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    iconOptionSelected: {
        backgroundColor: '#EFF6FF',
        borderColor: '#3B82F6',
    },
    iconOptionText: {
        fontSize: 12,
        color: '#6B7280',
    },
    iconOptionTextSelected: {
        color: '#3B82F6',
        fontWeight: '600',
    },
    imageUploadCard: {
        marginBottom: 8,
    },
    imageUploadTitle: {
        fontSize: 13,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 8,
    },
    uploadPlaceholder: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
        padding: 24,
        alignItems: 'center',
    },
    uploadText: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 8,
    },
    uploadSubtext: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 4,
    },
    imagePreviewContainer: {
        position: 'relative',
    },
    imagePreview: {
        width: '100%',
        height: 150,
        borderRadius: 16,
    },
    imagePreviewActions: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        flexDirection: 'row',
        gap: 8,
    },
    imagePreviewButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePreviewButtonDanger: {
        backgroundColor: '#EF4444',
    },
    imageSpacer: {
        height: 12,
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
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 8,
    },
    primaryButton: {
        flex: 1,
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
});