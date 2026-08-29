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
    enum: ['video', 'playlist', 'documentation'],
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
      playlistData: {
        playlistId: { type: String, default: null },
        totalVideos: { type: Number, default: 0 },
        totalDurationSecs: { type: Number, default: 0 },
        currentVideoIndex: { type: Number, default: 0 },
        lastWatchedTimestamp: { type: Number, default: 0 },
        videos: [{
          title: { type: String, required: true },
          videoId: { type: String, required: true },
          duration: { type: String, default: '' },
          durationSecs: { type: Number, default: 0 },
          thumbnail: { type: String, default: null },
          isCompleted: { type: Boolean, default: false },
          lastWatchedTimestamp: { type: Number, default: 0 }
        }]
      },
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
}, { timestamps: true, optimisticConcurrency: true });

// Pre-save hook: auto-compute progress and set completed flag
// Note: Mongoose 9+ uses async middleware (no next() callback)
skillSchema.pre('save', async function () {
  if (this.type === 'playlist') {
    if (this.playlistData && this.playlistData.videos && this.playlistData.videos.length > 0) {
      const total = this.playlistData.videos.length;
      const completedCount = this.playlistData.videos.filter(v => v.isCompleted).length;
      const rawProgress = (completedCount / total) * 100;
      this.progress = Math.min(100, Math.max(0, Math.round(rawProgress)));
    } else if (this.videos && this.videos.length > 0) {
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

  // Set completed flag according to computed progress threshold
  if (this.progress >= 95) {
    this.completed = true;
  } else {
    this.completed = false;
  }
});

// Compound index for sorting user skills by activity recency
skillSchema.index({ userId: 1, lastWatched: -1, createdAt: -1 });

module.exports = mongoose.model('Skill', skillSchema);
