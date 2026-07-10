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

interface CouponFormData {
  name: string;
  code: string;
  description: string;
  campaignName: string;
  internalNotes: string;
  discountType: 'percentage' | 'fixed' | 'free_shipping' | 'bogo' | 'bundle';
  discountValue: number;
  maxDiscountAmount: number;
  minOrderValue: number;
  startDate: string;
  endDate: string;
  totalUsageLimit: number;
  usagePerCustomer: number;
  allowMultipleRedemptions: boolean;
  stackable: boolean;
  autoApply: boolean;
  customerSegments: string[];
  minLifetimeValue: number;
  minTotalOrders: number;
  eligibleProducts: string[];
  excludedProducts: string[];
  eligibleCategories: string[];
  excludedCategories: string[];
  eligibleBrands: string[];
  excludedBrands: string[];
  minPurchaseAmount: number;
  maxPurchaseAmount: number;
  minQuantity: number;
  maxQuantity: number;
  firstOrderOnly: boolean;
  subscriptionOnly: boolean;
  paymentMethods: string[];
  shippingMethods: string[];
  bannerImage: string | null;
  colorTheme: string;
  promotionalLabel: string;
  badgeText: string;
  campaignIcon: string;
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'expired';
  visibility: 'visible' | 'admin_only' | 'hidden' | 'featured';
  marketingChannels: string[];
  ipRestriction: boolean;
  deviceRestriction: boolean;
  fraudDetection: boolean;
}

interface Segment {
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

const initialFormData: CouponFormData = {
  name: '',
  code: '',
  description: '',
  campaignName: '',
  internalNotes: '',
  discountType: 'percentage',
  discountValue: 0,
  maxDiscountAmount: 0,
  minOrderValue: 0,
  startDate: '',
  endDate: '',
  totalUsageLimit: 0,
  usagePerCustomer: 1,
  allowMultipleRedemptions: false,
  stackable: false,
  autoApply: false,
  customerSegments: [],
  minLifetimeValue: 0,
  minTotalOrders: 0,
  eligibleProducts: [],
  excludedProducts: [],
  eligibleCategories: [],
  excludedCategories: [],
  eligibleBrands: [],
  excludedBrands: [],
  minPurchaseAmount: 0,
  maxPurchaseAmount: 0,
  minQuantity: 0,
  maxQuantity: 0,
  firstOrderOnly: false,
  subscriptionOnly: false,
  paymentMethods: [],
  shippingMethods: [],
  bannerImage: null,
  colorTheme: '#8B5CF6',
  promotionalLabel: '',
  badgeText: '',
  campaignIcon: 'ticket-percent',
  status: 'draft',
  visibility: 'visible',
  marketingChannels: [],
  ipRestriction: false,
  deviceRestriction: false,
  fraudDetection: true,
};

const customerSegments: Segment[] = [
  { id: 'all', name: 'All Customers' },
  { id: 'new', name: 'New Customers' },
  { id: 'returning', name: 'Returning Customers' },
  { id: 'vip', name: 'VIP Customers' },
  { id: 'premium', name: 'Premium Members' },
  { id: 'inactive', name: 'Inactive Customers' },
];

const marketingChannelsList = [
  'Homepage Banner',
  'Email Campaign',
  'Push Notification',
  'SMS Campaign',
  'In-App Promotion',
  'Checkout Promotion',
];

const colorOptions = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'];

// ============================================
// REUSABLE COMPONENTS
// ============================================

const SectionHeader = ({ title, icon, required }: { title: string; icon?: string; required?: boolean }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionTitleContainer}>
      {icon && <MaterialCommunityIcons name={icon as any} size={20} color="#8B5CF6" style={styles.sectionIcon} />}
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

const InputField = ({ label, value, onChangeText, placeholder, keyboardType, required }: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: any;
  required?: boolean;
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

const NumericField = ({ label, value, onChangeText, placeholder, required }: {
  label: string;
  value: number;
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
      style={styles.input}
      value={value === 0 ? '' : value.toString()}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      keyboardType="numeric"
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
      trackColor={{ false: '#E5E7EB', true: '#8B5CF6' }}
      thumbColor="#FFFFFF"
    />
  </View>
);

const SelectionChip = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress}>
    <View style={[styles.selectionChip, selected && styles.selectionChipSelected]}>
      <Text style={[styles.selectionChipText, selected && styles.selectionChipTextSelected]}>{label}</Text>
    </View>
  </TouchableOpacity>
);

const DiscountTypeSelector = ({ selected, onSelect }: { selected: string; onSelect: (type: string) => void }) => (
  <View style={styles.discountTypeContainer}>
    {['percentage', 'fixed', 'free_shipping', 'bogo'].map((type) => (
      <TouchableOpacity
        key={type}
        onPress={() => onSelect(type)}
        style={[styles.discountTypeChip, selected === type && styles.discountTypeChipSelected]}
      >
        <Text style={[styles.discountTypeText, selected === type && styles.discountTypeTextSelected]}>
          {type === 'percentage' ? 'Percentage' : type === 'fixed' ? 'Fixed Amount' : type === 'free_shipping' ? 'Free Shipping' : 'BOGO'}
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
          <Text style={styles.aiInsightTitle}>AI Campaign Insight</Text>
          <Text style={styles.aiInsightMessage}>
            Percentage discounts between 15-25% typically generate the highest conversion rates.
            VIP customer campaigns show 32% stronger ROI. Free shipping promotions increase average
            order value by 18%. Consider limiting usage to improve coupon exclusivity.
          </Text>
        </View>
      </View>
    </LinearGradient>
  </Animated.View>
);

// ============================================
// MAIN CREATE COUPON SCREEN
// ============================================

export default function CreateCouponScreen() {
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState<CouponFormData>(initialFormData);
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [showValidation, setShowValidation] = useState(true);
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

  const updateField = useCallback((field: keyof CouponFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'name' && !formData.code) {
      const code = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
      if (code) setFormData(prev => ({ ...prev, [field]: value, code }));
    }
  }, [formData.code]);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) {
      updateField('bannerImage', result.assets[0].uri);
    }
  }, []);

