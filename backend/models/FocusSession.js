const mongoose = require("mongoose");

const FocusSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  type: {
    type: String,
    enum: ["pomodoro", "stopwatch"],
    required: true
  },
  duration: {
    type: Number, // in seconds
    required: true
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  xpEarned: {
    type: Number,
    default: 0
  },
  completed: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model("FocusSession", FocusSessionSchema);
