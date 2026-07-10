import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
    FadeInDown,
    FadeInLeft,
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

interface ProductTag {
  id: string;
  name: string;
}

interface ChangeHistory {
  id: string;
  action: string;
  editor: string;
  timestamp: string;
}

interface ValidationItem {
  id: string;
  label: string;
  completed: boolean;
}

interface SEOData {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  slug: string;
  canonicalUrl: string;
}

interface ProductData {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  shortDescription: string;
  fullDescription: string;
  brand: string;
  productType: 'physical' | 'digital';
  status: 'published' | 'draft' | 'archived' | 'pending_review';
  mainCategory: string;
  subCategory: string;
  childCategory: string;
  collection: string;
  tags: ProductTag[];
  regularPrice: number;
  salePrice: number;
  costPrice: number;
  taxPercentage: number;
  taxClass: string;
  currency: string;
  stockQuantity: number;
  warehouseStock: number;
  reservedStock: number;
  lowStockThreshold: number;
  inventoryStatus: 'in_stock' | 'low_stock' | 'out_of_stock' | 'backorder';
  trackInventory: boolean;
  allowBackorders: boolean;
  stockNotifications: boolean;
  weight: number;
  length: number;
  width: number;
  height: number;
  shippingClass: string;
  packageType: string;
  originLocation: string;
  vendor: string;
  supplier: string;
  storeLocation: string;
  department: string;
  manager: string;
  internalNotes: string;
  isFeatured: boolean;
  isBestSeller: boolean;
  isRecommended: boolean;
  isTrending: boolean;
  isNewArrival: boolean;
  isLimitedOffer: boolean;
  isFlashSale: boolean;
  publishDate: string;
  saleStartDate: string;
  saleEndDate: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  totalSales: number;
  revenueGenerated: number;
  unitsSold: number;
  conversionRate: number;
  averageRating: number;
  wishlistCount: number;
  views: number;
}

// ============================================
// DUMMY PRODUCT DATA
// ============================================

