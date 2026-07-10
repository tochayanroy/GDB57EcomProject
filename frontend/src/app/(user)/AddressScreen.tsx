// AddressScreen.tsx
import React, { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
    SlideInUp,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

// Types
interface Address {
    id: string;
    name: string;
    phone: string;
    addressLine: string;
    city: string;
    state: string;
    pinCode: string;
    landmark?: string;
    isDefault: boolean;
    addressType: 'Home' | 'Work' | 'Other';
}

interface UserDetails {
    email: string;
    savedAddresses: Address[];
}

// Mock Data
const MOCK_USER: UserDetails = {
    email: 'john.smith@example.com',
    savedAddresses: [
        {
            id: '1',
            name: 'John Smith',
            phone: '+91 98765 43210',
            addressLine: '123 Main Street, Andheri East',
            city: 'Mumbai',
            state: 'Maharashtra',
            pinCode: '400093',
            landmark: 'Near Metro Station',
            isDefault: true,
            addressType: 'Home',
        },
        {
            id: '2',
            name: 'John Smith',
            phone: '+91 98765 43210',
            addressLine: '45 Business Park, Bandra Kurla Complex',
            city: 'Mumbai',
            state: 'Maharashtra',
            pinCode: '400051',
            landmark: 'Near ICICI Bank',
            isDefault: false,
            addressType: 'Work',
        },
    ],
};

// Components
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const AddressCard: React.FC<{
    address: Address;
    isSelected: boolean;
    onSelect: () => void;
    onEdit: () => void;
    onDelete: () => void;
}> = ({ address, isSelected, onSelect, onEdit, onDelete }) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withTiming(0.98, { duration: 100 });
    };

    const handlePressOut = () => {
        scale.value = withTiming(1, { duration: 100 });
    };

    return (
        <AnimatedTouchable
            style={[
                styles.addressCard,
                isSelected && styles.addressCardSelected,
                animatedStyle,
            ]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={onSelect}
            activeOpacity={1}
        >
            <View style={styles.addressCardHeader}>
                <View style={styles.addressTypeBadge}>
                    <MaterialIcon
                        name={
                            address.addressType === 'Home'
                                ? 'home'
                                : address.addressType === 'Work'
                                ? 'work'
                                : 'place'
                        }
                        size={14}
                        color="#2563EB"
                    />
                    <Text style={styles.addressTypeText}>{address.addressType}</Text>
                </View>
                {address.isDefault && (
                    <View style={styles.defaultChip}>
                        <Text style={styles.defaultChipText}>Default</Text>
                    </View>
                )}
                <View style={styles.addressActions}>
                    <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
                        <Icon name="edit-2" size={16} color="#64748B" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
                        <Icon name="trash-2" size={16} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>

            <Text style={styles.addressCardName}>{address.name}</Text>
            <Text style={styles.addressCardPhone}>{address.phone}</Text>
            <Text style={styles.addressCardText}>
                {address.addressLine}, {address.city}, {address.state} - {address.pinCode}
            </Text>
            {address.landmark && (
                <Text style={styles.addressCardLandmark}>Landmark: {address.landmark}</Text>
            )}

            <View style={styles.radioContainer}>
                <View
                    style={[
                        styles.radioButton,
                        isSelected && styles.radioButtonSelected,
                    ]}
                >
                    {isSelected && <View style={styles.radioButtonInner} />}
                </View>
                <Text style={styles.deliverHereText}>Deliver to this address</Text>
            </View>
        </AnimatedTouchable>
    );
};

