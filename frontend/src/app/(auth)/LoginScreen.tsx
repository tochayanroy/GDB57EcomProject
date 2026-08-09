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
    useWindowDimensions
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

const API_BASE_URL = 'http://10.225.180.27:5000';

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
    forgotPassword: {
        fontSize: getResponsiveFontSize(width, 13, 13, 14, 15),
        fontWeight: '500' as const,
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
});

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface LoginResponse {
    success: boolean;
    token?: string;
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
    message?: string;
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

// Icon Component - Using emoji/text to avoid font issues
const Icon: React.FC<{ name: string; size: number; color: string; style?: any }> = memo(({ name, size, color, style }) => {
    const getIconChar = () => {
        switch (name) {
            case 'mail-outline':
                return '✉️';
            case 'lock-closed-outline':
                return '🔒';
            case 'eye':
                return '👁️';
            case 'eye-off':
                return '👁️‍🗨️';
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
    keyboardType?: 'email-address' | 'default';
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
            accessibilityHint={`Sign in using your ${text} account`}
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
// MAIN LOGIN SCREEN COMPONENT
// ============================================================================

interface LoginScreenProps {
    onLoginSuccess?: (email: string) => void;
    onSignUpPress?: () => void;
    onForgotPasswordPress?: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({
    onLoginSuccess,
    onSignUpPress,
    onForgotPasswordPress,
}) => {
    const { width } = useWindowDimensions();
    const typography = getTypography(width);

    // Form state - Using individual useState hooks
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Animation values
    const logoScale = useSharedValue(0.8);
    const logoOpacity = useSharedValue(0);
    const formTranslateY = useSharedValue(40);
    const formOpacity = useSharedValue(0);
    const buttonOpacity = useSharedValue(0);

    // Refs for input focus
    const passwordRef = useRef<TextInput>(null);

    // Handle sign up navigation
    const handleSignUpPress = useCallback(() => {
        if (onSignUpPress) {
            onSignUpPress();
        } else {
            router.push('/RegisterScreen');
        }
    }, [onSignUpPress]);

    // Validation functions
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

    const validatePassword = useCallback((passwordText: string) => {
        if (!passwordText) {
            return 'Password is required';
        }
        if (passwordText.length < 6) {
            return 'Password must be at least 6 characters';
        }
        return '';
    }, []);

    // Handle email change with real-time validation
    const handleEmailChange = useCallback((text: string) => {
        setEmail(text);
        if (emailError) {
            const error = validateEmail(text);
            setEmailError(error);
        }
    }, [emailError, validateEmail]);

    // Handle password change with real-time validation
    const handlePasswordChange = useCallback((text: string) => {
        setPassword(text);
        if (passwordError) {
            const error = validatePassword(text);
            setPasswordError(error);
        }
    }, [passwordError, validatePassword]);

    // ============================================================================
    // LOGIN USER FUNCTION - Matches Register Screen pattern
    // ============================================================================

    const loginUser = async (emailText: string, passwordText: string) => {
        try {
            const formData = {
                email: emailText,
                password: passwordText,
            };

            const response = await axios.post(
                `${API_BASE_URL}/User/login`,
                formData
            );

            alert(response.data.message)

            if (response.data.success) {
                await AsyncStorage.setItem(
                    "token",
                    response.data.token
                );

                if (response.data.user.role === 'admin') {
                    router.replace('/(admin)');
                } else {
                    router.replace('/(user)');
                }
            } else {
                throw new Error(response.data.message || 'Login failed. Please try again.');
            }

        } catch (error: any) {
            console.log(error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Login failed. Please try again.');
        }
    };

    // ============================================================================
    // HANDLE LOGIN - Updated to use loginUser function
    // ============================================================================

    const handleLogin = useCallback(async () => {
        Keyboard.dismiss();

        // Validate all fields
        const emailValidationError = validateEmail(email);
        const passwordValidationError = validatePassword(password);

        setEmailError(emailValidationError);
        setPasswordError(passwordValidationError);

        // Check if there are any validation errors
        const hasErrors = !!emailValidationError || !!passwordValidationError;

        if (!hasErrors) {
            setIsLoading(true);

            try {
                await loginUser(email, password);
            } catch (error) {
                // Error is handled inside loginUser function
                // But we need to catch it to set loading state
            } finally {
                setIsLoading(false);
            }
        }
    }, [email, password, validateEmail, validatePassword, loginUser]);

    // Handle social login
    const handleSocialLogin = useCallback((provider: string) => {
        Alert.alert(
            'Social Login',
            `${provider} login integration will be available soon.`,
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
                'Login screen. Please enter your email and password to sign in.'
            );
        }
    }, []);

    // Check if form is valid
    const isFormValid = !!email && !!password && !emailError && !passwordError;

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
                                Welcome Back
                            </Text>

                            <Text style={[styles.subheading, typography.subheading]}>
                                Sign in to continue shopping and access your personalized experience.
                            </Text>
                        </View>

                        {/* Form Section */}
                        <Animated.View style={[styles.formSection, formAnimatedStyle]}>
                            <CustomInput
                                label="Email Address"
                                value={email}
                                onChangeText={handleEmailChange}
                                placeholder="Enter your email"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                error={emailError}
                                icon="mail-outline"
                                onSubmitEditing={() => passwordRef.current?.focus()}
                            />

                            <CustomInput
                                label="Password"
                                value={password}
                                onChangeText={handlePasswordChange}
                                placeholder="Enter your password"
                                secureTextEntry={true}
                                error={passwordError}
                                icon="lock-closed-outline"
                                ref={passwordRef}
                                onSubmitEditing={handleLogin}
                            />

                            <Pressable
                                style={styles.forgotPasswordContainer}
                                onPress={onForgotPasswordPress}
                                accessibilityLabel="Forgot password"
                                accessibilityRole="button"
                                accessibilityHint="Reset your password"
                            >
                                <Text style={[styles.forgotPasswordText, typography.forgotPassword]}>
                                    Forgot Password?
                                </Text>
                            </Pressable>

                            <Animated.View style={[styles.buttonContainer, buttonAnimatedStyle]}>
                                <Pressable
                                    style={[
                                        styles.loginButton,
                                        (!isFormValid || isLoading) && styles.loginButtonDisabled
                                    ]}
                                    onPress={handleLogin}
                                    disabled={!isFormValid || isLoading}
                                    accessibilityLabel="Sign in button"
                                    accessibilityRole="button"
                                    accessibilityHint="Sign in to your account"
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color={colors.textOnPrimary} />
                                    ) : (
                                        <Text style={[styles.loginButtonText, typography.buttonPrimary]}>
                                            Sign In
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
                                onPress={() => handleSocialLogin('Google')}
                                backgroundColor={colors.googleBg}
                                textColor={colors.googleText}
                            />

                            {Platform.OS === 'ios' && (
                                <SocialButton
                                    icon=""
                                    text="Apple"
                                    onPress={() => handleSocialLogin('Apple')}
                                    backgroundColor={colors.appleBg}
                                    textColor={colors.appleText}
                                />
                            )}
                        </View>

                        {/* Footer Section */}
                        <View style={styles.footerSection}>
                            <Text style={[styles.footerText, typography.buttonSecondary]}>
                                Don't have an account?{' '}
                            </Text>
                            <Pressable
                                onPress={handleSignUpPress}
                                accessibilityLabel="Create account"
                                accessibilityRole="button"
                                accessibilityHint="Create a new account"
                            >
                                <Text style={[styles.signUpText, typography.buttonSecondary]}>
                                    Create Account
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
        paddingTop: 50,
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
    forgotPasswordContainer: {
        alignItems: 'flex-end',
        marginBottom: 24,
    },
    forgotPasswordText: {
        color: colors.primary,
        includeFontPadding: false,
    },
    buttonContainer: {
        marginBottom: 24,
    },
    loginButton: {
        backgroundColor: colors.primary,
        borderRadius: 20,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0px 4px 12px rgba(37, 99, 235, 0.2)',
        elevation: 4,
    },
    loginButtonDisabled: {
        backgroundColor: colors.primaryLight,
        opacity: 0.7,
    },
    loginButtonText: {
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
    signUpText: {
        color: colors.primary,
        fontWeight: '700',
        includeFontPadding: false,
    },
});

// For Expo Router compatibility
export default LoginScreen;