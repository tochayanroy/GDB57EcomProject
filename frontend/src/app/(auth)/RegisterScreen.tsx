import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { router } from 'expo-router';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
    AccessibilityInfo,
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
    useWindowDimensions,
} from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from 'react-native-reanimated';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

// API Configuration - Update this with your actual API URL
const API_BASE_URL = 'http://192.168.0.103:5000';

const ANIMATION_CONFIG = {
    logoFadeIn: {
        duration: 600,
        easing: Easing.bezier(0.2, 0.9, 0.4, 1),
    },
    formSlideUp: {
        duration: 500,
        easing: Easing.out(Easing.cubic),
    },
    buttonFadeIn: {
        duration: 400,
        easing: Easing.out(Easing.cubic),
    },
};

const FORM_DELAY = 300;
const BUTTON_DELAY = 500;

// ============================================================================
// RESPONSIVE UTILITIES
// ============================================================================

const getResponsiveSize = (width: number, small: number, medium: number, large: number, tablet: number) => {
    if (width < 375) return small;
    if (width < 768) return medium;
    if (width < 1024) return large;
    return tablet;
};

const getResponsiveFontSize = (width: number, small: number, medium: number, large: number, tablet: number) => {
    if (width < 375) return small;
    if (width < 768) return medium;
    if (width < 1024) return large;
    return tablet;
};

// ============================================================================
// COLOR SYSTEM - Premium & Scalable
// ============================================================================

const colors = {
    // Primary Brand Colors
    primary: '#2563EB',
    primaryDark: '#1D4ED8',
    primaryLight: '#60A5FA',
    secondary: '#4F46E5',
    secondaryLight: '#818CF8',

    // Surfaces
    background: '#FFFFFF',
    surface: '#F8FAFC',
    surfaceElevated: '#FFFFFF',

    // Text Colors
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    textOnPrimary: '#FFFFFF',
    textOnSecondary: '#FFFFFF',

    // Borders & Dividers
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    borderFocus: '#2563EB',
    borderError: '#EF4444',
    borderSuccess: '#10B981',

    // Status Colors
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    errorLight: '#FEE2E2',

    // Social Colors
    googleBg: '#FFFFFF',
    googleBorder: '#E5E7EB',
    googleText: '#374151',
    appleBg: '#000000',
    appleText: '#FFFFFF',
};

// ============================================================================
// TYPOGRAPHY SYSTEM - Responsive
// ============================================================================

const getTypography = (width: number) => ({
    heading: {
        fontSize: getResponsiveFontSize(width, 28, 32, 34, 38),
        fontWeight: '800' as const,
        letterSpacing: -0.5,
        lineHeight: getResponsiveFontSize(width, 36, 40, 42, 46),
    },
    subheading: {
        fontSize: getResponsiveFontSize(width, 14, 15, 16, 17),
        fontWeight: '400' as const,
        lineHeight: getResponsiveFontSize(width, 20, 22, 24, 26),
    },
    label: {
        fontSize: getResponsiveFontSize(width, 13, 14, 14, 15),
        fontWeight: '600' as const,
        lineHeight: getResponsiveFontSize(width, 18, 20, 20, 22),
    },
    input: {
        fontSize: getResponsiveFontSize(width, 15, 16, 16, 17),
        fontWeight: '400' as const,
    },
    buttonPrimary: {
        fontSize: getResponsiveFontSize(width, 16, 16, 17, 18),
        fontWeight: '700' as const,
        letterSpacing: 0.5,
    },
    buttonSecondary: {
        fontSize: getResponsiveFontSize(width, 14, 14, 15, 16),
        fontWeight: '600' as const,
    },
    brandName: {
        fontSize: getResponsiveFontSize(width, 18, 20, 24, 28),
        fontWeight: '800' as const,
        letterSpacing: 1.5,
    },
    socialButton: {
        fontSize: getResponsiveFontSize(width, 14, 14, 15, 16),
        fontWeight: '500' as const,
    },
    divider: {
        fontSize: getResponsiveFontSize(width, 12, 12, 13, 14),
        fontWeight: '500' as const,
    },
    termsText: {
        fontSize: getResponsiveFontSize(width, 12, 12, 13, 14),
        fontWeight: '400' as const,
    },
});

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface RegisterFormData {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
}

