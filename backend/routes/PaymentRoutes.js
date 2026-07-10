const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const passport = require("passport");
const crypto = require("crypto");
const Payment = require("../modules/PaymentSchema");
const Order = require("../modules/OrderSchema");
const User = require("../modules/UserSchema");

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
// ==============================
// HELPER FUNCTIONS
// ==============================

// Generate unique transaction ID
const generateTransactionId = () => {
	const prefix = "TXN";
	const timestamp = Date.now().toString().slice(-8);
	const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
	return `${prefix}${timestamp}${random}`;
};

// Generate invoice ID
const generateInvoiceId = () => {
	const prefix = "INV";
	const timestamp = Date.now().toString().slice(-8);
	const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
	return `${prefix}${timestamp}${random}`;
};

// Simulate payment gateway processing (for demo)
const processPaymentGateway = async (paymentDetails) => {
	// In production, integrate with actual payment gateway like Razorpay, Stripe, etc.
	return new Promise((resolve) => {
		setTimeout(() => {
			const success = Math.random() > 0.1; // 90% success rate for demo
			if (success) {
				resolve({
					success: true,
					transactionId: generateTransactionId(),
					paymentIntentId: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					gatewayResponse: {
						status: "success",
						message: "Payment processed successfully"
					}
				});
			} else {
				resolve({
					success: false,
					failureReason: "Payment gateway error",
					gatewayResponse: {
						status: "failed",
						message: "Payment processing failed"
					}
				});
			}
		}, 1000);
	});
};

// ==============================
// 📋 USER ROUTES (Authenticated users only)
// ==============================