const AddAddressForm: React.FC<{
    onSave: (address: Omit<Address, 'id'>) => void;
    onCancel: () => void;
    initialAddress?: Address;
}> = ({ onSave, onCancel, initialAddress }) => {
    const [formData, setFormData] = useState({
        name: initialAddress?.name || '',
        phone: initialAddress?.phone || '',
        addressLine: initialAddress?.addressLine || '',
        city: initialAddress?.city || '',
        state: initialAddress?.state || '',
        pinCode: initialAddress?.pinCode || '',
        landmark: initialAddress?.landmark || '',
        addressType: initialAddress?.addressType || 'Home' as 'Home' | 'Work' | 'Other',
        isDefault: initialAddress?.isDefault || false,
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = () => {
        // Basic validation
        if (!formData.name.trim()) {
            Alert.alert('Error', 'Please enter your name');
            return;
        }
        if (!formData.phone.trim()) {
            Alert.alert('Error', 'Please enter your phone number');
            return;
        }
        if (!formData.addressLine.trim()) {
            Alert.alert('Error', 'Please enter your address');
            return;
        }
        if (!formData.city.trim()) {
            Alert.alert('Error', 'Please enter your city');
            return;
        }
        if (!formData.state.trim()) {
            Alert.alert('Error', 'Please enter your state');
            return;
        }
        if (!formData.pinCode.trim() || formData.pinCode.length < 6) {
            Alert.alert('Error', 'Please enter a valid 6-digit PIN code');
            return;
        }

        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            onSave(formData);
        }, 500);
    };

    return (
        <Animated.View entering={FadeInDown} style={styles.formContainer}>
            <View style={styles.formHeader}>
                <Text style={styles.formTitle}>
                    {initialAddress ? 'Edit Address' : 'Add New Address'}
                </Text>
                <TouchableOpacity onPress={onCancel}>
                    <Icon name="x" size={24} color="#64748B" />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Address Type Selection */}
                <View style={styles.addressTypeContainer}>
                    <Text style={styles.inputLabel}>Address Type</Text>
                    <View style={styles.addressTypeRow}>
                        {(['Home', 'Work', 'Other'] as const).map((type) => (
                            <TouchableOpacity
                                key={type}
                                style={[
                                    styles.addressTypeOption,
                                    formData.addressType === type && styles.addressTypeOptionSelected,
                                ]}
                                onPress={() => setFormData({ ...formData, addressType: type })}
                            >
                                <MaterialIcon
                                    name={
                                        type === 'Home'
                                            ? 'home'
                                            : type === 'Work'
                                            ? 'work'
                                            : 'place'
                                    }
                                    size={18}
                                    color={formData.addressType === type ? '#2563EB' : '#64748B'}
                                />
                                <Text
                                    style={[
                                        styles.addressTypeOptionText,
                                        formData.addressType === type && styles.addressTypeOptionTextSelected,
                                    ]}
                                >
                                    {type}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Form Fields */}
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Full Name *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChangeText={(text) => setFormData({ ...formData, name: text })}
                        placeholderTextColor="#94A3B8"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phone Number *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter your phone number"
                        value={formData.phone}
                        onChangeText={(text) => setFormData({ ...formData, phone: text })}
                        keyboardType="phone-pad"
                        placeholderTextColor="#94A3B8"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Address Line *</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Enter your street address, house number, etc."
                        value={formData.addressLine}
                        onChangeText={(text) => setFormData({ ...formData, addressLine: text })}
                        multiline
                        numberOfLines={3}
                        placeholderTextColor="#94A3B8"
                    />
                </View>

                <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.inputLabel}>City *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="City"
                            value={formData.city}
                            onChangeText={(text) => setFormData({ ...formData, city: text })}
                            placeholderTextColor="#94A3B8"
                        />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                        <Text style={styles.inputLabel}>State *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="State"
                            value={formData.state}
                            onChangeText={(text) => setFormData({ ...formData, state: text })}
                            placeholderTextColor="#94A3B8"
                        />
                    </View>
                </View>

                <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.inputLabel}>PIN Code *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="6-digit PIN code"
                            value={formData.pinCode}
                            onChangeText={(text) => setFormData({ ...formData, pinCode: text })}
                            keyboardType="number-pad"
                            maxLength={6}
                            placeholderTextColor="#94A3B8"
                        />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                        <Text style={styles.inputLabel}>Landmark (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Nearby landmark"
                            value={formData.landmark}
                            onChangeText={(text) => setFormData({ ...formData, landmark: text })}
                            placeholderTextColor="#94A3B8"
                        />
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.defaultCheckbox}
                    onPress={() => setFormData({ ...formData, isDefault: !formData.isDefault })}
                >
                    <View style={[styles.checkbox, formData.isDefault && styles.checkboxChecked]}>
                        {formData.isDefault && <Icon name="check" size={12} color="#FFFFFF" />}
                    </View>
                    <Text style={styles.checkboxLabel}>Set as default address</Text>
                </TouchableOpacity>

                <View style={styles.formButtons}>
                    <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isLoading}>
                        {isLoading ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save Address</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </Animated.View>
    );
};