interface RegisterResponse {
    success: boolean;
    message?: string;
    data?: {
        token: string;
        user: {
            _id: string;
            name: string;
            email: string;
            phone: string;
            role: string;
        };
    };
}

// ============================================================================
// MEMOIZED COMPONENTS
// ============================================================================

// Logo Component
const Logo: React.FC<{ width: number }> = memo(({ width }) => {
    const logoSize = getResponsiveSize(width, 65, 75, 85, 95);

    return (
        <View style={[styles.logoContainer, { width: logoSize, height: logoSize, borderRadius: logoSize / 2 }]}>
            <View style={styles.logoInner}>
                <View style={styles.logoBag}>
                    <View style={styles.logoBagBody} />
                    <View style={styles.logoBagHandle} />
                </View>
            </View>
        </View>
    );
});

Logo.displayName = 'Logo';

// Icon Component
const Icon: React.FC<{ name: string; size: number; color: string; style?: any }> = memo(({ name, size, color, style }) => {
    const getIconChar = () => {
        switch (name) {
            case 'person-outline':
                return '👤';
            case 'mail-outline':
                return '✉️';
            case 'lock-closed-outline':
                return '🔒';
            case 'eye':
                return '👁️';
            case 'eye-off':
                return '👁️‍🗨️';
            case 'call-outline':
                return '📱';
            default:
                return '●';
        }
    };

    return (
        <Text style={[style, { fontSize: size, color }]}>
            {getIconChar()}
        </Text>
    );
});

Icon.displayName = 'Icon';

// Custom TextInput Component
interface CustomInputProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    secureTextEntry?: boolean;
    keyboardType?: 'email-address' | 'default' | 'phone-pad';
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    error?: string;
    icon: string;
    onFocus?: () => void;
    onBlur?: () => void;
    onSubmitEditing?: () => void;
}

const CustomInput = React.forwardRef<TextInput, CustomInputProps>(({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry = false,
    keyboardType = 'default',
    autoCapitalize = 'none',
    error,
    icon,
    onFocus,
    onBlur,
    onSubmitEditing,
}, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { width } = useWindowDimensions();
    const typography = getTypography(width);

    const handleFocus = () => {
        setIsFocused(true);
        onFocus?.();
    };

    const handleBlur = () => {
        setIsFocused(false);
        onBlur?.();
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const getBorderColor = () => {
        if (error) return colors.borderError;
        if (isFocused) return colors.borderFocus;
        return colors.border;
    };

    const getBackgroundColor = () => {
        if (error) return colors.errorLight;
        return colors.surface;
    };

    return (
        <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, typography.label]}>
                {label}
            </Text>

            <View style={[
                styles.inputWrapper,
                {
                    borderColor: getBorderColor(),
                    backgroundColor: getBackgroundColor(),
                }
            ]}>
                <Icon
                    name={icon}
                    size={getResponsiveSize(width, 18, 20, 20, 22)}
                    color={isFocused ? colors.primary : colors.textSecondary}
                    style={styles.inputIcon}
                />

                <TextInput
                    ref={ref}
                    style={[styles.input, typography.input, { color: colors.textPrimary }]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textTertiary}
                    secureTextEntry={secureTextEntry && !showPassword}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    autoCorrect={false}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onSubmitEditing={onSubmitEditing}
                    accessibilityLabel={`${label} input field`}
                    accessibilityHint={`Enter your ${label.toLowerCase()}`}
                />

                {secureTextEntry && (
                    <Pressable
                        onPress={togglePasswordVisibility}
                        style={styles.eyeIcon}
                        accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                        accessibilityRole="button"
                    >
                        <Icon
                            name={showPassword ? "eye-off" : "eye"}
                            size={getResponsiveSize(width, 18, 20, 20, 22)}
                            color={colors.textSecondary}
                        />
                    </Pressable>
                )}
            </View>

            {error ? (
                <Text style={styles.errorText}>
                    {error}
                </Text>
            ) : null}
        </View>
    );
});

