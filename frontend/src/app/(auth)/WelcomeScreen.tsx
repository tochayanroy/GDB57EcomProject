import { router } from 'expo-router';
import React, { memo, useCallback, useEffect } from 'react';
import {
    AccessibilityInfo,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
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

const ANIMATION_CONFIG = {
    logoFadeIn: {
        duration: 600,
        easing: Easing.bezier(0.2, 0.9, 0.4, 1),
    },
    heroFadeIn: {
        duration: 700,
        easing: Easing.bezier(0.2, 0.9, 0.4, 1),
    },
    contentSlideUp: {
        duration: 600,
        easing: Easing.out(Easing.cubic),
    },
    ctaFadeIn: {
        duration: 500,
        easing: Easing.out(Easing.cubic),
    },
};

const CONTENT_DELAY = 300;
const CTA_DELAY = 500;
const HERO_DELAY = 100;

// ============================================================================
// RESPONSIVE UTILITIES - Enhanced for ALL screen sizes
// ============================================================================

const getResponsiveSize = (
    width: number,
    height: number,
    small: number,
    medium: number,
    large: number,
    tablet: number,
    desktop: number
) => {
    const screenSize = Math.min(width, height);
    if (screenSize < 375) return small;
    if (screenSize < 600) return medium;
    if (screenSize < 768) return large;
    if (screenSize < 1024) return tablet;
    return desktop;
};

const getResponsiveFontSize = (
    width: number,
    height: number,
    small: number,
    medium: number,
    large: number,
    tablet: number,
    desktop: number
) => {
    const screenSize = Math.min(width, height);
    if (screenSize < 375) return small;
    if (screenSize < 600) return medium;
    if (screenSize < 768) return large;
    if (screenSize < 1024) return tablet;
    return desktop;
};

const getResponsiveSpacing = (
    height: number,
    verySmall: number,
    small: number,
    medium: number,
    large: number,
    veryLarge: number
) => {
    if (height < 600) return verySmall;
    if (height < 700) return small;
    if (height < 800) return medium;
    if (height < 900) return large;
    return veryLarge;
};

const getResponsivePadding = (
    width: number,
    height: number,
    small: number,
    medium: number,
    large: number,
    xlarge: number
) => {
    const avgSize = (width + height) / 2;
    if (avgSize < 700) return small;
    if (avgSize < 900) return medium;
    if (avgSize < 1100) return large;
    return xlarge;
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
    
    // Status Colors
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    
    // Illustrations
    illustrationBg: '#F0F9FF',
    illustrationPrimary: '#2563EB',
    illustrationSecondary: '#818CF8',
    illustrationAccent: '#60A5FA',
};

// ============================================================================
// TYPOGRAPHY SYSTEM - Fully Responsive
// ============================================================================

const getTypography = (width: number, height: number) => ({
    heading: {
        fontSize: getResponsiveFontSize(width, height, 24, 28, 32, 38, 44),
        fontWeight: '800' as const,
        letterSpacing: -0.5,
        lineHeight: getResponsiveFontSize(width, height, 32, 36, 42, 48, 56),
    },
    subheading: {
        fontSize: getResponsiveFontSize(width, height, 12, 14, 15, 16, 18),
        fontWeight: '400' as const,
        lineHeight: getResponsiveFontSize(width, height, 18, 20, 24, 26, 28),
    },
    benefitTitle: {
        fontSize: getResponsiveFontSize(width, height, 10, 12, 13, 14, 16),
        fontWeight: '600' as const,
        lineHeight: getResponsiveFontSize(width, height, 14, 16, 18, 20, 22),
    },
    benefitDescription: {
        fontSize: getResponsiveFontSize(width, height, 9, 10, 11, 12, 14),
        fontWeight: '400' as const,
        lineHeight: getResponsiveFontSize(width, height, 12, 14, 16, 18, 20),
    },
    buttonPrimary: {
        fontSize: getResponsiveFontSize(width, height, 13, 15, 16, 17, 18),
        fontWeight: '700' as const,
        letterSpacing: 0.5,
    },
    buttonSecondary: {
        fontSize: getResponsiveFontSize(width, height, 11, 13, 14, 15, 16),
        fontWeight: '600' as const,
    },
    brandName: {
        fontSize: getResponsiveFontSize(width, height, 16, 18, 20, 24, 28),
        fontWeight: '800' as const,
        letterSpacing: 1.5,
    },
});

// ============================================================================
// BENEFITS DATA - Memoized for performance
// ============================================================================

interface Benefit {
    id: string;
    icon: string;
    title: string;
    description: string;
    accessibilityLabel: string;
}

const BENEFITS: readonly Benefit[] = [
    {
        id: 'selection',
        icon: '🛍️',
        title: 'Wide Selection',
        description: 'Thousands of premium products',
        accessibilityLabel: 'Benefit: Wide selection of thousands of premium products',
    },
    {
        id: 'security',
        icon: '🛡️',
        title: 'Secure Payments',
        description: 'Protected & trusted transactions',
        accessibilityLabel: 'Benefit: Secure payments with protected and trusted transactions',
    },
    {
        id: 'delivery',
        icon: '🚚',
        title: 'Fast Delivery',
        description: 'Quick delivery to your location',
        accessibilityLabel: 'Benefit: Fast delivery to your location',
    },
] as const;

// ============================================================================
// MEMOIZED COMPONENTS - Performance Optimization
// ============================================================================

// Logo Component - Memoized
const Logo: React.FC<{ width: number; height: number }> = memo(({ width, height }) => {
    const logoSize = getResponsiveSize(width, height, 55, 65, 75, 85, 95);
    
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

// Benefit Card Component - Memoized
const BenefitCard: React.FC<{ benefit: Benefit; width: number; height: number }> = memo(({ benefit, width, height }) => {
    const cardWidth = getResponsiveSize(width, height, 85, 100, 110, 125, 145);
    const iconSize = getResponsiveSize(width, height, 36, 42, 46, 52, 58);
    const cardPadding = getResponsiveSpacing(height, 8, 10, 12, 14, 16);
    
    return (
        <View
            style={[styles.benefitCard, { width: cardWidth, paddingVertical: cardPadding }]}
            accessibilityLabel={benefit.accessibilityLabel}
            accessibilityRole="text"
        >
            <View style={[styles.benefitIconContainer, { width: iconSize, height: iconSize, borderRadius: iconSize / 2 }]}>
                <Text style={[styles.benefitIcon, { fontSize: getResponsiveFontSize(width, height, 16, 20, 22, 24, 28) }]}>
                    {benefit.icon}
                </Text>
            </View>
            <Text style={[styles.benefitTitle, getTypography(width, height).benefitTitle]} numberOfLines={1}>
                {benefit.title}
            </Text>
            <Text style={[styles.benefitDescription, getTypography(width, height).benefitDescription]} numberOfLines={2}>
                {benefit.description}
            </Text>
        </View>
    );
});

BenefitCard.displayName = 'BenefitCard';

// Hero Illustration Component - Memoized, Lightweight
const HeroIllustration: React.FC<{ width: number; height: number }> = memo(({ width, height }) => {
    const illustrationSize = getResponsiveSize(width, height, 150, 180, 210, 250, 310);
    const bagSize = getResponsiveSize(width, height, 50, 65, 75, 90, 115);
    const borderRadius = getResponsiveSize(width, height, 10, 14, 16, 20, 24);
    const borderWidth = getResponsiveSize(width, height, 1.5, 2, 2.5, 3, 3.5);
    const decorativeSize1 = getResponsiveSize(width, height, 18, 25, 30, 40, 55);
    const decorativeSize2 = getResponsiveSize(width, height, 14, 18, 20, 25, 35);
    
    return (
        <View style={[styles.illustrationContainer, { width: illustrationSize, height: illustrationSize }]}>
            <View style={[styles.illustrationBg, { width: illustrationSize, height: illustrationSize, borderRadius: illustrationSize / 2 }]} />
            
            <View style={styles.shoppingBagWrapper}>
                <View style={[styles.shoppingBag, { width: bagSize, height: bagSize * 1.2 }]}>
                    <View style={[styles.bagBody, {
                        width: bagSize,
                        height: bagSize * 1.1,
                        borderRadius: borderRadius,
                    }]} />
                    <View style={[styles.bagHandleLeft, {
                        top: -bagSize * 0.2,
                        left: bagSize * 0.15,
                        width: bagSize * 0.25,
                        height: bagSize * 0.3,
                        borderWidth: borderWidth,
                    }]} />
                    <View style={[styles.bagHandleRight, {
                        top: -bagSize * 0.2,
                        right: bagSize * 0.15,
                        width: bagSize * 0.25,
                        height: bagSize * 0.3,
                        borderWidth: borderWidth,
                    }]} />
                </View>
            </View>
            
            {/* Decorative elements */}
            <View style={[styles.decorativeCircle1, {
                width: decorativeSize1,
                height: decorativeSize1,
                top: -decorativeSize1 * 0.35,
                right: -decorativeSize1 * 0.35,
            }]} />
            <View style={[styles.decorativeCircle2, {
                width: decorativeSize2,
                height: decorativeSize2,
                bottom: -decorativeSize2 * 0.3,
                left: -decorativeSize2 * 0.5,
            }]} />
        </View>
    );
});

HeroIllustration.displayName = 'HeroIllustration';

// ============================================================================
// MAIN WELCOME SCREEN COMPONENT
// ============================================================================

interface WelcomeScreenProps {
    onGetStarted?: () => void;
    onSignIn?: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
    onGetStarted,
    onSignIn,
}) => {
    const { width, height } = useWindowDimensions();
    const typography = getTypography(width, height);
    
    // Animation values - Optimized for performance
    const logoScale = useSharedValue(0.8);
    const logoOpacity = useSharedValue(0);
    const heroTranslateY = useSharedValue(30);
    const heroOpacity = useSharedValue(0);
    const contentTranslateY = useSharedValue(40);
    const contentOpacity = useSharedValue(0);
    const ctaOpacity = useSharedValue(0);
    
    // Memoized handlers with router navigation
    const handleGetStarted = useCallback(() => {
        if (onGetStarted) {
            onGetStarted();
        } else {
            router.replace('/RegisterScreen');
        }
    }, [onGetStarted]);
    
    const handleSignIn = useCallback(() => {
        if (onSignIn) {
            onSignIn();
        } else {
            router.replace('/LoginScreen');
        }
    }, [onSignIn]);
    
    // Animated styles
    const logoAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: logoScale.value }],
        opacity: logoOpacity.value,
    }));
    
    const heroAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: heroTranslateY.value }],
        opacity: heroOpacity.value,
    }));
    
    const contentAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: contentTranslateY.value }],
        opacity: contentOpacity.value,
    }));
    
    const ctaAnimatedStyle = useAnimatedStyle(() => ({
        opacity: ctaOpacity.value,
    }));
    
    // Run animations
    useEffect(() => {
        // Logo animation
        logoOpacity.value = withTiming(1, ANIMATION_CONFIG.logoFadeIn);
        logoScale.value = withTiming(1, ANIMATION_CONFIG.logoFadeIn);
        
        // Hero animation with delay
        heroOpacity.value = withDelay(
            HERO_DELAY,
            withTiming(1, ANIMATION_CONFIG.heroFadeIn)
        );
        heroTranslateY.value = withDelay(
            HERO_DELAY,
            withTiming(0, ANIMATION_CONFIG.heroFadeIn)
        );
        
        // Content animation
        contentOpacity.value = withDelay(
            CONTENT_DELAY,
            withTiming(1, ANIMATION_CONFIG.contentSlideUp)
        );
        contentTranslateY.value = withDelay(
            CONTENT_DELAY,
            withTiming(0, ANIMATION_CONFIG.contentSlideUp)
        );
        
        // CTA animation
        ctaOpacity.value = withDelay(
            CTA_DELAY,
            withTiming(1, ANIMATION_CONFIG.ctaFadeIn)
        );
    }, []);
    
    // Accessibility announcement
    useEffect(() => {
        if (Platform.OS !== 'web') {
            AccessibilityInfo.announceForAccessibility(
                'Welcome to Shoply. Your premium shopping experience starts here.'
            );
        }
    }, []);
    
    // Calculate dynamic spacing based on screen dimensions
    const getDynamicSpacing = useCallback(() => {
        const heroTopMargin = getResponsiveSpacing(height, 4, 8, 16, 24, 32);
        const heroBottomMargin = getResponsiveSpacing(height, 4, 8, 16, 24, 32);
        const contentBottomMargin = getResponsiveSpacing(height, 8, 16, 24, 32, 40);
        const benefitsBottomMargin = getResponsiveSpacing(height, 8, 16, 24, 32, 40);
        const headerPaddingTop = getResponsiveSpacing(height, 8, 16, 20, 24, 32);
        const headerPaddingBottom = getResponsiveSpacing(height, 4, 8, 12, 16, 20);
        const actionPaddingBottom = getResponsiveSpacing(height, 8, 16, 20, 24, 32);
        const contentPaddingHorizontal = getResponsivePadding(width, height, 16, 20, 24, 32);
        const benefitsGap = getResponsiveSize(width, height, 6, 8, 12, 16, 20);
        
        return {
            heroTopMargin,
            heroBottomMargin,
            contentBottomMargin,
            benefitsBottomMargin,
            headerPaddingTop,
            headerPaddingBottom,
            actionPaddingBottom,
            contentPaddingHorizontal,
            benefitsGap,
        };
    }, [width, height]);
    
    const spacing = getDynamicSpacing();
    
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar
                barStyle="dark-content"
                backgroundColor={colors.background}
                translucent={false}
            />
            
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={height < 700}
            >
                <View style={styles.container}>
                    {/* Header Section */}
                    <View style={[
                        styles.headerSection,
                        {
                            paddingTop: spacing.headerPaddingTop,
                            paddingBottom: spacing.headerPaddingBottom,
                        }
                    ]}>
                        <Animated.View style={logoAnimatedStyle}>
                            <Logo width={width} height={height} />
                        </Animated.View>
                        
                        <Text style={[styles.brandName, typography.brandName]}>
                            SHOPLY
                        </Text>
                    </View>
                    
                    {/* Hero Section */}
                    <Animated.View style={[
                        styles.heroSection,
                        heroAnimatedStyle,
                        { 
                            marginTop: spacing.heroTopMargin,
                            marginBottom: spacing.heroBottomMargin 
                        }
                    ]}>
                        <HeroIllustration width={width} height={height} />
                    </Animated.View>
                    
                    {/* Welcome Content Section */}
                    <Animated.View style={[
                        styles.contentSection,
                        contentAnimatedStyle,
                        { 
                            marginBottom: spacing.contentBottomMargin,
                            paddingHorizontal: spacing.contentPaddingHorizontal,
                        }
                    ]}>
                        <Text
                            style={[styles.heading, typography.heading]}
                            accessibilityRole="header"
                            accessibilityLabel="Welcome to the Future of Shopping"
                        >
                            Welcome to the{'\n'}Future of Shopping
                        </Text>
                        
                        <Text
                            style={[styles.subheading, typography.subheading]}
                            accessibilityLabel="Discover premium products with secure payments and fast delivery"
                        >
                            Discover premium products, enjoy secure payments, and get fast delivery directly to your doorstep.
                        </Text>
                    </Animated.View>
                    
                    {/* Benefits Section */}
                    <View style={[
                        styles.benefitsSection,
                        { 
                            marginBottom: spacing.benefitsBottomMargin,
                            paddingHorizontal: spacing.contentPaddingHorizontal,
                            gap: spacing.benefitsGap,
                        }
                    ]}>
                        {BENEFITS.map((benefit) => (
                            <BenefitCard
                                key={benefit.id}
                                benefit={benefit}
                                width={width}
                                height={height}
                            />
                        ))}
                    </View>
                    
                    {/* Action Section - Always at bottom */}
                    <Animated.View style={[
                        styles.actionSection,
                        ctaAnimatedStyle,
                        {
                            paddingHorizontal: spacing.contentPaddingHorizontal,
                            paddingBottom: spacing.actionPaddingBottom,
                        }
                    ]}>
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={handleGetStarted}
                            activeOpacity={0.85}
                            accessibilityLabel="Get started button"
                            accessibilityRole="button"
                            accessibilityHint="Start shopping with Shoply"
                        >
                            <Text style={[styles.buttonText, typography.buttonPrimary]}>
                                Get Started
                            </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={handleSignIn}
                            activeOpacity={0.7}
                            accessibilityLabel="Sign in button"
                            accessibilityRole="button"
                            accessibilityHint="Sign in to your existing account"
                        >
                            <Text style={[styles.secondaryButtonText, typography.buttonSecondary]}>
                                Already have an account? <Text style={styles.signInText}>Sign In</Text>
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

