const express = require('express');
const router = express.Router();
const BuildPathTemplate = require('../models/BuildPathTemplate');
const UserBuildProgress = require('../models/UserBuildProgress');
const Problem = require('../models/Problem');
const { protect, optionalAuth } = require('../middlewares/auth');
const {
  findMatchingTemplate,
  generateBuildPathTemplate,
  evaluateTaskSubmission,
  generateModuleStepByStepGuide
} = require('../services/buildPathService');
const { awardUserXp } = require('../utils/gamification');

// Feature Flag Guard
const isBuildPathEnabled = () => {
  return process.env.FEATURE_PROJECT_BUILD_PATH === 'true';
};

const gateFeature = (req, res, next) => {
  if (!isBuildPathEnabled()) {
    return res.status(403).json({
      success: false,
      message: 'Project Build Path feature is currently disabled',
      featureDisabled: true
    });
  }
  next();
};

router.use(gateFeature);

// @route   POST /api/build-paths/generate
// @desc    Intake flow: matches canonical template or generates new 3-layer curriculum
router.post('/generate', protect, async (req, res) => {
  try {
    const { projectIdea, techStack, skillLevel, platform } = req.body;

    if (!projectIdea || typeof projectIdea !== 'string' || projectIdea.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'A clear project description or goal is required (minimum 3 characters).'
      });
    }

    const intake = {
      projectIdea: projectIdea.trim(),
      techStack: Array.isArray(techStack) ? techStack : (typeof techStack === 'string' ? [techStack] : []),
      skillLevel: ['beginner', 'intermediate', 'advanced'].includes((skillLevel || '').toLowerCase())
        ? skillLevel.toLowerCase()
        : 'beginner',
      platform: ['web', 'mobile', 'desktop', 'fullstack', 'any'].includes((platform || '').toLowerCase())
        ? platform.toLowerCase()
        : 'web'
    };

    // Step 1: Check canonical signature & template reuse
    const match = await findMatchingTemplate(intake);
    let template;
    let isReused = false;

    if (match && match.template) {
      template = match.template;
      template.usageCount = (template.usageCount || 1) + 1;
      await template.save();
      isReused = true;
      console.info(`[BuildPaths] Reusing cached template for "${intake.projectIdea}" (Signature: ${template.canonicalSignature})`);
    } else {
      console.info(`[BuildPaths] Generating new 3-layer template for "${intake.projectIdea}"...`);
      template = await generateBuildPathTemplate(intake);
    }

    // Step 2: Initialize or fetch user progress
    let progress = await UserBuildProgress.findOne({
      userId: req.user.id,
      templateId: template._id
    });

    if (!progress) {
      progress = await UserBuildProgress.create({
        userId: req.user.id,
        templateId: template._id,
        status: 'active',
        currentModuleIndex: 0,
        completedModules: [],
        totalXpEarned: 0
      });
    }

    res.status(200).json({
      success: true,
      isReused,
      template,
      progress
    });
  } catch (err) {
    console.error('[BuildPaths:Generate Error]:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to generate build path. Please try again.'
    });
  }
});

// @route   GET /api/build-paths/templates
// @desc    List popular build path templates for exploration
router.get('/templates', optionalAuth, async (req, res) => {
  try {
    const templates = await BuildPathTemplate.find({})
      .select('canonicalSignature projectIdea normalizedTitle overview techStack skillLevel platform usageCount qualityScore modules.title')
      .sort({ usageCount: -1, createdAt: -1 })
      .limit(30)
      .lean();

    res.json({ success: true, templates });
  } catch (err) {
    console.error('[BuildPaths:ListTemplates Error]:', err);
    res.status(500).json({ success: false, message: 'Server error listing templates' });
  }
});

// @route   GET /api/build-paths/templates/:id
// @desc    Get full template details
router.get('/templates/:id', optionalAuth, async (req, res) => {
  try {
    const template = await BuildPathTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Build path template not found' });
    }
    res.json({ success: true, template });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error fetching template' });
  }
});

