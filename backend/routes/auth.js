const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect } = require("../middlewares/auth");
const { createNotification } = require("../utils/notification");

// @route   POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    // Check if user exists securely natively
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) return res.status(400).json({ message: "User already exists with that email or phone" });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user securely globally
    const newUser = new User({
      name,
      email,
      phone,
      password: hashedPassword,
    });

    const savedUser = await newUser.save();
    
    // Generate token securely mapping secret
    const token = jwt.sign({ id: savedUser._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    
    res.status(201).json({ 
       token, 
       user: { id: savedUser._id, name: savedUser.name, email: savedUser.email, xp: savedUser.xp, level: savedUser.level, streak: savedUser.streak } 
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Server error during registration" });
  }
});

// @route   POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { identity, password } = req.body; // Identity maps cleanly to phone OR email safely
    
    if (!identity || !password) {
      return res.status(400).json({ message: "Please enter both credentials" });
    }

    // Lookup dynamically wrapping $or boundary
    const user = await User.findOne({ 
       $or: [ { email: identity }, { phone: identity } ] 
    });

    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // Hard gate compare natively
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    // Success login notification
    await createNotification(user._id, 'LOGIN', `Welcome back to EduVerse! Your session has been established.`);

    res.json({ 
       token, 
       user: { id: user._id, name: user.name, email: user.email, xp: user.xp, level: user.level, streak: user.streak, tutorPoints: user.tutorPoints } 
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error during login" });
  }
});

// @route   GET /api/auth/me
router.get("/me", protect, async (req, res) => {
  try {
    // The protect middleware appends req.user seamlessly mapped behind JWT barrier securely
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error fetching user" });
  }
});

module.exports = router;
