const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Hard Auth Gate (Required Authentication)
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      if (!token || token === "null" || token === "undefined") {
        return res.status(401).json({ success: false, message: "Not authorized, no token" });
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password -otp -otpExpiry -resetPasswordToken -resetPasswordExpiry");
      if (!req.user) {
        return res.status(401).json({ success: false, message: "User no longer exists" });
      }
      return next();
    } catch (error) {
      return res.status(401).json({ success: false, message: "Not authorized, token invalid or expired" });
    }
  }

  return res.status(401).json({ success: false, message: "Not authorized, no token" });
};

// Soft Auth Gate (Guest Preview Allowed)
const optionalAuth = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      const token = req.headers.authorization.split(" ")[1];
      if (token && token !== "null" && token !== "undefined") {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password -otp -otpExpiry -resetPasswordToken -resetPasswordExpiry");
        if (user) {
          req.user = user;
          return next();
        }
      }
    } catch (error) {
      // Silently downgrade to guest — token is expired/invalid
    }
  }

  // Guest state — allow request to proceed without user
  req.user = null;
  next();
};

module.exports = { protect, optionalAuth };
