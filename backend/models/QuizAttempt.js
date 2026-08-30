const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  skillId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill',
    required: true,
    index: true,
  },
  score: {
    type: Number,
    required: true,
  },
  totalQuestions: {
    type: Number,
    required: true,
  },
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

// Compound indexes for fast calendar performance and user query lookups (FIX 13)
quizAttemptSchema.index({ skillId: 1, userId: 1, date: -1 });
quizAttemptSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