CustomInput.displayName = 'CustomInput';

// Social Login Button
interface SocialButtonProps {
    icon: string;
    text: string;
    onPress: () => void;
    backgroundColor: string;
    textColor: string;
}

const SocialButton: React.FC<SocialButtonProps> = memo(({
    icon,
    text,
    onPress,
    backgroundColor,
    textColor,
}) => {
    const { width } = useWindowDimensions();
    const typography = getTypography(width);

    return (
        <Pressable
            style={[styles.socialButton, { backgroundColor }]}
            onPress={onPress}
            accessibilityLabel={`Continue with ${text}`}
            accessibilityRole="button"
            accessibilityHint={`Sign up using your ${text} account`}
        >
            <Text style={styles.socialButtonIcon}>{icon}</Text>
            <Text style={[styles.socialButtonText, typography.socialButton, { color: textColor }]}>
                Continue with {text}
            </Text>
        </Pressable>
    );
});

SocialButton.displayName = 'SocialButton';

// ============================================================================
// MAIN REGISTER SCREEN COMPONENT
// ============================================================================

interface RegisterScreenProps {
    onRegisterSuccess?: (userData: RegisterFormData) => void;
    onLoginPress?: () => void;
    onTermsPress?: () => void;
    onPrivacyPress?: () => void;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({
    onRegisterSuccess,
    onLoginPress,
    onTermsPress,
    onPrivacyPress,
}) => {
    const { width } = useWindowDimensions();
    const typography = getTypography(width);

    // Form state - Using individual useState hooks as requested
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [phone, setPhone] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [errors, setErrors] = useState<Partial<RegisterFormData>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [agreeToTerms, setAgreeToTerms] = useState(false);

    // Animation values
    const logoScale = useSharedValue(0.8);
    const logoOpacity = useSharedValue(0);
    const formTranslateY = useSharedValue(40);
    const formOpacity = useSharedValue(0);
    const buttonOpacity = useSharedValue(0);

    // Refs for input focus
    const emailRef = useRef<TextInput>(null);
    const phoneRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);
    const confirmPasswordRef = useRef<TextInput>(null);

    // Handle login navigation
    const handleLoginPress = useCallback(() => {
        if (onLoginPress) {
            onLoginPress();
        } else {
            router.push('/LoginScreen');
        }
    }, [onLoginPress]);

    // Validation functions
    const validateFullName = useCallback((nameText: string) => {
        if (!nameText) {
            return 'Full name is required';
        }
        if (nameText.length < 3) {
            return 'Name must be at least 3 characters';
        }
        if (nameText.length > 50) {
            return 'Name must be less than 50 characters';
        }
        return '';
    }, []);

