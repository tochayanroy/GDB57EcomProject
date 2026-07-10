const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const passport = require("passport");
const Review = require("../modules/ReviewSchema");
const Product = require("../modules/ProductSchema");
const User = require("../modules/UserSchema");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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
// 📋 USER ROUTES (Authenticated users)
// ==============================

// Get all reviews by current user
router.get("/my-reviews", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const { page = 1, limit = 10, status } = req.query;
		const userId = req.user._id;

		const query = { user: userId };
		if (status) query.status = status;

		const reviews = await Review.find(query)
			.populate("product", "name slug thumbnail price")
			.sort("-createdAt")
			.limit(limit * 1)
			.skip((page - 1) * limit)
			.lean();

		const total = await Review.countDocuments(query);

		res.json({
			success: true,
			reviews,
			total,
			page: parseInt(page),
			pages: Math.ceil(total / limit)
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Get single review by ID (with product and user details)
router.get("/:reviewId", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const { reviewId } = req.params;

		const review = await Review.findById(reviewId)
			.populate("product", "name slug price thumbnail averageRating")
			.populate("user", "name email avatar")
			.populate("replies.user", "name email role")
			.lean();

		if (!review) {
			return res.status(404).json({ success: false, message: "Review not found" });
		}

		res.json({ success: true, review });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Create new review for a product
router.post("/product/:productId", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const { productId } = req.params;
		const { rating, title, comment, images } = req.body;
		const userId = req.user._id;

		// Validate required fields
		if (!rating) {
			return res.status(400).json({ success: false, message: "Rating is required" });
		}

		// Check if product exists
		const product = await Product.findById(productId);
		if (!product) {
			return res.status(404).json({ success: false, message: "Product not found" });
		}

		// Check if user already reviewed this product
		const existingReview = await Review.findOne({ product: productId, user: userId });
		if (existingReview) {
			return res.status(400).json({ success: false, message: "You have already reviewed this product" });
		}

		// Create review
		const review = await Review.create({
			product: productId,
			user: userId,
			rating,
			title: title || "",
			comment: comment || "",
			images: images || [],
			status: "pending"
		});

		// Update product's review stats
		const allReviews = await Review.find({ product: productId, status: "approved" });
		const totalReviews = allReviews.length;
		const averageRating = totalReviews > 0
			? allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
			: 0;

		await Product.findByIdAndUpdate(productId, {
			totalReviews,
			averageRating,
			$push: { reviews: review._id }
		});

		res.status(201).json({
			success: true,
			message: "Review submitted successfully and pending moderation",
			data: review
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Update own review
router.put("/:reviewId", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const { reviewId } = req.params;
		const { rating, title, comment, images } = req.body;
		const userId = req.user._id;

		const review = await Review.findOne({ _id: reviewId, user: userId });
		if (!review) {
			return res.status(404).json({ success: false, message: "Review not found or you don't have permission" });
		}

		// Check if review can be edited (optional: restrict after certain time)
		const hoursSinceCreation = (Date.now() - new Date(review.createdAt).getTime()) / (1000 * 60 * 60);
		if (hoursSinceCreation > 720) { // 30 days
			return res.status(400).json({ success: false, message: "Reviews can only be edited within 30 days" });
		}

		// Update fields
		if (rating) review.rating = rating;
		if (title !== undefined) review.title = title;
		if (comment !== undefined) review.comment = comment;
		if (images !== undefined) review.images = images;
		
		review.isEdited = true;
		review.editedAt = new Date();
		review.status = "pending"; // Re-moderate

		await review.save();

		// Update product stats if review was approved before
		if (review.status === "approved") {
			const approvedReviews = await Review.find({ product: review.product, status: "approved" });
			const totalReviews = approvedReviews.length;
			const averageRating = totalReviews > 0
				? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
				: 0;

			await Product.findByIdAndUpdate(review.product, { totalReviews, averageRating });
		}

		res.json({
			success: true,
			message: "Review updated successfully and pending moderation",
			data: review
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Delete own review
router.delete("/:reviewId", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const { reviewId } = req.params;
		const userId = req.user._id;

		const review = await Review.findOne({ _id: reviewId, user: userId });
		if (!review) {
			return res.status(404).json({ success: false, message: "Review not found or you don't have permission" });
		}

		await review.deleteOne();

		// Update product stats
		const approvedReviews = await Review.find({ product: review.product, status: "approved" });
		const totalReviews = approvedReviews.length;
		const averageRating = totalReviews > 0
			? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
			: 0;

		await Product.findByIdAndUpdate(review.product, {
			totalReviews,
			averageRating,
			$pull: { reviews: reviewId }
		});

		res.json({
			success: true,
			message: "Review deleted successfully"
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Mark review as helpful
router.post("/:reviewId/helpful", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const { reviewId } = req.params;
		const userId = req.user._id;

		const review = await Review.findById(reviewId);
		if (!review) {
			return res.status(404).json({ success: false, message: "Review not found" });
		}

		// Optional: Track which users marked helpful to prevent multiple votes
		review.helpfulCount += 1;
		await review.save();

		res.json({
			success: true,
			message: "Marked as helpful",
			helpfulCount: review.helpfulCount
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Mark review as not helpful
router.post("/:reviewId/not-helpful", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const { reviewId } = req.params;
		const userId = req.user._id;

		const review = await Review.findById(reviewId);
		if (!review) {
			return res.status(404).json({ success: false, message: "Review not found" });
		}

		review.notHelpfulCount += 1;
		await review.save();

		res.json({
			success: true,
			message: "Marked as not helpful",
			notHelpfulCount: review.notHelpfulCount
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Add reply to a review
router.post("/:reviewId/reply", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const { reviewId } = req.params;
		const { message } = req.body;
		const userId = req.user._id;

		if (!message) {
			return res.status(400).json({ success: false, message: "Reply message is required" });
		}

		const review = await Review.findById(reviewId);
		if (!review) {
			return res.status(404).json({ success: false, message: "Review not found" });
		}

		review.replies.push({
			user: userId,
			message: message,
			createdAt: new Date()
		});

		await review.save();

		const updatedReview = await Review.findById(reviewId)
			.populate("replies.user", "name email role")
			.lean();

		res.json({
			success: true,
			message: "Reply added successfully",
			data: updatedReview.replies
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Delete own reply
router.delete("/:reviewId/reply/:replyIndex", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const { reviewId, replyIndex } = req.params;
		const userId = req.user._id;

		const review = await Review.findById(reviewId);
		if (!review) {
			return res.status(404).json({ success: false, message: "Review not found" });
		}

		const reply = review.replies[parseInt(replyIndex)];
		if (!reply) {
			return res.status(404).json({ success: false, message: "Reply not found" });
		}

		// Check if user owns the reply OR is admin
		if (reply.user.toString() !== userId.toString() && req.user.role !== "admin") {
			return res.status(403).json({ success: false, message: "You don't have permission to delete this reply" });
		}

		review.replies.splice(parseInt(replyIndex), 1);
		await review.save();

		res.json({
			success: true,
			message: "Reply deleted successfully"
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// ==============================
// 🔐 ADMIN ROUTES
// ==============================

// Get all reviews (Admin only) with advanced filtering
router.get("/admin/all", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const {
			status,
			productId,
			userId,
			minRating,
			maxRating,
			page = 1,
			limit = 20,
			sort = "-createdAt"
		} = req.query;

		const query = {};

		if (status) query.status = status;
		if (productId && mongoose.Types.ObjectId.isValid(productId)) query.product = productId;
		if (userId && mongoose.Types.ObjectId.isValid(userId)) query.user = userId;
		if (minRating) query.rating = { $gte: parseInt(minRating) };
		if (maxRating) query.rating = { ...query.rating, $lte: parseInt(maxRating) };

		const reviews = await Review.find(query)
			.populate("product", "name slug thumbnail price")
			.populate("user", "name email avatar phone")
			.populate("replies.user", "name email role")
			.sort(sort)
			.limit(limit * 1)
			.skip((page - 1) * limit)
			.lean();

		const total = await Review.countDocuments(query);

		// Get statistics
		const stats = await Review.aggregate([
			{ $match: query },
			{
				$group: {
					_id: null,
					averageRating: { $avg: "$rating" },
					totalReviews: { $sum: 1 },
					pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
					approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
					rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } }
				}
			}
		]);

		res.json({
			success: true,
			reviews,
			stats: stats[0] || {
				averageRating: 0,
				totalReviews: 0,
				pending: 0,
				approved: 0,
				rejected: 0
			},
			total,
			page: parseInt(page),
			pages: Math.ceil(total / limit)
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Get single review details (Admin only)
router.get("/admin/:reviewId", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const { reviewId } = req.params;

		const review = await Review.findById(reviewId)
			.populate("product", "name slug description price stock images")
			.populate("user", "name email phone addresses orders")
			.populate("replies.user", "name email role")
			.lean();

		if (!review) {
			return res.status(404).json({ success: false, message: "Review not found" });
		}

		res.json({ success: true, review });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});


// Bulk moderate reviews (Admin only)
router.patch("/admin/bulk/moderate", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const { reviewIds, status } = req.body;

		if (!reviewIds || !Array.isArray(reviewIds) || reviewIds.length === 0) {
			return res.status(400).json({ success: false, message: "Review IDs array required" });
		}

		if (!["approved", "rejected", "pending"].includes(status)) {
			return res.status(400).json({ success: false, message: "Invalid status" });
		}

		const result = await Review.updateMany(
			{ _id: { $in: reviewIds } },
			{ status }
		);

		// Recalculate product stats for affected products
		const affectedReviews = await Review.find({ _id: { $in: reviewIds } });
		const productIds = [...new Set(affectedReviews.map(r => r.product.toString()))];

		for (const productId of productIds) {
			const approvedReviews = await Review.find({ product: productId, status: "approved" });
			const totalReviews = approvedReviews.length;
			const averageRating = totalReviews > 0
				? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
				: 0;

			await Product.findByIdAndUpdate(productId, { totalReviews, averageRating });
		}

		res.json({
			success: true,
			message: `${result.modifiedCount} reviews updated`,
			modifiedCount: result.modifiedCount
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});



// Approve or reject review (Admin only)
router.patch("/admin/:reviewId/moderate", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const { reviewId } = req.params;
		const { status, adminNote } = req.body;

		if (!["approved", "rejected", "pending"].includes(status)) {
			return res.status(400).json({ success: false, message: "Invalid status. Must be approved, rejected, or pending" });
		}

		const review = await Review.findById(reviewId);
		if (!review) {
			return res.status(404).json({ success: false, message: "Review not found" });
		}

		const oldStatus = review.status;
		review.status = status;
		
		if (adminNote) review.adminNote = adminNote;
		await review.save();

		// Update product stats only if status changed to/from approved
		if (oldStatus === "approved" && status !== "approved") {
			// Remove from product stats
			const approvedReviews = await Review.find({ product: review.product, status: "approved" });
			const totalReviews = approvedReviews.length;
			const averageRating = totalReviews > 0
				? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
				: 0;

			await Product.findByIdAndUpdate(review.product, {
				totalReviews,
				averageRating,
				$pull: { reviews: reviewId }
			});
		} else if (status === "approved" && oldStatus !== "approved") {
			// Add to product stats
			const approvedReviews = await Review.find({ product: review.product, status: "approved" });
			const totalReviews = approvedReviews.length;
			const averageRating = totalReviews > 0
				? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
				: 0;

			await Product.findByIdAndUpdate(review.product, {
				totalReviews,
				averageRating,
				$addToSet: { reviews: reviewId }
			});
		}

		res.json({
			success: true,
			message: `Review ${status} successfully`,
			data: review
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});


// Bulk delete reviews (Admin only)
router.delete("/admin/bulk/delete", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const { reviewIds } = req.body;

		if (!reviewIds || !Array.isArray(reviewIds) || reviewIds.length === 0) {
			return res.status(400).json({ success: false, message: "Review IDs array required" });
		}

		const reviewsToDelete = await Review.find({ _id: { $in: reviewIds } });
		const productIds = [...new Set(reviewsToDelete.map(r => r.product.toString()))];

		const result = await Review.deleteMany({ _id: { $in: reviewIds } });

		// Recalculate stats for affected products
		for (const productId of productIds) {
			const approvedReviews = await Review.find({ product: productId, status: "approved" });
			const totalReviews = approvedReviews.length;
			const averageRating = totalReviews > 0
				? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
				: 0;

			await Product.findByIdAndUpdate(productId, {
				totalReviews,
				averageRating,
				$pull: { reviews: { $in: reviewIds } }
			});
		}

		res.json({
			success: true,
			message: `${result.deletedCount} reviews deleted`,
			deletedCount: result.deletedCount
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});


// Delete any review (Admin only)
router.delete("/admin/:reviewId", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const { reviewId } = req.params;

		const review = await Review.findById(reviewId);
		if (!review) {
			return res.status(404).json({ success: false, message: "Review not found" });
		}

		const productId = review.product;
		await review.deleteOne();

		// Update product stats
		const approvedReviews = await Review.find({ product: productId, status: "approved" });
		const totalReviews = approvedReviews.length;
		const averageRating = totalReviews > 0
			? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
			: 0;

		await Product.findByIdAndUpdate(productId, {
			totalReviews,
			averageRating,
			$pull: { reviews: reviewId }
		});

		res.json({
			success: true,
			message: "Review deleted successfully"
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});



// Get review statistics dashboard (Admin only)
router.get("/admin/stats/dashboard", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const stats = await Review.aggregate([
			{
				$group: {
					_id: null,
					totalReviews: { $sum: 1 },
					averageRating: { $avg: "$rating" },
					pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
					approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
					rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
					totalHelpful: { $sum: "$helpfulCount" },
					totalNotHelpful: { $sum: "$notHelpfulCount" }
				}
			}
		]);

		const ratingDistribution = await Review.aggregate([
			{
				$group: {
					_id: "$rating",
					count: { $sum: 1 }
				}
			},
			{ $sort: { _id: 1 } }
		]);

		const recentReviews = await Review.find()
			.populate("product", "name")
			.populate("user", "name email")
			.sort("-createdAt")
			.limit(10)
			.lean();

		res.json({
			success: true,
			stats: stats[0] || {
				totalReviews: 0,
				averageRating: 0,
				pending: 0,
				approved: 0,
				rejected: 0,
				totalHelpful: 0,
				totalNotHelpful: 0
			},
			ratingDistribution,
			recentReviews
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

module.exports = router;