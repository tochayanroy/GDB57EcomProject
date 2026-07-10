const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const passport = require("passport");
const Cart = require("../modules/CartSchema");
const Product = require("../modules/ProductSchema");
const User = require("../modules/UserSchema");
const Category = require("../modules/CategorySchema");
const Review = require("../modules/ReviewSchema");
const Wishlist = require("../modules/WishlistSchema");
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
// Check if product exists and get product details
const checkProductExists = async (req, res, next) => {
	try {
		const { productId } = req.params;
		const product = await Product.findById(productId);
		if (!product) {
			return res.status(404).json({ success: false, message: "Product not found" });
		}
		
		// Check if product is active
		if (!product.isActive) {
			return res.status(400).json({ success: false, message: "Product is not available" });
		}
		
		req.product = product;
		next();
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
};

// Calculate cart total helper function
const calculateCartTotal = (cartItems) => {
	let subtotal = 0;
	let totalShipping = 0;
	let totalDiscount = 0;
	
	for (const item of cartItems) {
		subtotal += item.totalPrice;
		totalShipping += item.shippingCharge || 0;
		totalDiscount += item.discountPrice || 0;
	}
	
	const grandTotal = subtotal + totalShipping;
	
	return {
		subtotal,
		totalShipping,
		totalDiscount,
		grandTotal,
		itemCount: cartItems.length
	};
};

// ==============================
// 📋 USER ROUTES (Authenticated users only)
// ==============================

// Get user's cart
router.get("/", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const userId = req.user._id;
		
		let cartItems = await Cart.find({ user: userId })
			.populate("product", "name slug price discountPrice thumbnail images stock isActive brand")
			.sort("-createdAt")
			.lean();
		
		if (!cartItems || cartItems.length === 0) {
			return res.json({
				success: true,
				data: {
					items: [],
					summary: {
						subtotal: 0,
						totalShipping: 0,
						totalDiscount: 0,
						grandTotal: 0,
						itemCount: 0
					}
				}
			});
		}
		
		// Process cart items and check availability
		const processedItems = [];
		let unavailableItems = [];
		
		for (const item of cartItems) {
			if (!item.product) {
				unavailableItems.push(item._id);
				continue;
			}
			
			if (!item.product.isActive) {
				unavailableItems.push(item._id);
				continue;
			}
			
			// Calculate current price
			const currentPrice = item.product.discountPrice && item.product.discountPrice > 0 
				? item.product.discountPrice 
				: item.product.price;
			
			// Check stock availability
			const stockAvailable = item.product.stock >= item.quantity;
			
			// Calculate item total
			const itemTotal = currentPrice * item.quantity;
			
			processedItems.push({
				_id: item._id,
				product: {
					_id: item.product._id,
					name: item.product.name,
					slug: item.product.slug,
					price: item.product.price,
					discountPrice: item.product.discountPrice,
					currentPrice: currentPrice,
					thumbnail: item.product.thumbnail,
					stock: item.product.stock,
					brand: item.product.brand
				},
				variant: item.variant,
				quantity: item.quantity,
				discountPrice: item.discountPrice,
				shippingCharge: item.shippingCharge,
				totalPrice: item.totalPrice,
				currentTotalPrice: itemTotal,
				stockAvailable,
				priceChanged: item.totalPrice !== itemTotal
			});
		}
		
		// Remove unavailable items from cart
		if (unavailableItems.length > 0) {
			await Cart.deleteMany({ _id: { $in: unavailableItems } });
		}
		
		// Calculate summary
		const summary = calculateCartTotal(processedItems);
		
		res.json({
			success: true,
			data: {
				items: processedItems,
				summary,
				unavailableRemoved: unavailableItems.length > 0,
				unavailableCount: unavailableItems.length
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Get cart summary (count and total)
router.get("/summary", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const userId = req.user._id;
		
		const cartItems = await Cart.find({ user: userId })
			.populate("product", "price discountPrice")
			.lean();
		
		let itemCount = 0;
		let subtotal = 0;
		
		for (const item of cartItems) {
			if (item.product) {
				const currentPrice = item.product.discountPrice && item.product.discountPrice > 0 
					? item.product.discountPrice 
					: item.product.price;
				itemCount += item.quantity;
				subtotal += currentPrice * item.quantity;
			}
		}
		
		res.json({
			success: true,
			data: {
				itemCount,
				subtotal: subtotal.toFixed(2),
				cartCount: cartItems.length
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Add item to cart
router.post("/add/:productId", passport.authenticate("jwt", { session: false }), checkProductExists, async (req, res) => {
	try {
		const userId = req.user._id;
		const { productId } = req.params;
		const { quantity = 1, variant = null } = req.body;
		const product = req.product;
		
		// Validate quantity
		if (quantity < 1) {
			return res.status(400).json({ success: false, message: "Quantity must be at least 1" });
		}
		
		// Check stock
		if (product.stock < quantity) {
			return res.status(400).json({ 
				success: false, 
				message: `Only ${product.stock} items available in stock` 
			});
		}
		
		// Calculate price
		const currentPrice = product.discountPrice && product.discountPrice > 0 
			? product.discountPrice 
			: product.price;
		const totalPrice = currentPrice * quantity;
		
		// Check if item already exists in cart
		let existingCartItem = await Cart.findOne({ 
			user: userId, 
			product: productId,
			variant: variant || null
		});
		
		if (existingCartItem) {
			// Update quantity
			const newQuantity = existingCartItem.quantity + quantity;
			
			if (product.stock < newQuantity) {
				return res.status(400).json({ 
					success: false, 
					message: `Only ${product.stock} items available in stock` 
				});
			}
			
			existingCartItem.quantity = newQuantity;
			existingCartItem.totalPrice = currentPrice * newQuantity;
			existingCartItem.discountPrice = product.discountPrice || 0;
			existingCartItem.shippingCharge = product.shippingCharge || 0;
			await existingCartItem.save();
			
			// Update user's cart reference
			await User.findByIdAndUpdate(userId, { cart: existingCartItem._id });
			
			return res.json({
				success: true,
				message: "Cart updated successfully",
				data: {
					item: existingCartItem,
					quantity: existingCartItem.quantity,
					totalPrice: existingCartItem.totalPrice
				}
			});
		}
		
		// Create new cart item
		const cartItem = await Cart.create({
			product: productId,
			user: userId,
			variant: variant || null,
			quantity,
			discountPrice: product.discountPrice || 0,
			shippingCharge: product.shippingCharge || 0,
			totalPrice,
			coupon: {
				code: null,
				discountAmount: 0
			}
		});
		
		// Update user's cart reference
		await User.findByIdAndUpdate(userId, { cart: cartItem._id });
		
		res.status(201).json({
			success: true,
			message: "Item added to cart successfully",
			data: cartItem
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Update cart item quantity
router.put("/update/:cartItemId", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const userId = req.user._id;
		const { cartItemId } = req.params;
		const { quantity } = req.body;
		
		if (!quantity || quantity < 1) {
			return res.status(400).json({ success: false, message: "Quantity must be at least 1" });
		}
		
		const cartItem = await Cart.findOne({ _id: cartItemId, user: userId });
		
		if (!cartItem) {
			return res.status(404).json({ success: false, message: "Cart item not found" });
		}
		
		// Check product stock
		const product = await Product.findById(cartItem.product);
		if (!product || !product.isActive) {
			await Cart.findByIdAndDelete(cartItemId);
			return res.status(400).json({ success: false, message: "Product no longer available" });
		}
		
		if (product.stock < quantity) {
			return res.status(400).json({ 
				success: false, 
				message: `Only ${product.stock} items available in stock` 
			});
		}
		
		// Calculate new total price
		const currentPrice = product.discountPrice && product.discountPrice > 0 
			? product.discountPrice 
			: product.price;
		const totalPrice = currentPrice * quantity;
		
		cartItem.quantity = quantity;
		cartItem.totalPrice = totalPrice;
		await cartItem.save();
		
		// Get updated cart summary
		const allCartItems = await Cart.find({ user: userId });
		const summary = calculateCartTotal(allCartItems);
		
		res.json({
			success: true,
			message: "Cart updated successfully",
			data: {
				item: cartItem,
				summary
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});


// Remove multiple items from cart (bulk remove)
router.delete("/remove/bulk", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const userId = req.user._id;
		const { cartItemIds } = req.body;
		
		if (!cartItemIds || !Array.isArray(cartItemIds) || cartItemIds.length === 0) {
			return res.status(400).json({ success: false, message: "Cart item IDs array required" });
		}
		
		const result = await Cart.deleteMany({ 
			_id: { $in: cartItemIds }, 
			user: userId 
		});
		
		// Check if user has any other cart items
		const remainingItems = await Cart.countDocuments({ user: userId });
		
		if (remainingItems === 0) {
			await User.findByIdAndUpdate(userId, { cart: null });
		}
		
		// Get updated cart summary
		const allCartItems = await Cart.find({ user: userId }).populate("product", "price discountPrice");
		const summary = calculateCartTotal(allCartItems);
		
		res.json({
			success: true,
			message: `${result.deletedCount} item(s) removed from cart`,
			data: {
				deletedCount: result.deletedCount,
				summary
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});


// Remove single item from cart
router.delete("/remove/:cartItemId", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const userId = req.user._id;
		const { cartItemId } = req.params;
		
		const cartItem = await Cart.findOneAndDelete({ _id: cartItemId, user: userId });
		
		if (!cartItem) {
			return res.status(404).json({ success: false, message: "Cart item not found" });
		}
		
		// Check if user has any other cart items
		const remainingItems = await Cart.countDocuments({ user: userId });
		
		if (remainingItems === 0) {
			await User.findByIdAndUpdate(userId, { cart: null });
		}
		
		// Get updated cart summary
		const allCartItems = await Cart.find({ user: userId }).populate("product", "price discountPrice");
		const summary = calculateCartTotal(allCartItems);
		
		res.json({
			success: true,
			message: "Item removed from cart",
			data: {
				summary
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});


// Clear entire cart
router.delete("/clear", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const userId = req.user._id;
		
		const result = await Cart.deleteMany({ user: userId });
		
		await User.findByIdAndUpdate(userId, { cart: null });
		
		res.json({
			success: true,
			message: `Cart cleared successfully (${result.deletedCount} items removed)`,
			data: {
				deletedCount: result.deletedCount
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Apply coupon to cart
router.post("/apply-coupon", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const userId = req.user._id;
		const { couponCode } = req.body;
		
		if (!couponCode) {
			return res.status(400).json({ success: false, message: "Coupon code required" });
		}
		
		// Get all cart items
		const cartItems = await Cart.find({ user: userId });
		
		if (cartItems.length === 0) {
			return res.status(400).json({ success: false, message: "Cart is empty" });
		}
		
		// Calculate subtotal
		let subtotal = 0;
		for (const item of cartItems) {
			const product = await Product.findById(item.product);
			if (product) {
				const currentPrice = product.discountPrice && product.discountPrice > 0 
					? product.discountPrice 
					: product.price;
				subtotal += currentPrice * item.quantity;
			}
		}
		
		// TODO: Implement actual coupon validation logic here
		// This is a placeholder for coupon validation
		const validCoupons = {
			"SAVE10": { discount: 10, type: "percentage", minOrder: 500 },
			"SAVE20": { discount: 20, type: "percentage", minOrder: 1000 },
			"FLAT50": { discount: 50, type: "fixed", minOrder: 300 }
		};
		
		const coupon = validCoupons[couponCode.toUpperCase()];
		
		if (!coupon) {
			return res.status(400).json({ success: false, message: "Invalid coupon code" });
		}
		
		if (subtotal < coupon.minOrder) {
			return res.status(400).json({ 
				success: false, 
				message: `Minimum order of ₹${coupon.minOrder} required for this coupon` 
			});
		}
		
		let discountAmount = 0;
		if (coupon.type === "percentage") {
			discountAmount = (subtotal * coupon.discount) / 100;
		} else {
			discountAmount = coupon.discount;
		}
		
		// Apply coupon to all cart items (or you can apply to specific items)
		for (const item of cartItems) {
			item.coupon = {
				code: couponCode.toUpperCase(),
				discountAmount: discountAmount / cartItems.length // Distribute discount evenly
			};
			await item.save();
		}
		
		const grandTotal = subtotal - discountAmount;
		
		res.json({
			success: true,
			message: "Coupon applied successfully",
			data: {
				couponCode: couponCode.toUpperCase(),
				discountAmount,
				subtotal,
				grandTotal
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Remove coupon from cart
router.delete("/remove-coupon", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const userId = req.user._id;
		
		const result = await Cart.updateMany(
			{ user: userId },
			{ coupon: { code: null, discountAmount: 0 } }
		);
		
		res.json({
			success: true,
			message: "Coupon removed successfully",
			data: {
				modifiedCount: result.modifiedCount
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Sync cart prices with current product prices
router.put("/sync-prices", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const userId = req.user._id;
		
		const cartItems = await Cart.find({ user: userId });
		
		let updatedCount = 0;
		const priceChanges = [];
		
		for (const item of cartItems) {
			const product = await Product.findById(item.product);
			if (product && product.isActive) {
				const currentPrice = product.discountPrice && product.discountPrice > 0 
					? product.discountPrice 
					: product.price;
				const newTotalPrice = currentPrice * item.quantity;
				
				if (item.totalPrice !== newTotalPrice) {
					priceChanges.push({
						productId: item.product,
						oldPrice: item.totalPrice,
						newPrice: newTotalPrice,
						quantity: item.quantity
					});
					item.totalPrice = newTotalPrice;
					item.discountPrice = product.discountPrice || 0;
					await item.save();
					updatedCount++;
				}
			}
		}
		
		// Get updated summary
		const updatedCartItems = await Cart.find({ user: userId }).populate("product", "price discountPrice");
		const summary = calculateCartTotal(updatedCartItems);
		
		res.json({
			success: true,
			message: `${updatedCount} item(s) price updated`,
			data: {
				updatedCount,
				priceChanges,
				summary
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Get cart item count (for navbar badge)
router.get("/count", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const userId = req.user._id;
		
		const result = await Cart.aggregate([
			{ $match: { user: userId } },
			{ $group: { _id: null, totalQuantity: { $sum: "$quantity" } } }
		]);
		
		const totalQuantity = result.length > 0 ? result[0].totalQuantity : 0;
		
		res.json({
			success: true,
			data: {
				count: totalQuantity
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Validate cart items before checkout
router.get("/validate", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const userId = req.user._id;
		
		const cartItems = await Cart.find({ user: userId })
			.populate("product", "name price discountPrice stock isActive");
		
		const validationResults = {
			valid: true,
			items: [],
			unavailableItems: [],
			outOfStockItems: [],
			priceChangedItems: []
		};
		
		for (const item of cartItems) {
			const itemValidation = {
				itemId: item._id,
				productId: item.product?._id,
				productName: item.product?.name,
				quantity: item.quantity,
				valid: true,
				issues: []
			};
			
			if (!item.product || !item.product.isActive) {
				itemValidation.valid = false;
				itemValidation.issues.push("Product no longer available");
				validationResults.unavailableItems.push(itemValidation);
				validationResults.valid = false;
			} else if (item.product.stock < item.quantity) {
				itemValidation.valid = false;
				itemValidation.issues.push(`Only ${item.product.stock} items in stock`);
				validationResults.outOfStockItems.push(itemValidation);
				validationResults.valid = false;
			} else {
				const currentPrice = item.product.discountPrice && item.product.discountPrice > 0 
					? item.product.discountPrice 
					: item.product.price;
				const expectedTotal = currentPrice * item.quantity;
				
				if (item.totalPrice !== expectedTotal) {
					itemValidation.issues.push("Price changed");
					validationResults.priceChangedItems.push(itemValidation);
				}
			}
			
			validationResults.items.push(itemValidation);
		}
		
		res.json({
			success: true,
			data: validationResults
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

// Move cart items to wishlist
router.post(
  "/move-to-wishlist/:cartItemId",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {

      const userId = req.user._id;
      const { cartItemId } = req.params;

      // Find cart item
      const cartItem = await Cart.findOne({
        _id: cartItemId,
        user: userId
      });

      if (!cartItem) {
        return res.status(404).json({
          success: false,
          message: "Cart item not found"
        });
      }

      // Find product
      const product = await Product.findById(
        cartItem.product
      );

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found"
        });
      }

      // Find wishlist
      let wishlist = await Wishlist.findOne({
        user: userId
      });

      // Create wishlist if not exists
      if (!wishlist) {
        wishlist = new Wishlist({
          user: userId,
          items: [],
          totalItems: 0
        });
      }

      // Ensure items array exists
      if (!wishlist.items) {
        wishlist.items = [];
      }

      // Prevent duplicate
      const existingItem = wishlist.items.find(
        item =>
          item.product.toString() ===
          cartItem.product.toString() &&
          (item.variant || null) ===
          (cartItem.variant || null)
      );

      // Add only if not exists
      if (!existingItem) {

        const currentPrice =
          product.discountPrice &&
          product.discountPrice > 0
            ? product.discountPrice
            : product.price;

        wishlist.items.push({
          product: cartItem.product,
          variant: cartItem.variant || null,
          price: currentPrice,
          addedAt: new Date()
        });

        wishlist.totalItems =
          wishlist.items.length;

        await wishlist.save();
      }

      // Remove from cart
      await cartItem.deleteOne();

      res.json({
        success: true,
        message:
          "Product moved to wishlist successfully"
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message
      });

    }
  }
);

module.exports = router;