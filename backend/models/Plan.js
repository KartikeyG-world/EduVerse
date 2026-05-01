const mongoose = require("mongoose");

const planSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  durationDays: {
    type: Number,
    required: true,
  },
  goal: {
    type: String,
    required: true,
  },
  roadmap: [
    {
      day: Number,
      topic: String,
      tasks: [String],
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Plan", planSchema);