// @route   GET /api/build-paths/templates/:id/modules/:moduleIndex/guide
// @desc    Get or generate cached step-by-step guide for a specific milestone.
// NOTE: protect (not optionalAuth) is deliberate — on cache-miss this route calls the AI gateway
//       and permanently caches the result on the shared BuildPathTemplate document (real AI spend).
//       Unauthenticated requests are rejected here consistent with all other AI-triggering routes
//       in this project (POST /generate, POST /submit, POST /ai/* etc.).
router.get('/templates/:id/modules/:moduleIndex/guide', protect, async (req, res) => {
  try {
    const template = await BuildPathTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    const moduleIndex = parseInt(req.params.moduleIndex, 10);
    const targetModule = template.modules.find((m) => m.moduleIndex === moduleIndex);
    if (!targetModule) {
      return res.status(404).json({ success: false, message: 'Module not found in template' });
    }

    // Return cached guide if already generated on the template
    if (Array.isArray(targetModule.stepByStepGuide) && targetModule.stepByStepGuide.length > 0) {
      return res.json({
        success: true,
        source: 'cache',
        stepByStepGuide: targetModule.stepByStepGuide
      });
    }

    // Otherwise generate on-demand, cache onto template, and return
    const guide = await generateModuleStepByStepGuide(template.projectIdea, template.techStack, targetModule);
    targetModule.stepByStepGuide = guide;
    await template.save();

    res.json({
      success: true,
      source: 'generated',
      stepByStepGuide: guide
    });
  } catch (err) {
    console.error('[BuildPaths:Guide Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve step-by-step guide' });
  }
});

// @route   GET /api/build-paths/progress
// @desc    Get all active build paths for the authenticated user
router.get('/progress', protect, async (req, res) => {
  try {
    const list = await UserBuildProgress.find({ userId: req.user.id })
      .populate('templateId')
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ success: true, progressList: list });
  } catch (err) {
    console.error('[BuildPaths:GetProgress Error]:', err);
    res.status(500).json({ success: false, message: 'Server error fetching user progress' });
  }
});

// @route   GET /api/build-paths/progress/:id
// @desc    Get user's progress for a specific build path (with ownership check)
router.get('/progress/:id', protect, async (req, res) => {
  try {
    const progress = await UserBuildProgress.findById(req.params.id).populate('templateId');
    if (!progress) {
      return res.status(404).json({ success: false, message: 'Progress record not found' });
    }

    // Strict ownership check
    if (progress.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this progress record' });
    }

    res.json({ success: true, progress });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error fetching progress' });
  }
});

// @route   POST /api/build-paths/progress/:id/modules/:moduleIndex/submit
// @desc    Submit deliverable for a hands-on task with optional AI feedback
router.post('/progress/:id/modules/:moduleIndex/submit', protect, async (req, res) => {
  try {
    const { submissionType = 'text', content, requestAiFeedback = true } = req.body;
    const moduleIdx = parseInt(req.params.moduleIndex, 10);

    const progress = await UserBuildProgress.findById(req.params.id).populate('templateId');
    if (!progress) {
      return res.status(404).json({ success: false, message: 'Progress record not found' });
    }

    if (progress.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to modify this progress record' });
    }

    const template = progress.templateId;
    const targetModule = template.modules?.find((m) => m.moduleIndex === moduleIdx);
    if (!targetModule) {
      return res.status(400).json({ success: false, message: `Module index ${moduleIdx} not found in template` });
    }

    // Hard sequencing: Check that prior milestone is completed (direct membership, not XP value)
    if (moduleIdx > 0) {
      const isPriorCompleted = progress.completedModules.some((m) => m.moduleIndex === moduleIdx - 1);
      if (!isPriorCompleted) {
        return res.status(400).json({
          success: false,
          message: `Milestone #${moduleIdx + 1} is locked. You must complete Milestone #${moduleIdx} first.`
        });
      }
    }

    let aiFeedback = null;
    if (requestAiFeedback && content) {
      aiFeedback = await evaluateTaskSubmission({
        projectTitle: template.projectIdea,
        moduleTitle: targetModule.title,
        taskInstructions: targetModule.handsOnTask?.instructions || '',
        submissionContent: content,
        submissionType
      });
    }

    const existingIndex = progress.completedModules.findIndex((m) => m.moduleIndex === moduleIdx);
    const submissionData = {
      submissionType,
      content,
      submittedAt: new Date()
    };

    if (existingIndex >= 0) {
      progress.completedModules[existingIndex].submission = submissionData;
      if (aiFeedback) progress.completedModules[existingIndex].aiFeedback = aiFeedback;
    } else {
      progress.completedModules.push({
        moduleIndex: moduleIdx,
        completedAt: new Date(),
        xpAwarded: 0,
        submission: submissionData,
        aiFeedback
      });
    }

    await progress.save();

    res.json({
      success: true,
      submission: submissionData,
      aiFeedback,
      progress
    });
  } catch (err) {
    console.error('[BuildPaths:Submit Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to record task submission' });
  }
});