// ============================================================================
// STYLESHEET - Optimized, Production-Ready, Fully Responsive
// ============================================================================

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
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
    },
    logoContainer: {
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
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
    // Hero Section
    heroSection: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Illustration Styles
    illustrationContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    illustrationBg: {
        backgroundColor: colors.illustrationBg,
        position: 'absolute',
    },
    shoppingBagWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    shoppingBag: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    bagBody: {
        backgroundColor: colors.illustrationPrimary,
        shadowColor: colors.illustrationPrimary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
    },
    bagHandleLeft: {
        position: 'absolute',
        borderColor: colors.illustrationPrimary,
        borderBottomWidth: 0,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    bagHandleRight: {
        position: 'absolute',
        borderColor: colors.illustrationPrimary,
        borderBottomWidth: 0,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    decorativeCircle1: {
        position: 'absolute',
        borderRadius: 100,
        backgroundColor: colors.illustrationSecondary,
        opacity: 0.15,
    },
    decorativeCircle2: {
        position: 'absolute',
        borderRadius: 100,
        backgroundColor: colors.illustrationAccent,
        opacity: 0.12,
    },
    // Content Section
    contentSection: {
        alignItems: 'center',
    },
    heading: {
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: 12,
        includeFontPadding: false,
    },
    subheading: {
        color: colors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: 8,
        includeFontPadding: false,
    },
    // Benefits Section
    benefitsSection: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    benefitCard: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        paddingHorizontal: 8,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    benefitIconContainer: {
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 1,
    },
    benefitIcon: {
        textAlign: 'center',
    },
    benefitTitle: {
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: 4,
        includeFontPadding: false,
    },
    benefitDescription: {
        color: colors.textSecondary,
        textAlign: 'center',
        includeFontPadding: false,
    },
    // Action Section
    actionSection: {
        marginTop: 'auto',
    },
    primaryButton: {
        backgroundColor: colors.primary,
        borderRadius: 20,
        height: 54,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 4,
    },
    buttonText: {
        color: colors.textOnPrimary,
    },
    secondaryButton: {
        alignItems: 'center',
        marginTop: 14,
        paddingVertical: 8,
    },
    secondaryButtonText: {
        color: colors.textSecondary,
    },
    signInText: {
        color: colors.primary,
        fontWeight: '700',
    },
});

// For Expo Router compatibility
export default WelcomeScreen;