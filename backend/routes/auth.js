const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { protect } = require("../middlewares/auth");
const { createNotification } = require("../utils/notification");
const { updateStreak } = require("../utils/streak");
const { sendOtpEmail, sendWelcomeEmail } = require("../utils/emailSender");
const rateLimit = require("express-rate-limit");

const resendOtpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { success: false, message: "Too many OTP resend requests, please try again after an hour" }
});

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const hashData = (data) => crypto.createHash("sha256").update(data).digest("hex");

// @route   POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Please provide all required fields" });
    }

    if (name.length < 2) {
      return res.status(400).json({ success: false, message: "Name must be at least 2 characters long" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters, include uppercase, lowercase, number, and special character" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists with that email" });
    }

    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return res.status(400).json({ success: false, message: "User already exists with that phone number" });
      }
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const otp = generateOTP();
    const hashedOTP = hashData(otp);

    const newUser = new User({
      name,
      email,
      phone: phone || undefined,
      password: hashedPassword,
      otp: hashedOTP,
      otpExpiry: Date.now() + 10 * 60 * 1000,
      isVerified: false
    });

    const savedUser = await newUser.save();
    
    console.log(`[AUTH] Registration successful for ${savedUser.email}, OTP generated`);

    // Send OTP using Brevo HTTP API
    try {
      await sendOtpEmail(savedUser.email, otp);
    } catch (emailErr) {
      console.error(`[AUTH] Failed to send OTP email to ${savedUser.email}:`, emailErr.message);
      return res.status(500).json({ success: false, message: "Failed to send OTP email. Please try again." });
    }

    res.status(201).json({ 
      success: true, 
      message: "OTP sent to your email",
      userId: savedUser._id 
    });
  } catch (err) {
    console.error("Registration error:", err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      return res.status(400).json({ 
        success: false, 
        message: `An account with this ${field} already exists.` 
      });
    }
    res.status(500).json({ success: false, message: err.message || "Server error during registration" });
  }
});

// @route   POST /api/auth/verify-otp
router.post("/verify-otp", async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({ success: false, message: "User ID and OTP are required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user.isVerified) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
      return res.json({
        success: true,
        token,
        user: { 
          id: user._id, 
          name: user.name, 
          email: user.email, 
          avatar: user.avatar, 
          xp: user.xp, 
          level: user.level,
          streak: user.streak,
          focusHours: user.focusHours
        }
      });
    }

    if (user.otpAttempts >= 5) {
      return res.status(400).json({ success: false, message: "Too many failed attempts. Please request a new OTP." });
    }

    if (!user.otpExpiry || user.otpExpiry < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
    }

    const hashedIncomingOTP = hashData(otp);

    if (hashedIncomingOTP !== user.otp) {
      user.otpAttempts += 1;
      await user.save();
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    user.otpAttempts = 0;
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

    await createNotification(user._id, 'WELCOME', `Welcome to EduVerse, ${user.name}!`);
    sendWelcomeEmail(user.email, user.name).catch((err) => console.error("[AUTH] Welcome email failed:", err.message));

    res.json({
      success: true,
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        avatar: user.avatar, 
        xp: user.xp, 
        level: user.level,
        streak: user.streak || 0,
        focusHours: user.focusHours || 0,
        tutorPoints: user.tutorPoints || 0
      }
    });
  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({ success: false, message: "Server error during verification" });
  }
});

// @route   POST /api/auth/resend-otp
router.post("/resend-otp", resendOtpLimiter, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: "User ID is required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user.isVerified) return res.status(400).json({ success: false, message: "User is already verified" });

    const otp = generateOTP();
    const hashedOTP = hashData(otp);

    user.otp = hashedOTP;
    user.otpExpiry = Date.now() + 10 * 60 * 1000;
    user.otpAttempts = 0;
    await user.save();

    try {
      await sendOtpEmail(user.email, otp);
      res.json({ success: true, message: "New OTP sent" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Failed to send OTP email. Please try again." });
    }
  } catch (err) {
    console.error("Resend OTP error:", err);
    res.status(500).json({ success: false, message: "Server error during OTP resend" });
  }
});

// @route   POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;
    // For backward compatibility or if frontend still sends email
    const loginId = identifier || req.body.email;
    
    console.log(`Login attempt for: ${loginId}`);
    
    if (!loginId || !password) {
      console.log('Missing credentials');
      return res.status(400).json({ success: false, message: "Please enter both credentials" });
    }

    const isEmail = loginId.includes("@");
    const query = isEmail ? { email: loginId } : { phone: loginId };
    const user = await User.findOne(query);
    
    if (!user) {
      console.log(`User not found: ${loginId}`);
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }


    if (!user.isVerified) {
      const otp = generateOTP();
      const hashedOTP = hashData(otp);
      user.otp = hashedOTP;
      user.otpExpiry = Date.now() + 10 * 60 * 1000;
      user.otpAttempts = 0;
      await user.save();
      try {
        await sendOtpEmail(user.email, otp);
      } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Failed to send OTP email. Please try again." });
      }

      return res.status(403).json({ 
        success: false, 
        message: "Please verify your email first", 
        userId: user._id,
        requiresVerification: true 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      console.log(`Password mismatch for: ${user.email || user.phone}`);
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    user.loginAttempts = 0;
    user.lastLogin = Date.now();
    await user.save();

    const updatedUser = await updateStreak(user);

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

    res.json({ 
       success: true,
       token, 
       user: { 
         id: updatedUser._id, 
         name: updatedUser.name, 
         email: updatedUser.email, 
         avatar: updatedUser.avatar, 
         xp: updatedUser.xp, 
         level: updatedUser.level,
         streak: updatedUser.streak || 0,
         focusHours: updatedUser.focusHours || 0,
         tutorPoints: updatedUser.tutorPoints || 0
       } 
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error during login" });
  }
});

// @route   POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: true, message: "If this email is registered, a reset link has been sent" });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = hashData(rawToken);

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpiry = Date.now() + 15 * 60 * 1000;
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${rawToken}`;

    res.json({ success: true, message: "If this email is registered, a reset link has been sent" });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: "Token and new password are required" });
    }

    const hashedToken = hashData(token);

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired reset link" });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters, include uppercase, lowercase, number, and special character" });
    }

    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    
    user.resetPasswordToken = null;
    user.resetPasswordExpiry = null;
    user.loginAttempts = 0;
    user.lockUntil = null;
    
    await user.save();

    res.json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   GET /api/auth/me
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -otp -otpExpiry -resetPasswordToken -resetPasswordExpiry");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      xp: user.xp,
      level: user.level,
      streak: user.streak || 0,
      focusHours: user.focusHours || 0,
      tutorPoints: user.tutorPoints || 0,
      isVerified: user.isVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error fetching user" });
  }
});

// @route   PUT /api/auth/update-profile
router.put("/update-profile", protect, async (req, res) => {
  try {
    const { name, avatar } = req.body;
    
    if (name && name.length < 2) {
      return res.status(400).json({ success: false, message: "Name must be at least 2 characters long" });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (avatar !== undefined) updateData.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true }
    ).select("-password -otp -otpExpiry -resetPasswordToken -resetPasswordExpiry");

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ success: false, message: "Server error updating profile" });
  }
});

module.exports = router;