    const validateEmail = useCallback((emailText: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailText) {
            return 'Email is required';
        }
        if (!emailRegex.test(emailText)) {
            return 'Please enter a valid email address';
        }
        return '';
    }, []);

    const validatePhone = useCallback((phoneText: string) => {
        const phoneRegex = /^[0-9]{10,15}$/;
        if (!phoneText) {
            return 'Phone number is required';
        }
        if (!phoneRegex.test(phoneText.replace(/[^0-9]/g, ''))) {
            return 'Please enter a valid phone number (10-15 digits)';
        }
        return '';
    }, []);

    const validatePassword = useCallback((passwordText: string) => {
        if (!passwordText) {
            return 'Password is required';
        }
        if (passwordText.length < 8) {
            return 'Password must be at least 8 characters';
        }
        if (passwordText.length > 30) {
            return 'Password must be less than 30 characters';
        }
        if (!/[A-Z]/.test(passwordText)) {
            return 'Password must contain at least one uppercase letter';
        }
        if (!/[a-z]/.test(passwordText)) {
            return 'Password must contain at least one lowercase letter';
        }
        if (!/[0-9]/.test(passwordText)) {
            return 'Password must contain at least one number';
        }
        if (!/[!@#$%^&*]/.test(passwordText)) {
            return 'Password must contain at least one special character (!@#$%^&*)';
        }
        return '';
    }, []);

    const validateConfirmPassword = useCallback((confirmText: string, passwordText: string) => {
        if (!confirmText) {
            return 'Please confirm your password';
        }
        if (confirmText !== passwordText) {
            return 'Passwords do not match';
        }
        return '';
    }, []);

    // Handle field changes
    const handleFieldChange = useCallback((field: keyof RegisterFormData, value: string) => {
        // Update the appropriate state
        switch (field) {
            case 'fullName':
                setName(value);
                break;
            case 'email':
                setEmail(value);
                break;
            case 'phone':
                setPhone(value);
                break;
            case 'password':
                setPassword(value);
                break;
            case 'confirmPassword':
                setConfirmPassword(value);
                break;
        }

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }

        // Real-time validation for certain fields
        switch (field) {
            case 'fullName':
                if (value) {
                    const error = validateFullName(value);
                    if (error) setErrors(prev => ({ ...prev, fullName: error }));
                    else setErrors(prev => ({ ...prev, fullName: '' }));
                }
                break;
            case 'email':
                if (value) {
                    const error = validateEmail(value);
                    if (error) setErrors(prev => ({ ...prev, email: error }));
                    else setErrors(prev => ({ ...prev, email: '' }));
                }
                break;
            case 'phone':
                if (value) {
                    const error = validatePhone(value);
                    if (error) setErrors(prev => ({ ...prev, phone: error }));
                    else setErrors(prev => ({ ...prev, phone: '' }));
                }
                break;
            case 'password':
                if (value) {
                    const error = validatePassword(value);
                    if (error) setErrors(prev => ({ ...prev, password: error }));
                    else setErrors(prev => ({ ...prev, password: '' }));

                    // Also validate confirm password if it has a value
                    if (confirmPassword) {
                        const confirmError = validateConfirmPassword(confirmPassword, value);
                        if (confirmError) setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
                        else setErrors(prev => ({ ...prev, confirmPassword: '' }));
                    }
                }
                break;
            case 'confirmPassword':
                if (value) {
                    const error = validateConfirmPassword(value, password);
                    if (error) setErrors(prev => ({ ...prev, confirmPassword: error }));
                    else setErrors(prev => ({ ...prev, confirmPassword: '' }));
                }
                break;
        }
    }, [errors, validateFullName, validateEmail, validatePhone, validatePassword, validateConfirmPassword, password, confirmPassword]);

    // ============================================================================
    // REGISTER USER FUNCTION - Updated as requested
    // ============================================================================
    
    const registerUser = async () => {
        try {
            const formData = {
                name,
                email,
                password,
                phone,
            };

            const response = await axios.post(
                `${API_BASE_URL}/User/register`,
                formData
            );

            if (response.data.success) {
                await AsyncStorage.setItem(
                    "token",
                    response.data.data
                );

                console.log("Token saved successfully");
                console.log(response.data.message);

                // Navigate to home screen
                router.replace('./(user)');

                // Show success message
                Alert.alert(
                    'Success',
                    'Account created successfully! Welcome to Shoply.',
                    [{ text: 'OK' }]
                );
            }

        } catch (error: any) {
            console.log(error.response?.data || error.message);
            Alert.alert(
                'Registration Failed',
                error.response?.data?.message || 'Something went wrong. Please try again.',
                [{ text: 'OK' }]
            );
        }
    };

    // ============================================================================
    // HANDLE REGISTER - Updated to use registerUser function
    // ============================================================================
    
    const handleRegister = useCallback(async () => {
        Keyboard.dismiss();

        // Validate all fields
        const fullNameError = validateFullName(name);
        const emailError = validateEmail(email);
        const phoneError = validatePhone(phone);
        const passwordError = validatePassword(password);
        const confirmPasswordError = validateConfirmPassword(confirmPassword, password);

        const newErrors = {
            fullName: fullNameError,
            email: emailError,
            phone: phoneError,
            password: passwordError,
            confirmPassword: confirmPasswordError,
        };

        setErrors(newErrors);

        const hasErrors = Object.values(newErrors).some(error => error !== '');

        if (!hasErrors && agreeToTerms) {
            setIsLoading(true);
            await registerUser();
            setIsLoading(false);
        } else if (!agreeToTerms) {
            Alert.alert(
                'Terms & Conditions',
                'Please agree to the Terms and Conditions to continue.',
                [{ text: 'OK' }]
            );
        }
    }, [name, email, phone, password, confirmPassword, validateFullName, validateEmail, validatePhone, validatePassword, validateConfirmPassword, agreeToTerms]);

    // Handle social registration
    const handleSocialRegister = useCallback((provider: string) => {
        Alert.alert(
            'Social Registration',
            `${provider} registration will be available soon.`,
            [{ text: 'OK' }]
        );
    }, []);

    // Animated styles
    const logoAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: logoScale.value }],
        opacity: logoOpacity.value,
    }));

    const formAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: formTranslateY.value }],
        opacity: formOpacity.value,
    }));

    const buttonAnimatedStyle = useAnimatedStyle(() => ({
        opacity: buttonOpacity.value,
    }));

    // Run animations
    useEffect(() => {
        logoOpacity.value = withTiming(1, ANIMATION_CONFIG.logoFadeIn);
        logoScale.value = withTiming(1, ANIMATION_CONFIG.logoFadeIn);

        formOpacity.value = withDelay(
            FORM_DELAY,
            withTiming(1, ANIMATION_CONFIG.formSlideUp)
        );
        formTranslateY.value = withDelay(
            FORM_DELAY,
            withTiming(0, ANIMATION_CONFIG.formSlideUp)
        );

        buttonOpacity.value = withDelay(
            BUTTON_DELAY,
            withTiming(1, ANIMATION_CONFIG.buttonFadeIn)
        );
    }, []);

    // Accessibility announcement
    useEffect(() => {
        if (Platform.OS !== 'web') {
            AccessibilityInfo.announceForAccessibility(
                'Create account screen. Please fill in your information to register.'
            );
        }
    }, []);

    // Check if form is valid
    const isFormValid = !!name && !!email && !!phone &&
        !!password && !!confirmPassword && agreeToTerms &&
        !errors.fullName && !errors.email && !errors.phone &&
        !errors.password && !errors.confirmPassword;

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar
                barStyle="dark-content"
                backgroundColor={colors.background}
                translucent={false}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <Pressable
                        style={styles.container}
                        onPress={Keyboard.dismiss}
                    >
                        {/* Header Section */}
                        <View style={styles.headerSection}>
                            <Animated.View style={logoAnimatedStyle}>
                                <Logo width={width} />
                            </Animated.View>

                            <Text style={[styles.brandName, typography.brandName]}>
                                SHOPLY
                            </Text>
                        </View>

                        {/* Welcome Section */}
                        <View style={styles.welcomeSection}>
                            <Text style={[styles.heading, typography.heading]}>
                                Create Account
                            </Text>

                            <Text style={[styles.subheading, typography.subheading]}>
                                Join Shoply today and start your premium shopping experience.
                            </Text>
                        </View>

                        {/* Form Section */}
                        <Animated.View style={[styles.formSection, formAnimatedStyle]}>
                            <CustomInput
                                label="Full Name"
                                value={name}
                                onChangeText={(text) => handleFieldChange('fullName', text)}
                                placeholder="Enter your full name"
                                autoCapitalize="words"
                                error={errors.fullName}
                                icon="person-outline"
                                onSubmitEditing={() => emailRef.current?.focus()}
                            />

                            <CustomInput
                                label="Email Address"
                                value={email}
                                onChangeText={(text) => handleFieldChange('email', text)}
                                placeholder="Enter your email"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                error={errors.email}
                                icon="mail-outline"
                                ref={emailRef}
                                onSubmitEditing={() => phoneRef.current?.focus()}
                            />

                            <CustomInput
                                label="Phone Number"
                                value={phone}
                                onChangeText={(text) => handleFieldChange('phone', text)}
                                placeholder="Enter your phone number"
                                keyboardType="phone-pad"
                                error={errors.phone}
                                icon="call-outline"
                                ref={phoneRef}
                                onSubmitEditing={() => passwordRef.current?.focus()}
                            />

                            <CustomInput
                                label="Password"
                                value={password}
                                onChangeText={(text) => handleFieldChange('password', text)}
                                placeholder="Create a password"
                                secureTextEntry={true}
                                error={errors.password}
                                icon="lock-closed-outline"
                                ref={passwordRef}
                                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                            />

                            <CustomInput
                                label="Confirm Password"
                                value={confirmPassword}
                                onChangeText={(text) => handleFieldChange('confirmPassword', text)}
                                placeholder="Confirm your password"
                                secureTextEntry={true}
                                error={errors.confirmPassword}
                                icon="lock-closed-outline"
                                ref={confirmPasswordRef}
                                onSubmitEditing={handleRegister}
                            />

                            {/* Terms and Conditions */}
                            <View style={styles.termsContainer}>
                                <Pressable
                                    style={styles.checkbox}
                                    onPress={() => setAgreeToTerms(!agreeToTerms)}
                                    accessibilityLabel="Agree to terms"
                                    accessibilityRole="checkbox"
                                    accessibilityState={{ checked: agreeToTerms }}
                                >
                                    <View style={[
                                        styles.checkboxBox,
                                        agreeToTerms && styles.checkboxBoxChecked
                                    ]}>
                                        {agreeToTerms && (
                                            <Text style={styles.checkboxCheck}>✓</Text>
                                        )}
                                    </View>
                                </Pressable>

                                <Text style={[styles.termsText, typography.termsText]}>
                                    I agree to the{' '}
                                    <Text
                                        style={styles.termsLink}
                                        onPress={onTermsPress}
                                    >
                                        Terms of Service
                                    </Text>
                                    {' '}and{' '}
                                    <Text
                                        style={styles.termsLink}
                                        onPress={onPrivacyPress}
                                    >
                                        Privacy Policy
                                    </Text>
                                </Text>
                            </View>

                            <Animated.View style={[styles.buttonContainer, buttonAnimatedStyle]}>
                                <Pressable
                                    style={[
                                        styles.registerButton,
                                        (!isFormValid || isLoading) && styles.registerButtonDisabled
                                    ]}
                                    onPress={handleRegister}
                                    disabled={!isFormValid || isLoading}
                                    accessibilityLabel="Create account button"
                                    accessibilityRole="button"
                                    accessibilityHint="Create your new account"
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color={colors.textOnPrimary} />
                                    ) : (
                                        <Text style={[styles.registerButtonText, typography.buttonPrimary]}>
                                            Create Account
                                        </Text>
                                    )}
                                </Pressable>
                            </Animated.View>
                        </Animated.View>

                        {/* Social Section */}
                        <View style={styles.socialSection}>
                            <View style={styles.dividerContainer}>
                                <View style={styles.dividerLine} />
                                <Text style={[styles.dividerText, typography.divider]}>OR</Text>
                                <View style={styles.dividerLine} />
                            </View>

                            <SocialButton
                                icon="G"
                                text="Google"
                                onPress={() => handleSocialRegister('Google')}
                                backgroundColor={colors.googleBg}
                                textColor={colors.googleText}
                            />

                            {Platform.OS === 'ios' && (
                                <SocialButton
                                    icon=""
                                    text="Apple"
                                    onPress={() => handleSocialRegister('Apple')}
                                    backgroundColor={colors.appleBg}
                                    textColor={colors.appleText}
                                />
                            )}
                        </View>

                        {/* Footer Section */}
                        <View style={styles.footerSection}>
                            <Text style={[styles.footerText, typography.buttonSecondary]}>
                                Already have an account?{' '}
                            </Text>
                            <Pressable
                                onPress={handleLoginPress}
                                accessibilityLabel="Sign in"
                                accessibilityRole="button"
                                accessibilityHint="Sign in to your existing account"
                            >
                                <Text style={[styles.signInText, typography.buttonSecondary]}>
                                    Sign In
                                </Text>
                            </Pressable>
                        </View>
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

