const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const passport = require("passport");
const Wishlist = require("../modules/WishlistSchema");
const Product = require("../modules/ProductSchema");
const User = require("../modules/UserSchema");
const Cart = require("../modules/CartSchema");
const Review = require("../modules/ReviewSchema");
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


// Check if product exists middleware
const checkProductExists = async (req, res, next) => {
	try {
		const { productId } = req.params;
		const product = await Product.findById(productId);
		if (!product) {
			return res.status(404).json({ success: false, message: "Product not found" });
		}
const mongoose = require("mongoose");

const checkProductExists = async (req, res, next) => {
	try {

		const { productId } = req.params;

		// Validate ObjectId
		if (!mongoose.Types.ObjectId.isValid(productId)) {
			return res.status(400).json({
				success: false,
				message: "Invalid product ID"
			});
		}

		// Find product
		const product = await Product.findById(productId);

		if (!product) {
			return res.status(404).json({
				success: false,
				message: "Product not found"
			});
		}

		// Optional: Check active product
		if (!product.isActive) {
			return res.status(400).json({
				success: false,
				message: "Product is inactive"
			});
		}

		req.product = product;

		next();

	} catch (error) {

		return res.status(500).json({
			success: false,
			message: error.message
		});

	}
};		req.product = product;
		next();
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
};

// ==============================
// 📋 USER ROUTES (Authenticated users only)
// ==============================

// Get user's wishlist
router.get("/", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const userId = req.user._id;
		const { page = 1, limit = 20, sort = "-addedAt" } = req.query;

		let wishlist = await Wishlist.findOne({ user: userId });

		if (!wishlist) {
			// Create empty wishlist if doesn't exist
			wishlist = await Wishlist.create({
				user: userId,
				items: [],
				totalItems: 0
			});
		}

		// Get paginated items with product details
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + parseInt(limit);

		const paginatedItems = wishlist.items.slice(startIndex, endIndex);

		// Populate product details for each item
		const populatedItems = await Promise.all(
			paginatedItems.map(async (item) => {
				const product = await Product.findById(item.product)
					.populate("category", "name slug")
					.select("name slug price discountPrice thumbnail images stock isActive averageRating")
					.lean();

				if (!product || !product.isActive) {
					return null;
				}

				// Calculate current price
				const currentPrice = product.discountPrice && product.discountPrice > 0 
					? product.discountPrice 
					: product.price;

				return {
					_id: item._id,
					product: {
						_id: product._id,
						name: product.name,
						slug: product.slug,
						price: product.price,
						discountPrice: product.discountPrice,
						currentPrice: currentPrice,
						thumbnail: product.thumbnail,
						images: product.images,
						stock: product.stock,
						averageRating: product.averageRating,
						category: product.category
					},
					variant: item.variant,
					price: item.price,
					addedAt: item.addedAt,
					inStock: product.stock > 0,
					priceChanged: item.price !== currentPrice
				};
			})
		);

		const validItems = populatedItems.filter(item => item !== null);

		res.json({
			success: true,
			data: {
				_id: wishlist._id,
				user: wishlist.user,
				totalItems: wishlist.totalItems,
				items: validItems,
				pagination: {
					page: parseInt(page),
					limit: parseInt(limit),
					total: wishlist.totalItems,
					pages: Math.ceil(wishlist.totalItems / limit)
				}
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Get wishlist summary (count only)
router.get("/summary", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const userId = req.user._id;

		const wishlist = await Wishlist.findOne({ user: userId });

		res.json({
			success: true,
			data: {
				totalItems: wishlist ? wishlist.totalItems : 0,
				hasItems: wishlist ? wishlist.totalItems > 0 : false
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Check if product is in wishlist
router.get("/check/:productId", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const userId = req.user._id;
		const { productId } = req.params;

		const wishlist = await Wishlist.findOne({ 
			user: userId,
			"items.product": productId
		});

		const isInWishlist = wishlist !== null;

		res.json({
			success: true,
			data: {
				isInWishlist,
				productId
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Add product to wishlist
router.post("/add/:productId", passport.authenticate("jwt", { session: false }), checkProductExists, async (req, res) => {
	try {
		const userId = req.user._id;
		const { productId } = req.params;
		const { variant } = req.body;
		const product = req.product;

		// Find or create wishlist
		let wishlist = await Wishlist.findOne({ user: userId });

if (!wishlist) {
	wishlist = new Wishlist({
		user: userId,
		items: [],
		totalItems: 0
	});
}

if (!wishlist.items) {
	wishlist.items = [];
}

		if (!wishlist) {
			wishlist = new Wishlist({
				user: userId,
				items: [],
				totalItems: 0
			});
		}

		// Check if product already in wishlist
		const existingItem = wishlist.items.find(
			item => item.product.toString() === productId && 
			(item.variant || null) === (variant || null)
		);

		if (existingItem) {
			return res.status(400).json({
				success: false,
				message: "Product already in wishlist"
			});
		}

		// Add to wishlist
		const currentPrice = product.discountPrice && product.discountPrice > 0 
			? product.discountPrice 
			: product.price;

		wishlist.items.push({
			product: productId,
			variant: variant || null,
			price: currentPrice,
			addedAt: new Date()
		});

		wishlist.totalItems = wishlist.items.length;
		await wishlist.save();

		// Also update user's wishlist reference if needed
		await User.findByIdAndUpdate(userId, {
			$addToSet: { wishlist: productId }
		});

		res.status(201).json({
			success: true,
			message: "Product added to wishlist",
			data: {
				totalItems: wishlist.totalItems,
				item: wishlist.items[wishlist.items.length - 1]
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Remove multiple products from wishlist (bulk remove)
router.delete(
  "/remove/bulk",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {

      const userId = req.user._id;
      const { productIds } = req.body;

      // Validation
      if (
        !productIds ||
        !Array.isArray(productIds) ||
        productIds.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Product IDs array required"
        });
      }

      // Find wishlist
      const wishlist = await Wishlist.findOne({
        user: userId
      });

      if (!wishlist) {
        return res.status(404).json({
          success: false,
          message: "Wishlist not found"
        });
      }

      // Count before remove
      const beforeCount =
        wishlist.items.length;

      // Remove matching products
      wishlist.items =
        wishlist.items.filter(
          item =>
            !productIds.includes(
              item.product.toString()
            )
        );

      // Count removed
      const removedCount =
        beforeCount -
        wishlist.items.length;

      // Update total items
      wishlist.totalItems =
        wishlist.items.length;

      // Save
      await wishlist.save();

      res.json({
        success: true,
        message:
          `${removedCount} product(s) removed successfully`,
        data: {
          totalItems:
            wishlist.totalItems,
          removedCount
        }
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message
      });

    }
  }
);




// Remove product from wishlist
router.delete("/remove/:productId", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const userId = req.user._id;
		const { productId } = req.params;
		const { variant } = req.query;

		const wishlist = await Wishlist.findOne({ user: userId });

		if (!wishlist) {
			return res.status(404).json({
				success: false,
				message: "Wishlist not found"
			});
		}

		// Find item index
		const itemIndex = wishlist.items.findIndex(
			item => item.product.toString() === productId && 
			(item.variant || null) === (variant || null)
		);

		if (itemIndex === -1) {
			return res.status(404).json({
				success: false,
				message: "Product not found in wishlist"
			});
		}

		// Remove item
		wishlist.items.splice(itemIndex, 1);
		wishlist.totalItems = wishlist.items.length;
		await wishlist.save();

		// Update user's wishlist reference
		await User.findByIdAndUpdate(userId, {
			$pull: { wishlist: productId }
		});

		res.json({
			success: true,
			message: "Product removed from wishlist",
			data: {
				totalItems: wishlist.totalItems
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});



// Clear entire wishlist
router.delete("/clear", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const userId = req.user._id;

		const wishlist = await Wishlist.findOne({ user: userId });

		if (!wishlist) {
			return res.status(404).json({
				success: false,
				message: "Wishlist not found"
			});
		}

		const removedCount = wishlist.totalItems;
		
		// Clear wishlist
		wishlist.items = [];
		wishlist.totalItems = 0;
		await wishlist.save();

		// Clear user's wishlist reference
		await User.findByIdAndUpdate(userId, {
			$set: { wishlist: [] }
		});

		res.json({
			success: true,
			message: "Wishlist cleared successfully",
			data: {
				removedCount
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Move wishlist item to cart
router.post(
  "/move-to-cart/:productId",
  passport.authenticate("jwt", { session: false }),
  checkProductExists,
  async (req, res) => {
    try {

      const userId = req.user._id;

      const { productId } = req.params;

      const {
        variant = null,
        quantity = 1
      } = req.body;

      const product = req.product;

      // Find wishlist
      const wishlist = await Wishlist.findOne({
        user: userId
      });

      if (!wishlist) {
        return res.status(404).json({
          success: false,
          message: "Wishlist not found"
        });
      }

      // Find product in wishlist
      const itemIndex =
        wishlist.items.findIndex(
          item =>
            item.product.toString() ===
            productId &&
            (item.variant || null) ===
            (variant || null)
        );

      if (itemIndex === -1) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found in wishlist"
        });
      }

      // Current price
      const currentPrice =
        product.discountPrice &&
        product.discountPrice > 0
          ? product.discountPrice
          : product.price;

      // Check existing cart item
      let cartItem =
        await Cart.findOne({
          user: userId,
          product: productId,
          variant: variant || null
        });

      if (cartItem) {

        // Update quantity
        cartItem.quantity += quantity;

        cartItem.totalPrice =
          cartItem.quantity *
          currentPrice;

        await cartItem.save();

      } else {

        // Create cart item
        cartItem = await Cart.create({
          user: userId,
          product: productId,
          variant: variant || null,
          quantity,
          discountPrice:
            product.discountPrice || 0,
          shippingCharge:
            product.shippingCharge || 0,
          totalPrice:
            currentPrice * quantity
        });

      }

      // Remove from wishlist
      wishlist.items.splice(itemIndex, 1);

      wishlist.totalItems =
        wishlist.items.length;

      await wishlist.save();

      res.json({
        success: true,
        message:
          "Product moved to cart successfully",
        data: {
          cartItem,
          wishlistTotalItems:
            wishlist.totalItems
        }
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message
      });

    }
  }
);

// Update product price in wishlist (sync with current prices)
router.put("/sync-prices", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const userId = req.user._id;

		const wishlist = await Wishlist.findOne({ user: userId });

		if (!wishlist || wishlist.items.length === 0) {
			return res.json({
				success: true,
				message: "No items to sync",
				data: { updatedCount: 0 }
			});
		}

		let updatedCount = 0;
		const priceChanges = [];

		// Update prices for each item
		for (let item of wishlist.items) {
			const product = await Product.findById(item.product);
			if (product) {
				const currentPrice = product.discountPrice && product.discountPrice > 0 
					? product.discountPrice 
					: product.price;
				
				if (item.price !== currentPrice) {
					priceChanges.push({
						productId: item.product,
						oldPrice: item.price,
						newPrice: currentPrice
					});
					item.price = currentPrice;
					updatedCount++;
				}
			}
		}

		if (updatedCount > 0) {
			await wishlist.save();
		}

		res.json({
			success: true,
			message: `${updatedCount} item(s) price updated`,
			data: {
				updatedCount,
				priceChanges
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Get wishlist items with price drop alerts
router.put("/price-drops", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const userId = req.user._id;

		const wishlist = await Wishlist.findOne({ user: userId });

		if (!wishlist || wishlist.items.length === 0) {
			return res.json({
				success: true,
				data: { priceDrops: [] }
			});
		}

		const priceDrops = [];

		for (const item of wishlist.items) {
			const product = await Product.findById(item.product)
				.select("name slug price discountPrice thumbnail stock");

			if (product) {
				const currentPrice = product.discountPrice && product.discountPrice > 0 
					? product.discountPrice 
					: product.price;
				
				if (currentPrice < item.price) {
					const discountAmount = item.price - currentPrice;
					const discountPercentage = ((discountAmount / item.price) * 100).toFixed(2);
					
					priceDrops.push({
						product: {
							_id: product._id,
							name: product.name,
							slug: product.slug,
							thumbnail: product.thumbnail,
							stock: product.stock
						},
						oldPrice: item.price,
						newPrice: currentPrice,
						savedAmount: discountAmount,
						savedPercentage: discountPercentage,
						variant: item.variant
					});
				}
			}
		}

		res.json({
			success: true,
			data: {
				priceDrops,
				totalDrops: priceDrops.length
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Share wishlist (generate public link)
router.get("/share", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const userId = req.user._id;
		const user = await User.findById(userId).select("name email");

		const wishlist = await Wishlist.findOne({ user: userId })
			.populate("items.product", "name slug price discountPrice thumbnail");

		if (!wishlist || wishlist.items.length === 0) {
			return res.status(400).json({
				success: false,
				message: "Wishlist is empty"
			});
		}

		// Generate a share token (you can implement JWT or random string)
		const jwt = require("jsonwebtoken");
			const shareToken = jwt.sign({ userId },process.env.JWT_SECRET,{ expiresIn: "7d" });
		
		// In production, store this token in database with expiry
		const shareUrl = `${req.protocol}://${req.get('host')}/api/wishlist/public/${shareToken}`;

		res.json({
			success: true,
			data: {
				shareUrl,
				shareToken,
				userName: user.name,
				totalItems: wishlist.totalItems
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Get wishlist statistics
router.get("/stats", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const userId = req.user._id;

		const wishlist = await Wishlist.findOne({ user: userId });

		if (!wishlist) {
			return res.json({
				success: true,
				data: {
					totalItems: 0,
					totalValue: 0,
					averagePrice: 0,
					oldestItem: null,
					newestItem: null,
					priceDrops: 0
				}
			});
		}

		let totalValue = 0;
		let priceDrops = 0;

		for (const item of wishlist.items) {
			const product = await Product.findById(item.product);
			if (product) {
				const currentPrice = product.discountPrice && product.discountPrice > 0 
					? product.discountPrice 
					: product.price;
				totalValue += currentPrice;
				if (currentPrice < item.price) priceDrops++;
			}
		}

		const oldestItem = wishlist.items.length > 0 
			? wishlist.items.reduce((oldest, item) => 
				item.addedAt < oldest.addedAt ? item : oldest
			) : null;
		
		const newestItem = wishlist.items.length > 0 
			? wishlist.items.reduce((newest, item) => 
				item.addedAt > newest.addedAt ? item : newest
			) : null;

		res.json({
			success: true,
			data: {
				totalItems: wishlist.totalItems,
				totalValue: totalValue.toFixed(2),
				averagePrice: wishlist.totalItems > 0 
					? (totalValue / wishlist.totalItems).toFixed(2) 
					: 0,
				priceDrops,
				oldestItem: oldestItem ? {
					productId: oldestItem.product,
					addedAt: oldestItem.addedAt
				} : null,
				newestItem: newestItem ? {
					productId: newestItem.product,
					addedAt: newestItem.addedAt
				} : null
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

module.exports = router;