// @route   POST /api/build-paths/progress/:id/modules/:moduleIndex/complete
// @desc    Mark a module complete and award 50 XP (strictly idempotent: single source of truth, no double-counting)
router.post('/progress/:id/modules/:moduleIndex/complete', protect, async (req, res) => {
  try {
    const moduleIdx = parseInt(req.params.moduleIndex, 10);
    const progress = await UserBuildProgress.findById(req.params.id).populate('templateId');

    if (!progress) {
      return res.status(404).json({ success: false, message: 'Progress record not found' });
    }

    if (progress.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to modify this progress record' });
    }

    const template = progress.templateId;
    const totalModules = template.modules?.length || 1;

    // Hard sequencing: Check that prior milestone is completed (direct membership, not XP value)
    if (moduleIdx > 0) {
      const isPriorCompleted = progress.completedModules.some((m) => m.moduleIndex === moduleIdx - 1);
      if (!isPriorCompleted) {
        return res.status(400).json({
          success: false,
          message: `Milestone #${moduleIdx + 1} is locked. You must complete Milestone #${moduleIdx} first.`
        });
      }
    }

    // Idempotency check: Has this module already been awarded XP?
    const existingEntry = progress.completedModules.find((m) => m.moduleIndex === moduleIdx);
    if (existingEntry && (existingEntry.xpAwarded || 0) > 0) {
      return res.json({
        success: true,
        alreadyCompleted: true,
        xpAwarded: 0,
        message: 'Module already marked complete. No additional XP awarded.',
        progress
      });
    }

    // Award 50 XP via centralized single source of truth
    const xpReward = 50;
    const xpResult = await awardUserXp(req.user.id, xpReward, {
      source: 'Build Path Milestone',
      message: `🎉 Completed Milestone #${moduleIdx + 1} of "${template.projectIdea}" (+50 XP)!`
    });

    if (existingEntry) {
      existingEntry.xpAwarded = xpReward;
      existingEntry.completedAt = new Date();
    } else {
      progress.completedModules.push({
        moduleIndex: moduleIdx,
        completedAt: new Date(),
        xpAwarded: xpReward
      });
    }

    progress.totalXpEarned = (progress.totalXpEarned || 0) + xpReward;

    // Check if entire build path is now finished
    const uniqueCompleted = new Set(progress.completedModules.map((m) => m.moduleIndex));
    if (uniqueCompleted.size >= totalModules) {
      progress.status = 'completed';
    }

    // Soft-sequencing pointer: recommend next incomplete module
    let nextIndex = moduleIdx + 1;
    while (uniqueCompleted.has(nextIndex) && nextIndex < totalModules) {
      nextIndex++;
    }
    progress.currentModuleIndex = Math.min(nextIndex, totalModules - 1);

    await progress.save();

    res.json({
      success: true,
      alreadyCompleted: false,
      xpAwarded: xpReward,
      userStats: xpResult ? { xp: xpResult.xp, level: xpResult.level, leveledUp: xpResult.leveledUp } : null,
      progress
    });
  } catch (err) {
    console.error('[BuildPaths:Complete Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to complete module' });
  }
});

