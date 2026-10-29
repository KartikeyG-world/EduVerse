const mongoose = require('mongoose');

const moduleResourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  url: { type: String, required: true },
  videoId: { type: String, default: '' },
  channel: { type: String, default: '' },
  duration: { type: String, default: '' },
  views: { type: Number, default: 0 }
}, { _id: false });

const handsOnTaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  instructions: { type: String, required: true },
  deliverableType: {
    type: String,
    enum: ['code', 'text', 'repo_url', 'any'],
    default: 'any'
  },
  evaluationCriteria: [{ type: String }]
}, { _id: false });

const docLinkSchema = new mongoose.Schema({
  title: { type: String, required: true },
  url: { type: String, required: true },
  domain: { type: String, required: true },
  isVerified: { type: Boolean, default: false }
}, { _id: false });

const buildPathModuleSchema = new mongoose.Schema({
  moduleIndex: { type: Number, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  estimatedMinutes: { type: Number, default: 60 },
  handsOnTask: { type: handsOnTaskSchema, required: true },
  youtubeResources: [moduleResourceSchema],
  docLink: { type: docLinkSchema, default: null },
  stepByStepGuide: [{ type: String }]
}, { _id: false });

const buildPathTemplateSchema = new mongoose.Schema({
  canonicalSignature: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  canonicalKey: {
    type: String,
    required: true,
    index: true
  },
  projectIdea: {
    type: String,
    required: true
  },
  normalizedTitle: {
    type: String,
    required: true
  },
  overview: {
    type: String,
    required: true
  },
  techStack: [{
    type: String
  }],
  skillLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  platform: {
    type: String,
    enum: ['web', 'mobile', 'desktop', 'fullstack', 'any'],
    default: 'web'
  },
  modules: [buildPathModuleSchema],
  qualityScore: {
    type: Number,
    default: 8.0
  },
  generationAttempts: {
    type: Number,
    default: 1
  },
  providerUsed: {
    type: String,
    default: 'aiProvider'
  },
  usageCount: {
    type: Number,
    default: 1
  }
}, { timestamps: true });

module.exports = mongoose.model('BuildPathTemplate', buildPathTemplateSchema);
