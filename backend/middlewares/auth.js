const jwt = require("jsonwebtoken");
const User = require("../models/User");

// In-memory User Session Cache (60s TTL)
const userCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

const getCachedUser = async (userId) => {
  const now = Date.now();
  const idStr = userId.toString();
  const cached = userCache.get(idStr);
  if (cached && cached.expiry > now) {
    return cached.user;
  }
  const user = await User.findById(userId)
    .select("-password -otp -otpExpiry -resetPasswordToken -resetPasswordExpiry")
    .lean();
  if (user) {
    userCache.set(idStr, { user, expiry: now + CACHE_TTL_MS });
  }
  return user;
};

const invalidateUserCache = (userId) => {
  if (userId) {
    userCache.delete(userId.toString());
  }
};

const clearAllUserCache = () => {
  userCache.clear();
};

const extractToken = (req) => {
  if (req.cookies && req.cookies.token && req.cookies.token !== "null" && req.cookies.token !== "undefined") {
    return req.cookies.token;
  }
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    const parts = req.headers.authorization.split(" ");
    if (parts.length === 2 && parts[1] && parts[1] !== "null" && parts[1] !== "undefined") {
      return parts[1];
    }
  }
  return null;
};

// Hard Auth Gate (Required Authentication)
const protect = async (req, res, next) => {
  const token = extractToken(req);

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await getCachedUser(decoded.id);
      if (!user) {
        return res.status(401).json({ success: false, message: "User no longer exists" });
      }
      req.user = user;
      req.user.id = user._id.toString();
      return next();
    } catch (error) {
      return res.status(401).json({ success: false, message: "Not authorized, token invalid or expired" });
    }
  }

  return res.status(401).json({ success: false, message: "Not authorized, no token" });
};

// Soft Auth Gate (Guest Preview Allowed)
const optionalAuth = async (req, res, next) => {
  const token = extractToken(req);

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await getCachedUser(decoded.id);
      if (user) {
        req.user = user;
        req.user.id = user._id.toString();
        return next();
      }
    } catch (error) {
      // Silently downgrade to guest — token is expired/invalid
    }
  }

  // Guest state — allow request to proceed without user
  req.user = null;
  next();
};

module.exports = { protect, optionalAuth, invalidateUserCache, clearAllUserCache };

