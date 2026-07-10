const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Category = require("../modules/CategorySchema");
const Product = require("../modules/ProductSchema");
const User = require("../modules/UserSchema");
const Review = require("../modules/ReviewSchema");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");



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
// 📋 USER ROUTES (Authenticated users can view categories)
// ==============================

// Get all categories (with filtering, pagination)
router.get("/", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const {
			page = 1,
			limit = 20,
			sort = "-createdAt",
			isActive,
			search
		} = req.query;

		const query = {};

		// Filter by active status
		if (isActive === "true") query.isActive = true;
		if (isActive === "false") query.isActive = false;

		// Search by name or description
		if (search) {
			query.$or = [
				{ name: { $regex: search, $options: "i" } },
				{ description: { $regex: search, $options: "i" } }
			];
		}

		const categories = await Category.find(query)
			.sort(sort)
			.limit(limit * 1)
			.skip((page - 1) * limit)
			.lean();

		const total = await Category.countDocuments(query);

		res.json({
			success: true,
			categories,
			total,
			page: parseInt(page),
			pages: Math.ceil(total / limit)
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Get single category by ID or slug
router.get("/:id", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const { id } = req.params;
		let query = {};

		if (mongoose.Types.ObjectId.isValid(id)) {
			query._id = id;
		} else {
			query.slug = id.toLowerCase();
		}

		const category = await Category.findOne(query).lean();

		if (!category) {
			return res.status(404).json({ success: false, message: "Category not found" });
		}

		// Get products in this category
		const products = await Product.find({ 
			category: category._id, 
			isActive: true 
		})
		.select("name slug price discountPrice thumbnail averageRating stock")
		.limit(20)
		.lean();

		res.json({
			success: true,
			category,
			products,
			productCount: products.length
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Get all products in a specific category with pagination
router.get("/:id/products", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const { id } = req.params;
		const {
			page = 1,
			limit = 20,
			sort = "-createdAt",
			minPrice,
			maxPrice,
			brand,
			minRating
		} = req.query;

		let categoryId = id;

		// If slug is provided, find category by slug
		if (!mongoose.Types.ObjectId.isValid(id)) {
			const category = await Category.findOne({ slug: id.toLowerCase() });
			if (!category) {
				return res.status(404).json({ success: false, message: "Category not found" });
			}
			categoryId = category._id;
		}

		const query = { 
			category: categoryId, 
			isActive: true 
		};

		// Price range
		if (minPrice || maxPrice) {
			query.price = {};
			if (minPrice) query.price.$gte = parseFloat(minPrice);
			if (maxPrice) query.price.$lte = parseFloat(maxPrice);
		}

		// Brand filter
		if (brand) query.brand = { $regex: brand, $options: "i" };

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

// ==============================
// 🔐 ADMIN ROUTES
// ==============================

// Create new category (Admin only)
router.post("/", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const { name, slug, description, image, icon, isActive } = req.body;

		// Validate required fields
		if (!name || !slug) {
			return res.status(400).json({
				success: false,
				message: "Name and slug are required"
			});
		}

		// Check if slug is unique
		const existingCategory = await Category.findOne({ slug: slug.toLowerCase() });
		if (existingCategory) {
			return res.status(400).json({
				success: false,
				message: "Slug already exists"
			});
		}

		const category = await Category.create({
			name,
			slug: slug.toLowerCase(),
			description: description || "",
			image: image || null,
			icon: icon || null,
			isActive: isActive !== undefined ? isActive : true,
			productCount: 0
		});

		res.status(201).json({
			success: true,
			message: "Category created successfully",
			data: category
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Update category (Admin only)
router.put("/:id", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const { id } = req.params;
		const { name, slug, description, image, icon, isActive } = req.body;

		// Check if category exists
		const category = await Category.findById(id);
		if (!category) {
			return res.status(404).json({
				success: false,
				message: "Category not found"
			});
		}

		// If slug is being updated, check uniqueness
		if (slug && slug !== category.slug) {
			const existingCategory = await Category.findOne({ 
				slug: slug.toLowerCase(), 
				_id: { $ne: id } 
			});
			if (existingCategory) {
				return res.status(400).json({
					success: false,
					message: "Slug already exists"
				});
			}
			category.slug = slug.toLowerCase();
		}

		// Update fields
		if (name) category.name = name;
		if (description !== undefined) category.description = description;
		if (image !== undefined) category.image = image;
		if (icon !== undefined) category.icon = icon;
		if (isActive !== undefined) category.isActive = isActive;

		await category.save();

		res.json({
			success: true,
			message: "Category updated successfully",
			data: category
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Delete category (Admin only)
router.delete("/:id", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const { id } = req.params;

		const category = await Category.findById(id);
		if (!category) {
			return res.status(404).json({
				success: false,
				message: "Category not found"
			});
		}

		// Check if there are products in this category
		const productCount = await Product.countDocuments({ category: id });
		if (productCount > 0) {
			return res.status(400).json({
				success: false,
				message: `Cannot delete category with ${productCount} products. Move or delete products first.`
			});
		}

		await category.deleteOne();

		res.json({
			success: true,
			message: "Category deleted successfully"
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Bulk update categories status (Admin only)
router.patch("/admin/bulk/status", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const { categoryIds, isActive } = req.body;

		if (!categoryIds || !Array.isArray(categoryIds)) {
			return res.status(400).json({
				success: false,
				message: "Category IDs array required"
			});
		}

		const result = await Category.updateMany(
			{ _id: { $in: categoryIds } },
			{ isActive }
		);

		res.json({
			success: true,
			message: `${result.modifiedCount} categories updated`,
			modifiedCount: result.modifiedCount
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Bulk delete categories (Admin only)
router.delete("/admin/bulk", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const { categoryIds } = req.body;

		if (!categoryIds || !Array.isArray(categoryIds)) {
			return res.status(400).json({
				success: false,
				message: "Category IDs array required"
			});
		}

		// Check if any category has products
		const categoriesWithProducts = await Category.aggregate([
			{ $match: { _id: { $in: categoryIds.map(id => new mongoose.Types.ObjectId(id)) } } },
			{
				$lookup: {
					from: "products",
					localField: "_id",
					foreignField: "category",
					as: "products"
				}
			},
			{ $match: { "products.0": { $exists: true } } },
			{ $project: { name: 1, productCount: { $size: "$products" } } }
		]);

		if (categoriesWithProducts.length > 0) {
			return res.status(400).json({
				success: false,
				message: "Cannot delete categories with products",
				categoriesWithProducts
			});
		}

		const result = await Category.deleteMany({ _id: { $in: categoryIds } });

		res.json({
			success: true,
			message: `${result.deletedCount} categories deleted`,
			deletedCount: result.deletedCount
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Update category product count (Admin only - recalc from products)
router.post("/:id/recalc-count", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const { id } = req.params;

		const category = await Category.findById(id);
		if (!category) {
			return res.status(404).json({
				success: false,
				message: "Category not found"
			});
		}

		const productCount = await Product.countDocuments({ 
			category: id, 
			isActive: true 
		});

		category.productCount = productCount;
		await category.save();

		res.json({
			success: true,
			message: "Product count updated",
			productCount
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Get category tree/hierarchy (Admin only)
router.get("/admin/tree", passport.authenticate("jwt", { session: false }), authorizeAdmin, async (req, res) => {
	try {
		const categories = await Category.find({ isActive: true })
			.sort("name")
			.lean();

		res.json({
			success: true,
			categories,
			total: categories.length
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

module.exports = router;