  const toggleSegment = useCallback((segmentId: string) => {
    setSelectedSegments(prev =>
      prev.includes(segmentId) ? prev.filter(id => id !== segmentId) : [...prev, segmentId]
    );
    updateField('customerSegments', selectedSegments);
  }, [selectedSegments]);

  const toggleChannel = useCallback((channel: string) => {
    setSelectedChannels(prev =>
      prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]
    );
    updateField('marketingChannels', selectedChannels);
  }, [selectedChannels]);

  const validationItems: ValidationItem[] = [
    { id: '1', label: 'Coupon Name Added', completed: !!formData.name },
    { id: '2', label: 'Coupon Code Valid', completed: formData.code.length >= 3 },
    { id: '3', label: 'Discount Configured', completed: formData.discountValue > 0 || formData.discountType === 'free_shipping' },
    { id: '4', label: 'Usage Rules Defined', completed: formData.totalUsageLimit > 0 || formData.usagePerCustomer > 0 },
    { id: '5', label: 'Expiration Date Set', completed: !!formData.endDate },
    { id: '6', label: 'Target Audience Selected', completed: selectedSegments.length > 0 },
  ];

  const getDiscountDisplay = () => {
    if (formData.discountType === 'percentage') return `${formData.discountValue}% OFF`;
    if (formData.discountType === 'fixed') return `$${formData.discountValue} OFF`;
    if (formData.discountType === 'free_shipping') return 'FREE SHIPPING';
    if (formData.discountType === 'bogo') return 'BUY ONE GET ONE';
    return 'DISCOUNT';
  };

  const handleCreate = useCallback(() => {
    console.log('Creating coupon:', formData);
  }, [formData]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      <Animated.View style={[styles.headerContainer, headerAnimatedStyle]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Coupon</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerButton}>
              <MaterialCommunityIcons name="content-save-outline" size={22} color="#8B5CF6" />
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
        {/* Live Preview Card */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.previewCard}>
          <LinearGradient
            colors={[formData.colorTheme, `${formData.colorTheme}CC`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.previewGradient}
          >
            <View style={styles.previewHeader}>
              <Text style={styles.previewLabel}>COUPON PREVIEW</Text>
              <View style={styles.previewBadge}>
                <Text style={styles.previewBadgeText}>{formData.status.toUpperCase()}</Text>
              </View>
            </View>
            <View style={styles.previewContent}>
              <MaterialCommunityIcons name={formData.campaignIcon as any} size={40} color="#FFFFFF" />
              <Text style={styles.previewTitle}>{formData.name || 'New Coupon'}</Text>
              <Text style={styles.previewCode}>{formData.code || 'COUPONCODE'}</Text>
              <View style={styles.previewDiscount}>
                <Text style={styles.previewDiscountText}>{getDiscountDisplay()}</Text>
              </View>
              <Text style={styles.previewExpiry}>
                {formData.endDate ? `Valid until ${formData.endDate}` : 'No expiry set'}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Basic Information */}
        <FormSection title="Coupon Details" icon="information-outline" required>
          <InputField
            label="Coupon Name"
            value={formData.name}
            onChangeText={(v) => updateField('name', v)}
            placeholder="e.g., Summer Mega Sale"
            required
          />
          <InputField
            label="Coupon Code"
            value={formData.code}
            onChangeText={(v) => updateField('code', v.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            placeholder="e.g., SUMMER50"
            required
          />
          <TextAreaField
            label="Description"
            value={formData.description}
            onChangeText={(v) => updateField('description', v)}
            placeholder="Describe what customers get with this coupon"
          />
          <InputField
            label="Campaign Name"
            value={formData.campaignName}
            onChangeText={(v) => updateField('campaignName', v)}
            placeholder="e.g., Summer Marketing Campaign 2024"
          />
          <TextAreaField
            label="Internal Notes"
            value={formData.internalNotes}
            onChangeText={(v) => updateField('internalNotes', v)}
            placeholder="Admin-only notes about this campaign"
          />
        </FormSection>

        {/* Discount Configuration */}
        <FormSection title="Discount Settings" icon="sale" required>
          <DiscountTypeSelector selected={formData.discountType} onSelect={(t) => updateField('discountType', t)} />
          
          {formData.discountType !== 'free_shipping' && (
            <NumericField
              label={formData.discountType === 'percentage' ? 'Discount Percentage' : 'Discount Amount ($)'}
              value={formData.discountValue}
              onChangeText={(v) => updateField('discountValue', parseFloat(v) || 0)}
              placeholder={formData.discountType === 'percentage' ? 'e.g., 25' : 'e.g., 20'}
              required
            />
          )}
          
          {formData.discountType === 'percentage' && (
            <NumericField
              label="Maximum Discount Amount ($)"
              value={formData.maxDiscountAmount}
              onChangeText={(v) => updateField('maxDiscountAmount', parseFloat(v) || 0)}
              placeholder="0 for unlimited"
            />
          )}
          
          <NumericField
            label="Minimum Order Value ($)"
            value={formData.minOrderValue}
            onChangeText={(v) => updateField('minOrderValue', parseFloat(v) || 0)}
            placeholder="0 for no minimum"
          />
        </FormSection>

        {/* Validity Period */}
        <FormSection title="Validity Period" icon="calendar" required>
          <InputField
            label="Start Date"
            value={formData.startDate}
            onChangeText={(v) => updateField('startDate', v)}
            placeholder="YYYY-MM-DD"
          />
          <InputField
            label="End Date"
            value={formData.endDate}
            onChangeText={(v) => updateField('endDate', v)}
            placeholder="YYYY-MM-DD"
            required
          />
        </FormSection>

        {/* Usage Rules */}
        <FormSection title="Usage Rules" icon="ticket" required>
          <NumericField
            label="Total Usage Limit"
            value={formData.totalUsageLimit}
            onChangeText={(v) => updateField('totalUsageLimit', parseInt(v) || 0)}
            placeholder="0 for unlimited"
          />
          <NumericField
            label="Uses Per Customer"
            value={formData.usagePerCustomer}
            onChangeText={(v) => updateField('usagePerCustomer', parseInt(v) || 1)}
            placeholder="1"
          />
          <ToggleRow
            label="Allow Multiple Redemptions"
            value={formData.allowMultipleRedemptions}
            onValueChange={(v) => updateField('allowMultipleRedemptions', v)}
            description="Allow same coupon to be used multiple times"
          />
          <ToggleRow
            label="Stack With Other Coupons"
            value={formData.stackable}
            onValueChange={(v) => updateField('stackable', v)}
            description="Allow combining with other discounts"
          />
          <ToggleRow
            label="Auto Apply Coupon"
            value={formData.autoApply}
            onValueChange={(v) => updateField('autoApply', v)}
            description="Automatically apply at checkout"
          />
        </FormSection>

        {/* Target Audience */}
        <FormSection title="Target Audience" icon="account-group" required>
          <View style={styles.segmentsContainer}>
            {customerSegments.map((segment) => (
              <SelectionChip
                key={segment.id}
                label={segment.name}
                selected={selectedSegments.includes(segment.id)}
                onPress={() => toggleSegment(segment.id)}
              />
            ))}
          </View>
          <NumericField
            label="Minimum Lifetime Value ($)"
            value={formData.minLifetimeValue}
            onChangeText={(v) => updateField('minLifetimeValue', parseFloat(v) || 0)}
            placeholder="0 for no restriction"
          />
          <NumericField
            label="Minimum Total Orders"
            value={formData.minTotalOrders}
            onChangeText={(v) => updateField('minTotalOrders', parseInt(v) || 0)}
            placeholder="0 for no restriction"
          />
        </FormSection>

        {/* Order Restrictions */}
        <FormSection title="Order Conditions" icon="cart">
          <NumericField
            label="Minimum Purchase Amount ($)"
            value={formData.minPurchaseAmount}
            onChangeText={(v) => updateField('minPurchaseAmount', parseFloat(v) || 0)}
            placeholder="0 for no minimum"
          />
          <NumericField
            label="Maximum Purchase Amount ($)"
            value={formData.maxPurchaseAmount}
            onChangeText={(v) => updateField('maxPurchaseAmount', parseFloat(v) || 0)}
            placeholder="0 for no maximum"
          />
          <NumericField
            label="Minimum Quantity"
            value={formData.minQuantity}
            onChangeText={(v) => updateField('minQuantity', parseInt(v) || 0)}
            placeholder="0 for no minimum"
          />
          <NumericField
            label="Maximum Quantity"
            value={formData.maxQuantity}
            onChangeText={(v) => updateField('maxQuantity', parseInt(v) || 0)}
            placeholder="0 for no maximum"
          />
          <ToggleRow
            label="First Order Only"
            value={formData.firstOrderOnly}
            onValueChange={(v) => updateField('firstOrderOnly', v)}
            description="Only applies to customer's first purchase"
          />
          <ToggleRow
            label="Subscription Only"
            value={formData.subscriptionOnly}
            onValueChange={(v) => updateField('subscriptionOnly', v)}
            description="Only for subscription orders"
          />
        </FormSection>

        {/* Campaign Branding */}
        <FormSection title="Coupon Branding" icon="palette">
          <TouchableOpacity onPress={pickImage} style={styles.bannerUpload}>
            {formData.bannerImage ? (
              <Image source={{ uri: formData.bannerImage }} style={styles.bannerImage} />
            ) : (
              <View style={styles.bannerPlaceholder}>
                <MaterialCommunityIcons name="image-plus" size={32} color="#9CA3AF" />
                <Text style={styles.bannerPlaceholderText}>Upload Campaign Banner</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <Text style={styles.inputLabel}>Color Theme</Text>
          <ColorPicker selected={formData.colorTheme} onSelect={(v) => updateField('colorTheme', v)} />
          
          <InputField
            label="Promotional Label"
            value={formData.promotionalLabel}
            onChangeText={(v) => updateField('promotionalLabel', v)}
            placeholder="e.g., Limited Time Offer"
          />
          <InputField
            label="Badge Text"
            value={formData.badgeText}
            onChangeText={(v) => updateField('badgeText', v)}
            placeholder="e.g., BEST DEAL"
          />
        </FormSection>

        {/* Revenue Forecast */}
        <FormSection title="Projected Impact" icon="chart-line">
          <View style={styles.forecastContainer}>
            <View style={styles.forecastMetric}>
              <Text style={styles.forecastLabel}>Est. Redemptions</Text>
              <Text style={styles.forecastValue}>1,250+</Text>
            </View>
            <View style={styles.forecastMetric}>
              <Text style={styles.forecastLabel}>Projected Revenue</Text>
              <Text style={styles.forecastValue}>$62.5K</Text>
            </View>
            <View style={styles.forecastMetric}>
              <Text style={styles.forecastLabel}>Discount Cost</Text>
              <Text style={styles.forecastValue}>-$15.6K</Text>
            </View>
            <View style={styles.forecastMetric}>
              <Text style={styles.forecastLabel}>Expected ROI</Text>
              <Text style={[styles.forecastValue, styles.forecastPositive]}>+300%</Text>
            </View>
          </View>
        </FormSection>

        {/* Status Settings */}
        <FormSection title="Campaign Settings" icon="eye">
          <View style={styles.statusContainer}>
            {['draft', 'scheduled', 'active', 'paused'].map((status) => (
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
          <View style={styles.visibilityContainer}>
            {['visible', 'featured', 'admin_only', 'hidden'].map((visibility) => (
              <SelectionChip
                key={visibility}
                label={visibility === 'visible' ? 'Visible' : visibility === 'featured' ? 'Featured' : visibility === 'admin_only' ? 'Admin Only' : 'Hidden'}
                selected={formData.visibility === visibility}
                onPress={() => updateField('visibility', visibility)}
              />
            ))}
          </View>
        </FormSection>

        {/* Marketing Distribution */}
        <FormSection title="Promotion Channels" icon="email">
          <View style={styles.channelsContainer}>
            {marketingChannelsList.map((channel) => (
              <SelectionChip
                key={channel}
                label={channel}
                selected={selectedChannels.includes(channel)}
                onPress={() => toggleChannel(channel)}
              />
            ))}
          </View>
        </FormSection>

        {/* Fraud Protection */}
        <FormSection title="Abuse Prevention" icon="shield-check">
          <ToggleRow
            label="IP Restriction"
            value={formData.ipRestriction}
            onValueChange={(v) => updateField('ipRestriction', v)}
            description="Limit based on IP address"
          />
          <ToggleRow
            label="Device Restriction"
            value={formData.deviceRestriction}
            onValueChange={(v) => updateField('deviceRestriction', v)}
            description="Limit per device"
          />
          <ToggleRow
            label="Fraud Detection"
            value={formData.fraudDetection}
            onValueChange={(v) => updateField('fraudDetection', v)}
            description="Enable fraud protection"
          />
        </FormSection>

        {/* AI Insight */}
        <AIInsightCard />

        {/* Validation Checklist */}
        <FormSection title="Campaign Readiness" icon="check-circle">
          <ValidationChecklist items={validationItems} />
          <View style={styles.completionBarContainer}>
            <View style={styles.completionBar}>
              <View style={[styles.completionBarFill, { width: `${(validationItems.filter(i => i.completed).length / validationItems.length) * 100}%` }]} />
            </View>
            <Text style={styles.completionText}>
              {validationItems.filter(i => i.completed).length}/{validationItems.length} complete
            </Text>
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
        <TouchableOpacity style={styles.primaryButton} onPress={handleCreate}>
          <Text style={styles.primaryButtonText}>Create Coupon</Text>
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
    padding: 20,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
  },
  previewBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  previewBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  previewContent: {
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 8,
  },
  previewCode: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  previewDiscount: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 30,
    marginTop: 12,
  },
  previewDiscountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  previewExpiry: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 12,
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
  discountTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  discountTypeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
  },
  discountTypeChipSelected: {
    backgroundColor: '#8B5CF6',
  },
  discountTypeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
  },
  discountTypeTextSelected: {
    color: '#FFFFFF',
  },
  segmentsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  selectionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
  },
  selectionChipSelected: {
    backgroundColor: '#8B5CF6',
  },
  selectionChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
  },
  selectionChipTextSelected: {
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
  bannerUpload: {
    marginBottom: 16,
  },
  bannerPlaceholder: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
  },
  bannerPlaceholderText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
  },
  bannerImage: {
    width: '100%',
    height: 120,
    borderRadius: 16,
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
  forecastPositive: {
    color: '#10B981',
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statusChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
  },
  statusChipSelected: {
    backgroundColor: '#8B5CF6',
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
  },
  statusChipTextSelected: {
    color: '#FFFFFF',
  },
  visibilityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  channelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
    backgroundColor: '#8B5CF6',
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
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },
  tertiaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
});