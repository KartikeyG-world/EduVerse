const mongoose = require("mongoose");

const ActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['study', 'planner', 'chat', 'notes'],
      description: 'The type of interaction performed by the user'
    },
    duration: {
      type: Number,
      default: 0,
      description: 'Duration in seconds (e.g., length of study session)'
    },
    metadata: {
      type: Object,
      default: {},
      description: 'Any additional metrics or data about the action'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Activity", ActivitySchema);
