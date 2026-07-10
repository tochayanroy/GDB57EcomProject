// ConfirmationScreen.tsx
import React, { useCallback, useEffect, useRef } from 'react';
import {
    Dimensions,
    Linking,
    Platform,
    ScrollView,
    Share,
    StatusBar,
    StyleSheet,
    Text,
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
    withSpring
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

// Types
interface OrderItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
    size?: string;
    color?: string;
}

interface DeliveryAddress {
    name: string;
    phone: string;
    addressLine: string;
    city: string;
    state: string;
    pinCode: string;
    landmark?: string;
}

interface PaymentDetails {
    method: string;
    transactionId: string;
    amount: number;
    date: string;
    time: string;
}

interface OrderSummary {
    orderId: string;
    orderDate: string;
    estimatedDelivery: string;
    items: OrderItem[];
    subtotal: number;
    discount: number;
    couponDiscount: number;
    shippingFee: number;
    tax: number;
    platformFee: number;
    grandTotal: number;
    paymentMethod: string;
    deliveryAddress: DeliveryAddress;
    paymentDetails: PaymentDetails;
}

// Mock Order Data
const MOCK_ORDER: OrderSummary = {
    orderId: 'ORD' + Math.floor(Math.random() * 1000000),
    orderDate: new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }),
    estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }),
    items: [
        {
            id: '1',
            name: 'Nike Air Max 90',
            price: 8999,
            quantity: 1,
            image: 'https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/8e7c2b1b-3b7e-4b9c-8e2f-4b5c6d7e8f9e/air-max-90-shoes.png',
            size: 'UK 8',
            color: 'Black/White',
        },
        {
            id: '2',
            name: 'Premium Cotton T-Shirt',
            price: 1499,
            quantity: 2,
            image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200',
            size: 'L',
            color: 'Navy Blue',
        },
    ],
    subtotal: 11997,
    discount: 2000,
    couponDiscount: 500,
    shippingFee: 0,
    tax: 299,
    platformFee: 49,
    grandTotal: 9845,
    paymentMethod: 'Google Pay (UPI)',
    deliveryAddress: {
        name: 'John Smith',
        phone: '+91 98765 43210',
        addressLine: '123 Main Street, Andheri East',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400093',
        landmark: 'Near Metro Station',
    },
    paymentDetails: {
        method: 'Google Pay',
        transactionId: 'TXN' + Math.floor(Math.random() * 1000000000),
        amount: 9845,
        date: new Date().toLocaleDateString('en-IN'),
        time: new Date().toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
        }),
    },
};

// Components
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const SuccessAnimation: React.FC = () => {
    const checkmarkScale = useSharedValue(0);
    const circleScale = useSharedValue(0);

    useEffect(() => {
        circleScale.value = withSpring(1, { damping: 12, stiffness: 100 });
        checkmarkScale.value = withSpring(1, { damping: 10, stiffness: 120, delay: 150 });
    }, []);

    const circleStyle = useAnimatedStyle(() => ({
        transform: [{ scale: circleScale.value }],
    }));

    const checkStyle = useAnimatedStyle(() => ({
        transform: [{ scale: checkmarkScale.value }],
    }));

    return (
        <View style={styles.successAnimationContainer}>
            <Animated.View style={[styles.successCircle, circleStyle]}>
                <Animated.View style={[styles.successCheck, checkStyle]}>
                    <Icon name="check" size={48} color="#FFFFFF" />
                </Animated.View>
            </Animated.View>
        </View>
    );
};

