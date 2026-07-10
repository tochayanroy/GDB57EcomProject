import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useState } from 'react';
import {
    Dimensions,
    Image,
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
// TYPES & INTERFACES
// ============================================

interface CategoryImage {
  uri: string;
  type: 'cover' | 'banner';
}

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  categoryCode: string;
  parentCategory: string;
  parentCategoryId: string | null;
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

interface ValidationItem {
  id: string;
  label: string;
  completed: boolean;
}

interface SEORecommendation {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success';
}

// ============================================
// INITIAL FORM DATA
// ============================================

const initialFormData: CategoryFormData = {
  name: '',
  slug: '',
  description: '',
  shortDescription: '',
  categoryCode: '',
  parentCategory: 'None',
  parentCategoryId: null,
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

const parentCategories = [
  { id: null, name: 'None' },
  { id: '1', name: 'Electronics' },
  { id: '2', name: 'Fashion' },
  { id: '3', name: 'Home & Living' },
  { id: '4', name: 'Sports' },
  { id: '5', name: 'Beauty' },
  { id: '6', name: 'Books' },
];

const collections = [
  'Summer Sale 2024',
  'Winter Collection',
  'Best Sellers',
  'New Arrivals',
  'Limited Edition',
  'Clearance',
];

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
      />
      {rightElement}
    </View>
  </View>
);

const TextAreaField = ({ label, value, onChangeText, placeholder, required }: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  required?: boolean;
}) => (
  <View style={styles.inputContainer}>
    <View style={styles.inputLabelContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      {required && <Text style={styles.requiredStar}>*</Text>}
    </View>
    <TextInput
      style={styles.textArea}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      multiline
      numberOfLines={4}
      textAlignVertical="top"
    />
  </View>
);

const DropdownField = ({ label, value, onPress, options, required }: {
  label: string;
  value: string;
  onPress: () => void;
  options: { id: any; name: string }[] | { value: string; label: string }[];
  required?: boolean;
}) => (
  <TouchableOpacity onPress={onPress} style={styles.dropdownContainer}>
    <View style={styles.inputLabelContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      {required && <Text style={styles.requiredStar}>*</Text>}
    </View>
    <View style={styles.dropdown}>
      <Text style={[styles.dropdownText, !value && styles.placeholderText]}>{value || `Select ${label.toLowerCase()}`}</Text>
      <Ionicons name="chevron-down" size={20} color="#6B7280" />
    </View>
  </TouchableOpacity>
);

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

const ImageUploadCard = ({ image, onUpload, onRemove, title }: {
  image: CategoryImage | null;
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

const StatusBadgeSelector = ({ selected, onSelect, options }: {
  selected: string;
  onSelect: (value: string) => void;
  options: { value: string; label: string }[];
}) => (
  <View style={styles.statusSelectorContainer}>
    {options.map((option) => (
      <TouchableOpacity
        key={option.value}
        onPress={() => onSelect(option.value)}
        style={[styles.statusOption, selected === option.value && styles.statusOptionSelected]}
      >
        <Text style={[styles.statusOptionText, selected === option.value && styles.statusOptionTextSelected]}>
          {option.label}
        </Text>
      </TouchableOpacity>
    ))}
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

const ValidationChecklist = ({ items }: { items: ValidationItem[] }) => (
  <View style={styles.validationContainer}>
    {items.map((item) => (
      <View key={item.id} style={styles.validationItem}>
        <View style={[styles.validationCircle, item.completed && styles.validationCircleCompleted]}>
          {item.completed && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
        </View>
        <Text style={[styles.validationLabel, item.completed && styles.validationLabelCompleted]}>{item.label}</Text>
      </View>
    ))}
  </View>
);

const SEOPreviewCard = ({ title, description, url }: { title: string; description: string; url: string }) => (
  <View style={styles.seoPreviewCard}>
    <Text style={styles.seoPreviewTitle}>{title || 'Category Title'}</Text>
    <Text style={styles.seoPreviewUrl}>{url || 'https://store.com/category/'}</Text>
    <Text style={styles.seoPreviewDescription} numberOfLines={2}>
      {description || 'Category description will appear here...'}
    </Text>
  </View>
);

const SEORecommendationCard = ({ recommendation }: { recommendation: SEORecommendation }) => {
  const getIcon = () => {
    switch (recommendation.type) {
      case 'success': return 'checkmark-circle';
      case 'warning': return 'alert-circle';
      default: return 'information-circle';
    }
  };
  const getColor = () => {
    switch (recommendation.type) {
      case 'success': return '#10B981';
      case 'warning': return '#F59E0B';
      default: return '#3B82F6';
    }
  };
  return (
    <View style={[styles.seoRecommendation, { borderLeftColor: getColor() }]}>
      <Ionicons name={getIcon()} size={16} color={getColor()} />
      <Text style={styles.seoRecommendationText}>{recommendation.message}</Text>
    </View>
  );
};

const HierarchyPreview = ({ parentName, childName }: { parentName: string; childName: string }) => (
  <View style={styles.hierarchyPreview}>
    <Text style={styles.hierarchyPreviewTitle}>Category Structure Preview</Text>
    <View style={styles.hierarchyTree}>
      {parentName !== 'None' && (
        <View style={styles.hierarchyNode}>
          <MaterialCommunityIcons name="folder" size={16} color="#F59E0B" />
          <Text style={styles.hierarchyNodeName}>{parentName}</Text>
        </View>
      )}
      {parentName !== 'None' && (
        <View style={styles.hierarchyLine}>
          <View style={styles.hierarchyLineVertical} />
          <View style={styles.hierarchyLineHorizontal} />
        </View>
      )}
      <View style={[styles.hierarchyNode, styles.hierarchyNodeCurrent]}>
        <MaterialCommunityIcons name="folder-plus" size={16} color="#3B82F6" />
        <Text style={styles.hierarchyNodeNameCurrent}>{childName || 'New Category'}</Text>
      </View>
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
          <Text style={styles.aiInsightTitle}>AI Recommendations</Text>
          <Text style={styles.aiInsightMessage}>
            Featured categories receive 30% more engagement. Adding a banner image can increase visibility by 45%.
            Completing SEO metadata improves discoverability in search results.
          </Text>
        </View>
      </View>
    </LinearGradient>
  </Animated.View>
);

// ============================================
// MAIN ADD CATEGORY SCREEN
// ============================================

export default function AddCategoryScreen() {
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState<CategoryFormData>(initialFormData);
  const [coverImage, setCoverImage] = useState<CategoryImage | null>(null);
  const [bannerImage, setBannerImage] = useState<CategoryImage | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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

  const updateField = useCallback((field: keyof CategoryFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-generate slug from name
    if (field === 'name') {
      const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      setFormData(prev => ({ ...prev, name: value, slug }));
    }
  }, []);

  const pickImage = useCallback(async (type: 'cover' | 'banner') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'cover' ? [1, 1] : [16, 9],
      quality: 0.8,
    });
    
    if (!result.canceled) {
      const image = { uri: result.assets[0].uri, type };
      if (type === 'cover') setCoverImage(image);
      else setBannerImage(image);
    }
  }, []);

  const removeImage = useCallback((type: 'cover' | 'banner') => {
    if (type === 'cover') setCoverImage(null);
    else setBannerImage(null);
  }, []);

  const handleSave = useCallback(() => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
    }, 1000);
  }, []);

  // Validation checklist
  const validationItems: ValidationItem[] = [
    { id: '1', label: 'Category Name Added', completed: !!formData.name },
    { id: '2', label: 'Description Added', completed: !!formData.description },
    { id: '3', label: 'Cover Image Uploaded', completed: !!coverImage },
    { id: '4', label: 'SEO Configured', completed: !!formData.metaTitle && !!formData.metaDescription },
    { id: '5', label: 'Visibility Configured', completed: true },
    { id: '6', label: 'Parent Category Assigned', completed: formData.parentCategoryId !== null || formData.parentCategory === 'None' },
  ];

  // SEO Recommendations
  const seoRecommendations: SEORecommendation[] = [
    { id: '1', message: 'Meta title should be between 50-60 characters', type: formData.metaTitle.length >= 50 && formData.metaTitle.length <= 60 ? 'success' : 'warning' },
    { id: '2', message: 'Meta description should be between 150-160 characters', type: formData.metaDescription.length >= 150 && formData.metaDescription.length <= 160 ? 'success' : 'warning' },
    { id: '3', message: 'Add relevant keywords for better search ranking', type: formData.metaKeywords ? 'success' : 'info' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      <Animated.View style={[styles.headerContainer, headerAnimatedStyle]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Category</Text>
          <TouchableOpacity onPress={handleSave} style={[styles.headerButton, styles.headerSaveButton]}>
            <MaterialCommunityIcons name="content-save-outline" size={24} color="#3B82F6" />
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
        {/* Category Preview Overview */}
        <SectionCard title="Category Preview" icon="eye-outline">
          <View style={styles.previewContainer}>
            <View style={[styles.previewIcon, { backgroundColor: `${formData.colorTheme}15` }]}>
              <MaterialCommunityIcons name={formData.icon as any} size={32} color={formData.colorTheme} />
            </View>
            <View style={styles.previewInfo}>
              <Text style={styles.previewName}>{formData.name || 'New Category'}</Text>
              <Text style={styles.previewSlug}>{formData.slug || 'category-slug'}</Text>
              <View style={styles.previewStatus}>
                <View style={[styles.previewStatusDot, { backgroundColor: formData.status === 'published' ? '#10B981' : '#F59E0B' }]} />
                <Text style={styles.previewStatusText}>{statusOptions.find(s => s.value === formData.status)?.label}</Text>
              </View>
            </View>
          </View>
        </SectionCard>

        {/* Category Media Section */}
        <SectionCard title="Category Images" icon="image-multiple">
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
          <Text style={styles.helperText}>Recommended: Cover 500x500px, Banner 1200x400px. JPG or PNG.</Text>
        </SectionCard>

        {/* Basic Information */}
        <SectionCard title="Basic Information" icon="information-outline">
          <InputField
            label="Category Name"
            value={formData.name}
            onChangeText={(v) => updateField('name', v)}
            placeholder="Enter category name"
            required
          />
          <InputField
            label="Slug"
            value={formData.slug}
            onChangeText={(v) => updateField('slug', v)}
            placeholder="auto-generated"
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
          <TextAreaField
            label="Full Description"
            value={formData.description}
            onChangeText={(v) => updateField('description', v)}
            placeholder="Detailed category description"
            required
          />
        </SectionCard>

        {/* Category Hierarchy */}
        <SectionCard title="Category Structure" icon="folder-tree">
          <DropdownField
            label="Parent Category"
            value={formData.parentCategory}
            onPress={() => {}}
            options={parentCategories}
          />
          <DropdownField
            label="Collection"
            value={formData.collection}
            onPress={() => {}}
            options={collections.map(c => ({ id: c, name: c }))}
          />
          <HierarchyPreview parentName={formData.parentCategory} childName={formData.name} />
        </SectionCard>

        {/* Visibility Settings */}
        <SectionCard title="Visibility Settings" icon="eye">
          <StatusBadgeSelector
            selected={formData.status}
            onSelect={(v) => updateField('status', v)}
            options={statusOptions}
          />
          <View style={styles.divider} />
          <ToggleRow
            label="Active Category"
            value={formData.isActive}
            onValueChange={(v) => updateField('isActive', v)}
            description="Make this category active on your store"
          />
          <ToggleRow
            label="Featured Category"
            value={formData.isFeatured}
            onValueChange={(v) => updateField('isFeatured', v)}
            description="Display on homepage featured section"
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
        <SectionCard title="Appearance" icon="palette">
          <DropdownField
            label="Category Icon"
            value={formData.icon}
            onPress={() => {}}
            options={[{ id: 'folder', name: 'Folder' }, { id: 'folder-open', name: 'Folder Open' }, { id: 'tag', name: 'Tag' }, { id: 'star', name: 'Star' }]}
          />
          <Text style={styles.inputLabel}>Color Theme</Text>
          <ColorPicker selected={formData.colorTheme} onSelect={(v) => updateField('colorTheme', v)} />
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

        {/* Product Management Rules */}
        <SectionCard title="Product Management" icon="package-variant">
          <ToggleRow
            label="Allow Product Assignment"
            value={formData.allowProductAssignment}
            onValueChange={(v) => updateField('allowProductAssignment', v)}
          />
          <ToggleRow
            label="Automatic Product Assignment"
            value={formData.allowAutomaticAssignment}
            onValueChange={(v) => updateField('allowAutomaticAssignment', v)}
          />
          <ToggleRow
            label="Manual Product Assignment"
            value={formData.allowManualAssignment}
            onValueChange={(v) => updateField('allowManualAssignment', v)}
          />
          <ToggleRow
            label="Multi-Category Assignment"
            value={formData.allowMultiCategoryAssignment}
            onValueChange={(v) => updateField('allowMultiCategoryAssignment', v)}
          />
          <InputField
            label="Product Count Limit"
            value={formData.productCountLimit.toString()}
            onChangeText={(v) => updateField('productCountLimit', parseInt(v) || 0)}
            placeholder="0 (unlimited)"
            keyboardType="numeric"
          />
        </SectionCard>

        {/* SEO Management */}
        <SectionCard title="SEO Settings" icon="google">
          <InputField
            label="Meta Title"
            value={formData.metaTitle}
            onChangeText={(v) => updateField('metaTitle', v)}
            placeholder="SEO title"
          />
          <TextAreaField
            label="Meta Description"
            value={formData.metaDescription}
            onChangeText={(v) => updateField('metaDescription', v)}
            placeholder="SEO description"
          />
          <InputField
            label="Meta Keywords"
            value={formData.metaKeywords}
            onChangeText={(v) => updateField('metaKeywords', v)}
            placeholder="keyword1, keyword2, keyword3"
          />
          <InputField
            label="Canonical URL"
            value={formData.canonicalUrl}
            onChangeText={(v) => updateField('canonicalUrl', v)}
            placeholder="https://store.com/category/"
          />
          
          <View style={styles.seoScoreContainer}>
            <Text style={styles.seoScoreLabel}>SEO Score</Text>
            <Text style={styles.seoScoreValue}>
              {formData.metaTitle && formData.metaDescription ? '85/100' : '45/100'}
            </Text>
          </View>
          
          <SEOPreviewCard
            title={formData.metaTitle || formData.name}
            description={formData.metaDescription || formData.description}
            url={formData.canonicalUrl || `https://store.com/category/${formData.slug}`}
          />
          
          {seoRecommendations.map((rec) => (
            <SEORecommendationCard key={rec.id} recommendation={rec} />
          ))}
        </SectionCard>

        {/* Analytics Settings */}
        <SectionCard title="Analytics Configuration" icon="chart-line">
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

        {/* Access Control */}
        <SectionCard title="Access Control" icon="shield-account">
          <DropdownField
            label="Access Level"
            value={accessOptions.find(a => a.value === formData.accessLevel)?.label || 'Public'}
            onPress={() => {}}
            options={accessOptions}
          />
        </SectionCard>

        {/* Organization Information */}
        <SectionCard title="Organization" icon="store">
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
          <TextAreaField
            label="Internal Notes"
            value={formData.internalNotes}
            onChangeText={(v) => updateField('internalNotes', v)}
            placeholder="Private notes about this category"
          />
        </SectionCard>

        {/* AI Recommendations */}
        <AIInsightCard />

        {/* Validation Checklist */}
        <SectionCard title="Category Readiness" icon="check-circle">
          <ValidationChecklist items={validationItems} />
        </SectionCard>
      </Animated.ScrollView>

      {/* Sticky Bottom Action Bar */}
      <Animated.View entering={FadeInUp.springify()} style={[styles.bottomActionBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Save Draft</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tertiaryButton}>
          <Text style={styles.tertiaryButtonText}>Preview</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={handleSave}>
          <Text style={styles.primaryButtonText}>Create Category</Text>
        </TouchableOpacity>
      </Animated.View>
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
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 80,
  },
  dropdownContainer: {
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
  previewIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
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
  previewSlug: {
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
  imageUploadCard: {
    marginBottom: 16,
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
    height: 8,
  },
  helperText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 8,
  },
  statusSelectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  hierarchyPreview: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  hierarchyPreviewTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  hierarchyTree: {
    alignItems: 'flex-start',
  },
  hierarchyNode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  hierarchyNodeCurrent: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  hierarchyNodeName: {
    fontSize: 13,
    color: '#6B7280',
  },
  hierarchyNodeNameCurrent: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  hierarchyLine: {
    alignItems: 'center',
    marginLeft: 8,
    marginVertical: 4,
  },
  hierarchyLineVertical: {
    width: 2,
    height: 16,
    backgroundColor: '#D1D5DB',
  },
  hierarchyLineHorizontal: {
    width: 16,
    height: 2,
    backgroundColor: '#D1D5DB',
    marginLeft: 8,
  },
  seoScoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  seoScoreLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  seoScoreValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  seoPreviewCard: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  seoPreviewTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  seoPreviewUrl: {
    fontSize: 11,
    color: '#10B981',
    marginBottom: 4,
  },
  seoPreviewDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  seoRecommendation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  seoRecommendationText: {
    flex: 1,
    fontSize: 12,
    color: '#374151',
  },
  validationContainer: {
    gap: 12,
  },
  validationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  validationCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  validationCircleCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  validationLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  validationLabelCompleted: {
    color: '#10B981',
    textDecorationLine: 'line-through',
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
});