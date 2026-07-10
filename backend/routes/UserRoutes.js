const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../modules/UserSchema");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");




// ==============================
// 🔐 CREATE USER (Register)
// ==============================

router.post("/register", async (req, res) => {
	try {
		console.log("b");
		
		const { name, email, password, phone } = req.body;
		console.log("c");

		// Basic validation
		if (!name || !email || !password || !phone) {
			return res.status(400).json({
				success: false,
				message: "All fields are required"
			});
		}
		console.log("d");

		// Check existing user
		const existingUser = await User.findOne({ email });
		console.log("e");

		if (existingUser) {
			return res.status(400).json({
				success: false,
				message: "User already exists"
			});
		}
		console.log("f");

		// 🔐 Hash password
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);
		console.log("g");

		// Create user
		const user = await User.create({
			name,
			email,
			password: hashedPassword,
			phone
		});
		console.log("h");

		// Generate JWT token
		const token = jwt.sign(
			{ id: user._id, }, process.env.JWT_SECRET,);

				console.log("i");


		res.status(201).json({
			success: true,
			message: "User created successfully",
			data: token
		});

	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message
		});
	}
});


// ==============================
// 🔐 LOGIN USER
// ==============================

router.post("/login", async (req, res) => {
	try {
		const { email, password } = req.body;

		// Basic validation
		if (!email || !password) {
			return res.status(400).json({
				success: false,
				message: "Email and password are required"
			});
		}

		// Check user exists
		const user = await User.findOne({ email });

		if (!user) {
			return res.status(400).json({
				success: false,
				message: "Invalid email or password"
			});
		}

		// 🔐 Compare password
		const isMatch = await bcrypt.compare(password, user.password);

		if (!isMatch) {
			return res.status(400).json({
				success: false,
				message: "Invalid email or password"
			});
		}

		// Generate JWT token
		const token = jwt.sign(
			{ id: user._id, }, process.env.JWT_SECRET,);

		res.status(200).json({
			success: true,
			message: "Login successful",
			data: token,
			user
		});

	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message
		});
	}
});

module.exports = router;

// ==============================
// 📥 GET ALL USERS
// ==============================
router.get("/profile", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const user = await User.findById(req.user._id)

		if (!user) {
			return res.status(404).json({
				success: false,
				message: "User not found"
			});
		} else {
			res.json({
				success: true,
				data: user
			});	

		};

	}  catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});


// ==============================
// 📄 GET SINGLE USER
// ==============================
router.get("/:id",passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const user = await User.findById(req.params.id)
			.populate("cart wishlist orders reviews notifications");

		if (!user) {
			return res.status(404).json({
				success: false,
				message: "User not found"
			});
		}

		res.json({
			success: true,
			data: user
		});

	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});


// ==============================
// ✏️ UPDATE USER
// ==============================
router.put("/:id", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const updatedUser = await User.findByIdAndUpdate(
			req.params.id,
			req.body,
			{ returnDocument: 'after', runValidators: true }
		);

		if (!updatedUser) {
			return res.status(404).json({
				success: false,
				message: "User not found"
			});
		}

		res.json({
			success: true,
			message: "User updated",
			data: updatedUser
		});

	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});


// ==============================
// ❌ DELETE USER
// ==============================
router.delete("/deleteUser/:id", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const deletedUser = await User.findByIdAndDelete(req.params.id);

		if (!deletedUser) {
			return res.status(404).json({
				success: false,
				message: "User not found"
			});
		}

		res.json({
			success: true,
			message: "User deleted"
		});

	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});


// ==============================
// ➕ ADD ADDRESS
// ==============================
// ==============================
// ==============================
router.post(
  "/addressAdd/:id",
  passport.authenticate("jwt", { session: false }), async (req, res) => {
    try {

      const { fullName, phone, street,city,state,zipCode,country} = req.body;

      // Validation
		if (!fullName || !phone || !street || !city || !state || !zipCode) {
			return res.status(400).json({
				success: false,
				message: "All required fields are needed"
			});
		}

      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      // Add address
		user.addresses.push({
			fullName,
			phone,
			street,
			city,
			state,
			zipCode,
			country
		});

      await user.save();

      res.status(200).json({
        success: true,
        message: "Address added successfully",
        data: user.addresses
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);



// ==============================
// ❌ REMOVE ADDRESS
// ==============================
router.delete("/:id/address/:addressId", passport.authenticate("jwt", { session: false }), async (req, res) => {
	try {
		const user = await User.findById(req.params.id);

		if (!user) {
			return res.status(404).json({ success: false, message: "User not found" });
		}

		user.addresses = user.addresses.filter(
			(addr) => addr._id.toString() !== req.params.addressId
		);

		await user.save();

		res.json({
			success: true,
			message: "Address removed",
			data: user.addresses
		});

	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});



module.exports = router;