const OrderStatusCard: React.FC<{ order: OrderSummary }> = ({ order }) => {
    const [currentStatus, setCurrentStatus] = React.useState(0);
    const statuses = ['Order Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered'];

    useEffect(() => {
        // Animate through statuses
        const interval = setInterval(() => {
            setCurrentStatus((prev) => {
                if (prev < statuses.length - 1) return prev + 1;
                clearInterval(interval);
                return prev;
            });
        }, 800);
        return () => clearInterval(interval);
    }, []);

    return (
        <Animated.View entering={FadeInDown.delay(300)} style={styles.statusCard}>
            <Text style={styles.statusCardTitle}>Order Status</Text>
            <View style={styles.timelineContainer}>
                {statuses.map((status, index) => (
                    <View key={status} style={styles.timelineItem}>
                        <View style={styles.timelineLeft}>
                            <View
                                style={[
                                    styles.timelineDot,
                                    index <= currentStatus && styles.timelineDotActive,
                                ]}
                            >
                                {index < currentStatus && (
                                    <Icon name="check" size={10} color="#FFFFFF" />
                                )}
                            </View>
                            {index < statuses.length - 1 && (
                                <View
                                    style={[
                                        styles.timelineLine,
                                        index < currentStatus && styles.timelineLineActive,
                                    ]}
                                />
                            )}
                        </View>
                        <View style={styles.timelineRight}>
                            <Text
                                style={[
                                    styles.timelineStatus,
                                    index <= currentStatus && styles.timelineStatusActive,
                                ]}
                            >
                                {status}
                            </Text>
                            {index === 0 && (
                                <Text style={styles.timelineTime}>Just now</Text>
                            )}
                            {index === 1 && currentStatus >= 1 && (
                                <Text style={styles.timelineTime}>Processing at warehouse</Text>
                            )}
                            {index === 2 && currentStatus >= 2 && (
                                <Text style={styles.timelineTime}>Dispatched from Mumbai</Text>
                            )}
                        </View>
                    </View>
                ))}
            </View>

            <View style={styles.deliveryEstimate}>
                <Icon name="calendar" size={16} color="#2563EB" />
                <Text style={styles.deliveryEstimateText}>
                    Estimated Delivery: {order.estimatedDelivery}
                </Text>
            </View>
        </Animated.View>
    );
};

const OrderSummaryCard: React.FC<{ order: OrderSummary }> = ({ order }) => {
    const [expanded, setExpanded] = React.useState(false);

    return (
        <Animated.View entering={FadeInDown.delay(400)} style={styles.summaryCard}>
            <TouchableOpacity
                style={styles.summaryHeader}
                onPress={() => setExpanded(!expanded)}
            >
                <View style={styles.summaryHeaderLeft}>
                    <MaterialIcon name="receipt" size={20} color="#2563EB" />
                    <Text style={styles.summaryTitle}>Order Summary</Text>
                </View>
                <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color="#64748B" />
            </TouchableOpacity>

            {expanded && (
                <Animated.View entering={FadeIn}>
                    <View style={styles.orderIdContainer}>
                        <Text style={styles.orderIdLabel}>Order ID</Text>
                        <Text style={styles.orderIdValue}>{order.orderId}</Text>
                        <TouchableOpacity
                            onPress={() => {
                                Share.share({
                                    message: `My Order ID: ${order.orderId}\nTotal: ₹${order.grandTotal.toLocaleString()}`,
                                });
                            }}
                        >
                            <Icon name="share-2" size={16} color="#2563EB" />
                        </TouchableOpacity>
                    </View>

                    {order.items.map((item, index) => (
                        <View key={item.id} style={styles.orderItem}>
                            <View style={styles.orderItemDetails}>
                                <Text style={styles.orderItemName}>{item.name}</Text>
                                {item.size && (
                                    <Text style={styles.orderItemMeta}>Size: {item.size}</Text>
                                )}
                                {item.color && (
                                    <Text style={styles.orderItemMeta}>Color: {item.color}</Text>
                                )}
                                <Text style={styles.orderItemPrice}>
                                    ₹{item.price.toLocaleString()} x {item.quantity}
                                </Text>
                            </View>
                            <Text style={styles.orderItemTotal}>
                                ₹{(item.price * item.quantity).toLocaleString()}
                            </Text>
                        </View>
                    ))}

                    <View style={styles.divider} />

                    <View style={styles.billingRow}>
                        <Text style={styles.billingLabel}>Subtotal</Text>
                        <Text style={styles.billingValue}>₹{order.subtotal.toLocaleString()}</Text>
                    </View>
                    {order.discount > 0 && (
                        <View style={styles.billingRow}>
                            <Text style={[styles.billingLabel, styles.discountLabel]}>
                                Discount
                            </Text>
                            <Text style={[styles.billingValue, styles.discountValue]}>
                                -₹{order.discount.toLocaleString()}
                            </Text>
                        </View>
                    )}
                    {order.couponDiscount > 0 && (
                        <View style={styles.billingRow}>
                            <Text style={[styles.billingLabel, styles.couponLabel]}>
                                Coupon Discount
                            </Text>
                            <Text style={[styles.billingValue, styles.couponValue]}>
                                -₹{order.couponDiscount.toLocaleString()}
                            </Text>
                        </View>
                    )}
                    <View style={styles.billingRow}>
                        <Text style={styles.billingLabel}>Shipping</Text>
                        <Text style={styles.billingValue}>
                            {order.shippingFee === 0 ? 'Free' : `₹${order.shippingFee}`}
                        </Text>
                    </View>
                    <View style={styles.billingRow}>
                        <Text style={styles.billingLabel}>Tax (GST)</Text>
                        <Text style={styles.billingValue}>₹{order.tax.toLocaleString()}</Text>
                    </View>
                    <View style={styles.billingRow}>
                        <Text style={styles.billingLabel}>Platform Fee</Text>
                        <Text style={styles.billingValue}>₹{order.platformFee.toLocaleString()}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Grand Total</Text>
                        <Text style={styles.totalValue}>₹{order.grandTotal.toLocaleString()}</Text>
                    </View>

                    <View style={styles.paymentMethodContainer}>
                        <Icon name="credit-card" size={16} color="#10B981" />
                        <Text style={styles.paymentMethodText}>
                            Paid via {order.paymentMethod}
                        </Text>
                    </View>
                </Animated.View>
            )}
        </Animated.View>
    );
};

