require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

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

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB Atlas");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error("MongoDB connection error:", err));