// @route   POST /api/build-paths/progress/:id/modules/:moduleIndex/peer-review
// @desc    Posts task deliverable to Peer Tutor Network with additive isBuildPathReview flag
router.post('/progress/:id/modules/:moduleIndex/peer-review', protect, async (req, res) => {
  try {
    const moduleIdx = parseInt(req.params.moduleIndex, 10);
    const { customNote } = req.body;

    const progress = await UserBuildProgress.findById(req.params.id).populate('templateId');
    if (!progress) {
      return res.status(404).json({ success: false, message: 'Progress record not found' });
    }

    if (progress.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to post review for this progress record' });
    }

    const template = progress.templateId;
    const targetModule = template.modules?.find((m) => m.moduleIndex === moduleIdx);
    if (!targetModule) {
      return res.status(400).json({ success: false, message: 'Target module not found' });
    }

    // Hard sequencing: Check that prior milestone is completed (direct membership, not XP value)
    if (moduleIdx > 0) {
      const isPriorCompleted = progress.completedModules.some((m) => m.moduleIndex === moduleIdx - 1);
      if (!isPriorCompleted) {
        return res.status(400).json({
          success: false,
          message: `Milestone #${moduleIdx + 1} is locked. You must complete Milestone #${moduleIdx} first.`
        });
      }
    }

    const completedEntry = progress.completedModules.find((m) => m.moduleIndex === moduleIdx);
    const submissionContent = completedEntry?.submission?.content || customNote || 'Please review my milestone implementation code and architecture.';

    // Construct clean questionText without baked-in banners
    const questionText = `Review Request for Milestone #${moduleIdx + 1}: "${targetModule.title}" (${template.projectIdea})

Task Requirements:
${targetModule.handsOnTask?.instructions || 'Standard practical implementation'}

Student Deliverable:
${submissionContent}${customNote ? `\n\nStudent Note:\n${customNote}` : ''}`;

    // Create Problem with additive flags
    const problem = await Problem.create({
      userId: req.user.id,
      subject: 'Programming',
      questionText,
      isBuildPathReview: true,
      buildPathMeta: {
        templateId: template._id,
        moduleIndex: moduleIdx,
        moduleTitle: targetModule.title
      }
    });

    if (completedEntry) {
      completedEntry.peerReviewProblemId = problem._id;
      await progress.save();
    }

    res.status(201).json({
      success: true,
      message: 'Milestone deliverable posted to Peer Tutor Network for community review!',
      problem
    });
  } catch (err) {
    console.error('[BuildPaths:PeerReview Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to post peer review request' });
  }
});

// @route   DELETE /api/build-paths/progress/:id
// @desc    Delete a user's build path progress. Only removes UserBuildProgress; BuildPathTemplate is untouched.
router.delete('/progress/:id', protect, async (req, res) => {
  try {
    const progress = await UserBuildProgress.findById(req.params.id);
    if (!progress) {
      return res.status(404).json({ success: false, message: 'Build path progress record not found' });
    }

    if (progress.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this build path' });
    }

    const templateId = progress.templateId;
    await UserBuildProgress.findByIdAndDelete(req.params.id);

    // Verify template remains unaffected
    const templateStillExists = await BuildPathTemplate.exists({ _id: templateId });

    res.json({
      success: true,
      message: 'Build path removed from your workspace. Shared template remains preserved.',
      deletedProgressId: req.params.id,
      templateId,
      templatePreserved: !!templateStillExists
    });
  } catch (err) {
    console.error('[BuildPaths:Delete Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to delete build path progress' });
  }
});

module.exports = router;
