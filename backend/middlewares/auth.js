  const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Hard Auth Gate (Required Authentication)
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      next();
    } catch (error) {
      console.error("Token verification failed:", error);
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

// Soft Auth Gate (Guest Preview Allowed)
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      // Only attach if valid token is provided
      if (token && token !== "null") {
         const decoded = jwt.verify(token, process.env.JWT_SECRET);
         const user = await User.findById(decoded.id).select("-password");
         if (user) {
             req.user = user;
             return next();
         }
      }
    } catch (error) {
        // Soft fail if token is expired/invalid, downgrade to guest natively
        console.warn("Optional auth token invalid:", error.message);
    }
  }

  // Fallback Native Guest State (Allows API to gracefully return 0-bounds without crashing)
  req.user = null;
  next();
};

module.exports = { protect, optionalAuth };