// Get user's payment history
router.get("/my-payments", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const userId = req.user._id;
		const {
			page = 1,
			limit = 10,
			sort = "-createdAt",
			status,
			method
		} = req.query;

		const query = { user: userId };
		if (status) query.status = status;
		if (method) query.method = method;

		const payments = await Payment.find(query)
			.populate("order", "orderId status totalPrice shippingAddress")
			.sort(sort)
			.limit(limit * 1)
			.skip((page - 1) * limit)
			.lean();

		const total = await Payment.countDocuments(query);

		res.json({
			success: true,
			data: {
				payments,
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

// Get single payment by ID
router.get("/:paymentId", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const { paymentId } = req.params;
		const userId = req.user._id;
		const userRole = req.user.role;

		let query = { _id: paymentId };
		if (userRole !== "admin") {
			query.user = userId;
		}

		const payment = await Payment.findOne(query)
			.populate("order", "orderId status totalPrice shippingAddress items")
			.populate("user", "name email phone")
			.lean();

		if (!payment) {
			return res.status(404).json({ success: false, message: "Payment not found" });
		}

		res.json({ success: true, data: payment });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Get payment by transaction ID
router.get("/transaction/:transactionId", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const { transactionId } = req.params;
		const userId = req.user._id;
		const userRole = req.user.role;

		let query = { transactionId };
		if (userRole !== "admin") {
			query.user = userId;
		}

		const payment = await Payment.findOne(query)
			.populate("order", "orderId status totalPrice")
			.lean();

		if (!payment) {
			return res.status(404).json({ success: false, message: "Payment not found" });
		}

		res.json({ success: true, data: payment });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Create new payment for an order
router.post("/create/:orderId", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const { orderId } = req.params;
		const userId = req.user._id;
		const { method, provider, paymentDetails } = req.body;

		// Validate required fields
		if (!method) {
			return res.status(400).json({ success: false, message: "Payment method is required" });
		}

		// Find the order
		const order = await Order.findOne({ _id: orderId, user: userId });

		if (!order) {
			return res.status(404).json({ success: false, message: "Order not found" });
		}

		// Check if payment already exists for this order
		const existingPayment = await Payment.findOne({ order: orderId });
		if (existingPayment && existingPayment.status === "success") {
			return res.status(400).json({ success: false, message: "Payment already completed for this order" });
		}

		// Calculate payment amount
		const amount = order.totalPrice + (order.shippingCharge || 0) - (order.coupon?.discountAmount || 0);

		// Create payment record
		const payment = new Payment({
			order: orderId,
			user: userId,
			amount,
			method,
			provider: provider || "NONE",
			transactionId: generateTransactionId(),
			invoiceId: generateInvoiceId(),
			status: "pending",
			notes: paymentDetails?.notes || ""
		});

		await payment.save();

		// If payment method is COD, mark as success immediately
		if (method === "COD") {
			payment.status = "success";
			payment.isVerified = true;
			payment.paidAt = new Date();
			await payment.save();

			// Update order payment status
			order.payment.status = "pending";
			order.payment.method = "COD";
			await order.save();

			return res.status(201).json({
				success: true,
				message: "COD payment created successfully",
				data: payment
			});
		}

		// For online payments, process through gateway
		const gatewayResult = await processPaymentGateway({
			amount,
			method,
			provider,
			orderId: order.orderId,
			...paymentDetails
		});

		if (gatewayResult.success) {
			payment.status = "success";
			payment.isVerified = true;
			payment.paidAt = new Date();
			payment.transactionId = gatewayResult.transactionId || payment.transactionId;
			payment.paymentIntentId = gatewayResult.paymentIntentId;
			payment.gatewayResponse = gatewayResult.gatewayResponse;
			payment.signature = crypto.randomBytes(64).toString("hex");
			await payment.save();

			// Update order payment status
			order.payment.status = "paid";
			order.payment.method = method;
			order.payment.transactionId = payment.transactionId;
			order.payment.paidAt = payment.paidAt;
			order.isPaid = true;
			await order.save();

			res.status(201).json({
				success: true,
				message: "Payment processed successfully",
				data: payment
			});
		} else {
			payment.status = "failed";
			payment.failureReason = gatewayResult.failureReason;
			payment.gatewayResponse = gatewayResult.gatewayResponse;
			await payment.save();

			res.status(400).json({
				success: false,
				message: "Payment failed",
				data: payment
			});
		}
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Retry failed payment
router.post("/retry/:paymentId", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const { paymentId } = req.params;
		const userId = req.user._id;
		const { paymentDetails } = req.body;

		const payment = await Payment.findOne({ _id: paymentId, user: userId });

		if (!payment) {
			return res.status(404).json({ success: false, message: "Payment not found" });
		}

		if (payment.status !== "failed") {
			return res.status(400).json({ success: false, message: "Only failed payments can be retried" });
		}

		// Process payment again
		const gatewayResult = await processPaymentGateway({
			amount: payment.amount,
			method: payment.method,
			provider: payment.provider,
			...paymentDetails
		});

		if (gatewayResult.success) {
			payment.status = "success";
			payment.isVerified = true;
			payment.paidAt = new Date();
			payment.transactionId = gatewayResult.transactionId || generateTransactionId();
			payment.paymentIntentId = gatewayResult.paymentIntentId;
			payment.gatewayResponse = gatewayResult.gatewayResponse;
			payment.failureReason = null;
			await payment.save();

			// Update order
			const order = await Order.findById(payment.order);
			if (order) {
				order.payment.status = "paid";
				order.payment.transactionId = payment.transactionId;
				order.payment.paidAt = payment.paidAt;
				order.isPaid = true;
				await order.save();
			}

			res.json({
				success: true,
				message: "Payment retry successful",
				data: payment
			});
		} else {
			payment.status = "failed";
			payment.failureReason = gatewayResult.failureReason;
			payment.gatewayResponse = gatewayResult.gatewayResponse;
			await payment.save();

			res.status(400).json({
				success: false,
				message: "Payment retry failed",
				data: payment
			});
		}
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Request refund for payment
router.post("/:paymentId/refund", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const { paymentId } = req.params;
		const userId = req.user._id;
		const { reason, amount } = req.body;

		if (!reason) {
			return res.status(400).json({ success: false, message: "Refund reason is required" });
		}

		const payment = await Payment.findOne({ _id: paymentId, user: userId });

		if (!payment) {
			return res.status(404).json({ success: false, message: "Payment not found" });
		}

		if (payment.status !== "success") {
			return res.status(400).json({ success: false, message: "Only successful payments can be refunded" });
		}

		if (payment.refund.status !== "none") {
			return res.status(400).json({ success: false, message: `Refund already ${payment.refund.status}` });
		}

		const refundAmount = amount || payment.amount;

		if (refundAmount > payment.amount) {
			return res.status(400).json({ success: false, message: "Refund amount cannot exceed payment amount" });
		}

		payment.refund = {
			refundId: `REF_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
			amount: refundAmount,
			status: "pending",
			refundedAt: null
		};
		payment.status = "refunded";
		await payment.save();

		// Update order
		const order = await Order.findById(payment.order);
		if (order) {
			order.refund.status = "requested";
			order.refund.amount = refundAmount;
			order.refund.reason = reason;
			await order.save();
		}

		res.json({
			success: true,
			message: "Refund request submitted successfully",
			data: payment
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Get payment statistics for user
router.get("/stats/my-stats", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const userId = req.user._id;

		const stats = await Payment.aggregate([
			{ $match: { user: userId } },
			{
				$group: {
					_id: null,
					totalPayments: { $sum: 1 },
					totalAmount: { $sum: "$amount" },
					successfulPayments: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } },
					failedPayments: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
					refundedPayments: { $sum: { $cond: [{ $eq: ["$status", "refunded"] }, 1, 0] } },
					totalRefundAmount: { $sum: "$refund.amount" }
				}
			}
		]);

		const recentPayments = await Payment.find({ user: userId })
			.sort("-createdAt")
			.limit(5)
			.populate("order", "orderId")
			.lean();

		res.json({
			success: true,
			data: {
				stats: stats[0] || {
					totalPayments: 0,
					totalAmount: 0,
					successfulPayments: 0,
					failedPayments: 0,
					refundedPayments: 0,
					totalRefundAmount: 0
				},
				recentPayments
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Verify payment signature (webhook-like endpoint)
router.post("/verify", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const { paymentId, signature } = req.body;

		const payment = await Payment.findById(paymentId);

		if (!payment) {
			return res.status(404).json({ success: false, message: "Payment not found" });
		}

		// Verify signature (simplified for demo)
		const expectedSignature = crypto
			.createHmac("sha256", process.env.PAYMENT_WEBHOOK_SECRET || "secret_key")
			.update(`${payment.transactionId}${payment.amount}`)
			.digest("hex");

		if (signature === expectedSignature) {
			payment.isVerified = true;
			payment.signature = signature;
			await payment.save();

			res.json({
				success: true,
				message: "Payment verified successfully"
			});
		} else {
			res.status(400).json({
				success: false,
				message: "Invalid signature"
			});
		}
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// ==============================
// 🔐 ADMIN ROUTES
// ==============================

// Get all payments (Admin only)
router.get("/admin/all", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const {
			page = 1,
			limit = 20,
			sort = "-createdAt",
			status,
			method,
			provider,
			fromDate,
			toDate,
			search
		} = req.query;

		const query = {};

		if (status) query.status = status;
		if (method) query.method = method;
		if (provider) query.provider = provider;
		if (fromDate || toDate) {
			query.createdAt = {};
			if (fromDate) query.createdAt.$gte = new Date(fromDate);
			if (toDate) query.createdAt.$lte = new Date(toDate);
		}
		if (search) {
			query.$or = [
				{ transactionId: { $regex: search, $options: "i" } },
				{ invoiceId: { $regex: search, $options: "i" } },
				{ paymentIntentId: { $regex: search, $options: "i" } }
			];
		}

		const payments = await Payment.find(query)
			.populate("order", "orderId status totalPrice")
			.populate("user", "name email phone")
			.sort(sort)
			.limit(limit * 1)
			.skip((page - 1) * limit)
			.lean();

		const total = await Payment.countDocuments(query);

		// Calculate summary
		const summary = await Payment.aggregate([
			{ $match: query },
			{
				$group: {
					_id: null,
					totalPayments: { $sum: 1 },
					totalAmount: { $sum: "$amount" },
					successfulAmount: { $sum: { $cond: [{ $eq: ["$status", "success"] }, "$amount", 0] } },
					failedAmount: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, "$amount", 0] } },
					refundedAmount: { $sum: "$refund.amount" },
					successfulCount: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } },
					failedCount: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
					refundedCount: { $sum: { $cond: [{ $eq: ["$status", "refunded"] }, 1, 0] } }
				}
			}
		]);

		res.json({
			success: true,
			data: {
				payments,
				summary: summary[0] || {
					totalPayments: 0,
					totalAmount: 0,
					successfulAmount: 0,
					failedAmount: 0,
					refundedAmount: 0,
					successfulCount: 0,
					failedCount: 0,
					refundedCount: 0
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

// Get payment details (Admin only)
router.get("/admin/:paymentId", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const { paymentId } = req.params;

		const payment = await Payment.findById(paymentId)
			.populate("order", "orderId status totalPrice shippingAddress items coupon")
			.populate("user", "name email phone address")
			.lean();

		if (!payment) {
			return res.status(404).json({ success: false, message: "Payment not found" });
		}

		res.json({ success: true, data: payment });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Update payment status (Admin only)
router.patch("/admin/:paymentId/status", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const { paymentId } = req.params;
		const { status, failureReason } = req.body;

		const validStatuses = ["pending", "processing", "success", "failed", "cancelled", "refunded"];

		if (!validStatuses.includes(status)) {
			return res.status(400).json({ success: false, message: "Invalid status" });
		}

		const payment = await Payment.findById(paymentId);

		if (!payment) {
			return res.status(404).json({ success: false, message: "Payment not found" });
		}

		payment.status = status;
		if (status === "success") {
			payment.isVerified = true;
			payment.paidAt = new Date();
		}
		if (status === "failed" && failureReason) {
			payment.failureReason = failureReason;
		}
		if (status === "cancelled") {
			payment.failureReason = "Payment cancelled by admin";
		}

		await payment.save();

		// Update order status accordingly
		const order = await Order.findById(payment.order);
		if (order) {
			if (status === "success") {
				order.payment.status = "paid";
				order.isPaid = true;
				order.payment.paidAt = payment.paidAt;
			} else if (status === "failed" || status === "cancelled") {
				order.payment.status = "failed";
			}
			await order.save();
		}

		res.json({
			success: true,
			message: `Payment status updated to ${status}`,
			data: payment
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Process refund (Admin only)
router.post("/admin/:paymentId/refund", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const { paymentId } = req.params;
		const { amount, reason } = req.body;

		const payment = await Payment.findById(paymentId);

		if (!payment) {
			return res.status(404).json({ success: false, message: "Payment not found" });
		}

		if (payment.status !== "success") {
			return res.status(400).json({ success: false, message: "Only successful payments can be refunded" });
		}

		const refundAmount = amount || payment.amount;

		if (refundAmount > payment.amount) {
			return res.status(400).json({ success: false, message: "Refund amount cannot exceed payment amount" });
		}

		// Process refund (simulate gateway refund)
		payment.refund = {
			refundId: `REF_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
			amount: refundAmount,
			status: "processed",
			refundedAt: new Date()
		};
		payment.status = "refunded";
		await payment.save();

		// Update order
		const order = await Order.findById(payment.order);
		if (order) {
			order.refund.status = "approved";
			order.refund.amount = refundAmount;
			order.refund.reason = reason || "Processed by admin";
			order.payment.status = "refunded";
			await order.save();
		}

		res.json({
			success: true,
			message: "Refund processed successfully",
			data: payment
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Get payment analytics (Admin only)
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

		const analytics = await Payment.aggregate([
			{ $match: { ...dateFilter, status: "success" } },
			{
				$group: {
					_id: {
						date: { $dateToString: { format: period === "week" ? "%Y-%m-%d" : period === "month" ? "%Y-%m" : "%Y", date: "$createdAt" } },
						method: "$method"
					},
					count: { $sum: 1 },
					amount: { $sum: "$amount" }
				}
			},
			{ $sort: { "_id.date": 1 } }
		]);

		const methodBreakdown = await Payment.aggregate([
			{ $match: dateFilter },
			{
				$group: {
					_id: "$method",
					count: { $sum: 1 },
					totalAmount: { $sum: "$amount" },
					successCount: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } },
					failedCount: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } }
				}
			}
		]);

		res.json({
			success: true,
			data: {
				analytics,
				methodBreakdown,
				period
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Get payment webhook (for gateway callbacks)
router.post("/webhook", async (req, res) => {
	try {
		const { event, data } = req.body;

		// Handle different webhook events from payment gateway
		switch (event) {
			case "payment.success":
				const payment = await Payment.findOne({ transactionId: data.transactionId });
				if (payment) {
					payment.status = "success";
					payment.isVerified = true;
					payment.paidAt = new Date();
					payment.gatewayResponse = data;
					await payment.save();

					const order = await Order.findById(payment.order);
					if (order) {
						order.payment.status = "paid";
						order.isPaid = true;
						await order.save();
					}
				}
				break;

			case "payment.failed":
				const failedPayment = await Payment.findOne({ transactionId: data.transactionId });
				if (failedPayment) {
					failedPayment.status = "failed";
					failedPayment.failureReason = data.reason;
					failedPayment.gatewayResponse = data;
					await failedPayment.save();
				}
				break;

			case "refund.success":
				const refundPayment = await Payment.findOne({ "refund.refundId": data.refundId });
				if (refundPayment) {
					refundPayment.refund.status = "processed";
					refundPayment.refund.refundedAt = new Date();
					refundPayment.status = "refunded";
					await refundPayment.save();
				}
				break;
		}

		res.json({ success: true, message: "Webhook received" });
	} catch (error) {
		console.error("Webhook error:", error);
		res.status(500).json({ success: false, message: error.message });
	}
});

module.exports = router;