// Main Component
const AddressScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const [addresses, setAddresses] = useState<Address[]>(MOCK_USER.savedAddresses);
    const [selectedAddressId, setSelectedAddressId] = useState<string>(
        MOCK_USER.savedAddresses.find((addr) => addr.isDefault)?.id || MOCK_USER.savedAddresses[0]?.id || ''
    );
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Address | undefined>(undefined);
    const scrollViewRef = useRef<ScrollView>(null);

    const selectedAddress = addresses.find((addr) => addr.id === selectedAddressId);

    const handleSelectAddress = useCallback((id: string) => {
        setSelectedAddressId(id);
    }, []);

    const handleAddAddress = useCallback((newAddress: Omit<Address, 'id'>) => {
        const address: Address = {
            ...newAddress,
            id: Date.now().toString(),
        };

        let updatedAddresses = [...addresses, address];
        
        // If this address is set as default, remove default from others
        if (newAddress.isDefault) {
            updatedAddresses = updatedAddresses.map((addr) => ({
                ...addr,
                isDefault: addr.id === address.id,
            }));
            setSelectedAddressId(address.id);
        }
        
        setAddresses(updatedAddresses);
        setShowAddForm(false);
        Alert.alert('Success', 'Address added successfully!');
    }, [addresses]);

    const handleEditAddress = useCallback((address: Address) => {
        setEditingAddress(address);
        setShowAddForm(true);
    }, []);

    const handleUpdateAddress = useCallback((updatedData: Omit<Address, 'id'>) => {
        if (!editingAddress) return;

        let updatedAddresses = addresses.map((addr) =>
            addr.id === editingAddress.id
                ? { ...addr, ...updatedData }
                : addr
        );

        // If this address is set as default, remove default from others
        if (updatedData.isDefault) {
            updatedAddresses = updatedAddresses.map((addr) => ({
                ...addr,
                isDefault: addr.id === editingAddress.id,
            }));
            setSelectedAddressId(editingAddress.id);
        }

        setAddresses(updatedAddresses);
        setShowAddForm(false);
        setEditingAddress(undefined);
        Alert.alert('Success', 'Address updated successfully!');
    }, [addresses, editingAddress]);

    const handleDeleteAddress = useCallback((id: string) => {
        Alert.alert(
            'Delete Address',
            'Are you sure you want to delete this address?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        const updatedAddresses = addresses.filter((addr) => addr.id !== id);
                        setAddresses(updatedAddresses);
                        
                        // If deleted address was selected, select another one
                        if (selectedAddressId === id && updatedAddresses.length > 0) {
                            const defaultAddr = updatedAddresses.find((addr) => addr.isDefault);
                            setSelectedAddressId(defaultAddr?.id || updatedAddresses[0].id);
                        }
                        Alert.alert('Success', 'Address deleted successfully!');
                    },
                },
            ]
        );
    }, [addresses, selectedAddressId]);

    const handleProceedToPayment = useCallback(() => {
        if (!selectedAddress) {
            Alert.alert('Error', 'Please select a delivery address');
            return;
        }
        
        // Navigate to Payment Screen with selected address
        navigation.navigate('Payment', { selectedAddress });
    }, [selectedAddress, navigation]);

    const stickyBarTranslateY = useSharedValue(100);
    
    React.useEffect(() => {
        stickyBarTranslateY.value = withTiming(0, { duration: 500 });
    }, []);

    const stickyBarStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: stickyBarTranslateY.value }],
    }));

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.safeArea}>
                <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

                <Animated.View entering={FadeIn.delay(300)} style={styles.header}>
                    <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
                        <Icon name="arrow-left" size={24} color="#0F172A" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Select Address</Text>
                    <View style={styles.headerPlaceholder} />
                </Animated.View>

                <CheckoutProgress currentStep={0} />

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
                >
                    {showAddForm ? (
                        <AddAddressForm
                            onSave={(data) => {
                                if (editingAddress) {
                                    handleUpdateAddress(data);
                                } else {
                                    handleAddAddress(data);
                                }
                            }}
                            onCancel={() => {
                                setShowAddForm(false);
                                setEditingAddress(undefined);
                            }}
                            initialAddress={editingAddress}
                        />
                    ) : (
                        <>
                            <ScrollView
                                ref={scrollViewRef}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.scrollContent}
                                removeClippedSubviews={true}
                                maxToRenderPerBatch={10}
                                initialNumToRender={8}
                            >
                                {/* Saved Addresses */}
                                <View style={styles.section}>
                                    <View style={styles.sectionHeader}>
                                        <Text style={styles.sectionTitle}>Saved Addresses</Text>
                                        <TouchableOpacity onPress={() => setShowAddForm(true)}>
                                            <View style={styles.addButton}>
                                                <Icon name="plus" size={16} color="#2563EB" />
                                                <Text style={styles.addButtonText}>Add New</Text>
                                            </View>
                                        </TouchableOpacity>
                                    </View>

                                    {addresses.length === 0 ? (
                                        <View style={styles.emptyContainer}>
                                            <MaterialIcon name="location-off" size={64} color="#CBD5E1" />
                                            <Text style={styles.emptyText}>No saved addresses</Text>
                                            <Text style={styles.emptySubtext}>
                                                Add your first address to get started
                                            </Text>
                                        </View>
                                    ) : (
                                        addresses.map((address) => (
                                            <AddressCard
                                                key={address.id}
                                                address={address}
                                                isSelected={selectedAddressId === address.id}
                                                onSelect={() => handleSelectAddress(address.id)}
                                                onEdit={() => handleEditAddress(address)}
                                                onDelete={() => handleDeleteAddress(address.id)}
                                            />
                                        ))
                                    )}
                                </View>

                                {/* Delivery Tips */}
                                <Animated.View entering={FadeInDown.delay(200)} style={styles.tipsCard}>
                                    <View style={styles.tipsHeader}>
                                        <Icon name="info" size={20} color="#2563EB" />
                                        <Text style={styles.tipsTitle}>Delivery Tips</Text>
                                    </View>
                                    <View style={styles.tipItem}>
                                        <Icon name="check-circle" size={14} color="#10B981" />
                                        <Text style={styles.tipText}>Ensure your phone number is correct for delivery updates</Text>
                                    </View>
                                    <View style={styles.tipItem}>
                                        <Icon name="check-circle" size={14} color="#10B981" />
                                        <Text style={styles.tipText}>Add a landmark for easier location finding</Text>
                                    </View>
                                    <View style={styles.tipItem}>
                                        <Icon name="check-circle" size={14} color="#10B981" />
                                        <Text style={styles.tipText}>Double-check PIN code for accurate delivery</Text>
                                    </View>
                                </Animated.View>

                                {/* Delivery Options */}
                                <Animated.View entering={FadeInUp.delay(250)} style={styles.deliveryOptionsCard}>
                                    <Text style={styles.deliveryOptionsTitle}>Delivery Options</Text>
                                    <View style={styles.deliveryOption}>
                                        <View style={styles.deliveryOptionLeft}>
                                            <View style={styles.deliveryOptionIcon}>
                                                <Icon name="truck" size={20} color="#2563EB" />
                                            </View>
                                            <View>
                                                <Text style={styles.deliveryOptionName}>Standard Delivery</Text>
                                                <Text style={styles.deliveryOptionTime}>2-3 business days</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.deliveryOptionPrice}>Free</Text>
                                    </View>
                                    <View style={styles.deliveryOption}>
                                        <View style={styles.deliveryOptionLeft}>
                                            <View style={styles.deliveryOptionIcon}>
                                                <Icon name="zap" size={20} color="#F59E0B" />
                                            </View>
                                            <View>
                                                <Text style={styles.deliveryOptionName}>Express Delivery</Text>
                                                <Text style={styles.deliveryOptionTime}>1-2 business days</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.deliveryOptionPrice}>₹99</Text>
                                    </View>
                                </Animated.View>

                                {/* Address Protection */}
                                <Animated.View entering={FadeInDown.delay(300)} style={styles.protectionCard}>
                                    <View style={styles.protectionHeader}>
                                        <Icon name="shield" size={20} color="#8B5CF6" />
                                        <Text style={styles.protectionTitle}>Address Privacy Protected</Text>
                                    </View>
                                    <Text style={styles.protectionText}>
                                        Your address information is encrypted and never shared with third parties.
                                        We use secure protocols to protect your delivery details.
                                    </Text>
                                </Animated.View>
                            </ScrollView>
                        </>
                    )}
                </KeyboardAvoidingView>

                {/* Sticky Bottom Bar - Only show when not in form mode */}
                {!showAddForm && (
                    <Animated.View entering={SlideInUp.delay(400)} style={[styles.stickyBar, stickyBarStyle]}>
                        <View style={styles.stickyBarContent}>
                            <View>
                                <Text style={styles.deliveryToLabel}>Delivering to</Text>
                                <Text style={styles.deliveryAddressPreview} numberOfLines={1}>
                                    {selectedAddress
                                        ? `${selectedAddress.addressLine}, ${selectedAddress.city}`
                                        : 'No address selected'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={[
                                    styles.proceedButton,
                                    !selectedAddress && styles.proceedButtonDisabled,
                                ]}
                                onPress={handleProceedToPayment}
                                disabled={!selectedAddress}
                            >
                                <Text style={styles.proceedButtonText}>Proceed to Payment</Text>
                                <Icon name="arrow-right" size={20} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                )}
            </SafeAreaView>
        </GestureHandlerRootView>
    );
};

