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
    FadeInDown,
    FadeInUp,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// TYPES & INTERFACES
// ============================================

interface BannerFormData {
  name: string;
  campaignName: string;
  title: string;
  subtitle: string;
  description: string;
  internalNotes: string;
  desktopImage: string | null;
  mobileImage: string | null;
  placement: string;
  actionType: 'product' | 'category' | 'collection' | 'url' | 'none';
  destinationId: string;
  buttonLabel: string;
  buttonColor: string;
  startDate: string;
  endDate: string;
  audience: string[];
  priority: 'low' | 'normal' | 'high' | 'critical';
  position: number;
  isEnabled: boolean;
  isFeatured: boolean;
  isSticky: boolean;
  autoHideOnExpiry: boolean;
  status: 'draft' | 'scheduled' | 'published' | 'paused';
  themeColor: string;
  badgeText: string;
  campaignTag: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  trackingEnabled: boolean;
}

interface Placement {
  id: string;
  name: string;
  description: string;
}

interface AudienceOption {
  id: string;
  name: string;
}

interface ValidationItem {
  id: string;
  label: string;
  completed: boolean;
}

// ============================================
// DUMMY DATA
// ============================================

const initialFormData: BannerFormData = {
  name: '',
  campaignName: '',
  title: '',
  subtitle: '',
  description: '',
  internalNotes: '',
  desktopImage: null,
  mobileImage: null,
  placement: 'homepage_hero',
  actionType: 'product',
  destinationId: '',
  buttonLabel: 'Shop Now',
  buttonColor: '#3B82F6',
  startDate: '',
  endDate: '',
  audience: ['all'],
  priority: 'normal',
  position: 0,
  isEnabled: true,
  isFeatured: false,
  isSticky: false,
  autoHideOnExpiry: true,
  status: 'draft',
  themeColor: '#3B82F6',
  badgeText: '',
  campaignTag: '',
  utmSource: '',
  utmMedium: '',
  utmCampaign: '',
  trackingEnabled: true,
};

const placements: Placement[] = [
  { id: 'homepage_hero', name: 'Homepage Hero', description: 'Full width hero banner at the top' },
  { id: 'homepage_slider', name: 'Homepage Slider', description: 'Rotating carousel banner' },
  { id: 'category_page', name: 'Category Page', description: 'Top of category pages' },
  { id: 'product_page', name: 'Product Page', description: 'Below product information' },
  { id: 'flash_sale', name: 'Flash Sale Section', description: 'Limited time offers section' },
  { id: 'checkout', name: 'Checkout Page', description: 'Checkout page banner' },
  { id: 'offers', name: 'Offers Section', description: 'Promotions area' },
];

const audienceOptions: AudienceOption[] = [
  { id: 'all', name: 'All Users' },
  { id: 'new', name: 'New Users' },
  { id: 'returning', name: 'Returning Users' },
  { id: 'vip', name: 'VIP Members' },
  { id: 'premium', name: 'Premium Customers' },
];

const priorityOptions = [
  { id: 'low', label: 'Low', color: '#6B7280' },
  { id: 'normal', label: 'Normal', color: '#3B82F6' },
  { id: 'high', label: 'High', color: '#F59E0B' },
  { id: 'critical', label: 'Critical', color: '#EF4444' },
];

const colorOptions = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'];

// ============================================
// REUSABLE COMPONENTS
// ============================================

const SectionHeader = ({ title, icon, required }: { title: string; icon?: string; required?: boolean }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionTitleContainer}>
      {icon && <MaterialCommunityIcons name={icon as any} size={20} color="#3B82F6" style={styles.sectionIcon} />}
      <Text style={styles.sectionTitle}>{title}</Text>
      {required && <Text style={styles.requiredStar}>*</Text>}
    </View>
  </View>
);

const FormSection = ({ title, icon, required, children }: { title: string; icon?: string; required?: boolean; children: React.ReactNode }) => (
  <Animated.View entering={FadeInUp.delay(100).springify().damping(15)} style={styles.formCard}>
    <SectionHeader title={title} icon={icon} required={required} />
    {children}
  </Animated.View>
);

