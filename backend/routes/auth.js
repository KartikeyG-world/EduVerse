const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { protect, invalidateUserCache } = require("../middlewares/auth");
const { createNotification } = require("../utils/notification");
const { updateStreak } = require("../utils/streak");
const { sendOtpEmail, sendWelcomeEmail, sendPasswordResetEmail } = require("../utils/emailSender");
const rateLimit = require("express-rate-limit");
const axios = require("axios");
const { OAuth2Client } = require("google-auth-library");

// Single reusable Google OAuth2 client — scoped to server lifetime
const googleOAuthClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const resendOtpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { success: false, message: "Too many OTP resend requests, please try again after an hour" }
});

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const hashData = (data) => crypto.createHash("sha256").update(data).digest("hex");

// HttpOnly Cookie Helpers for Secure Session Management (FIX 5)
const setAuthCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

const clearAuthCookie = (res) => {
  const isProd = process.env.NODE_ENV === "production";
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/"
  });
};

// @route   POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Please provide all required fields" });
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = phone ? phone.trim() : undefined;

    if (normalizedName.length < 2) {
      return res.status(400).json({ success: false, message: "Name must be at least 2 characters long" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters, include uppercase, lowercase, number, and special character" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists with that email" });
    }

    if (normalizedPhone) {
      const existingPhone = await User.findOne({ phone: normalizedPhone });
      if (existingPhone) {
        return res.status(400).json({ success: false, message: "User already exists with that phone number" });
      }
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const otp = generateOTP();
    const hashedOTP = hashData(otp);

    const newUser = new User({
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
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

    // Guard: Prevent OTP bypass — already-verified users must authenticate via /api/auth/login
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Account is already verified. Please sign in with your credentials."
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
    invalidateUserCache(user._id);

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
    setAuthCookie(res, token);

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

    const cleanLoginId = loginId.trim();
    const isEmail = cleanLoginId.includes("@");
    const query = isEmail ? { email: cleanLoginId.toLowerCase() } : { phone: cleanLoginId };
    const user = await User.findOne(query);
    
    if (!user) {
      console.log(`User not found: ${loginId}`);
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }


    // Account Lockout Guard (FIX 4)
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingMinutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / (60 * 1000));
      return res.status(423).json({
        success: false,
        message: `Account is temporarily locked due to consecutive failed login attempts. Please try again in ${remainingMinutes} minute(s).`
      });
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

    // Guard: Social-only users have no password — they must use their social provider
    if (!user.password) {
      const provider = user.authProvider || 'social';
      return res.status(400).json({ 
        success: false, 
        message: `This account uses ${provider} login. Please use the "${provider === 'google' ? 'Continue with Google' : 'Continue with Facebook'}" button instead.` 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      console.log(`Password mismatch for: ${user.email || user.phone}`);
      
      // Increment failed attempts and set 15-minute lock if >= 5 (FIX 4)
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await user.save();
      invalidateUserCache(user._id);

      if (user.loginAttempts >= 5) {
        return res.status(423).json({
          success: false,
          message: "Too many failed login attempts. Account is temporarily locked for 15 minutes."
        });
      }

      const remainingAttempts = 5 - user.loginAttempts;
      return res.status(400).json({
        success: false,
        message: `Invalid credentials. ${remainingAttempts} attempt(s) remaining before temporary lockout.`
      });
    }

    // Successful login — reset lockout state
    user.loginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = Date.now();
    await user.save();
    invalidateUserCache(user._id);

    const timezone = req.headers['x-timezone'] || (req.headers['x-timezone-offset'] !== undefined ? Number(req.headers['x-timezone-offset']) : null);
    const updatedUser = await updateStreak(user, timezone);

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
    setAuthCookie(res, token);

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

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.json({ success: true, message: "If this email is registered, a reset link has been sent" });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = hashData(rawToken);

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpiry = Date.now() + 15 * 60 * 1000;
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${rawToken}`;

    // Dispatch password reset email (FIX 4)
    try {
      await sendPasswordResetEmail(user.email, resetLink, user.name);
    } catch (emailErr) {
      console.error("[AUTH] Failed to send password reset email:", emailErr.message);
      // Still return the generic message to avoid email enumeration
    }

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
    invalidateUserCache(user._id);

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
      _id: user._id,
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
    if (name) updateData.name = name.trim();
    if (avatar !== undefined) {
      if (avatar !== "" && avatar !== null) {
        if (typeof avatar !== 'string' || avatar.length > 500) {
          return res.status(400).json({ success: false, message: "Avatar URL is invalid or exceeds 500 characters" });
        }
        try {
          const parsedUrl = new URL(avatar);
          if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return res.status(400).json({ success: false, message: "Avatar URL must use http or https protocol" });
          }
        } catch (_) {
          return res.status(400).json({ success: false, message: "Avatar must be a valid URL" });
        }
        updateData.avatar = avatar.trim();
      } else {
        updateData.avatar = "";
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { returnDocument: 'after' }
    ).select("-password -otp -otpExpiry -resetPasswordToken -resetPasswordExpiry");

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    invalidateUserCache(user._id);

    res.json(user);
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ success: false, message: "Server error updating profile" });
  }
});

// @route   POST /api/auth/google
// @desc    Authenticate or register user with verified Google ID Token
// SECURITY: Only accepts idToken. Backend verifies using google-auth-library.
// Frontend-supplied user objects are NOT trusted.
router.post("/google", async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({ success: false, message: "Google ID token is required" });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error("[AUTH] GOOGLE_CLIENT_ID environment variable is not set");
      return res.status(500).json({ success: false, message: "Google authentication is not configured" });
    }

    // Verify the ID token using google-auth-library (cryptographic verification)
    let ticket;
    try {
      ticket = await googleOAuthClient.verifyIdToken({
        idToken,
        audience: clientId,
      });
    } catch (err) {
      console.error("[AUTH] Google ID Token verification failed:", err.message);
      return res.status(400).json({ success: false, message: "Invalid or expired Google token. Please try again." });
    }

    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email;
    const emailVerified = payload.email_verified;
    const name = payload.name;
    const picture = payload.picture;

    // Reject if Google account email is not verified with Google
    if (!emailVerified) {
      return res.status(400).json({ success: false, message: "Your Google account email is not verified. Please verify it with Google first." });
    }

    if (!email || !googleId) {
      return res.status(400).json({ success: false, message: "Google profile is missing required fields" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Account Deduplication: Find by googleId OR verified email
    let user = await User.findOne({
      $or: [{ googleId }, { email: normalizedEmail }]
    });

    let isNewUser = false;

    if (user) {
      // Link Google ID to existing account (e.g. local email/password user)
      if (!user.googleId) {
        user.googleId = googleId;
      }
      // Auto-verify email since Google confirmed it
      if (!user.isVerified) {
        user.isVerified = true;
      }
      // Set avatar if they don't have one yet
      if (!user.avatar && picture) {
        user.avatar = picture;
      }
      user.lastLogin = Date.now();
      user.loginAttempts = 0;
      user.lockUntil = null;
      await user.save();
    } else {
      // New user — create account from verified Google profile
      isNewUser = true;
      user = new User({
        name: name || "Google User",
        email: normalizedEmail,
        googleId,
        authProvider: "google",
        avatar: picture || "",
        isVerified: true
      });
      await user.save();

      await createNotification(user._id, 'WELCOME', `Welcome to EduVerse, ${user.name}!`);
      sendWelcomeEmail(user.email, user.name).catch((err) => console.error("[AUTH] Welcome email failed:", err.message));
    }

    invalidateUserCache(user._id);

    const timezone = req.headers['x-timezone'] || (req.headers['x-timezone-offset'] !== undefined ? Number(req.headers['x-timezone-offset']) : null);
    const updatedUser = await updateStreak(user, timezone);

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d"
    });
    setAuthCookie(res, token);

    res.json({
      success: true,
      token,
      isNewUser,
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
    console.error("Google authentication error:", err);
    res.status(500).json({ success: false, message: "Server error during Google authentication" });
  }
});

// @route   POST /api/auth/facebook
// @desc    Authenticate or register user with verified Facebook Access Token
// SECURITY: Only accepts accessToken. Backend verifies with Facebook Graph API.
// Frontend-supplied user objects are NOT trusted.
router.post("/facebook", async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken || typeof accessToken !== 'string') {
      return res.status(400).json({ success: false, message: "Facebook access token is required" });
    }

    let facebookId, email, name, picture;

    // Verify the access token by calling Facebook Graph API
    // This cryptographically confirms the token is real and belongs to the user
    try {
      const fbRes = await axios.get(
        `https://graph.facebook.com/v19.0/me?fields=id,name,email,picture.type(large)`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 8000
        }
      );
      facebookId = fbRes.data.id;
      email = fbRes.data.email;
      name = fbRes.data.name;
      picture = fbRes.data.picture?.data?.url;
    } catch (err) {
      console.error("[AUTH] Facebook Token verification failed:", err.response?.data || err.message);
      return res.status(400).json({ success: false, message: "Invalid or expired Facebook access token. Please try again." });
    }

    if (!facebookId) {
      return res.status(400).json({ success: false, message: "Could not retrieve your Facebook profile" });
    }

    // Reject if no email — a verified email is required to avoid broken accounts
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Your Facebook account does not share an email address. Please grant email permission or use a different login method."
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Account Deduplication: Find by facebookId OR verified email
    let user = await User.findOne({
      $or: [{ facebookId }, { email: normalizedEmail }]
    });

    let isNewUser = false;

    if (user) {
      // Link Facebook ID to existing account
      if (!user.facebookId) {
        user.facebookId = facebookId;
      }
      if (!user.isVerified) {
        user.isVerified = true;
      }
      if (!user.avatar && picture) {
        user.avatar = picture;
      }
      user.lastLogin = Date.now();
      user.loginAttempts = 0;
      user.lockUntil = null;
      await user.save();
    } else {
      // New user — create account from verified Facebook profile
      isNewUser = true;
      user = new User({
        name: name || "Facebook User",
        email: normalizedEmail,
        facebookId,
        authProvider: "facebook",
        avatar: picture || "",
        isVerified: true
      });
      await user.save();

      await createNotification(user._id, 'WELCOME', `Welcome to EduVerse, ${user.name}!`);
      sendWelcomeEmail(user.email, user.name).catch((err) => console.error("[AUTH] Welcome email failed:", err.message));
    }

    invalidateUserCache(user._id);

    const timezone = req.headers['x-timezone'] || (req.headers['x-timezone-offset'] !== undefined ? Number(req.headers['x-timezone-offset']) : null);
    const updatedUser = await updateStreak(user, timezone);

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d"
    });
    setAuthCookie(res, token);

    res.json({
      success: true,
      token,
      isNewUser,
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
    console.error("Facebook authentication error:", err);
    res.status(500).json({ success: false, message: "Server error during Facebook authentication" });
  }
});

// @route   POST /api/auth/logout
// @desc    Clear HttpOnly authentication cookie
router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true, message: "Logged out successfully" });
});

module.exports = router;
