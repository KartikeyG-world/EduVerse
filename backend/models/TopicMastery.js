const mongoose = require('mongoose');

const topicMasterySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  topicName: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  masteryScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  confidenceScore: {
    type: Number,
    default: 50, // Default mid-level confidence
    min: 0,
    max: 100,
  },
  correctAttempts: {
    type: Number,
    default: 0,
  },
  wrongAttempts: {
    type: Number,
    default: 0,
  },
  lastStudiedAt: {
    type: Date,
    default: Date.now,
  },
  nextRevisionDue: {
    type: Date,
    default: Date.now,
  },
  difficultyLevel: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },
  isWeakArea: {
    type: Boolean,
    default: false,
  },
  notes: {
    type: String,
    default: '',
  },
}, { timestamps: true });

// Ensure unique topic per user and category
topicMasterySchema.index({ userId: 1, topicName: 1, category: 1 }, { unique: true });
topicMasterySchema.index({ userId: 1, isWeakArea: 1 });
topicMasterySchema.index({ userId: 1, nextRevisionDue: 1 });

module.exports = mongoose.model('TopicMastery', topicMasterySchema);
