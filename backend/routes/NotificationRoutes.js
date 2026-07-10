const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const passport = require("passport");
const Notification = require("../modules/NotificationSchema");
const User = require("../modules/UserSchema");

// ==============================
// MIDDLEWARE
// ==============================

const authorizeAdmin = () => {
	return (req, res, next) => {
		if (req.user && req.user.role === "admin") {
			next();
		} else {
			res.status(403).json({ success: false, message: "Admin access required" });
		}
	};
};

// ==============================
// HELPER FUNCTIONS
// ==============================

// Create notification helper
const createNotification = async (notificationData) => {
	try {
		const notification = new Notification(notificationData);
		await notification.save();
		
		// Add to user's notifications array
		await User.findByIdAndUpdate(notificationData.user, {
			$push: { notifications: notification._id }
		});
		
		return notification;
	} catch (error) {
		console.error("Error creating notification:", error);
		return null;
	}
};

// ==============================
// 📋 USER ROUTES (Authenticated users only)
// ==============================

// Get user's notifications
router.get("/", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const userId = req.user._id;
		const {
			page = 1,
			limit = 20,
			sort = "-createdAt",
			type,
			category,
			isRead,
			priority
		} = req.query;

		const query = { user: userId };
		
		// Apply filters
		if (type) query.type = type;
		if (category) query.category = category;
		if (isRead !== undefined) query.isRead = isRead === "true";
		if (priority) query.priority = priority;
		
		// Only show non-expired notifications
		query.$or = [
			{ expiresAt: null },
			{ expiresAt: { $gt: new Date() } }
		];

		const notifications = await Notification.find(query)
			.populate("sender", "name email avatar")
			.sort(sort)
			.limit(limit * 1)
			.skip((page - 1) * limit)
			.lean();

		const total = await Notification.countDocuments(query);
		
		// Get unread count
		const unreadCount = await Notification.countDocuments({
			user: userId,
			isRead: false,
			$or: [
				{ expiresAt: null },
				{ expiresAt: { $gt: new Date() } }
			]
		});

		res.json({
			success: true,
			data: {
				notifications,
				unreadCount,
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

// Get notification by ID
router.get("/:notificationId", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const { notificationId } = req.params;
		const userId = req.user._id;

		const notification = await Notification.findOne({
			_id: notificationId,
			user: userId
		})
		.populate("sender", "name email avatar")
		.lean();

		if (!notification) {
			return res.status(404).json({ success: false, message: "Notification not found" });
		}

		res.json({ success: true, data: notification });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Mark notification as read
router.patch("/:notificationId/read", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const { notificationId } = req.params;
		const userId = req.user._id;

		const notification = await Notification.findOneAndUpdate(
			{ _id: notificationId, user: userId, isRead: false },
			{ 
				isRead: true,
				readAt: new Date()
			},
			{ new: true }
		);

		if (!notification) {
			return res.status(404).json({ success: false, message: "Notification not found or already read" });
		}

		res.json({
			success: true,
			message: "Notification marked as read",
			data: notification
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Mark all notifications as read
router.patch("/mark-all-read", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const userId = req.user._id;

		const result = await Notification.updateMany(
			{ user: userId, isRead: false },
			{ 
				isRead: true,
				readAt: new Date()
			}
		);

		res.json({
			success: true,
			message: `${result.modifiedCount} notifications marked as read`,
			data: { modifiedCount: result.modifiedCount }
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Delete single notification
router.delete("/:notificationId", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const { notificationId } = req.params;
		const userId = req.user._id;

		const notification = await Notification.findOneAndDelete({
			_id: notificationId,
			user: userId
		});

		if (!notification) {
			return res.status(404).json({ success: false, message: "Notification not found" });
		}

		// Remove from user's notifications array
		await User.findByIdAndUpdate(userId, {
			$pull: { notifications: notificationId }
		});

		res.json({
			success: true,
			message: "Notification deleted successfully"
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Delete all read notifications
router.delete("/delete-all-read", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const userId = req.user._id;

		const notifications = await Notification.find({
			user: userId,
			isRead: true
		});

		const notificationIds = notifications.map(n => n._id);

		const result = await Notification.deleteMany({
			user: userId,
			isRead: true
		});

		// Remove from user's notifications array
		await User.findByIdAndUpdate(userId, {
			$pull: { notifications: { $in: notificationIds } }
		});

		res.json({
			success: true,
			message: `${result.deletedCount} read notifications deleted`,
			data: { deletedCount: result.deletedCount }
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Get notification preferences/summary
router.get("/preferences/summary", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const userId = req.user._id;

		const stats = await Notification.aggregate([
			{ $match: { user: userId } },
			{
				$group: {
					_id: null,
					total: { $sum: 1 },
					unread: { $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] } },
					read: { $sum: { $cond: [{ $eq: ["$isRead", true] }, 1, 0] } }
				}
			}
		]);

		const typeBreakdown = await Notification.aggregate([
			{ $match: { user: userId, isRead: false } },
			{
				$group: {
					_id: "$type",
					count: { $sum: 1 }
				}
			}
		]);

		res.json({
			success: true,
			data: {
				stats: stats[0] || { total: 0, unread: 0, read: 0 },
				unreadByType: typeBreakdown
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// ==============================
// 🔐 ADMIN ROUTES
// ==============================

// Send notification to specific user (Admin only)
router.post("/admin/send-to-user", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const {
			userId,
			type,
			title,
			message,
			category,
			actionUrl,
			image,
			priority,
			expiresInDays
		} = req.body;

		if (!userId || !type || !title || !message) {
			return res.status(400).json({
				success: false,
				message: "User ID, type, title, and message are required"
			});
		}

		// Check if user exists
		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({ success: false, message: "User not found" });
		}

		// Calculate expiry date
		let expiresAt = null;
		if (expiresInDays) {
			expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + expiresInDays);
		}

		const notification = await createNotification({
			user: userId,
			sender: req.user._id,
			type,
			title,
			message,
			category: category || "general",
			actionUrl: actionUrl || null,
			image: image || null,
			priority: priority || "medium",
			expiresAt
		});

		if (!notification) {
			return res.status(500).json({ success: false, message: "Failed to create notification" });
		}

		res.status(201).json({
			success: true,
			message: "Notification sent successfully",
			data: notification
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Send notification to all users (Admin only)
router.post("/admin/send-to-all", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const {
			type,
			title,
			message,
			category,
			actionUrl,
			image,
			priority,
			expiresInDays,
			userFilters
		} = req.body;

		if (!type || !title || !message) {
			return res.status(400).json({
				success: false,
				message: "Type, title, and message are required"
			});
		}

		// Build user query
		let userQuery = {};
		if (userFilters) {
			if (userFilters.role) userQuery.role = userFilters.role;
			if (userFilters.isActive !== undefined) userQuery.isActive = userFilters.isActive;
		}

		const users = await User.find(userQuery).select("_id");

		if (users.length === 0) {
			return res.status(404).json({ success: false, message: "No users found" });
		}

		// Calculate expiry date
		let expiresAt = null;
		if (expiresInDays) {
			expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + expiresInDays);
		}

		// Create notifications for all users
		const notifications = [];
		for (const user of users) {
			const notification = await createNotification({
				user: user._id,
				sender: req.user._id,
				type,
				title,
				message,
				category: category || "general",
				actionUrl: actionUrl || null,
				image: image || null,
				priority: priority || "medium",
				expiresAt
			});
			if (notification) notifications.push(notification);
		}

		res.status(201).json({
			success: true,
			message: `Notification sent to ${notifications.length} users`,
			data: {
				sentCount: notifications.length,
				failedCount: users.length - notifications.length
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Send notification to users by role (Admin only)
router.post("/admin/send-to-role", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const {
			role,
			type,
			title,
			message,
			category,
			actionUrl,
			image,
			priority,
			expiresInDays
		} = req.body;

		if (!role || !type || !title || !message) {
			return res.status(400).json({
				success: false,
				message: "Role, type, title, and message are required"
			});
		}

		const users = await User.find({ role }).select("_id");

		if (users.length === 0) {
			return res.status(404).json({ success: false, message: `No users found with role: ${role}` });
		}

		// Calculate expiry date
		let expiresAt = null;
		if (expiresInDays) {
			expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + expiresInDays);
		}

		const notifications = [];
		for (const user of users) {
			const notification = await createNotification({
				user: user._id,
				sender: req.user._id,
				type,
				title,
				message,
				category: category || "general",
				actionUrl: actionUrl || null,
				image: image || null,
				priority: priority || "medium",
				expiresAt
			});
			if (notification) notifications.push(notification);
		}

		res.status(201).json({
			success: true,
			message: `Notification sent to ${notifications.length} users with role: ${role}`,
			data: {
				sentCount: notifications.length,
				failedCount: users.length - notifications.length,
				role
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Get all notifications (Admin only)
router.get("/admin/all", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const {
			page = 1,
			limit = 20,
			sort = "-createdAt",
			type,
			category,
			isRead,
			priority,
			userId,
			fromDate,
			toDate
		} = req.query;

		const query = {};

		if (type) query.type = type;
		if (category) query.category = category;
		if (isRead !== undefined) query.isRead = isRead === "true";
		if (priority) query.priority = priority;
		if (userId) query.user = userId;
		if (fromDate || toDate) {
			query.createdAt = {};
			if (fromDate) query.createdAt.$gte = new Date(fromDate);
			if (toDate) query.createdAt.$lte = new Date(toDate);
		}

		const notifications = await Notification.find(query)
			.populate("user", "name email role")
			.populate("sender", "name email role")
			.sort(sort)
			.limit(limit * 1)
			.skip((page - 1) * limit)
			.lean();

		const total = await Notification.countDocuments(query);

		// Get summary statistics
		const summary = await Notification.aggregate([
			{ $match: query },
			{
				$group: {
					_id: null,
					total: { $sum: 1 },
					read: { $sum: { $cond: [{ $eq: ["$isRead", true] }, 1, 0] } },
					unread: { $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] } },
					highPriority: { $sum: { $cond: [{ $eq: ["$priority", "high"] }, 1, 0] } }
				}
			}
		]);

		res.json({
			success: true,
			data: {
				notifications,
				summary: summary[0] || { total: 0, read: 0, unread: 0, highPriority: 0 },
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

// Get notification statistics (Admin only)
router.get("/admin/stats", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const { period = "week" } = req.query;

		let dateFilter = {};
		const now = new Date();
		
		if (period === "week") {
			dateFilter = { createdAt: { $gte: new Date(now.setDate(now.getDate() - 7)) } };
		} else if (period === "month") {
			dateFilter = { createdAt: { $gte: new Date(now.setMonth(now.getMonth() - 1)) } };
		} else if (period === "year") {
			dateFilter = { createdAt: { $gte: new Date(now.setFullYear(now.getFullYear() - 1)) } };
		}

		// Notifications over time
		const timeline = await Notification.aggregate([
			{ $match: dateFilter },
			{
				$group: {
					_id: {
						date: { $dateToString: { format: period === "week" ? "%Y-%m-%d" : period === "month" ? "%Y-%m" : "%Y", date: "$createdAt" } },
						type: "$type"
					},
					count: { $sum: 1 }
				}
			},
			{ $sort: { "_id.date": 1 } }
		]);

		// Type breakdown
		const typeBreakdown = await Notification.aggregate([
			{ $match: dateFilter },
			{
				$group: {
					_id: "$type",
					count: { $sum: 1 },
					readCount: { $sum: { $cond: [{ $eq: ["$isRead", true] }, 1, 0] } }
				}
			}
		]);

		// Priority breakdown
		const priorityBreakdown = await Notification.aggregate([
			{ $match: dateFilter },
			{
				$group: {
					_id: "$priority",
					count: { $sum: 1 }
				}
			}
		]);

		// Top users by notification count
		const topUsers = await Notification.aggregate([
			{ $match: dateFilter },
			{
				$group: {
					_id: "$user",
					count: { $sum: 1 },
					unreadCount: { $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] } }
				}
			},
			{ $sort: { count: -1 } },
			{ $limit: 10 },
			{
				$lookup: {
					from: "users",
					localField: "_id",
					foreignField: "_id",
					as: "user"
				}
			},
			{ $unwind: "$user" }
		]);

		res.json({
			success: true,
			data: {
				timeline,
				typeBreakdown,
				priorityBreakdown,
				topUsers,
				period
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Delete expired notifications (Admin only)
router.delete("/admin/cleanup-expired", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const result = await Notification.deleteMany({
			expiresAt: { $lt: new Date() }
		});

		res.json({
			success: true,
			message: `${result.deletedCount} expired notifications deleted`,
			data: { deletedCount: result.deletedCount }
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Delete notification by ID (Admin only)
router.delete("/admin/:notificationId", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const { notificationId } = req.params;

		const notification = await Notification.findByIdAndDelete(notificationId);

		if (!notification) {
			return res.status(404).json({ success: false, message: "Notification not found" });
		}

		// Remove from user's notifications array
		await User.findByIdAndUpdate(notification.user, {
			$pull: { notifications: notificationId }
		});

		res.json({
			success: true,
			message: "Notification deleted successfully"
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Bulk delete notifications (Admin only)
router.delete("/admin/bulk/delete", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const { notificationIds } = req.body;

		if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
			return res.status(400).json({
				success: false,
				message: "Notification IDs array required"
			});
		}

		const notifications = await Notification.find({ _id: { $in: notificationIds } });
		
		const result = await Notification.deleteMany({ _id: { $in: notificationIds } });

		// Remove from users' notifications arrays
		for (const notification of notifications) {
			await User.findByIdAndUpdate(notification.user, {
				$pull: { notifications: notification._id }
			});
		}

		res.json({
			success: true,
			message: `${result.deletedCount} notifications deleted`,
			data: { deletedCount: result.deletedCount }
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Create system notification (Admin only)
router.post("/admin/system", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const {
			title,
			message,
			category,
			actionUrl,
			priority,
			expiresInDays
		} = req.body;

		if (!title || !message) {
			return res.status(400).json({
				success: false,
				message: "Title and message are required"
			});
		}

		// Calculate expiry date
		let expiresAt = null;
		if (expiresInDays) {
			expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + expiresInDays);
		}

		// Get all active users
		const users = await User.find({ isActive: true }).select("_id");

		const notifications = [];
		for (const user of users) {
			const notification = await createNotification({
				user: user._id,
				sender: req.user._id,
				type: "system",
				title,
				message,
				category: category || "system",
				actionUrl: actionUrl || null,
				priority: priority || "medium",
				expiresAt
			});
			if (notification) notifications.push(notification);
		}

		res.status(201).json({
			success: true,
			message: `System notification sent to ${notifications.length} users`,
			data: {
				sentCount: notifications.length
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

module.exports = router;