const productImages: ProductImage[] = [
  { id: '1', uri: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', isCover: true },
  { id: '2', uri: 'https://images.unsplash.com/photo-1577174881658-0f30ed549adc?w=400', isCover: false },
  { id: '3', uri: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400', isCover: false },
  { id: '4', uri: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400', isCover: false },
];

const productVariants: ProductVariant[] = [
  { id: '1', name: 'Color', options: ['Black', 'White', 'Blue'] },
  { id: '2', name: 'Size', options: ['S', 'M', 'L', 'XL'] },
];

const productAttributes: ProductAttribute[] = [
  { id: '1', name: 'Material', value: 'Premium Leather' },
  { id: '2', name: 'Weight', value: '250g' },
  { id: '3', name: 'Battery Life', value: '30 hours' },
  { id: '4', name: 'Water Resistant', value: 'IPX7' },
];

const productTags: ProductTag[] = [
  { id: '1', name: 'wireless' },
  { id: '2', name: 'premium' },
  { id: '3', name: 'best-seller' },
  { id: '4', name: 'new-arrival' },
];

const changeHistory: ChangeHistory[] = [
  { id: '1', action: 'Price updated from $399.99 to $299.99', editor: 'Alex Morgan', timestamp: '2 hours ago' },
  { id: '2', action: 'Stock quantity changed to 145', editor: 'Sarah Chen', timestamp: '1 day ago' },
  { id: '3', action: 'Description updated', editor: 'Alex Morgan', timestamp: '3 days ago' },
  { id: '4', action: 'Product images updated', editor: 'Mike Johnson', timestamp: '5 days ago' },
  { id: '5', action: 'Category changed to Electronics', editor: 'Sarah Chen', timestamp: '1 week ago' },
];

const validationItems: ValidationItem[] = [
  { id: '1', label: 'Product Information Complete', completed: true },
  { id: '2', label: 'Images Added (4/5+)', completed: true },
  { id: '3', label: 'Inventory Configured', completed: true },
  { id: '4', label: 'SEO Optimized', completed: false },
  { id: '5', label: 'Shipping Added', completed: true },
  { id: '6', label: 'Pricing Configured', completed: true },
];

const seoData: SEOData = {
  metaTitle: 'Premium Wireless Headphones Pro | Best Sound Quality',
  metaDescription: 'Experience studio-quality sound with our premium wireless headphones. 30-hour battery life, noise cancellation, and comfortable design.',
  metaKeywords: 'wireless headphones, premium audio, noise cancellation, bluetooth headphones',
  slug: 'premium-wireless-headphones-pro',
  canonicalUrl: 'https://store.com/products/premium-wireless-headphones',
};

const productData: ProductData = {
  id: '1',
  name: 'Premium Wireless Headphones Pro',
  sku: 'SKU-1001',
  barcode: '8901234567890',
  shortDescription: 'Experience studio-quality sound with premium wireless headphones featuring active noise cancellation.',
  fullDescription: 'Experience unparalleled audio quality with our Premium Wireless Headphones Pro. Designed for audiophiles and professionals, these headphones deliver crystal-clear sound with deep bass and detailed highs. Features include active noise cancellation, 30-hour battery life, comfortable memory foam ear cushions, and seamless Bluetooth 5.0 connectivity. Perfect for travel, work, and daily use.',
  brand: 'Sony',
  productType: 'physical',
  status: 'published',
  mainCategory: 'Electronics',
  subCategory: 'Audio',
  childCategory: 'Headphones',
  collection: 'Summer Sale 2024',
  tags: productTags,
  regularPrice: 299.99,
  salePrice: 249.99,
  costPrice: 149.99,
  taxPercentage: 10,
  taxClass: 'Standard',
  currency: 'USD',
  stockQuantity: 145,
  warehouseStock: 200,
  reservedStock: 55,
  lowStockThreshold: 20,
  inventoryStatus: 'in_stock',
  trackInventory: true,
  allowBackorders: false,
  stockNotifications: true,
  weight: 0.35,
  length: 20,
  width: 18,
  height: 8,
  shippingClass: 'Standard',
  packageType: 'Box',
  originLocation: 'New York, USA',
  vendor: 'Sony Electronics',
  supplier: 'TechDistro Inc.',
  storeLocation: 'Main Warehouse',
  department: 'Electronics',
  manager: 'John Smith',
  internalNotes: 'High demand product. Restock every 2 weeks.',
  isFeatured: true,
  isBestSeller: true,
  isRecommended: true,
  isTrending: true,
  isNewArrival: false,
  isLimitedOffer: true,
  isFlashSale: false,
  publishDate: '2024-01-15',
  saleStartDate: '2024-06-01',
  saleEndDate: '2024-07-31',
  createdAt: '2024-01-15',
  updatedAt: '2024-06-10',
  createdBy: 'Alex Morgan',
  updatedBy: 'Sarah Chen',
  totalSales: 342,
  revenueGenerated: 85500.58,
  unitsSold: 342,
  conversionRate: 4.8,
  averageRating: 4.7,
  wishlistCount: 1289,
  views: 15420,
};

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

const InputField = ({ label, value, onChangeText, placeholder, multiline, keyboardType, rightElement }: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: any;
  rightElement?: React.ReactNode;
}) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
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

const DropdownField = ({ label, value, onPress, options }: {
  label: string;
  value: string;
  onPress: () => void;
  options: string[];
}) => (
  <TouchableOpacity onPress={onPress} style={styles.dropdownContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={styles.dropdown}>
      <Text style={styles.dropdownText}>{value}</Text>
      <Ionicons name="chevron-down" size={20} color="#6B7280" />
    </View>
  </TouchableOpacity>
);

const ToggleField = ({ label, value, onValueChange, description }: {
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

const StatusBadge = ({ status }: { status: ProductData['status'] }) => {
  const config = {
    published: { label: 'Published', color: '#10B981', bg: '#D1FAE5' },
    draft: { label: 'Draft', color: '#8B5CF6', bg: '#EDE9FE' },
    archived: { label: 'Archived', color: '#6B7280', bg: '#F3F4F6' },
    pending_review: { label: 'Pending Review', color: '#F59E0B', bg: '#FEF3C7' },
  };
  const { label, color, bg } = config[status];
  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
};

const TagChip = ({ tag, onRemove }: { tag: ProductTag; onRemove: () => void }) => (
  <View style={styles.tagChip}>
    <Text style={styles.tagText}>{tag.name}</Text>
    <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Ionicons name="close" size={14} color="#6B7280" />
    </TouchableOpacity>
  </View>
);

const ImageCard = ({ image, onEdit, onRemove, onSetCover }: { image: ProductImage; onEdit: () => void; onRemove: () => void; onSetCover: () => void }) => (
  <View style={styles.imageCard}>
    <Image source={{ uri: image.uri }} style={styles.imageCardImage} />
    {image.isCover && (
      <View style={styles.coverBadge}>
        <Text style={styles.coverBadgeText}>Cover</Text>
      </View>
    )}
    <View style={styles.imageCardActions}>
      <TouchableOpacity onPress={onEdit} style={styles.imageActionButton}>
        <Ionicons name="create-outline" size={16} color="#FFFFFF" />
      </TouchableOpacity>
      <TouchableOpacity onPress={onRemove} style={styles.imageActionButton}>
        <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
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

const PerformanceMetricCard = ({ title, value, change }: { title: string; value: string; change?: number }) => (
  <View style={styles.performanceMetricCard}>
    <Text style={styles.performanceMetricTitle}>{title}</Text>
    <Text style={styles.performanceMetricValue}>{value}</Text>
    {change !== undefined && (
      <View style={[styles.performanceChange, { backgroundColor: change >= 0 ? '#D1FAE5' : '#FEE2E2' }]}>
        <Ionicons name={change >= 0 ? 'arrow-up' : 'arrow-down'} size={10} color={change >= 0 ? '#10B981' : '#EF4444'} />
        <Text style={[styles.performanceChangeText, { color: change >= 0 ? '#10B981' : '#EF4444' }]}>{Math.abs(change)}%</Text>
      </View>
    )}
  </View>
);

const TimelineItem = ({ item, index }: { item: ChangeHistory; index: number }) => (
  <Animated.View entering={FadeInLeft.delay(index * 30).springify()} style={styles.timelineItem}>
    <View style={styles.timelineDot} />
    <View style={styles.timelineContent}>
      <Text style={styles.timelineAction}>{item.action}</Text>
      <View style={styles.timelineMeta}>
        <Text style={styles.timelineEditor}>{item.editor}</Text>
        <Text style={styles.timelineTime}>{item.timestamp}</Text>
      </View>
    </View>
  </Animated.View>
);

const ValidationChecklist = ({ items }: { items: ValidationItem[] }) => (
  <View style={styles.validationContainer}>
    {items.map((item) => (
      <View key={item.id} style={styles.validationItem}>
        <View style={[styles.validationCircle, item.completed && styles.validationCircleCompleted]}>
          {item.completed && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
        </View>
        <Text style={[styles.validationLabel, item.completed && styles.validationLabelCompleted]}>
          {item.label}
        </Text>
      </View>
    ))}
  </View>
);

const SEOPreview = ({ seo }: { seo: SEOData }) => (
  <View style={styles.seoPreview}>
    <Text style={styles.seoPreviewTitle}>{seo.metaTitle}</Text>
    <Text style={styles.seoPreviewUrl}>{seo.canonicalUrl}</Text>
    <Text style={styles.seoPreviewDescription} numberOfLines={2}>{seo.metaDescription}</Text>
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
          <Text style={styles.aiInsightTitle}>AI Recommendation</Text>
          <Text style={styles.aiInsightMessage}>
            Products with 5+ images convert 24% better. Current stock may last only 7 days at current sales rate.
            Adding more keywords could improve SEO discoverability.
          </Text>
        </View>
      </View>
    </LinearGradient>
  </Animated.View>
);

// ============================================
// MAIN EDIT PRODUCT SCREEN
// ============================================

export default function EditProductScreen() {
  const insets = useSafeAreaInsets();
  const [product, setProduct] = useState<ProductData>(productData);
  const [images, setImages] = useState<ProductImage[]>(productImages);
  const [variants, setVariants] = useState<ProductVariant[]>(productVariants);
  const [attributes, setAttributes] = useState<ProductAttribute[]>(productAttributes);
  const [tags, setTags] = useState<ProductTag[]>(productTags);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
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

  const handleSave = useCallback(() => {
    setIsSaving(true);
    setSaveStatus('saving');
    setTimeout(() => {
      setIsSaving(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('unsaved'), 3000);
    }, 1000);
  }, []);

  const updateProductField = useCallback((field: keyof ProductData, value: any) => {
    setProduct(prev => ({ ...prev, [field]: value }));
    setSaveStatus('unsaved');
  }, []);

  const addTag = useCallback(() => {
    const newTag: ProductTag = { id: Date.now().toString(), name: 'new-tag' };
    setTags(prev => [...prev, newTag]);
    setSaveStatus('unsaved');
  }, []);

  const removeTag = useCallback((id: string) => {
    setTags(prev => prev.filter(t => t.id !== id));
    setSaveStatus('unsaved');
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      <Animated.View style={[styles.headerContainer, headerAnimatedStyle]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Product</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
              <MaterialCommunityIcons name="content-save-outline" size={24} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="ellipsis-horizontal" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>
        </View>
        {saveStatus !== 'saved' && (
          <Animated.View entering={FadeInDown.springify()} style={styles.saveStatusBar}>
            <Text style={styles.saveStatusText}>
              {saveStatus === 'saving' ? 'Saving changes...' : 'Unsaved changes'}
            </Text>
          </Animated.View>
        )}
      </Animated.View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* Product Overview Card */}
        <SectionCard title="Product Overview" icon="information-outline">
          <View style={styles.overviewContainer}>
            <Image source={{ uri: images.find(i => i.isCover)?.uri }} style={styles.overviewImage} />
            <View style={styles.overviewInfo}>
              <Text style={styles.overviewName}>{product.name}</Text>
              <Text style={styles.overviewSku}>SKU: {product.sku}</Text>
              <Text style={styles.overviewMeta}>{product.mainCategory} • {product.brand}</Text>
              <View style={styles.overviewStatusRow}>
                <StatusBadge status={product.status} />
                <Text style={styles.overviewUpdated}>Updated {product.updatedAt}</Text>
              </View>
              <View style={styles.overviewActions}>
                <TouchableOpacity style={styles.overviewAction}>
                  <Ionicons name="images-outline" size={16} color="#3B82F6" />
                  <Text style={styles.overviewActionText}>Images</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.overviewAction}>
                  <Ionicons name="eye-outline" size={16} color="#3B82F6" />
                  <Text style={styles.overviewActionText}>Preview</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.overviewAction}>
                  <Ionicons name="copy-outline" size={16} color="#3B82F6" />
                  <Text style={styles.overviewActionText}>Duplicate</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SectionCard>

        {/* Product Media Management */}
        <SectionCard title="Product Images" icon="image-multiple" onEdit={() => {}}>
          <View style={styles.imagesGrid}>
            {images.map((image) => (
              <ImageCard
                key={image.id}
                image={image}
                onEdit={() => {}}
                onRemove={() => {}}
                onSetCover={() => {}}
              />
            ))}
            <TouchableOpacity style={styles.addImageButton}>
              <Ionicons name="add" size={32} color="#3B82F6" />
              <Text style={styles.addImageText}>Add Image</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>Recommended: 1200x1200px, JPG or PNG. Add at least 5 images for better conversion.</Text>
        </SectionCard>

        {/* Basic Information */}
        <SectionCard title="Basic Information" icon="file-document-outline">
          <InputField
            label="Product Name"
            value={product.name}
            onChangeText={(v) => updateProductField('name', v)}
            placeholder="Enter product name"
          />
          <InputField
            label="Short Description"
            value={product.shortDescription}
            onChangeText={(v) => updateProductField('shortDescription', v)}
            placeholder="Brief description"
            multiline
          />
          <InputField
            label="Full Description"
            value={product.fullDescription}
            onChangeText={(v) => updateProductField('fullDescription', v)}
            placeholder="Detailed product description"
            multiline
          />
          <View style={styles.rowFields}>
            <InputField
              label="SKU"
              value={product.sku}
              onChangeText={(v) => updateProductField('sku', v)}
              placeholder="SKU"
            />
            <InputField
              label="Barcode"
              value={product.barcode}
              onChangeText={(v) => updateProductField('barcode', v)}
              placeholder="Barcode"
            />
          </View>
          <View style={styles.rowFields}>
            <DropdownField
              label="Brand"
              value={product.brand}
              onPress={() => {}}
              options={['Sony', 'Apple', 'Samsung', 'Nike']}
            />
            <DropdownField
              label="Product Type"
              value={product.productType}
              onPress={() => {}}
              options={['physical', 'digital']}
            />
          </View>
        </SectionCard>

        {/* Category Management */}
        <SectionCard title="Category & Tags" icon="tag-multiple">
          <View style={styles.rowFields}>
            <DropdownField
              label="Main Category"
              value={product.mainCategory}
              onPress={() => {}}
              options={['Electronics', 'Fashion', 'Home', 'Sports']}
            />
            <DropdownField
              label="Sub Category"
              value={product.subCategory}
              onPress={() => {}}
              options={['Audio', 'Wearables', 'Accessories']}
            />
          </View>
          <View style={styles.tagsContainer}>
            {tags.map((tag) => (
              <TagChip key={tag.id} tag={tag} onRemove={() => removeTag(tag.id)} />
            ))}
            <TouchableOpacity style={styles.addTagButton} onPress={addTag}>
              <Ionicons name="add" size={16} color="#3B82F6" />
              <Text style={styles.addTagText}>Add Tag</Text>
            </TouchableOpacity>
          </View>
        </SectionCard>

        {/* Pricing Management */}
        <SectionCard title="Pricing & Revenue" icon="currency-usd">
          <View style={styles.rowFields}>
            <InputField
              label="Regular Price"
              value={product.regularPrice.toString()}
              onChangeText={(v) => updateProductField('regularPrice', parseFloat(v) || 0)}
              placeholder="0.00"
              keyboardType="numeric"
            />
            <InputField
              label="Sale Price"
              value={product.salePrice.toString()}
              onChangeText={(v) => updateProductField('salePrice', parseFloat(v) || 0)}
              placeholder="0.00"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.rowFields}>
            <InputField
              label="Cost Price"
              value={product.costPrice.toString()}
              onChangeText={(v) => updateProductField('costPrice', parseFloat(v) || 0)}
              placeholder="0.00"
              keyboardType="numeric"
            />
            <InputField
              label="Tax %"
              value={product.taxPercentage.toString()}
              onChangeText={(v) => updateProductField('taxPercentage', parseFloat(v) || 0)}
              placeholder="0"
              keyboardType="numeric"
              rightElement={<Text style={styles.inputRightElement}>%</Text>}
            />
          </View>
          <View style={styles.pricingAnalytics}>
            <View style={styles.pricingMetric}>
              <Text style={styles.pricingMetricLabel}>Margin</Text>
              <Text style={styles.pricingMetricValue}>40%</Text>
            </View>
            <View style={styles.pricingMetric}>
              <Text style={styles.pricingMetricLabel}>Profit</Text>
              <Text style={styles.pricingMetricValue}>$100.00</Text>
            </View>
            <View style={styles.pricingMetric}>
              <Text style={styles.pricingMetricLabel}>Discount</Text>
              <Text style={styles.pricingMetricValue}>17%</Text>
            </View>
          </View>
        </SectionCard>

        {/* Inventory Management */}
        <SectionCard title="Inventory" icon="package-variant">
          <ToggleField
            label="Track Inventory"
            value={product.trackInventory}
            onValueChange={(v) => updateProductField('trackInventory', v)}
          />
          <View style={styles.rowFields}>
            <InputField
              label="Stock Quantity"
              value={product.stockQuantity.toString()}
              onChangeText={(v) => updateProductField('stockQuantity', parseInt(v) || 0)}
              placeholder="0"
              keyboardType="numeric"
            />
            <InputField
              label="Low Stock Threshold"
              value={product.lowStockThreshold.toString()}
              onChangeText={(v) => updateProductField('lowStockThreshold', parseInt(v) || 0)}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.inventoryAlert}>
            <MaterialCommunityIcons name="information-outline" size={16} color="#F59E0B" />
            <Text style={styles.inventoryAlertText}>Current stock may last approximately 7 days at current sales rate</Text>
          </View>
        </SectionCard>

        {/* Product Variants */}
        <SectionCard title="Variants" icon="view-grid" onEdit={() => {}}>
          {variants.map((variant) => (
            <VariantCard key={variant.id} variant={variant} onEdit={() => {}} onDelete={() => {}} />
          ))}
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add" size={20} color="#3B82F6" />
            <Text style={styles.addButtonText}>Add Variant</Text>
          </TouchableOpacity>
        </SectionCard>

        {/* Product Attributes */}
        <SectionCard title="Attributes" icon="format-list-bulleted">
          {attributes.map((attribute) => (
            <AttributeCard key={attribute.id} attribute={attribute} onEdit={() => {}} onDelete={() => {}} />
          ))}
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add" size={20} color="#3B82F6" />
            <Text style={styles.addButtonText}>Add Attribute</Text>
          </TouchableOpacity>
        </SectionCard>

        {/* SEO Management */}
        <SectionCard title="SEO Settings" icon="google">
          <InputField
            label="Meta Title"
            value={seoData.metaTitle}
            onChangeText={() => {}}
            placeholder="Meta title"
          />
          <InputField
            label="Meta Description"
            value={seoData.metaDescription}
            onChangeText={() => {}}
            placeholder="Meta description"
            multiline
          />
          <InputField
            label="Slug"
            value={seoData.slug}
            onChangeText={() => {}}
            placeholder="URL slug"
          />
          <View style={styles.seoScore}>
            <Text style={styles.seoScoreLabel}>SEO Score</Text>
            <Text style={styles.seoScoreValue}>92/100</Text>
          </View>
          <SEOPreview seo={seoData} />
        </SectionCard>

        {/* Performance Insights */}
        <SectionCard title="Performance Insights" icon="chart-line">
          <View style={styles.performanceGrid}>
            <PerformanceMetricCard title="Total Sales" value={product.totalSales.toString()} />
            <PerformanceMetricCard title="Revenue" value={`$${product.revenueGenerated.toLocaleString()}`} change={18} />
            <PerformanceMetricCard title="Conversion Rate" value={`${product.conversionRate}%`} change={5} />
            <PerformanceMetricCard title="Avg Rating" value={product.averageRating.toString()} />
          </View>
        </SectionCard>

        {/* Change History */}
        <SectionCard title="Recent Changes" icon="history">
          {changeHistory.map((item, index) => (
            <TimelineItem key={item.id} item={item} index={index} />
          ))}
        </SectionCard>

        {/* Validation Checklist */}
        <SectionCard title="Completion Checklist" icon="check-circle">
          <ValidationChecklist items={validationItems} />
        </SectionCard>

        {/* AI Insight Card */}
        <AIInsightCard />

        {/* Organization Information */}
        <SectionCard title="Organization" icon="store">
          <View style={styles.rowFields}>
            <InputField
              label="Vendor"
              value={product.vendor}
              onChangeText={(v) => updateProductField('vendor', v)}
              placeholder="Vendor"
            />
            <InputField
              label="Supplier"
              value={product.supplier}
              onChangeText={(v) => updateProductField('supplier', v)}
              placeholder="Supplier"
            />
          </View>
          <InputField
            label="Internal Notes"
            value={product.internalNotes}
            onChangeText={(v) => updateProductField('internalNotes', v)}
            placeholder="Internal notes"
            multiline
          />
          <View style={styles.auditInfo}>
            <Text style={styles.auditText}>Created by {product.createdBy} on {product.createdAt}</Text>
            <Text style={styles.auditText}>Last updated by {product.updatedBy} on {product.updatedAt}</Text>
          </View>
        </SectionCard>
      </Animated.ScrollView>

      {/* Sticky Bottom Action Bar */}
      <Animated.View entering={FadeInUp.springify()} style={[styles.bottomActionBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Preview</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dangerButton}>
          <Text style={styles.dangerButtonText}>Discard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={handleSave}>
          <Text style={styles.primaryButtonText}>Save Changes</Text>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveStatusBar: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 6,
    alignItems: 'center',
  },
  saveStatusText: {
    fontSize: 12,
    color: '#F59E0B',
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
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
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
    textAlignVertical: 'top',
  },
  inputRightElement: {
    position: 'absolute',
    right: 14,
    fontSize: 14,
    color: '#6B7280',
  },
  dropdownContainer: {
    marginBottom: 16,
    flex: 1,
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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  overviewContainer: {
    flexDirection: 'row',
  },
  overviewImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  overviewInfo: {
    flex: 1,
    marginLeft: 12,
  },
  overviewName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  overviewSku: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  overviewMeta: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  overviewStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  overviewUpdated: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  overviewActions: {
    flexDirection: 'row',
    gap: 16,
  },
  overviewAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  overviewActionText: {
    fontSize: 11,
    color: '#3B82F6',
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
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#374151',
  },
  addTagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3B82F6',
    gap: 4,
  },
  addTagText: {
    fontSize: 12,
    color: '#3B82F6',
  },
  pricingAnalytics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 8,
  },
  pricingMetric: {
    alignItems: 'center',
  },
  pricingMetricLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  pricingMetricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 2,
  },
  inventoryAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 12,
  },
  inventoryAlertText: {
    flex: 1,
    fontSize: 12,
    color: '#F59E0B',
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
  seoScore: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
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
  seoPreview: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  performanceMetricCard: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - 80) / 2,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
  },
  performanceMetricTitle: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  performanceMetricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  performanceChange: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
    gap: 2,
  },
  performanceChangeText: {
    fontSize: 9,
    fontWeight: '600',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginTop: 4,
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineAction: {
    fontSize: 13,
    color: '#1F2937',
    marginBottom: 4,
  },
  timelineMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineEditor: {
    fontSize: 11,
    color: '#6B7280',
  },
  timelineTime: {
    fontSize: 11,
    color: '#9CA3AF',
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
  auditInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  auditText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 4,
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
  dangerButton: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
});