// Checkout Progress Component (same as in PaymentScreen but step 0)
const CheckoutProgress: React.FC<{ currentStep: number }> = ({ currentStep }) => {
    const steps = ['Address', 'Payment', 'Confirmation'];
    
    return (
        <View style={styles.progressContainer}>
            {steps.map((step, index) => (
                <React.Fragment key={step}>
                    <View style={styles.progressStep}>
                        <View style={[styles.progressDot, index <= currentStep && styles.progressDotActive]}>
                            {index < currentStep && <Icon name="check" size={12} color="#FFFFFF" />}
                            {index === currentStep && <View style={styles.progressDotInner} />}
                        </View>
                        <Text style={[styles.progressLabel, index <= currentStep && styles.progressLabelActive]}>
                            {step}
                        </Text>
                    </View>
                    {index < steps.length - 1 && (
                        <View style={[styles.progressLine, index < currentStep && styles.progressLineActive]} />
                    )}
                </React.Fragment>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#F8FAFC',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    headerButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
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
    headerPlaceholder: {
        width: 40,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        marginTop: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    progressStep: {
        alignItems: 'center',
    },
    progressDot: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    progressDotActive: {
        backgroundColor: '#2563EB',
    },
    progressDotInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
    },
    progressLabel: {
        fontSize: 12,
        color: '#94A3B8',
    },
    progressLabelActive: {
        color: '#2563EB',
        fontWeight: '600',
    },
    progressLine: {
        width: 40,
        height: 2,
        backgroundColor: '#E2E8F0',
        marginHorizontal: 8,
    },
    progressLineActive: {
        backgroundColor: '#2563EB',
    },
    scrollContent: {
        paddingBottom: 100,
    },
    section: {
        marginTop: 20,
        paddingHorizontal: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#0F172A',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#2563EB15',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    addButtonText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#2563EB',
    },
    addressCard: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    addressCardSelected: {
        borderColor: '#2563EB',
        backgroundColor: '#2563EB08',
    },
    addressCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    addressTypeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 6,
    },
    addressTypeText: {
        fontSize: 11,
        fontWeight: '500',
        color: '#2563EB',
    },
    defaultChip: {
        backgroundColor: '#22C55E15',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginLeft: 8,
    },
    defaultChipText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#22C55E',
    },
    addressActions: {
        flexDirection: 'row',
        marginLeft: 'auto',
        gap: 12,
    },
    actionButton: {
        padding: 4,
    },
    addressCardName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0F172A',
        marginBottom: 2,
    },
    addressCardPhone: {
        fontSize: 13,
        color: '#64748B',
        marginBottom: 6,
    },
    addressCardText: {
        fontSize: 13,
        color: '#64748B',
        lineHeight: 18,
    },
    addressCardLandmark: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 4,
    },
    radioContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        gap: 8,
    },
    radioButton: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#CBD5E1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioButtonSelected: {
        borderColor: '#2563EB',
    },
    radioButtonInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#2563EB',
    },
    deliverHereText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#2563EB',
    },
    formContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        margin: 20,
        marginTop: 16,
        padding: 20,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    formHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    formTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
    },
    addressTypeContainer: {
        marginBottom: 20,
    },
    addressTypeRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    addressTypeOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
    },
    addressTypeOptionSelected: {
        borderColor: '#2563EB',
        backgroundColor: '#2563EB08',
    },
    addressTypeOptionText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#64748B',
    },
    addressTypeOptionTextSelected: {
        color: '#2563EB',
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: '#0F172A',
        marginBottom: 6,
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        color: '#0F172A',
    },
    textArea: {
        textAlignVertical: 'top',
        minHeight: 80,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 16,
    },
    defaultCheckbox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginVertical: 16,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#CBD5E1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#2563EB',
        borderColor: '#2563EB',
    },
    checkboxLabel: {
        fontSize: 13,
        color: '#0F172A',
    },
    formButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
        marginBottom: 20,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#64748B',
    },
    saveButton: {
        flex: 1,
        backgroundColor: '#2563EB',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#64748B',
        marginTop: 12,
    },
    emptySubtext: {
        fontSize: 13,
        color: '#94A3B8',
        marginTop: 4,
    },
    tipsCard: {
        backgroundColor: '#FFFFFF',
        margin: 20,
        marginTop: 20,
        padding: 16,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    tipsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    tipsTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0F172A',
    },
    tipItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    tipText: {
        fontSize: 12,
        color: '#64748B',
        flex: 1,
    },
    deliveryOptionsCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        marginBottom: 16,
        padding: 16,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    deliveryOptionsTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0F172A',
        marginBottom: 12,
    },
    deliveryOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    deliveryOptionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    deliveryOptionIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deliveryOptionName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#0F172A',
    },
    deliveryOptionTime: {
        fontSize: 11,
        color: '#64748B',
    },
    deliveryOptionPrice: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0F172A',
    },
    protectionCard: {
        backgroundColor: '#8B5CF610',
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 16,
        borderRadius: 20,
    },
    protectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    protectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8B5CF6',
    },
    protectionText: {
        fontSize: 12,
        color: '#64748B',
        lineHeight: 18,
    },
    stickyBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        paddingHorizontal: 20,
        paddingVertical: 12,
        paddingBottom: Platform.OS === 'ios' ? 20 : 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 8,
    },
    stickyBarContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    deliveryToLabel: {
        fontSize: 11,
        color: '#64748B',
        marginBottom: 2,
    },
    deliveryAddressPreview: {
        fontSize: 13,
        fontWeight: '500',
        color: '#0F172A',
        maxWidth: width * 0.4,
    },
    proceedButton: {
        backgroundColor: '#2563EB',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 14,
        gap: 8,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    proceedButtonDisabled: {
        backgroundColor: '#CBD5E1',
        shadowOpacity: 0,
    },
    proceedButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default AddressScreen;