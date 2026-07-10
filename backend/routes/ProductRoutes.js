const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../modules/UserSchema");
const Product = require("../modules/ProductSchema");
const Category = require("../modules/CategorySchema");
const Review = require("../modules/ReviewSchema");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");


// Middleware Imports (assuming these exist in your project)

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

// ==================== USER ROUTES (Authenticated users) ====================

// Get all products (with filtering, pagination, sorting)
router.get("/", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const {
			page = 1,
			limit = 10,
			sort = "-createdAt",
			category,
			minPrice,
			maxPrice,
			brand,
			isFeatured,
			search,
			minRating
		} = req.query;

		const query = { isActive: true };

		// Category filter
		if (category) {
			if (mongoose.Types.ObjectId.isValid(category)) {
				query.category = category;
			} else {
				const categoryDoc = await Category.findOne({ slug: category.toLowerCase() });
				if (categoryDoc) query.category = categoryDoc._id;
			}
		}

		// Price range
		if (minPrice || maxPrice) {
			query.price = {};
			if (minPrice) query.price.$gte = parseFloat(minPrice);
			if (maxPrice) query.price.$lte = parseFloat(maxPrice);
		}

		// Brand filter
		if (brand) query.brand = { $regex: brand, $options: "i" };

		// Featured products
		if (isFeatured === "true") query.isFeatured = true;

		// Search by name or description
		if (search) {
			query.$or = [
				{ name: { $regex: search, $options: "i" } },
				{ description: { $regex: search, $options: "i" } }
			];
		}

		// Minimum rating filter
		if (minRating) {
			query.averageRating = { $gte: parseFloat(minRating) };
		}

		const products = await Product.find(query)
			.populate("category", "name slug")
			.sort(sort)
			.limit(limit * 1)
			.skip((page - 1) * limit)
			.lean();

		const total = await Product.countDocuments(query);

		res.json({
			success: true,
			products,
			total,
			page: parseInt(page),
			pages: Math.ceil(total / limit)
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Get single product by ID or slug
router.get("/:id", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const { id } = req.params;
		let query = { isActive: true };

		if (mongoose.Types.ObjectId.isValid(id)) {
			query._id = id;
		} else {
			query.slug = id.toLowerCase();
		}

		const product = await Product.findOne(query)
			.populate("category", "name slug description image")
			.populate({
				path: "reviews",
				match: { status: "approved" },
				populate: { path: "user", select: "name email" }
			})
			.lean();

		if (!product) {
			return res.status(404).json({ success: false, message: "Product not found" });
		}

		res.json({ success: true, product });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});


// Create new review for a product
router.post("/:productId/reviews", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const { productId } = req.params;
		const { rating, title, comment, images } = req.body;
		const userId = req.user._id;

		const product = await Product.findById(productId);
		if (!product) {
			return res.status(404).json({ success: false, message: "Product not found" });
		}

		// Check if user already reviewed this product
		const existingReview = await Review.findOne({ product: productId, user: userId });
		if (existingReview) {
			return res.status(400).json({ success: false, message: "You have already reviewed this product" });
		}

		const review = await Review.create({
			product: productId,
			user: userId,
			rating,
			title,
			comment,
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

		res.status(201).json({ success: true, review });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Get product reviews
router.get("/:productId/reviews", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const { productId } = req.params;
		const { page = 1, limit = 10 } = req.query;

		const reviews = await Review.find({
			product: productId,
			status: "approved"
		})
			.populate("user", "name email")
			.sort("-createdAt")
			.limit(limit * 1)
			.skip((page - 1) * limit)
			.lean();

		const total = await Review.countDocuments({
			product: productId,
			status: "approved"
		});

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

// Update own review
router.put("/reviews/:reviewId", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const { reviewId } = req.params;
		const { rating, title, comment, images } = req.body;
		const userId = req.user._id;

		const review = await Review.findOne({ _id: reviewId, user: userId });
		if (!review) {
			return res.status(404).json({ success: false, message: "Review not found" });
		}

		review.rating = rating || review.rating;
		review.title = title || review.title;
		review.comment = comment || review.comment;
		review.images = images || review.images;
		review.isEdited = true;
		review.editedAt = new Date();
		review.status = "pending"; // Re-moderate

		await review.save();

		res.json({ success: true, review });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Delete own review
router.delete("/reviews/:reviewId", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const { reviewId } = req.params;
		const userId = req.user._id;

		const review = await Review.findOne({ _id: reviewId, user: userId });
		if (!review) {
			return res.status(404).json({ success: false, message: "Review not found" });
		}

		await review.deleteOne();

		// Update product stats
		const allReviews = await Review.find({ product: review.product, status: "approved" });
		const totalReviews = allReviews.length;
		const averageRating = totalReviews > 0
			? allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
			: 0;

		await Product.findByIdAndUpdate(review.product, {
			totalReviews,
			averageRating,
			$pull: { reviews: reviewId }
		});

		res.json({ success: true, message: "Review deleted successfully" });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Mark review as helpful
router.post("/reviews/:reviewId/helpful", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const { reviewId } = req.params;
		const review = await Review.findById(reviewId);

		if (!review) {
			return res.status(404).json({ success: false, message: "Review not found" });
		}

		review.helpfulCount += 1;
		await review.save();

		res.json({ success: true, helpfulCount: review.helpfulCount });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});










// ==================== ADMIN ROUTES ====================

// Create product (Admin only)
router.post("/", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const {
			name,
			slug,
			description,
			brand,
			category,
			price,
			discountPrice,
			costPrice,
			stock,
			images,
			thumbnail,
			variants,
			attributes,
			isActive,
			isFeatured,
			isDigital,
			weight,
			dimensions,
			shippingCharge
		} = req.body;

		// Check if category exists
		const categoryExists = await Category.findById(category);
		if (!categoryExists) {
			return res.status(400).json({ success: false, message: "Invalid category" });
		}

		// Check if slug is unique
		const existingProduct = await Product.findOne({ slug });
		if (existingProduct) {
			return res.status(400).json({ success: false, message: "Slug already exists" });
		}

		const product = await Product.create({
			name,
			slug: slug.toLowerCase(),
			description,
			brand,
			category,
			price,
			discountPrice,
			costPrice,
			stock,
			images,
			thumbnail,
			variants,
			attributes,
			isActive,
			isFeatured,
			isDigital,
			weight,
			dimensions,
			shippingCharge
		});

		// Update category product count
		await Category.findByIdAndUpdate(category, { $inc: { productCount: 1 } });

		res.status(201).json({ success: true, product });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Update product (Admin only)
router.put("/:id", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const { id } = req.params;
		const updates = req.body;

		// If slug is being updated, check uniqueness
		if (updates.slug) {
			updates.slug = updates.slug.toLowerCase();
			const existing = await Product.findOne({ slug: updates.slug, _id: { $ne: id } });
			if (existing) {
				return res.status(400).json({ success: false, message: "Slug already exists" });
			}
		}

		// If category is being updated
		if (updates.category && updates.category !== id) {
			const categoryExists = await Category.findById(updates.category);
			if (!categoryExists) {
				return res.status(400).json({ success: false, message: "Invalid category" });
			}
		}

		const product = await Product.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

		if (!product) {
			return res.status(404).json({ success: false, message: "Product not found" });
		}

		res.json({ success: true, product });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Delete product (Admin only)
router.delete("/:id", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const { id } = req.params;
		const product = await Product.findByIdAndDelete(id);

		if (!product) {
			return res.status(404).json({ success: false, message: "Product not found" });
		}

		// Remove all reviews for this product
		await Review.deleteMany({ product: id });

		// Update category product count
		await Category.findByIdAndUpdate(product.category, { $inc: { productCount: -1 } });

		res.json({ success: true, message: "Product deleted successfully" });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Update product stock (Admin only)
router.patch("/:id/stock", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const { id } = req.params;
		const { stock, variantIndex, variantStock } = req.body;

		const product = await Product.findById(id);
		if (!product) {
			return res.status(404).json({ success: false, message: "Product not found" });
		}

		if (variantIndex !== undefined && variantStock !== undefined) {
			product.variants[variantIndex].stock = variantStock;
		} else if (stock !== undefined) {
			product.stock = stock;
		}

		await product.save();
		res.json({ success: true, product });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Manage reviews (Admin only)
router.get("/admin/reviews/all", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const { status, page = 1, limit = 20 } = req.query;
		const query = status ? { status } : {};

		const reviews = await Review.find(query)
			.populate("product", "name slug")
			.populate("user", "name email")
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

// Approve or reject review (Admin only)
router.patch("/admin/reviews/:reviewId", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const { reviewId } = req.params;
		const { status } = req.body;

		if (!["approved", "rejected", "pending"].includes(status)) {
			return res.status(400).json({ success: false, message: "Invalid status" });
		}

		const review = await Review.findById(reviewId);
		if (!review) {
			return res.status(404).json({ success: false, message: "Review not found" });
		}

		review.status = status;
		await review.save();

		// Update product stats if review is approved or rejected
		const approvedReviews = await Review.find({ product: review.product, status: "approved" });
		const totalReviews = approvedReviews.length;
		const averageRating = totalReviews > 0
			? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
			: 0;

		await Product.findByIdAndUpdate(review.product, {
			totalReviews,
			averageRating
		});

		res.json({ success: true, review });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Delete any review (Admin only)
router.delete("/admin/reviews/:reviewId", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const { reviewId } = req.params;
		const review = await Review.findByIdAndDelete(reviewId);

		if (!review) {
			return res.status(404).json({ success: false, message: "Review not found" });
		}

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

		res.json({ success: true, message: "Review deleted successfully" });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Bulk product status update (Admin only)
router.patch("/admin/bulk/status", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const { productIds, isActive } = req.body;

		if (!productIds || !Array.isArray(productIds)) {
			return res.status(400).json({ success: false, message: "Product IDs array required" });
		}

		const result = await Product.updateMany(
			{ _id: { $in: productIds } },
			{ isActive }
		);

		res.json({ success: true, modifiedCount: result.modifiedCount });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

module.exports = router;