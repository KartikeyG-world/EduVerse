require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

// Middleware
// app.use(helmet()); // Temporarily disabled to resolve connectivity issues
app.use(express.json());

// CORS — allow Vercel frontend + localhost for development
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3000"
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
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

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB Atlas");
    app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error("MongoDB connection error:", err));