// ============================================================================
// STYLESHEET - Optimized, Production-Ready
// ============================================================================

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    // Header Section
    headerSection: {
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 20 : 16,
        paddingBottom: 8,
    },
    logoContainer: {
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0px 4px 12px rgba(37, 99, 235, 0.2)',
        elevation: 6,
    },
    logoInner: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoBag: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoBagBody: {
        width: 28,
        height: 34,
        borderWidth: 2,
        borderColor: colors.textOnPrimary,
        borderRadius: 8,
        borderBottomLeftRadius: 14,
        borderBottomRightRadius: 14,
    },
    logoBagHandle: {
        position: 'absolute',
        top: -6,
        width: 12,
        height: 7,
        borderWidth: 1.5,
        borderColor: colors.textOnPrimary,
        borderRadius: 6,
        borderBottomWidth: 0,
    },
    brandName: {
        color: colors.textPrimary,
        marginTop: 12,
        textAlign: 'center',
        includeFontPadding: false,
    },
    // Welcome Section
    welcomeSection: {
        paddingHorizontal: 24,
        marginTop: 24,
        marginBottom: 32,
    },
    heading: {
        color: colors.textPrimary,
        marginBottom: 8,
        includeFontPadding: false,
    },
    subheading: {
        color: colors.textSecondary,
        includeFontPadding: false,
    },
    // Form Section
    formSection: {
        paddingHorizontal: 24,
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabel: {
        color: colors.textPrimary,
        marginBottom: 8,
        includeFontPadding: false,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        padding: 0,
        includeFontPadding: false,
    },
    eyeIcon: {
        padding: 4,
    },
    errorText: {
        color: colors.error,
        fontSize: 12,
        marginTop: 6,
        marginLeft: 4,
        includeFontPadding: false,
    },
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 8,
    },
    checkbox: {
        marginRight: 12,
    },
    checkboxBox: {
        width: 22,
        height: 22,
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
    },
    checkboxBoxChecked: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    checkboxCheck: {
        color: colors.textOnPrimary,
        fontSize: 14,
        fontWeight: '700',
    },
    termsText: {
        flex: 1,
        color: colors.textSecondary,
        includeFontPadding: false,
    },
    termsLink: {
        color: colors.primary,
        fontWeight: '600',
    },
    buttonContainer: {
        marginBottom: 24,
    },
    registerButton: {
        backgroundColor: colors.primary,
        borderRadius: 20,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0px 4px 12px rgba(37, 99, 235, 0.2)',
        elevation: 4,
    },
    registerButtonDisabled: {
        backgroundColor: colors.primaryLight,
        opacity: 0.7,
    },
    registerButtonText: {
        color: colors.textOnPrimary,
    },
    // Social Section
    socialSection: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border,
    },
    dividerText: {
        color: colors.textSecondary,
        marginHorizontal: 16,
    },
    socialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        height: 52,
        marginBottom: 12,
    },
    socialButtonIcon: {
        fontSize: 20,
        marginRight: 12,
        fontWeight: '600',
    },
    socialButtonText: {
        includeFontPadding: false,
    },
    // Footer Section
    footerSection: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: Platform.OS === 'ios' ? 20 : 16,
        marginTop: 'auto',
        marginBottom: 20,
    },
    footerText: {
        color: colors.textSecondary,
        includeFontPadding: false,
    },
    signInText: {
        color: colors.primary,
        fontWeight: '700',
        includeFontPadding: false,
    },
});

// For Expo Router compatibility
export default RegisterScreen;