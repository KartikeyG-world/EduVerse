require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");

// Robust check: Validate that critical environment variables exist (FIX 10)
const requiredEnvVars = [
  "MONGO_URI",
  "JWT_SECRET",
  "OPENROUTER_API_KEY",
  "YOUTUBE_API_KEY",
  "BREVO_API_KEY",
  "BREVO_SENDER_EMAIL",
  "FRONTEND_URL",
  "GOOGLE_CLIENT_ID"
];
requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    console.error(`CRITICAL ERROR: ${varName} is not set in environment variables!`);
    process.exit(1);
  }
});

const app = express();

// Enable trust proxy for accurate rate limiting and IP resolution behind reverse proxies (Railway, Vercel, Render)
app.set("trust proxy", 1);

// Disable command buffering globally so database outages fail immediately instead of hanging requests
mongoose.set("bufferCommands", false);

// Middleware
// Enable cookie parser for HttpOnly session authentication
app.use(cookieParser());

// FIX 1: Enable helmet with cross-origin configuration
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Express 5 compatible in-place MongoDB operator sanitizer
// Recursively removes keys containing '$' or '.' without reassigning getter-only req.query
const sanitizeMongoOperators = (target) => {
  if (!target || typeof target !== 'object') return;
  if (Array.isArray(target)) {
    target.forEach(item => sanitizeMongoOperators(item));
    return;
  }
  Object.keys(target).forEach(key => {
    const val = target[key];
    if (key.startsWith('$') || key.includes('.')) {
      delete target[key];
    } else {
      sanitizeMongoOperators(val);
    }
  });
};

app.use(express.json());
app.use((req, _res, next) => {
  if (req.body) sanitizeMongoOperators(req.body);
  if (req.params) sanitizeMongoOperators(req.params);
  if (req.query) sanitizeMongoOperators(req.query);
  next();
});

// CORS — allow Vercel frontend + localhost for development
// Normalized: Remove any trailing slashes to prevent mismatches
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3000"
].filter(Boolean).map(url => url.replace(/\/+$/, ""));

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, health checks)
    if (!origin) return callback(null, true);
    
    // Normalize incoming origin by removing trailing slashes
    const normalizedOrigin = origin.replace(/\/+$/, "");
    
    // Allow localhost only in non-production development environments
    const isDev = process.env.NODE_ENV !== "production";
    const isLocalhost = isDev && /^http:\/\/localhost(:\d+)?$/.test(normalizedOrigin);
    if (isLocalhost || allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true
}));

// FIX 2: Rate limiters for auth and AI routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many authentication requests, please try again later" }
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many AI requests, please try again later" }
});

// Health check endpoints (Railway probes + uptime monitoring)
app.get("/health", (_req, res) => res.status(200).json({ status: "ok", timestamp: new Date().toISOString() }));
app.get("/api/health", (_req, res) => res.status(200).json({ status: "ok", timestamp: new Date().toISOString() }));

// Mount rate limiters on specific critical endpoints (FIX 2)
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/ai", aiLimiter);

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/notes", require("./routes/notes"));
app.use("/api/expenses", require("./routes/expenses"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/ai", require("./routes/ai"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/tutor", require("./routes/tutor"));
app.use("/api/skills", require("./routes/skills"));
app.use("/api/discover", require("./routes/discover"));
app.use("/api/skillhub", require("./routes/skillHub"));
app.use("/api/focus", require("./routes/focus"));
app.use("/api/mastery", require("./routes/mastery"));
app.use("/api/flashcards", require("./routes/flashcards")); // Phase 2: SRS
app.use("/api/chat", require("./routes/chat"));
app.use("/api", require("./routes/videoRoutes"));

// FIX 9: Global Express error handler middleware
app.use((err, req, res, next) => {
  console.error("[Unhandled Global Server Error]:", err);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === "production" ? "Internal server error" : (err.message || "Internal server error")
  });
});

const PORT = process.env.PORT || 5000;

// Bootstrap server: Await DB connection before accepting traffic to prevent bufferCommands:false race condition
const startServer = async () => {
  try {
    if (process.env.MONGO_URI) {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log("Connected to MongoDB Atlas");
    } else {
      console.warn("WARNING: MONGO_URI is not set in environment");
    }

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
    return server;
  } catch (err) {
    console.error("Fatal: MongoDB connection failure during startup:", err.message);
    process.exit(1);
  }
};

// Process-level unhandled exception and rejection handlers
process.on('uncaughtException', async (err) => {
  console.error('[FATAL UNCAUGHT EXCEPTION]:', err);
  try {
    await mongoose.connection.close(false);
  } catch (_) {}
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED PROMISE REJECTION]: Reason:', reason);
});

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
