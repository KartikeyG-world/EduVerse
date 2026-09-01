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
  canonicalTopicName: {
    type: String,
    trim: true,
    index: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  categories: {
    type: [String],
    default: [],
  },
  sources: {
    type: [{
      type: { type: String, enum: ['flashcard', 'quiz', 'manual', 'other'], default: 'manual' },
      lastStudiedAt: { type: Date, default: Date.now },
      count: { type: Number, default: 1 }
    }],
    default: [],
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
    default: null, // New/unassessed topics start with null until an actual assessment event occurs
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

// Pre-save hook to ensure canonicalTopicName and categories are populated
topicMasterySchema.pre('save',  async function() {
  if (this.topicName && !this.canonicalTopicName) {
    this.canonicalTopicName = this.topicName.trim().toLowerCase();
  }
  if (this.category && (!this.categories || this.categories.length === 0)) {
    this.categories = [this.category];
  }
});

// Non-unique compound index on canonical topic name (safe before migration)
topicMasterySchema.index({ userId: 1, canonicalTopicName: 1 });
// Legacy compound index retained for backward compatibility
topicMasterySchema.index({ userId: 1, topicName: 1, category: 1 });
topicMasterySchema.index({ userId: 1, isWeakArea: 1 });
topicMasterySchema.index({ userId: 1, nextRevisionDue: 1 });

module.exports = mongoose.model('TopicMastery', topicMasterySchema);