const InputField = ({ label, value, onChangeText, placeholder, required, keyboardType }: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  required?: boolean;
  keyboardType?: any;
}) => (
  <View style={styles.inputContainer}>
    <View style={styles.inputLabelContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      {required && <Text style={styles.requiredStar}>*</Text>}
    </View>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      keyboardType={keyboardType}
    />
  </View>
);

const TextAreaField = ({ label, value, onChangeText, placeholder }: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
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

const ImageUploadCard = ({ title, image, onUpload, onRemove, aspect }: {
  title: string;
  image: string | null;
  onUpload: () => void;
  onRemove: () => void;
  aspect?: 'desktop' | 'mobile';
}) => (
  <View style={styles.imageUploadCard}>
    <Text style={styles.imageUploadTitle}>{title}</Text>
    {image ? (
      <View style={styles.imagePreviewContainer}>
        <Image source={{ uri: image }} style={[styles.imagePreview, aspect === 'desktop' && styles.imagePreviewDesktop, aspect === 'mobile' && styles.imagePreviewMobile]} />
        <View style={styles.imagePreviewActions}>
          <TouchableOpacity onPress={onUpload} style={styles.imagePreviewButton}>
            <Ionicons name="refresh" size={16} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onRemove} style={[styles.imagePreviewButton, styles.imagePreviewButtonDanger]}>
            <Ionicons name="trash" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    ) : (
      <TouchableOpacity onPress={onUpload} style={styles.uploadPlaceholder}>
        <MaterialCommunityIcons name="image-plus" size={36} color="#9CA3AF" />
        <Text style={styles.uploadText}>Upload {title}</Text>
        <Text style={styles.uploadSubtext}>JPG, PNG, WEBP</Text>
      </TouchableOpacity>
    )}
  </View>
);

const PlacementCard = ({ placement, selected, onSelect }: { placement: Placement; selected: boolean; onSelect: () => void }) => (
  <TouchableOpacity onPress={onSelect} style={[styles.placementCard, selected && styles.placementCardSelected]}>
    <View style={[styles.placementRadio, selected && styles.placementRadioSelected]} />
    <View style={styles.placementContent}>
      <Text style={styles.placementName}>{placement.name}</Text>
      <Text style={styles.placementDescription}>{placement.description}</Text>
    </View>
  </TouchableOpacity>
);

const AudienceChip = ({ option, selected, onSelect }: { option: AudienceOption; selected: boolean; onSelect: () => void }) => (
  <TouchableOpacity onPress={onSelect} style={[styles.audienceChip, selected && styles.audienceChipSelected]}>
    <Text style={[styles.audienceChipText, selected && styles.audienceChipTextSelected]}>{option.name}</Text>
  </TouchableOpacity>
);

const PriorityChip = ({ option, selected, onSelect }: { option: { id: string; label: string; color: string }; selected: boolean; onSelect: () => void }) => (
  <TouchableOpacity onPress={onSelect} style={[styles.priorityChip, selected && { backgroundColor: option.color, borderColor: option.color }]}>
    <Text style={[styles.priorityChipText, selected && { color: '#FFFFFF' }]}>{option.label}</Text>
  </TouchableOpacity>
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
          {item.completed && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
        </View>
        <Text style={[styles.validationLabel, item.completed && styles.validationLabelCompleted]}>{item.label}</Text>
      </View>
    ))}
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
          <Text style={styles.aiInsightTitle}>AI Marketing Insight</Text>
          <Text style={styles.aiInsightMessage}>
            Homepage placement typically generates 3x more impressions than category pages.
            Short, action-oriented headlines (under 10 words) see 20% higher CTR.
            Featured banners during weekends show 15% better conversion rates.
          </Text>
        </View>
      </View>
    </LinearGradient>
  </Animated.View>
);

