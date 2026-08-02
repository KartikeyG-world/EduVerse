const mongoose = require('mongoose');

/**
 * Flashcard Model
 * Implements SM-2 Spaced Repetition fields.
 * topicId optionally links to a TopicMastery document.
 */
const flashcardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  // Optional link to Mastery Engine topic
  topicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TopicMastery',
    default: null,
  },
  // The source note that generated this card (optional)
  sourceNoteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note',
    default: null,
  },
  topicName: {
    type: String,
    default: 'General',
    trim: true,
  },
  front: {
    type: String,
    required: true,
    trim: true,
  },
  back: {
    type: String,
    required: true,
    trim: true,
  },

  // ── SM-2 SRS Fields ──────────────────────────────────────────
  // nextReviewDate: when this card should be shown again
  nextReviewDate: {
    type: Date,
    default: Date.now,
    index: true,
  },
  // interval: current delay in days before next review
  srsInterval: {
    type: Number,
    default: 1,
    min: 1,
  },
  // easeFactor: SM-2 EF, starts at 2.5, min 1.3
  easeFactor: {
    type: Number,
    default: 2.5,
    min: 1.3,
  },
  // repetitions: how many times the card has been reviewed successfully in a row
  repetitions: {
    type: Number,
    default: 0,
    min: 0,
  },
  // Total review count (all time)
  totalReviews: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

module.exports = mongoose.model('Flashcard', flashcardSchema);
