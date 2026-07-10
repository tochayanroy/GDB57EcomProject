// SplashScreen.tsx
// Production-Ready E-Commerce Splash Screen for React Native Expo
// Features: Reanimated 2 animations, TypeScript, Accessibility, Responsive Design

import React, { useEffect } from 'react';
import {
    AccessibilityInfo,
    Dimensions,
    Platform,
    SafeAreaView,
    StatusBar,
    Text,
    View,
} from 'react-native';
import Animated, {
    Easing,
    Extrapolate,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const SPLASH_DURATION = 2500; // Total splash screen visibility (ms)
const LOGO_ANIMATION_DURATION = 800;
const LOGO_ROTATION_DURATION = 1000; // 360° rotation duration
const TEXT_ANIMATION_DURATION = 600;
const TEXT_DELAY = 400;
const LOADER_PULSE_DURATION = 1000;

// Dimensions for responsive scaling
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isSmallDevice = SCREEN_WIDTH < 375;
const isTablet = SCREEN_WIDTH >= 768;

// ============================================================================
// TYPOGRAPHY SYSTEM - Premium Font Styling
// ============================================================================

const typography = {
    brandName: {
        fontSize: isSmallDevice ? 34 : isTablet ? 52 : 44,
        fontWeight: '800' as const,
        letterSpacing: 2,
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    tagline: {
        fontSize: isSmallDevice ? 14 : isTablet ? 20 : 16,
        fontWeight: '500' as const,
        letterSpacing: 1,
    },
};

// ============================================================================
// COLOR SYSTEM - Premium Color Palette
// ============================================================================

const colors = {
    // Primary Brand Colors - Luxury Gradient
    primaryStart: '#667eea',
    primaryEnd: '#764ba2',
    primary: '#5B3A8C',      // Royal Purple - Premium feel
    primaryLight: '#8B5CF6',  // Vibrant Purple
    secondary: '#EC4899',     // Hot Pink - Modern accent
    accent: '#F59E0B',        // Amber - Luxury touch

    // Neutrals
    background: '#FFFFFF',
    backgroundGradient: ['#FFFFFF', '#F3F4F6'],
    textPrimary: '#1F2937',   // Dark gray for elegance
    textSecondary: '#6B7280',  // Soft gray for tagline
    textLight: '#9CA3AF',
    border: '#E5E7EB',

    // Premium Card Background
    surface: '#FFFFFF',
    surfaceElevated: '#F9FAFB',

    // Loading indicator
    loaderInactive: '#E5E7EB',
    loaderActive: '#8B5CF6',
    loaderAccent: '#EC4899',
};

// ============================================================================
// PREMIUM LOGO COMPONENT - With Gradient and Shadow Effects
// ============================================================================

const PremiumLogoIcon: React.FC = () => {
    return (
        <View style={{ 
            width: 120, 
            height: 120, 
            alignItems: 'center', 
            justifyContent: 'center',
        }}>
            <View
                style={{
                    width: 100,
                    height: 100,
                    borderRadius: 30,
                    backgroundColor: colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: colors.primaryLight,
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.3,
                    shadowRadius: 20,
                    elevation: 12,
                    overflow: 'hidden',
                }}
            >
                {/* Inner gradient effect */}
                <View
                    style={{
                        position: 'absolute',
                        top: -50,
                        left: -50,
                        right: -50,
                        bottom: -50,
                        backgroundColor: colors.primaryLight,
                        opacity: 0.1,
                    }}
                />
                
                {/* Premium Crown Icon for luxury feel */}
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                    {/* Crown Shape */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <View style={{ width: 10, height: 10, backgroundColor: '#FFFFFF', borderRadius: 10, transform: [{ rotate: '45deg' }] }} />
                        <View style={{ width: 14, height: 14, backgroundColor: '#FFFFFF', borderRadius: 14, transform: [{ rotate: '45deg' }] }} />
                        <View style={{ width: 10, height: 10, backgroundColor: '#FFFFFF', borderRadius: 10, transform: [{ rotate: '45deg' }] }} />
                    </View>
                    
                    {/* Shopping Bag Icon */}
                    <View
                        style={{
                            width: 40,
                            height: 48,
                            borderWidth: 2.5,
                            borderColor: '#FFFFFF',
                            borderRadius: 14,
                            borderBottomLeftRadius: 20,
                            borderBottomRightRadius: 20,
                            marginTop: 4,
                        }}
                    />
                    <View
                        style={{
                            position: 'absolute',
                            top: -2,
                            width: 22,
                            height: 12,
                            borderWidth: 2,
                            borderColor: '#FFFFFF',
                            borderBottomWidth: 0,
                            borderTopLeftRadius: 12,
                            borderTopRightRadius: 12,
                        }}
                    />
                    {/* Handle */}
                    <View
                        style={{
                            position: 'absolute',
                            top: -8,
                            width: 14,
                            height: 8,
                            borderWidth: 2,
                            borderColor: '#FFFFFF',
                            borderRadius: 8,
                            borderBottomWidth: 0,
                        }}
                    />
                </View>
            </View>
        </View>
    );
};

// ============================================================================
// PREMIUM LOADING INDICATOR - Animated dots with gradient effect
// ============================================================================

const PremiumLoadingIndicator: React.FC = () => {
    const pulse1 = useSharedValue(0.3);
    const pulse2 = useSharedValue(0.3);
    const pulse3 = useSharedValue(0.3);

    useEffect(() => {
        pulse1.value = withRepeat(
            withSequence(
                withTiming(1, { duration: LOADER_PULSE_DURATION, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.3, { duration: LOADER_PULSE_DURATION, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
        
        pulse2.value = withDelay(
            200,
            withRepeat(
                withSequence(
                    withTiming(1, { duration: LOADER_PULSE_DURATION, easing: Easing.inOut(Easing.ease) }),
                    withTiming(0.3, { duration: LOADER_PULSE_DURATION, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            )
        );
        
        pulse3.value = withDelay(
            400,
            withRepeat(
                withSequence(
                    withTiming(1, { duration: LOADER_PULSE_DURATION, easing: Easing.inOut(Easing.ease) }),
                    withTiming(0.3, { duration: LOADER_PULSE_DURATION, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            )
        );
    }, []);

    const dot1Style = useAnimatedStyle(() => ({
        opacity: interpolate(pulse1.value, [0.3, 1], [0.4, 1], Extrapolate.CLAMP),
        transform: [{ scale: interpolate(pulse1.value, [0.3, 1], [0.8, 1.2], Extrapolate.CLAMP) }],
        backgroundColor: colors.loaderActive,
    }));

    const dot2Style = useAnimatedStyle(() => ({
        opacity: interpolate(pulse2.value, [0.3, 1], [0.4, 1], Extrapolate.CLAMP),
        transform: [{ scale: interpolate(pulse2.value, [0.3, 1], [0.8, 1.2], Extrapolate.CLAMP) }],
        backgroundColor: colors.loaderAccent,
    }));

    const dot3Style = useAnimatedStyle(() => ({
        opacity: interpolate(pulse3.value, [0.3, 1], [0.4, 1], Extrapolate.CLAMP),
        transform: [{ scale: interpolate(pulse3.value, [0.3, 1], [0.8, 1.2], Extrapolate.CLAMP) }],
        backgroundColor: colors.primaryLight,
    }));

    return (
        <View
            style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 14,
                paddingBottom: isSmallDevice ? 20 : 30,
            }}
            accessibilityLabel="Loading indicator"
            accessibilityRole="progressbar"
            accessibilityLiveRegion="polite"
        >
            <Animated.View
                style={[
                    {
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                    },
                    dot1Style,
                ]}
            />
            <Animated.View
                style={[
                    {
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                    },
                    dot2Style,
                ]}
            />
            <Animated.View
                style={[
                    {
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                    },
                    dot3Style,
                ]}
            />
        </View>
    );
};

// ============================================================================
// MAIN SPLASH SCREEN COMPONENT
// ============================================================================

interface SplashScreenProps {
    onAnimationComplete?: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationComplete }) => {
    // Animation values
    const logoScale = useSharedValue(0.6);
    const logoOpacity = useSharedValue(0);
    const logoRotation = useSharedValue(0); // New rotation value
    const brandTranslateY = useSharedValue(30);
    const brandOpacity = useSharedValue(0);
    const taglineTranslateY = useSharedValue(20);
    const taglineOpacity = useSharedValue(0);

    // Track if animation completed (prevent double callback)
    const animationCompleted = React.useRef(false);

    // Handle animation completion
    const handleAnimationComplete = React.useCallback(() => {
        if (!animationCompleted.current && onAnimationComplete) {
            animationCompleted.current = true;
            onAnimationComplete();
        }
    }, [onAnimationComplete]);

    useEffect(() => {
        // 1. Logo fades in, scales up, and rotates 360 degrees
        logoOpacity.value = withTiming(1, {
            duration: LOGO_ANIMATION_DURATION,
            easing: Easing.bezier(0.2, 0.9, 0.4, 1),
        });
        
        logoScale.value = withTiming(1, {
            duration: LOGO_ANIMATION_DURATION,
            easing: Easing.bezier(0.2, 0.9, 0.4, 1),
        });
        
        // 360 degree rotation - one complete rotation
        logoRotation.value = withTiming(360, {
            duration: LOGO_ROTATION_DURATION,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });

        // 2. Brand name slides up with delay
        brandOpacity.value = withDelay(
            TEXT_DELAY,
            withTiming(1, { duration: TEXT_ANIMATION_DURATION, easing: Easing.out(Easing.cubic) })
        );
        brandTranslateY.value = withDelay(
            TEXT_DELAY,
            withTiming(0, { duration: TEXT_ANIMATION_DURATION, easing: Easing.out(Easing.cubic) })
        );

        // 3. Tagline slides up with additional delay
        taglineOpacity.value = withDelay(
            TEXT_DELAY + 150,
            withTiming(0.9, { duration: TEXT_ANIMATION_DURATION, easing: Easing.out(Easing.cubic) })
        );
        taglineTranslateY.value = withDelay(
            TEXT_DELAY + 150,
            withTiming(0, { duration: TEXT_ANIMATION_DURATION, easing: Easing.out(Easing.cubic) })
        );

        // 4. Trigger completion after splash duration
        const timer = setTimeout(() => {
            runOnJS(handleAnimationComplete)();
        }, SPLASH_DURATION);

        return () => clearTimeout(timer);
    }, []);

    // Animated styles
    const logoAnimatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: logoScale.value },
            { rotate: `${logoRotation.value}deg` }
        ],
        opacity: logoOpacity.value,
    }));

    const brandAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: brandTranslateY.value }],
        opacity: brandOpacity.value,
    }));

    const taglineAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: taglineTranslateY.value }],
        opacity: taglineOpacity.value,
    }));

    // Accessibility: announce when screen is ready
    useEffect(() => {
        if (Platform.OS !== 'web') {
            AccessibilityInfo.announceForAccessibility('Welcome to Roy Shop. Premium luxury shopping experience loading.');
        }
    }, []);

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar
                barStyle="dark-content"
                backgroundColor={colors.background}
                translucent={false}
            />

            <View style={styles.container}>
                {/* Background decorative elements - Premium feel */}
                <View style={styles.decorativeCircle1} />
                <View style={styles.decorativeCircle2} />
                <View style={styles.decorativeCircle3} />

                {/* Center Container - Primary Focus */}
                <View style={styles.centerContainer}>
                    {/* Animated Logo with Rotation */}
                    <Animated.View style={logoAnimatedStyle}>
                        <PremiumLogoIcon />
                    </Animated.View>

                    {/* Brand Name - Animated with premium styling */}
                    <Animated.View style={[styles.brandContainer, brandAnimatedStyle]}>
                        <Text
                            style={[styles.brandName, typography.brandName]}
                            accessibilityLabel="Brand name: Roy Shop"
                            accessibilityRole="header"
                            maxFontSizeMultiplier={1.2}
                        >
                            ROY SHOP
                        </Text>
                        {/* Premium underline accent */}
                        <View style={styles.brandUnderline} />
                    </Animated.View>

                    {/* Tagline - Animated */}
                    <Animated.View style={taglineAnimatedStyle}>
                        <Text
                            style={[styles.tagline, typography.tagline]}
                            accessibilityLabel="Tagline: Premium Luxury Shopping Experience"
                            maxFontSizeMultiplier={1.2}
                        >
                            Premium Luxury Shopping Experience
                        </Text>
                    </Animated.View>
                </View>

                {/* Bottom Container - Premium Loading Indicator */}
                <View style={styles.bottomContainer}>
                    <PremiumLoadingIndicator />
                </View>
            </View>
        </SafeAreaView>
    );
};