// ============================================
// MAIN ADD BANNER SCREEN
// ============================================

export default function AddBannerScreen() {
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState<BannerFormData>(initialFormData);
  const [selectedPlacement, setSelectedPlacement] = useState('homepage_hero');
  const [selectedAudience, setSelectedAudience] = useState<string[]>(['all']);
  const [selectedPriority, setSelectedPriority] = useState('normal');
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

  const updateField = useCallback((field: keyof BannerFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const pickImage = useCallback(async (type: 'desktop' | 'mobile') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'desktop' ? [16, 9] : [9, 16],
      quality: 0.8,
    });
    if (!result.canceled) {
      updateField(`${type}Image` as keyof BannerFormData, result.assets[0].uri);
    }
  }, []);

  const removeImage = useCallback((type: 'desktop' | 'mobile') => {
    updateField(`${type}Image` as keyof BannerFormData, null);
  }, []);

  const toggleAudience = useCallback((audienceId: string) => {
    setSelectedAudience(prev =>
      prev.includes(audienceId) ? prev.filter(id => id !== audienceId) : [...prev, audienceId]
    );
    updateField('audience', selectedAudience);
  }, [selectedAudience]);

  const validationItems: ValidationItem[] = [
    { id: '1', label: 'Banner Name Added', completed: !!formData.name },
    { id: '2', label: 'Images Uploaded', completed: !!(formData.desktopImage || formData.mobileImage) },
    { id: '3', label: 'Placement Selected', completed: !!formData.placement },
    { id: '4', label: 'CTA Configured', completed: !!formData.buttonLabel },
    { id: '5', label: 'Schedule Configured', completed: !!formData.startDate && !!formData.endDate },
    { id: '6', label: 'Tracking Enabled', completed: formData.trackingEnabled },
  ];

  const completedCount = validationItems.filter(i => i.completed).length;
  const totalCount = validationItems.length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      <Animated.View style={[styles.headerContainer, headerAnimatedStyle]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Banner</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerButton}>
              <MaterialCommunityIcons name="content-save-outline" size={22} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="ellipsis-horizontal" size={22} color="#1F2937" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* Live Banner Preview */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.previewCard}>
          <LinearGradient
            colors={[formData.themeColor, `${formData.themeColor}CC`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.previewGradient}
          >
            <View style={styles.previewBadge}>
              <Text style={styles.previewBadgeText}>{formData.badgeText || 'PROMOTION'}</Text>
            </View>
            <Text style={styles.previewTitle}>{formData.title || 'Summer Mega Sale'}</Text>
            <Text style={styles.previewSubtitle}>{formData.subtitle || 'Up to 50% off on selected items'}</Text>
            <View style={[styles.previewButton, { backgroundColor: formData.buttonColor }]}>
              <Text style={styles.previewButtonText}>{formData.buttonLabel || 'Shop Now'}</Text>
            </View>
            <Text style={styles.previewCampaign}>{formData.campaignName || 'Campaign Name'}</Text>
          </LinearGradient>
        </Animated.View>

        {/* Banner Basic Information */}
        <FormSection title="Banner Details" icon="information-outline" required>
          <InputField
            label="Banner Name"
            value={formData.name}
            onChangeText={(v) => updateField('name', v)}
            placeholder="e.g., Summer Sale 2024"
            required
          />
          <InputField
            label="Campaign Name"
            value={formData.campaignName}
            onChangeText={(v) => updateField('campaignName', v)}
            placeholder="e.g., Summer Campaign"
          />
          <InputField
            label="Banner Title"
            value={formData.title}
            onChangeText={(v) => updateField('title', v)}
            placeholder="Main headline text"
          />
          <InputField
            label="Banner Subtitle"
            value={formData.subtitle}
            onChangeText={(v) => updateField('subtitle', v)}
            placeholder="Supporting text"
          />
          <TextAreaField
            label="Description"
            value={formData.description}
            onChangeText={(v) => updateField('description', v)}
            placeholder="Detailed banner description"
          />
          <TextAreaField
            label="Internal Notes"
            value={formData.internalNotes}
            onChangeText={(v) => updateField('internalNotes', v)}
            placeholder="Admin-only notes"
          />
        </FormSection>

        {/* Banner Media Upload */}
        <FormSection title="Banner Media" icon="image-multiple" required>
          <ImageUploadCard
            title="Desktop Banner (16:9)"
            image={formData.desktopImage}
            onUpload={() => pickImage('desktop')}
            onRemove={() => removeImage('desktop')}
            aspect="desktop"
          />
          <View style={styles.imageSpacer} />
          <ImageUploadCard
            title="Mobile Banner (9:16)"
            image={formData.mobileImage}
            onUpload={() => pickImage('mobile')}
            onRemove={() => removeImage('mobile')}
            aspect="mobile"
          />
          <Text style={styles.helperText}>Recommended: Desktop 1920x1080px, Mobile 1080x1920px. Max 2MB each.</Text>
        </FormSection>

        {/* Banner Placement */}
        <FormSection title="Placement Configuration" icon="view-dashboard" required>
          {placements.map((placement) => (
            <PlacementCard
              key={placement.id}
              placement={placement}
              selected={selectedPlacement === placement.id}
              onSelect={() => {
                setSelectedPlacement(placement.id);
                updateField('placement', placement.id);
              }}
            />
          ))}
        </FormSection>

        {/* Navigation & Action */}
        <FormSection title="Banner Action" icon="cursor-default-click" required>
          <View style={styles.actionTypeContainer}>
            {['product', 'category', 'collection', 'url', 'none'].map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => updateField('actionType', type)}
                style={[styles.actionTypeChip, formData.actionType === type && styles.actionTypeChipSelected]}
              >
                <Text style={[styles.actionTypeText, formData.actionType === type && styles.actionTypeTextSelected]}>
                  {type === 'product' ? 'Product' : type === 'category' ? 'Category' : type === 'collection' ? 'Collection' : type === 'url' ? 'External URL' : 'No Action'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {formData.actionType !== 'none' && (
            <>
              <InputField
                label={formData.actionType === 'url' ? 'Destination URL' : `${formData.actionType.charAt(0).toUpperCase() + formData.actionType.slice(1)} ID or Slug`}
                value={formData.destinationId}
                onChangeText={(v) => updateField('destinationId', v)}
                placeholder={formData.actionType === 'url' ? 'https://example.com' : 'e.g., product-123'}
                required
              />
              <InputField
                label="Button Label"
                value={formData.buttonLabel}
                onChangeText={(v) => updateField('buttonLabel', v)}
                placeholder="e.g., Shop Now"
                required
              />
            </>
          )}
          <Text style={styles.inputLabel}>Button Color</Text>
          <ColorPicker selected={formData.buttonColor} onSelect={(v) => updateField('buttonColor', v)} />
        </FormSection>

        {/* Campaign Scheduling */}
        <FormSection title="Campaign Schedule" icon="calendar" required>
          <InputField
            label="Start Date"
            value={formData.startDate}
            onChangeText={(v) => updateField('startDate', v)}
            placeholder="YYYY-MM-DD"
            required
          />
          <InputField
            label="End Date"
            value={formData.endDate}
            onChangeText={(v) => updateField('endDate', v)}
            placeholder="YYYY-MM-DD"
            required
          />
        </FormSection>

        {/* Audience Targeting */}
        <FormSection title="Target Audience" icon="account-group">
          <View style={styles.audienceContainer}>
            {audienceOptions.map((option) => (
              <AudienceChip
                key={option.id}
                option={option}
                selected={selectedAudience.includes(option.id)}
                onSelect={() => toggleAudience(option.id)}
              />
            ))}
          </View>
        </FormSection>

        {/* Priority Management */}
        <FormSection title="Priority Settings" icon="chart-line">
          <View style={styles.priorityContainer}>
            {priorityOptions.map((option) => (
              <PriorityChip
                key={option.id}
                option={option}
                selected={selectedPriority === option.id}
                onSelect={() => {
                  setSelectedPriority(option.id);
                  updateField('priority', option.id);
                }}
              />
            ))}
          </View>
          <InputField
            label="Display Position"
            value={formData.position.toString()}
            onChangeText={(v) => updateField('position', parseInt(v) || 0)}
            placeholder="0"
            keyboardType="numeric"
          />
        </FormSection>

        {/* Visibility Controls */}
        <FormSection title="Visibility Rules" icon="eye">
          <ToggleRow
            label="Enable Banner"
            value={formData.isEnabled}
            onValueChange={(v) => updateField('isEnabled', v)}
          />
          <ToggleRow
            label="Featured Banner"
            value={formData.isFeatured}
            onValueChange={(v) => updateField('isFeatured', v)}
            description="Highlight on homepage"
          />
          <ToggleRow
            label="Sticky Promotion"
            value={formData.isSticky}
            onValueChange={(v) => updateField('isSticky', v)}
            description="Remain visible while scrolling"
          />
          <ToggleRow
            label="Auto Hide On Expiry"
            value={formData.autoHideOnExpiry}
            onValueChange={(v) => updateField('autoHideOnExpiry', v)}
          />
          <View style={styles.statusContainer}>
            {['draft', 'scheduled', 'published', 'paused'].map((status) => (
              <TouchableOpacity
                key={status}
                onPress={() => updateField('status', status)}
                style={[styles.statusChip, formData.status === status && styles.statusChipSelected]}
              >
                <Text style={[styles.statusChipText, formData.status === status && styles.statusChipTextSelected]}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </FormSection>

        {/* Performance Forecast */}
        <FormSection title="Expected Performance" icon="chart-line">
          <View style={styles.forecastContainer}>
            <View style={styles.forecastMetric}>
              <Text style={styles.forecastLabel}>Est. Reach</Text>
              <Text style={styles.forecastValue}>250K+</Text>
            </View>
            <View style={styles.forecastMetric}>
              <Text style={styles.forecastLabel}>Projected CTR</Text>
              <Text style={styles.forecastValue}>3.2%</Text>
            </View>
            <View style={styles.forecastMetric}>
              <Text style={styles.forecastLabel}>Est. Revenue</Text>
              <Text style={styles.forecastValue}>$18.5K</Text>
            </View>
            <View style={styles.forecastMetric}>
              <Text style={styles.forecastLabel}>Conversion Rate</Text>
              <Text style={styles.forecastValue}>2.4%</Text>
            </View>
          </View>
        </FormSection>

        {/* Banner Branding */}
        <FormSection title="Visual Branding" icon="palette">
          <Text style={styles.inputLabel}>Theme Color</Text>
          <ColorPicker selected={formData.themeColor} onSelect={(v) => updateField('themeColor', v)} />
          <InputField
            label="Badge Text"
            value={formData.badgeText}
            onChangeText={(v) => updateField('badgeText', v)}
            placeholder="e.g., LIMITED TIME"
          />
          <InputField
            label="Campaign Tag"
            value={formData.campaignTag}
            onChangeText={(v) => updateField('campaignTag', v)}
            placeholder="Internal tracking tag"
          />
        </FormSection>

        {/* Tracking Configuration */}
        <FormSection title="Tracking Configuration" icon="google-analytics">
          <InputField
            label="UTM Source"
            value={formData.utmSource}
            onChangeText={(v) => updateField('utmSource', v)}
            placeholder="e.g., newsletter"
          />
          <InputField
            label="UTM Medium"
            value={formData.utmMedium}
            onChangeText={(v) => updateField('utmMedium', v)}
            placeholder="e.g., email"
          />
          <InputField
            label="UTM Campaign"
            value={formData.utmCampaign}
            onChangeText={(v) => updateField('utmCampaign', v)}
            placeholder="e.g., summer_sale"
          />
          <ToggleRow
            label="Enable Analytics Tracking"
            value={formData.trackingEnabled}
            onValueChange={(v) => updateField('trackingEnabled', v)}
          />
        </FormSection>

        {/* AI Insights */}
        <AIInsightCard />

        {/* Validation Checklist */}
        <FormSection title="Launch Readiness" icon="check-circle">
          <ValidationChecklist items={validationItems} />
          <View style={styles.completionBarContainer}>
            <View style={styles.completionBar}>
              <View style={[styles.completionBarFill, { width: `${(completedCount / totalCount) * 100}%` }]} />
            </View>
            <Text style={styles.completionText}>{completedCount}/{totalCount} complete</Text>
          </View>
        </FormSection>

        {/* Campaign Summary */}
        <FormSection title="Campaign Summary" icon="file-document">
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Banner Name:</Text>
              <Text style={styles.summaryValue}>{formData.name || 'Not set'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Placement:</Text>
              <Text style={styles.summaryValue}>{placements.find(p => p.id === selectedPlacement)?.name || 'Not selected'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Campaign Duration:</Text>
              <Text style={styles.summaryValue}>{formData.startDate && formData.endDate ? `${formData.startDate} to ${formData.endDate}` : 'Not set'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Audience:</Text>
              <Text style={styles.summaryValue}>{selectedAudience.map(a => audienceOptions.find(o => o.id === a)?.name).join(', ')}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Priority:</Text>
              <Text style={styles.summaryValue}>{priorityOptions.find(p => p.id === selectedPriority)?.label}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Status:</Text>
              <Text style={styles.summaryValue}>{formData.status.charAt(0).toUpperCase() + formData.status.slice(1)}</Text>
            </View>
          </View>
        </FormSection>
      </Animated.ScrollView>

      {/* Sticky Bottom Action Bar */}
      <Animated.View entering={FadeInUp.springify()} style={[styles.bottomActionBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Save Draft</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tertiaryButton}>
          <Text style={styles.tertiaryButtonText}>Preview</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Publish Banner</Text>
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
  scrollContent: {
    paddingTop: 16,
  },
  previewCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  previewGradient: {
    padding: 24,
    alignItems: 'center',
  },
  previewBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  previewBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  previewTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  previewSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 16,
  },
  previewButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 30,
    marginBottom: 12,
  },
  previewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  previewCampaign: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  formCard: {
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
  requiredStar: {
    color: '#EF4444',
    marginLeft: 4,
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
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  toggleDescription: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
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
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
  },
  uploadSubtext: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 140,
    borderRadius: 16,
  },
  imagePreviewDesktop: {
    height: 100,
  },
  imagePreviewMobile: {
    height: 200,
  },
  imagePreviewActions: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  imagePreviewButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    marginTop: 4,
  },
  placementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  placementCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  placementRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
  },
  placementRadioSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#3B82F6',
  },
  placementContent: {
    flex: 1,
  },
  placementName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  placementDescription: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  actionTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  actionTypeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
  },
  actionTypeChipSelected: {
    backgroundColor: '#3B82F6',
  },
  actionTypeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
  },
  actionTypeTextSelected: {
    color: '#FFFFFF',
  },
  audienceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  audienceChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
  },
  audienceChipSelected: {
    backgroundColor: '#3B82F6',
  },
  audienceChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
  },
  audienceChipTextSelected: {
    color: '#FFFFFF',
  },
  priorityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  priorityChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  priorityChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
  },
  statusChipSelected: {
    backgroundColor: '#3B82F6',
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
  },
  statusChipTextSelected: {
    color: '#FFFFFF',
  },
  colorPickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
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
  forecastContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  forecastMetric: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  forecastLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  forecastValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
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
    width: 18,
    height: 18,
    borderRadius: 9,
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
  completionBarContainer: {
    marginTop: 16,
  },
  completionBar: {
    height: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    overflow: 'hidden',
  },
  completionBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  completionText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  summaryContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1F2937',
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