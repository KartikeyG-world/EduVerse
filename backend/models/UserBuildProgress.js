const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  submissionType: {
    type: String,
    enum: ['text', 'code', 'repo_url'],
    default: 'text'
  },
  content: {
    type: String,
    required: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const aiFeedbackSchema = new mongoose.Schema({
  feedback: { type: String, default: '' },
  strengths: [{ type: String }],
  suggestions: [{ type: String }],
  evaluatedAt: { type: Date, default: Date.now }
}, { _id: false });

const completedModuleSchema = new mongoose.Schema({
  moduleIndex: {
    type: Number,
    required: true
  },
  completedAt: {
    type: Date,
    default: Date.now
  },
  xpAwarded: {
    type: Number,
    default: 0
  },
  submission: {
    type: submissionSchema,
    default: null
  },
  aiFeedback: {
    type: aiFeedbackSchema,
    default: null
  },
  peerReviewProblemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem',
    default: null
  }
}, { _id: false });

const userBuildProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BuildPathTemplate',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active'
  },
  currentModuleIndex: {
    type: Number,
    default: 0
  },
  completedModules: [completedModuleSchema],
  totalXpEarned: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

userBuildProgressSchema.index({ userId: 1, templateId: 1 }, { unique: true });

module.exports = mongoose.model('UserBuildProgress', userBuildProgressSchema);
