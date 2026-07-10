const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const passport = require("passport");
const Order = require("../modules/OrderSchema");
const Product = require("../modules/ProductSchema");
const User = require("../modules/UserSchema");
const Cart = require("../modules/CartSchema");

// ==============================
// MIDDLEWARE
// ==============================

const authorizeAdmin = (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: "Authentication required" 
            });
        }
        
        if (req.user.role !== "admin") {
            return res.status(403).json({ 
                success: false, 
                message: "Admin access required" 
            });
        }
        
        next();
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: "Server error during authorization" 
        });
    }
};

module.exports = authorizeAdmin;

// Generate unique order ID
const generateOrderId = () => {
	const prefix = "ORD";
	const timestamp = Date.now().toString().slice(-8);
	const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
	return `${prefix}${timestamp}${random}`;
};

// ==============================
// 📋 USER ROUTES (Authenticated users only)
// ==============================

// Get user's orders
router.get("/my-orders", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const userId = req.user._id;
		const {
			page = 1,
			limit = 10,
			sort = "-createdAt",
			status
		} = req.query;

		const query = { user: userId };
		if (status) query.status = status;

		const orders = await Order.find(query)
			.populate("product", "name slug thumbnail images brand")
			.sort(sort)
			.limit(limit * 1)
			.skip((page - 1) * limit)
			.lean();

		const total = await Order.countDocuments(query);

		// Calculate order summaries
		const ordersWithSummary = orders.map(order => ({
			...order,
			itemCount: 1, // Each order document represents one product
			orderStatus: order.status,
			paymentStatus: order.payment.status,
			trackingInfo: order.shipping.trackingNumber ? {
				trackingNumber: order.shipping.trackingNumber,
				carrier: order.shipping.carrier,
				status: order.status
			} : null
		}));

		res.json({
			success: true,
			data: {
				orders: ordersWithSummary,
				pagination: {
					page: parseInt(page),
					limit: parseInt(limit),
					total,
					pages: Math.ceil(total / limit)
				}
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Get single order by ID
router.get("/:orderId", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const { orderId } = req.params;
		const userId = req.user._id;
		const userRole = req.user.role;

		let query = { _id: orderId };
		
		// If not admin, restrict to user's own orders
		if (userRole !== "admin") {
			query.user = userId;
		}

		const order = await Order.findOne(query)
			.populate("product", "name slug description price discountPrice thumbnail images brand category")
			.populate("user", "name email phone")
			.lean();

		if (!order) {
			return res.status(404).json({ success: false, message: "Order not found" });
		}

		// Calculate timeline
		const timeline = [];
		if (order.createdAt) timeline.push({ status: "Order Placed", date: order.createdAt, completed: true });
		if (order.status === "confirmed" || order.status === "processing" || order.status === "shipped" || order.status === "delivered") {
			timeline.push({ status: "Order Confirmed", date: order.updatedAt, completed: true });
		}
		if (order.shipping.shippedAt) {
			timeline.push({ status: "Shipped", date: order.shipping.shippedAt, completed: true });
		}
		if (order.shipping.deliveredAt) {
			timeline.push({ status: "Delivered", date: order.shipping.deliveredAt, completed: true });
		}
		if (order.status === "cancelled") {
			timeline.push({ status: "Cancelled", date: order.updatedAt, completed: true });
		}

		res.json({
			success: true,
			data: {
				...order,
				timeline,
				canCancel: ["pending", "confirmed"].includes(order.status),
				canReturn: order.status === "delivered" && !order.refund.status !== "completed",
				returnWindow: order.status === "delivered" ? 
					Math.max(0, 7 - Math.floor((Date.now() - new Date(order.shipping.deliveredAt).getTime()) / (1000 * 60 * 60 * 24))) : 0
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Get order by custom order ID
router.get("/by-order-id/:orderId", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const { orderId } = req.params;
		const userId = req.user._id;
		const userRole = req.user.role;

		let query = { orderId };
		if (userRole !== "admin") {
			query.user = userId;
		}

		const order = await Order.findOne(query)
			.populate("product", "name slug thumbnail price")
			.lean();

		if (!order) {
			return res.status(404).json({ success: false, message: "Order not found" });
		}

		res.json({ success: true, data: order });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Create new order from cart
router.post("/create", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const userId = req.user._id;
		const {
			address,
			paymentMethod,
			couponCode,
			notes
		} = req.body;

		// Validate required fields
		if (!address || !paymentMethod) {
			return res.status(400).json({
				success: false,
				message: "Shipping address and payment method are required"
			});
		}

		// Get user's cart items
		const cartItems = await Cart.find({ user: userId }).populate("product");

		if (!cartItems || cartItems.length === 0) {
			return res.status(400).json({ success: false, message: "Cart is empty" });
		}

		// Validate stock and calculate totals
		let subtotal = 0;
		let totalShipping = 0;
		let totalDiscount = 0;
		const validatedItems = [];

		for (const item of cartItems) {
			const product = item.product;
			
			if (!product || !product.isActive) {
				return res.status(400).json({
					success: false,
					message: `Product ${product?.name || "Unknown"} is no longer available`
				});
			}

			if (product.stock < item.quantity) {
				return res.status(400).json({
					success: false,
					message: `Only ${product.stock} items available for ${product.name}`
				});
			}

			const currentPrice = product.discountPrice && product.discountPrice > 0 
				? product.discountPrice 
				: product.price;
			const totalPrice = currentPrice * item.quantity;
			
			subtotal += totalPrice;
			totalShipping += product.shippingCharge || 0;
			totalDiscount += product.discountPrice || 0;

			validatedItems.push({
				product: product._id,
				variant: item.variant,
				quantity: item.quantity,
				price: currentPrice,
				discountPrice: product.discountPrice || 0,
				totalPrice,
				shippingCharge: product.shippingCharge || 0
			});
		}

		// Apply coupon if provided
		let couponDiscount = 0;
		let appliedCoupon = null;
		
		if (couponCode) {
			// TODO: Implement actual coupon validation
			const validCoupons = {
				"SAVE10": { discount: 10, type: "percentage", minOrder: 500 },
				"SAVE20": { discount: 20, type: "percentage", minOrder: 1000 }
			};
			
			const coupon = validCoupons[couponCode.toUpperCase()];
			if (coupon && subtotal >= coupon.minOrder) {
				if (coupon.type === "percentage") {
					couponDiscount = (subtotal * coupon.discount) / 100;
				} else {
					couponDiscount = coupon.discount;
				}
				appliedCoupon = { code: couponCode.toUpperCase(), discountAmount: couponDiscount };
			}
		}

		const grandTotal = subtotal + totalShipping - couponDiscount;

		// Create orders for each cart item
		const createdOrders = [];
		
		for (const item of validatedItems) {
			const orderId = generateOrderId();
			
			const order = await Order.create({
				product: item.product,
				variant: item.variant,
				quantity: item.quantity,
				price: item.price,
				discountPrice: item.discountPrice,
				totalPrice: item.totalPrice,
				orderId,
				user: userId,
				shippingCharge: item.shippingCharge,
				coupon: appliedCoupon,
				payment: {
					method: paymentMethod,
					status: paymentMethod === "COD" ? "pending" : "pending",
					transactionId: null,
					paidAt: null
				},
				addresses: [address],
				shipping: {
					method: "standard",
					trackingNumber: null,
					carrier: null,
					shippedAt: null,
					deliveredAt: null
				},
				status: "pending",
				notes: notes || "",
				isPaid: paymentMethod === "COD" ? false : false,
				isDelivered: false
			});

			// Update product stock
			await Product.findByIdAndUpdate(item.product, {
				$inc: { stock: -item.quantity, soldCount: item.quantity }
			});

			createdOrders.push(order);
		}

		// Clear user's cart
		await Cart.deleteMany({ user: userId });
		await User.findByIdAndUpdate(userId, { cart: null });

		// Add orders to user's orders array
		const orderIds = createdOrders.map(order => order._id);
		await User.findByIdAndUpdate(userId, {
			$push: { orders: { $each: orderIds } }
		});

		res.status(201).json({
			success: true,
			message: `${createdOrders.length} order(s) created successfully`,
			data: {
				orders: createdOrders,
				summary: {
					subtotal,
					shipping: totalShipping,
					couponDiscount,
					grandTotal,
					itemCount: validatedItems.length
				}
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Cancel order
router.post("/:orderId/cancel", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const { orderId } = req.params;
		const userId = req.user._id;
		const { reason } = req.body;

		const order = await Order.findOne({ _id: orderId, user: userId });

		if (!order) {
			return res.status(404).json({ success: false, message: "Order not found" });
		}

		// Check if order can be cancelled
		if (!["pending", "confirmed"].includes(order.status)) {
			return res.status(400).json({
				success: false,
				message: `Order cannot be cancelled. Current status: ${order.status}`
			});
		}

		// Restore product stock
		await Product.findByIdAndUpdate(order.product, {
			$inc: { stock: order.quantity, soldCount: -order.quantity }
		});

		order.status = "cancelled";
		order.notes = reason ? `Cancelled: ${reason}` : order.notes;
		
		if (order.payment.status === "paid") {
			order.payment.status = "refunded";
			order.refund.status = "completed";
			order.refund.amount = order.totalPrice;
		}

		await order.save();

		res.json({
			success: true,
			message: "Order cancelled successfully",
			data: order
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Request return/refund
router.post("/:orderId/return", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const { orderId } = req.params;
		const userId = req.user._id;
		const { reason } = req.body;

		if (!reason) {
			return res.status(400).json({ success: false, message: "Return reason is required" });
		}

		const order = await Order.findOne({ _id: orderId, user: userId });

		if (!order) {
			return res.status(404).json({ success: false, message: "Order not found" });
		}

		// Check if order is delivered and within return window
		if (order.status !== "delivered") {
			return res.status(400).json({
				success: false,
				message: "Only delivered orders can be returned"
			});
		}

		// Check if already requested
		if (order.refund.status !== "none") {
			return res.status(400).json({
				success: false,
				message: `Return already ${order.refund.status}`
			});
		}

		order.refund.status = "requested";
		order.refund.reason = reason;
		order.refund.amount = order.totalPrice;
		order.status = "returned";
		
		await order.save();

		res.json({
			success: true,
			message: "Return request submitted successfully",
			data: order
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Track order
router.get("/:orderId/track", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const { orderId } = req.params;
		const userId = req.user._id;

		const order = await Order.findOne({ _id: orderId, user: userId })
			.populate("product", "name thumbnail")
			.lean();

		if (!order) {
			return res.status(404).json({ success: false, message: "Order not found" });
		}

		const trackingSteps = [
			{ step: "Order Placed", status: "completed", date: order.createdAt, description: "Your order has been placed successfully" },
			{ step: "Order Confirmed", status: order.status !== "pending" ? "completed" : "pending", date: order.status !== "pending" ? order.updatedAt : null, description: "Your order has been confirmed" },
			{ step: "Processing", status: ["processing", "shipped", "delivered"].includes(order.status) ? "completed" : "pending", date: ["processing", "shipped", "delivered"].includes(order.status) ? order.updatedAt : null, description: "Your order is being processed" },
			{ step: "Shipped", status: order.shipping.shippedAt ? "completed" : "pending", date: order.shipping.shippedAt, description: order.shipping.trackingNumber ? `Tracking: ${order.shipping.trackingNumber}` : "Your order has been shipped" },
			{ step: "Out for Delivery", status: order.shipping.deliveredAt ? "completed" : order.shipping.shippedAt ? "active" : "pending", date: null, description: "Your order is out for delivery" },
			{ step: "Delivered", status: order.shipping.deliveredAt ? "completed" : "pending", date: order.shipping.deliveredAt, description: "Your order has been delivered" }
		];

		if (order.status === "cancelled") {
			trackingSteps.push({ step: "Cancelled", status: "cancelled", date: order.updatedAt, description: "Your order has been cancelled" });
		}

		res.json({
			success: true,
			data: {
				orderId: order.orderId,
				product: order.product,
				status: order.status,
				trackingSteps,
				trackingNumber: order.shipping.trackingNumber,
				carrier: order.shipping.carrier,
				estimatedDelivery: order.shipping.shippedAt ? 
					new Date(new Date(order.shipping.shippedAt).getTime() + 7 * 24 * 60 * 60 * 1000) : null
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Download order invoice
router.get("/:orderId/invoice", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const { orderId } = req.params;
		const userId = req.user._id;

		const order = await Order.findOne({ _id: orderId, user: userId })
			.populate("product", "name sku brand")
			.lean();

		if (!order) {
			return res.status(404).json({ success: false, message: "Order not found" });
		}

		// Generate invoice data (in a real app, you'd generate PDF)
		const invoice = {
			invoiceNumber: `INV-${order.orderId}`,
			orderId: order.orderId,
			date: order.createdAt,
			customer: {
				name: order.shippingAddress.fullName,
				email: req.user.email,
				phone: order.shippingAddress.phone,
				address: `${order.shippingAddress.addressLine}, ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}`
			},
			items: [{
				product: order.product.name,
				quantity: order.quantity,
				price: order.price,
				total: order.totalPrice
			}],
			subtotal: order.totalPrice,
			shipping: order.shippingCharge,
			couponDiscount: order.coupon?.discountAmount || 0,
			grandTotal: order.totalPrice + order.shippingCharge - (order.coupon?.discountAmount || 0),
			paymentMethod: order.payment.method,
			paymentStatus: order.payment.status
		};

		res.json({
			success: true,
			data: invoice
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Get order statistics for user
router.get("/stats/my-stats", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const userId = req.user._id;

		const stats = await Order.aggregate([
			{ $match: { user: userId } },
			{
				$group: {
					_id: null,
					totalOrders: { $sum: 1 },
					totalSpent: { $sum: { $add: ["$totalPrice", "$shippingCharge"] } },
					totalItems: { $sum: "$quantity" },
					completedOrders: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } },
					cancelledOrders: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
					pendingOrders: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } }
				}
			}
		]);

		const recentOrders = await Order.find({ user: userId })
			.sort("-createdAt")
			.limit(5)
			.populate("product", "name thumbnail")
			.lean();

		res.json({
			success: true,
			data: {
				stats: stats[0] || {
					totalOrders: 0,
					totalSpent: 0,
					totalItems: 0,
					completedOrders: 0,
					cancelledOrders: 0,
					pendingOrders: 0
				},
				recentOrders
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// ==============================
// 🔐 ADMIN ROUTES
// ==============================

// Get all orders (Admin only)
router.get("/admin/all", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const {
			page = 1,
			limit = 20,
			sort = "-createdAt",
			status,
			paymentStatus,
			fromDate,
			toDate,
			search
		} = req.query;

		const query = {};

		if (status) query.status = status;
		if (paymentStatus) query["payment.status"] = paymentStatus;
		if (fromDate || toDate) {
			query.createdAt = {};
			if (fromDate) query.createdAt.$gte = new Date(fromDate);
			if (toDate) query.createdAt.$lte = new Date(toDate);
		}
		if (search) {
			query.$or = [
				{ orderId: { $regex: search, $options: "i" } },
				{ "shippingAddress.fullName": { $regex: search, $options: "i" } },
				{ "shippingAddress.phone": { $regex: search, $options: "i" } }
			];
		}

		const orders = await Order.find(query)
			.populate("product", "name slug thumbnail")
			.populate("user", "name email phone")
			.sort(sort)
			.limit(limit * 1)
			.skip((page - 1) * limit)
			.lean();

		const total = await Order.countDocuments(query);

		// Calculate summary
		const summary = await Order.aggregate([
			{ $match: query },
			{
				$group: {
					_id: null,
					totalOrders: { $sum: 1 },
					totalRevenue: { $sum: { $add: ["$totalPrice", "$shippingCharge"] } },
					totalItems: { $sum: "$quantity" },
					pendingOrders: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
					processingOrders: { $sum: { $cond: [{ $in: ["$status", ["confirmed", "processing", "shipped"]] }, 1, 0] } },
					deliveredOrders: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } },
					cancelledOrders: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } }
				}
			}
		]);

		res.json({
			success: true,
			data: {
				orders,
				summary: summary[0] || {
					totalOrders: 0,
					totalRevenue: 0,
					totalItems: 0,
					pendingOrders: 0,
					processingOrders: 0,
					deliveredOrders: 0,
					cancelledOrders: 0
				},
				pagination: {
					page: parseInt(page),
					limit: parseInt(limit),
					total,
					pages: Math.ceil(total / limit)
				}
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Update order status (Admin only)
router.patch("/admin/:orderId/status", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const { orderId } = req.params;
		const { status, trackingNumber, carrier } = req.body;

		const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"];
		
		if (!validStatuses.includes(status)) {
			return res.status(400).json({ success: false, message: "Invalid status" });
		}

		const order = await Order.findById(orderId);

		if (!order) {
			return res.status(404).json({ success: false, message: "Order not found" });
		}

		order.status = status;

		// Update shipping info
		if (status === "shipped") {
			order.shipping.shippedAt = new Date();
			if (trackingNumber) order.shipping.trackingNumber = trackingNumber;
			if (carrier) order.shipping.carrier = carrier;
		}

		if (status === "delivered") {
			order.shipping.deliveredAt = new Date();
			order.isDelivered = true;
		}

		if (status === "cancelled") {
			// Restore stock
			await Product.findByIdAndUpdate(order.product, {
				$inc: { stock: order.quantity, soldCount: -order.quantity }
			});
		}

		await order.save();

		res.json({
			success: true,
			message: `Order status updated to ${status}`,
			data: order
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Update payment status (Admin only)
router.patch("/admin/:orderId/payment", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const { orderId } = req.params;
		const { paymentStatus, transactionId } = req.body;

		const validStatuses = ["pending", "paid", "failed", "refunded"];

		if (!validStatuses.includes(paymentStatus)) {
			return res.status(400).json({ success: false, message: "Invalid payment status" });
		}

		const order = await Order.findById(orderId);

		if (!order) {
			return res.status(404).json({ success: false, message: "Order not found" });
		}

		order.payment.status = paymentStatus;
		if (transactionId) order.payment.transactionId = transactionId;
		if (paymentStatus === "paid") {
			order.payment.paidAt = new Date();
			order.isPaid = true;
		}

		await order.save();

		res.json({
			success: true,
			message: `Payment status updated to ${paymentStatus}`,
			data: order
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Process return request (Admin only)
router.patch("/admin/:orderId/return", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const { orderId } = req.params;
		const { action } = req.body;

		if (!["approve", "reject"].includes(action)) {
			return res.status(400).json({ success: false, message: "Action must be approve or reject" });
		}

		const order = await Order.findById(orderId);

		if (!order) {
			return res.status(404).json({ success: false, message: "Order not found" });
		}

		if (order.refund.status !== "requested") {
			return res.status(400).json({ success: false, message: "No pending return request" });
		}

		if (action === "approve") {
			order.refund.status = "approved";
			order.payment.status = "refunded";
			
			// Restore stock
			await Product.findByIdAndUpdate(order.product, {
				$inc: { stock: order.quantity, soldCount: -order.quantity }
			});
		} else {
			order.refund.status = "rejected";
			order.status = "delivered";
		}

		await order.save();

		res.json({
			success: true,
			message: `Return request ${action}d successfully`,
			data: order
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Get order analytics (Admin only)
router.get("/admin/analytics", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const { period = "month" } = req.query;

		let dateFilter = {};
		const now = new Date();
		
		if (period === "week") {
			dateFilter = { createdAt: { $gte: new Date(now.setDate(now.getDate() - 7)) } };
		} else if (period === "month") {
			dateFilter = { createdAt: { $gte: new Date(now.setMonth(now.getMonth() - 1)) } };
		} else if (period === "year") {
			dateFilter = { createdAt: { $gte: new Date(now.setFullYear(now.getFullYear() - 1)) } };
		}

		const analytics = await Order.aggregate([
			{ $match: dateFilter },
			{
				$group: {
					_id: {
						$dateToString: { format: period === "week" ? "%Y-%m-%d" : period === "month" ? "%Y-%m" : "%Y", date: "$createdAt" }
					},
					orders: { $sum: 1 },
					revenue: { $sum: { $add: ["$totalPrice", "$shippingCharge"] } },
					items: { $sum: "$quantity" }
				}
			},
			{ $sort: { _id: 1 } }
		]);

		const topProducts = await Order.aggregate([
			{ $match: dateFilter },
			{
				$group: {
					_id: "$product",
					totalSold: { $sum: "$quantity" },
					totalRevenue: { $sum: { $add: ["$totalPrice", "$shippingCharge"] } }
				}
			},
			{ $sort: { totalSold: -1 } },
			{ $limit: 10 },
			{
				$lookup: {
					from: "products",
					localField: "_id",
					foreignField: "_id",
					as: "product"
				}
			},
			{ $unwind: "$product" }
		]);

		res.json({
			success: true,
			data: {
				analytics,
				topProducts,
				period
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Bulk update order status (Admin only)
router.patch("/admin/bulk/status", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const { orderIds, status } = req.body;

		if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
			return res.status(400).json({ success: false, message: "Order IDs array required" });
		}

		const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
		
		if (!validStatuses.includes(status)) {
			return res.status(400).json({ success: false, message: "Invalid status" });
		}

		const result = await Order.updateMany(
			{ _id: { $in: orderIds } },
			{ status }
		);

		res.json({
			success: true,
			message: `${result.modifiedCount} orders updated`,
			data: { modifiedCount: result.modifiedCount }
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

module.exports = router;