// ============================================================================
// STYLESHEET - Premium, Responsive, Semantic, Production-Ready
// ============================================================================

const styles = {
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    // Decorative background circles for premium feel
    decorativeCircle1: {
        position: 'absolute' as const,
        top: -SCREEN_HEIGHT * 0.2,
        right: -SCREEN_WIDTH * 0.3,
        width: SCREEN_WIDTH * 0.6,
        height: SCREEN_WIDTH * 0.6,
        borderRadius: SCREEN_WIDTH * 0.3,
        backgroundColor: colors.primaryLight,
        opacity: 0.05,
    },
    decorativeCircle2: {
        position: 'absolute' as const,
        bottom: -SCREEN_HEIGHT * 0.15,
        left: -SCREEN_WIDTH * 0.2,
        width: SCREEN_WIDTH * 0.5,
        height: SCREEN_WIDTH * 0.5,
        borderRadius: SCREEN_WIDTH * 0.25,
        backgroundColor: colors.secondary,
        opacity: 0.05,
    },
    decorativeCircle3: {
        position: 'absolute' as const,
        top: SCREEN_HEIGHT * 0.3,
        left: -SCREEN_WIDTH * 0.1,
        width: SCREEN_WIDTH * 0.3,
        height: SCREEN_WIDTH * 0.3,
        borderRadius: SCREEN_WIDTH * 0.15,
        backgroundColor: colors.accent,
        opacity: 0.03,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        // Margin bottom to balance with loading indicator
        marginBottom: -40,
    },
    brandContainer: {
        marginTop: 28,
        alignItems: 'center',
    },
    brandName: {
        color: colors.textPrimary,
        textAlign: 'center',
        includeFontPadding: false,
        ...Platform.select({
            ios: {
                fontFamily: 'System',
                fontWeight: '800' as const,
            },
            android: {
                fontFamily: 'sans-serif',
                fontWeight: '800' as const,
            },
        }),
    },
    brandUnderline: {
        width: 50,
        height: 3,
        backgroundColor: colors.primaryLight,
        borderRadius: 2,
        marginTop: 12,
        shadowColor: colors.primaryLight,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 4,
    },
    tagline: {
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 16,
        includeFontPadding: false,
        ...Platform.select({
            ios: {
                fontFamily: 'System',
                fontWeight: '500' as const,
            },
            android: {
                fontFamily: 'sans-serif-medium',
            },
        }),
    },
    bottomContainer: {
        position: 'absolute' as const,
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: isSmallDevice ? 24 : 40,
    },
};

// For Expo Router compatibility - can be used as a screen component
export default SplashScreen;