require("dotenv").config();


const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// Robust check: Validate that critical environment variables exist
if (!process.env.MONGO_URI) {
  console.error("CRITICAL ERROR: MONGO_URI is not set in environment variables!");
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error("CRITICAL ERROR: JWT_SECRET is not set in environment variables!");
  process.exit(1);
}

const app = express();

// Disable command buffering globally so database outages fail immediately instead of hanging requests
mongoose.set("bufferCommands", false);

// Middleware
// app.use(helmet()); // Temporarily disabled to resolve connectivity issues
app.use(express.json());

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
    
    // Dynamically allow any localhost port in development to prevent CORS issues if port 5173 is occupied
    const isLocalhost = /^http:\/\/localhost(:\d+)?$/.test(normalizedOrigin);
    if (isLocalhost || allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true
}));

/*
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many requests, please try again later" }
});
*/

// Health check endpoints (Railway probes + uptime monitoring)
app.get("/health", (_req, res) => res.status(200).json({ status: "ok", timestamp: new Date().toISOString() }));
app.get("/api/health", (_req, res) => res.status(200).json({ status: "ok", timestamp: new Date().toISOString() }));

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

const PORT = process.env.PORT || 5000;

// Start listening immediately so health checks work and port conflicts/errors are reported instantly
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  
  // Connect to MongoDB Atlas in the background
  mongoose
    .connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    })
    .then(() => console.log("Connected to MongoDB Atlas"))
    .catch((err) => {
      console.error("MongoDB connection error:", err);
      console.error("Please verify that your current IP address is whitelisted on MongoDB Atlas (Network Access).");
    });
});