const DeliveryAddressCard: React.FC<{ address: DeliveryAddress }> = ({ address }) => (
    <Animated.View entering={FadeInDown.delay(500)} style={styles.deliveryCard}>
        <View style={styles.deliveryHeader}>
            <View style={styles.deliveryHeaderLeft}>
                <Icon name="map-pin" size={20} color="#2563EB" />
                <Text style={styles.deliveryTitle}>Delivery Address</Text>
            </View>
            <TouchableOpacity>
                <Text style={styles.trackButton}>Track Order</Text>
            </TouchableOpacity>
        </View>
        <Text style={styles.deliveryName}>{address.name}</Text>
        <Text style={styles.deliveryPhone}>{address.phone}</Text>
        <Text style={styles.deliveryAddress}>
            {address.addressLine}, {address.city}, {address.state} - {address.pinCode}
        </Text>
        {address.landmark && (
            <Text style={styles.deliveryLandmark}>Landmark: {address.landmark}</Text>
        )}
    </Animated.View>
);

const ActionButtons: React.FC<{ onTrack: () => void; onShare: () => void; onHome: () => void }> = ({
    onTrack,
    onShare,
    onHome,
}) => (
    <Animated.View entering={FadeInUp.delay(600)} style={styles.actionButtonsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={onTrack}>
            <Icon name="map" size={20} color="#2563EB" />
            <Text style={styles.actionButtonText}>Track</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={onShare}>
            <Icon name="share-2" size={20} color="#2563EB" />
            <Text style={styles.actionButtonText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={onHome}>
            <Icon name="home" size={20} color="#2563EB" />
            <Text style={styles.actionButtonText}>Home</Text>
        </TouchableOpacity>
    </Animated.View>
);

const NextStepsCard: React.FC = () => (
    <Animated.View entering={FadeInDown.delay(650)} style={styles.nextStepsCard}>
        <Text style={styles.nextStepsTitle}>What's Next?</Text>
        <View style={styles.nextStepItem}>
            <View style={styles.nextStepIcon}>
                <Icon name="bell" size={16} color="#8B5CF6" />
            </View>
            <View style={styles.nextStepContent}>
                <Text style={styles.nextStepTitle}>Order Updates</Text>
                <Text style={styles.nextStepDesc}>
                    You'll receive SMS & Email updates for order status
                </Text>
            </View>
        </View>
        <View style={styles.nextStepItem}>
            <View style={styles.nextStepIcon}>
                <Icon name="phone" size={16} color="#8B5CF6" />
            </View>
            <View style={styles.nextStepContent}>
                <Text style={styles.nextStepTitle}>Delivery Confirmation</Text>
                <Text style={styles.nextStepDesc}>
                    Our delivery partner will call before delivery
                </Text>
            </View>
        </View>
        <View style={styles.nextStepItem}>
            <View style={styles.nextStepIcon}>
                <Icon name="rotate-ccw" size={16} color="#8B5CF6" />
            </View>
            <View style={styles.nextStepContent}>
                <Text style={styles.nextStepTitle}>Easy Returns</Text>
                <Text style={styles.nextStepDesc}>
                    30-day return policy with free pickup
                </Text>
            </View>
        </View>
    </Animated.View>
);

const RecommendedSection: React.FC = () => {
    const recommendations = [
        { id: '1', name: 'Wireless Earbuds', price: 2999, rating: 4.5 },
        { id: '2', name: 'Phone Case', price: 999, rating: 4.2 },
        { id: '3', name: 'Fast Charger', price: 1499, rating: 4.3 },
    ];

    return (
        <Animated.View entering={FadeInDown.delay(700)} style={styles.recommendedCard}>
            <Text style={styles.recommendedTitle}>You May Also Like</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recommendedScroll}
            >
                {recommendations.map((item) => (
                    <TouchableOpacity key={item.id} style={styles.recommendedItem}>
                        <View style={styles.recommendedItemImage}>
                            <Icon name="shopping-bag" size={32} color="#CBD5E1" />
                        </View>
                        <Text style={styles.recommendedItemName}>{item.name}</Text>
                        <Text style={styles.recommendedItemPrice}>₹{item.price}</Text>
                        <View style={styles.recommendedRating}>
                            <Icon name="star" size={12} color="#F59E0B" />
                            <Text style={styles.recommendedRatingText}>{item.rating}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </Animated.View>
    );
};

const CustomerSupportCard: React.FC = () => (
    <Animated.View entering={FadeInDown.delay(750)} style={styles.supportCard}>
        <View style={styles.supportHeader}>
            <MaterialIcon name="support-agent" size={24} color="#2563EB" />
            <Text style={styles.supportTitle}>Need Help?</Text>
        </View>
        <Text style={styles.supportText}>
            For any queries related to your order, contact our customer support
        </Text>
        <View style={styles.supportButtons}>
            <TouchableOpacity
                style={styles.supportButton}
                onPress={() => Linking.openURL('tel:+919876543210')}
            >
                <Icon name="phone" size={16} color="#2563EB" />
                <Text style={styles.supportButtonText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.supportButton}
                onPress={() => Linking.openURL('mailto:support@example.com')}
            >
                <Icon name="mail" size={16} color="#2563EB" />
                <Text style={styles.supportButtonText}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.supportButton}>
                <Icon name="message-circle" size={16} color="#2563EB" />
                <Text style={styles.supportButtonText}>Chat</Text>
            </TouchableOpacity>
        </View>
    </Animated.View>
);

// Main Component
const ConfirmationScreen: React.FC<{ navigation: any; route?: any }> = ({ navigation, route }) => {
    const [order] = React.useState<OrderSummary>(MOCK_ORDER);
    const scrollViewRef = useRef<ScrollView>(null);

    const handleTrackOrder = useCallback(() => {
        // Navigate to order tracking screen
        Alert.alert('Track Order', 'Order tracking feature coming soon!');
    }, []);

    const handleShareOrder = useCallback(() => {
        Share.share({
            message: `Order Confirmed! 🎉\nOrder ID: ${order.orderId}\nTotal: ₹${order.grandTotal.toLocaleString()}\nEstimated Delivery: ${order.estimatedDelivery}`,
            title: 'Order Confirmation',
        });
    }, [order]);

    const handleGoToHome = useCallback(() => {
        navigation.navigate('Home');
    }, [navigation]);

    const handleDownloadInvoice = useCallback(() => {
        Alert.alert('Download Invoice', 'Invoice will be downloaded shortly');
    }, []);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.safeArea}>
                <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

                <Animated.View entering={FadeIn.delay(200)} style={styles.header}>
                    <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
                        <Icon name="arrow-left" size={24} color="#0F172A" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Order Confirmed!</Text>
                    <TouchableOpacity style={styles.headerButton} onPress={handleDownloadInvoice}>
                        <Icon name="download" size={20} color="#2563EB" />
                    </TouchableOpacity>
                </Animated.View>

                <CheckoutProgress currentStep={2} />

                <ScrollView
                    ref={scrollViewRef}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    removeClippedSubviews={true}
                >
                    {/* Success Animation */}
                    <SuccessAnimation />

                    {/* Success Message */}
                    <Animated.View entering={FadeInUp.delay(200)} style={styles.successMessageCard}>
                        <Text style={styles.successTitle}>Payment Successful! 🎉</Text>
                        <Text style={styles.successSubtitle}>
                            Your order has been placed successfully
                        </Text>
                        <View style={styles.transactionIdContainer}>
                            <Text style={styles.transactionIdLabel}>Transaction ID:</Text>
                            <Text style={styles.transactionIdValue}>{order.paymentDetails.transactionId}</Text>
                        </View>
                    </Animated.View>

                    {/* Order Status Timeline */}
                    <OrderStatusCard order={order} />

                    {/* Order Summary */}
                    <OrderSummaryCard order={order} />

                    {/* Delivery Address */}
                    <DeliveryAddressCard address={order.deliveryAddress} />

                    {/* Action Buttons */}
                    <ActionButtons
                        onTrack={handleTrackOrder}
                        onShare={handleShareOrder}
                        onHome={handleGoToHome}
                    />

                    {/* Next Steps */}
                    <NextStepsCard />

                    {/* Recommended Products */}
                    <RecommendedSection />

                    {/* Customer Support */}
                    <CustomerSupportCard />

                    {/* Feedback Card */}
                    <Animated.View entering={FadeInDown.delay(800)} style={styles.feedbackCard}>
                        <View style={styles.feedbackHeader}>
                            <Icon name="star" size={20} color="#F59E0B" />
                            <Text style={styles.feedbackTitle}>Rate Your Experience</Text>
                        </View>
                        <Text style={styles.feedbackText}>
                            How was your checkout experience? Your feedback helps us improve.
                        </Text>
                        <View style={styles.ratingStars}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity key={star} style={styles.starButton}>
                                    <Icon name="star" size={28} color="#CBD5E1" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Animated.View>

                    {/* Footer Space */}
                    <View style={styles.footerSpace} />
                </ScrollView>

                {/* Sticky Bottom Bar */}
                <Animated.View entering={SlideInUp.delay(500)} style={styles.stickyBar}>
                    <TouchableOpacity style={styles.continueShoppingButton} onPress={handleGoToHome}>
                        <Icon name="shopping-bag" size={20} color="#FFFFFF" />
                        <Text style={styles.continueShoppingText}>Continue Shopping</Text>
                    </TouchableOpacity>
                </Animated.View>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
};

// Checkout Progress Component
const CheckoutProgress: React.FC<{ currentStep: number }> = ({ currentStep }) => {
    const steps = ['Address', 'Payment', 'Confirmation'];

    return (
        <View style={styles.progressContainer}>
            {steps.map((step, index) => (
                <React.Fragment key={step}>
                    <View style={styles.progressStep}>
                        <View
                            style={[
                                styles.progressDot,
                                index <= currentStep && styles.progressDotActive,
                            ]}
                        >
                            {index < currentStep && <Icon name="check" size={12} color="#FFFFFF" />}
                            {index === currentStep && <View style={styles.progressDotInner} />}
                        </View>
                        <Text
                            style={[
                                styles.progressLabel,
                                index <= currentStep && styles.progressLabelActive,
                            ]}
                        >
                            {step}
                        </Text>
                    </View>
                    {index < steps.length - 1 && (
                        <View
                            style={[
                                styles.progressLine,
                                index < currentStep && styles.progressLineActive,
                            ]}
                        />
                    )}
                </React.Fragment>
            ))}
        </View>
    );
};

// Alert for demo
const Alert = (title: string, message: string) => {
    console.log(`${title}: ${message}`);
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
    successAnimationContainer: {
        alignItems: 'center',
        marginTop: 30,
        marginBottom: 20,
    },
    successCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#22C55E',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#22C55E',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    successCheck: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    successMessageCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        marginBottom: 16,
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    successTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 8,
    },
    successSubtitle: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 12,
    },
    transactionIdContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    transactionIdLabel: {
        fontSize: 12,
        color: '#64748B',
    },
    transactionIdValue: {
        fontSize: 12,
        fontWeight: '600',
        color: '#2563EB',
    },
    statusCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        marginBottom: 16,
        padding: 18,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    statusCardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
        marginBottom: 16,
    },
    timelineContainer: {
        marginBottom: 16,
    },
    timelineItem: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    timelineLeft: {
        width: 30,
        alignItems: 'center',
    },
    timelineDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    timelineDotActive: {
        backgroundColor: '#2563EB',
    },
    timelineLine: {
        width: 2,
        height: 30,
        backgroundColor: '#E2E8F0',
        position: 'absolute',
        top: 20,
    },
    timelineLineActive: {
        backgroundColor: '#2563EB',
    },
    timelineRight: {
        flex: 1,
        marginLeft: 12,
    },
    timelineStatus: {
        fontSize: 14,
        fontWeight: '500',
        color: '#64748B',
        marginBottom: 2,
    },
    timelineStatusActive: {
        color: '#0F172A',
        fontWeight: '600',
    },
    timelineTime: {
        fontSize: 11,
        color: '#94A3B8',
    },
    deliveryEstimate: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    deliveryEstimateText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#2563EB',
    },
    summaryCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    summaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 18,
        backgroundColor: '#F8FAFC',
    },
    summaryHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
    },
    orderIdContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingTop: 12,
        paddingBottom: 8,
        backgroundColor: '#F1F5F9',
        gap: 12,
    },
    orderIdLabel: {
        fontSize: 12,
        color: '#64748B',
    },
    orderIdValue: {
        flex: 1,
        fontSize: 12,
        fontWeight: '600',
        color: '#0F172A',
    },
    orderItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    orderItemDetails: {
        flex: 1,
    },
    orderItemName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#0F172A',
        marginBottom: 2,
    },
    orderItemMeta: {
        fontSize: 11,
        color: '#64748B',
        marginBottom: 2,
    },
    orderItemPrice: {
        fontSize: 12,
        color: '#64748B',
    },
    orderItemTotal: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0F172A',
    },
    divider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 12,
        marginHorizontal: 18,
    },
    billingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingVertical: 6,
    },
    billingLabel: {
        fontSize: 13,
        color: '#64748B',
    },
    billingValue: {
        fontSize: 13,
        color: '#0F172A',
    },
    discountLabel: {
        color: '#EF4444',
    },
    discountValue: {
        color: '#EF4444',
    },
    couponLabel: {
        color: '#8B5CF6',
    },
    couponValue: {
        color: '#8B5CF6',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 12,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
    },
    totalValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#2563EB',
    },
    paymentMethodContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 18,
        paddingVertical: 12,
        backgroundColor: '#F1F5F9',
        marginTop: 8,
    },
    paymentMethodText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#10B981',
    },
    deliveryCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        marginBottom: 16,
        padding: 18,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    deliveryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    deliveryHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    deliveryTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0F172A',
    },
    trackButton: {
        fontSize: 13,
        fontWeight: '500',
        color: '#2563EB',
    },
    deliveryName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0F172A',
        marginBottom: 2,
    },
    deliveryPhone: {
        fontSize: 13,
        color: '#64748B',
        marginBottom: 6,
    },
    deliveryAddress: {
        fontSize: 13,
        color: '#64748B',
        lineHeight: 18,
    },
    deliveryLandmark: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 4,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginHorizontal: 20,
        marginBottom: 16,
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#2563EB',
    },
    nextStepsCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        marginBottom: 16,
        padding: 18,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    nextStepsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
        marginBottom: 14,
    },
    nextStepItem: {
        flexDirection: 'row',
        marginBottom: 14,
        gap: 12,
    },
    nextStepIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#8B5CF615',
        justifyContent: 'center',
        alignItems: 'center',
    },
    nextStepContent: {
        flex: 1,
    },
    nextStepTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#0F172A',
        marginBottom: 2,
    },
    nextStepDesc: {
        fontSize: 12,
        color: '#64748B',
    },
    recommendedCard: {
        marginHorizontal: 20,
        marginBottom: 16,
    },
    recommendedTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
        marginBottom: 12,
    },
    recommendedScroll: {
        paddingRight: 20,
    },
    recommendedItem: {
        width: 120,
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderRadius: 16,
        marginRight: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    recommendedItemImage: {
        width: 80,
        height: 80,
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    recommendedItemName: {
        fontSize: 12,
        fontWeight: '500',
        color: '#0F172A',
        textAlign: 'center',
        marginBottom: 4,
    },
    recommendedItemPrice: {
        fontSize: 13,
        fontWeight: '700',
        color: '#2563EB',
        marginBottom: 4,
    },
    recommendedRating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    recommendedRatingText: {
        fontSize: 11,
        color: '#64748B',
    },
    supportCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        marginBottom: 16,
        padding: 18,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    supportHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    supportTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
    },
    supportText: {
        fontSize: 13,
        color: '#64748B',
        marginBottom: 16,
        lineHeight: 18,
    },
    supportButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    supportButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#F1F5F9',
        paddingVertical: 10,
        borderRadius: 12,
    },
    supportButtonText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#2563EB',
    },
    feedbackCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        marginBottom: 16,
        padding: 18,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    feedbackHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    feedbackTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
    },
    feedbackText: {
        fontSize: 12,
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 16,
    },
    ratingStars: {
        flexDirection: 'row',
        gap: 12,
    },
    starButton: {
        padding: 4,
    },
    footerSpace: {
        height: 20,
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
    continueShoppingButton: {
        backgroundColor: '#2563EB',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 14,
        borderRadius: 14,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    continueShoppingText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default ConfirmationScreen;