const mongoose = require('mongoose');

/**
 * Quiz Generation Metadata & Idempotency Model
 * Tracks watch-range quiz generation jobs, quality scores, token metrics, and caching.
 */
const quizGenerationMetaSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    videoId: {
      type: String,
      required: true,
      index: true,
    },
    skillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill',
      default: null,
    },
    playlistId: {
      type: String,
      default: null,
    },
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['in-progress', 'success', 'failed'],
      default: 'in-progress',
      index: true,
    },
    // NOTE on range accuracy: watchedEndSec is recorded from last-known playback head position / high-water mark.
    // This is an approximation of continuous viewing and does not track disjoint seek intervals.
    watchedStartSec: {
      type: Number,
      default: 0,
    },
    watchedEndSec: {
      type: Number,
      default: 0,
    },
    videoDurationSec: {
      type: Number,
      default: 0,
    },
    videoTitle: {
      type: String,
      default: '',
    },
    videoDesc: {
      type: String,
      default: '',
    },
    targetQuestionCount: {
      type: Number,
      default: 5,
    },
    quiz: {
      questions: [
        {
          question: { type: String, required: true },
          questionHindi: { type: String, default: '' },
          options: [{ type: String, required: true }],
          optionsHindi: [{ type: String, default: '' }],
          correctIndex: { type: Number, required: true, min: 0, max: 3 },
          explanation: { type: String, default: '' },
        },
      ],
    },
    attempts: {
      type: Number,
      default: 0,
    },
    qualityScore: {
      type: Number,
      default: 0,
    },
    contextType: {
      type: String,
      enum: ['chapters', 'captions', 'excerpt', 'none'],
      default: 'none',
    },
    topicsSummary: {
      type: String,
      default: '',
    },
    providerUsed: {
      type: String,
      default: '',
    },
    tokensUsed: {
      type: Number,
      default: 0,
    },
    generationLatencyMs: {
      type: Number,
      default: 0,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'quiz_generation_meta',
  }
);

// Idempotency Lock: strictly unique on userId + videoId
quizGenerationMetaSchema.index({ userId: 1, videoId: 1 }, { unique: true });

module.exports = mongoose.model('QuizGenerationMeta', quizGenerationMetaSchema);
