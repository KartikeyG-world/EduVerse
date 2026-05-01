const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    default: 'Custom',
  },
  type: {
    type: String,
    enum: ['video', 'playlist'],
    default: 'video',
  },
  source: {
    type: String,
    enum: ['manual', 'search'],
    default: 'manual',
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: null,
  },
  channelName: {
    type: String,
    default: null,
  },
  thumbnailUrl: {
    type: String,
    default: null,
  },
  videoUrl: {
    type: String,
    required: true,
  },
  videos: [{ type: String }],
  completedVideos: [{ type: String }],
  // Total video duration in seconds (captured from YouTube Player on first play)
  totalDuration: {
    type: Number,
    default: 0,
  },
  // Maximum watched position in seconds (high-water mark — never decreases)
  watchedDuration: {
    type: Number,
    default: 0,
  },
  // Derived: (watchedDuration / totalDuration) * 100, clamped 0–100
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  // Timestamp of last watch session (used for sorting)
  lastWatched: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

// Pre-save hook: auto-compute progress and set completed flag
// Note: Mongoose 9+ uses async middleware (no next() callback)
skillSchema.pre('save', async function () {
  if (this.type === 'playlist') {
    if (this.videos && this.videos.length > 0) {
      const rawProgress = (this.completedVideos.length / this.videos.length) * 100;
      this.progress = Math.min(100, Math.max(0, Math.round(rawProgress)));
    } else {
      this.progress = 0;
    }
  } else {
    if (this.totalDuration > 0) {
      const rawProgress = (this.watchedDuration / this.totalDuration) * 100;
      this.progress = Math.min(100, Math.max(0, Math.round(rawProgress)));
    } else {
      this.progress = 0;
    }
  }

  // Mark as completed when 95% or more is watched
  if (this.progress >= 95 && !this.completed) {
    this.completed = true;
  }
});

module.exports = mongoose.model('Skill', skillSchema);
