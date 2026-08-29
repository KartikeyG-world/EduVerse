const crypto = require('crypto');
const QuizGenerationMeta = require('../models/quizGenerationMeta');
const { getVideoWatchContext } = require('../integrations/youtubeService');
const { generateBilingualQuiz } = require('../integrations/aiProvider');

/**
 * Checks if the improved quiz feature flag is active at runtime.
 */
const isImprovedQuizEnabled = () => {
  return process.env.FEATURE_IMPROVED_QUIZ === 'true';
};

/**
 * Checks if quiz debug mode is enabled.
 */
const isQuizDebugEnabled = () => {
  return process.env.FEATURE_QUIZ_DEBUG === 'true';
};

/**
 * Resolves the question count rule:
 * videoDurationSec > 1800 (30 min) -> 10 questions; otherwise -> 5 questions.
 */
const getTargetQuestionCount = (videoDurationSec) => {
  const duration = Math.floor(videoDurationSec || 0);
  return duration > 1800 ? 10 : 5;
};

/**
 * Internal worker function to execute AI generation and persist to QuizGenerationMeta.
 */
const processQuizGenerationJob = async (jobId) => {
  const startTime = Date.now();
  const meta = await QuizGenerationMeta.findOne({ jobId });
  if (!meta) {
    console.warn(`[QuizService] Job ${jobId} not found for processing`);
    return null;
  }

  try {
    const contextData = await getVideoWatchContext(
      meta.videoId,
      meta.watchedStartSec,
      meta.watchedEndSec,
      {
        videoTitle: meta.videoTitle,
        videoDesc: meta.videoDesc,
        videoDurationSec: meta.videoDurationSec,
      }
    );

    // Update with resolved metadata
    meta.videoDurationSec = contextData.durationSec || meta.videoDurationSec;
    meta.videoTitle = contextData.videoTitle || meta.videoTitle;
    meta.videoDesc = contextData.videoDesc || meta.videoDesc;
    meta.contextType = contextData.contextType;
    meta.topicsSummary = contextData.topicsSummary;

    // Recalculate target question count based on resolved video duration
    const targetCount = getTargetQuestionCount(meta.videoDurationSec);
    meta.targetQuestionCount = targetCount;

    // Run AI Generation with 3-layer validation & quality judge
    const aiResult = await generateBilingualQuiz(contextData, targetCount);

    meta.quiz = { questions: aiResult.questions };
    meta.attempts = aiResult.attempts;
    meta.qualityScore = aiResult.qualityScore;
    meta.providerUsed = aiResult.providerUsed;
    meta.tokensUsed = aiResult.tokensUsed;
    meta.generationLatencyMs = Date.now() - startTime;
    meta.status = 'success';
    meta.errorMessage = null;

    await meta.save();
    console.info(`[QuizService] Job ${jobId} completed successfully in ${meta.generationLatencyMs}ms (Score: ${meta.qualityScore}/10)`);
    return meta;
  } catch (err) {
    console.error(`[QuizService] Job ${jobId} failed:`, err.message);
    meta.status = 'failed';
    meta.errorMessage = err.message;
    meta.generationLatencyMs = Date.now() - startTime;
    await meta.save();
    return meta;
  }
};

/**
 * Central orchestrator for watch-range based quiz generation.
 * Handles idempotency, DB locking, and incremental extension.
 */
const generateQuizForWatchRange = async (userId, videoId, watchedStartSec, watchedEndSec, opts = {}) => {
  const startSec = Math.max(0, Math.floor(watchedStartSec || 0));
  const endSec = Math.max(startSec, Math.floor(watchedEndSec || 0));

  // Guard: If watched range < 60 seconds, skip generation entirely
  if (endSec - startSec < 60) {
    return {
      skipped: true,
      reason: 'watched_range_under_60s',
      message: 'Watched range is under 60 seconds; skipped quiz generation.',
    };
  }

  const videoDurationSec = Math.max(0, Math.floor(opts.videoDurationSec || 0));
  const targetCap = getTargetQuestionCount(videoDurationSec);

  // Check existing record for userId:videoId (Idempotency Key)
  const existingMeta = await QuizGenerationMeta.findOne({ userId, videoId });

  if (existingMeta) {
    // Case 1: Already generated successfully
    if (existingMeta.status === 'success') {
      const storedEnd = existingMeta.watchedEndSec || 0;
      const storedCount = existingMeta.quiz?.questions?.length || 0;

      // If user has not advanced further, or question count already at max cap, return existing
      if (endSec <= storedEnd || storedCount >= targetCap) {
        return {
          status: 'success',
          jobId: existingMeta.jobId,
          quiz: existingMeta.quiz,
          isCached: true,
          meta: existingMeta,
        };
      }

      // Incremental Extension: User watched further than previously stored
      const incrementalStart = storedEnd;
      const incrementalEnd = endSec;
      const neededQuestions = Math.min(targetCap - storedCount, Math.max(2, targetCap - storedCount));

      if (neededQuestions > 0 && incrementalEnd - incrementalStart >= 60) {
        console.info(`[QuizService] Incremental generation for ${videoId}: extending from ${storedEnd}s to ${endSec}s (${neededQuestions} new questions)`);
        
        const incrementalContext = await getVideoWatchContext(videoId, incrementalStart, incrementalEnd, {
          videoTitle: existingMeta.videoTitle || opts.videoTitle,
          videoDesc: existingMeta.videoDesc || opts.videoDesc,
          videoDurationSec: existingMeta.videoDurationSec || videoDurationSec,
        });

        try {
          const incrementalAI = await generateBilingualQuiz(incrementalContext, neededQuestions);
          const combinedQuestions = [...existingMeta.quiz.questions, ...incrementalAI.questions].slice(0, targetCap);

          existingMeta.quiz = { questions: combinedQuestions };
          existingMeta.watchedEndSec = endSec;
          existingMeta.attempts += incrementalAI.attempts;
          existingMeta.qualityScore = Number(((existingMeta.qualityScore + incrementalAI.qualityScore) / 2).toFixed(1));
          existingMeta.tokensUsed += incrementalAI.tokensUsed;
          await existingMeta.save();

          return {
            status: 'success',
            jobId: existingMeta.jobId,
            quiz: existingMeta.quiz,
            isIncremental: true,
            meta: existingMeta,
          };
        } catch (incErr) {
          console.warn('[QuizService] Incremental extension failed; retaining existing quiz:', incErr.message);
          return {
            status: 'success',
            jobId: existingMeta.jobId,
            quiz: existingMeta.quiz,
            isCached: true,
            meta: existingMeta,
          };
        }
      }

      return {
        status: 'success',
        jobId: existingMeta.jobId,
        quiz: existingMeta.quiz,
        isCached: true,
        meta: existingMeta,
      };
    }

    // Case 2: Generation currently in progress
    if (existingMeta.status === 'in-progress') {
      return {
        status: 'in-progress',
        jobId: existingMeta.jobId,
      };
    }
  }

  // Case 3: New generation request (or retry after failed status)
  const newJobId = `quiz-job-${crypto.randomUUID()}`;

  const metaData = {
    userId,
    videoId,
    skillId: opts.skillId || null,
    playlistId: opts.playlistId || null,
    jobId: newJobId,
    status: 'in-progress',
    watchedStartSec: startSec,
    watchedEndSec: endSec,
    videoDurationSec,
    videoTitle: opts.videoTitle || '',
    videoDesc: opts.videoDesc || '',
    targetQuestionCount: targetCap,
  };

  const metaRecord = await QuizGenerationMeta.findOneAndUpdate(
    { userId, videoId },
    { $set: metaData },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // If synchronous execution flag is set (for testing/dev only)
  if (process.env.FEATURE_IMPROVED_QUIZ_SYNC === 'true') {
    const completedMeta = await processQuizGenerationJob(newJobId);
    return {
      status: completedMeta?.status || 'success',
      jobId: newJobId,
      quiz: completedMeta?.quiz || null,
      meta: completedMeta,
    };
  }

  // Asynchronous background execution (production standard)
  setImmediate(() => {
    processQuizGenerationJob(newJobId).catch((err) => {
      console.error(`[QuizService:BackgroundWorker] Unhandled error on job ${newJobId}:`, err);
    });
  });

  return {
    status: 'in-progress',
    jobId: newJobId,
  };
};

/**
 * Retrieves pre-generated quiz for a video and user.
 * Strictly guarantees:
 * - If generationStatus === 'success', returns non-empty questions[]
 * - If generationStatus === 'in-progress' or 'failed' or missing, returns { success: false, quiz: null }
 */
const getQuizForVideo = async (userId, videoId) => {
  if (!videoId || !userId) {
    return { success: false, quiz: null };
  }

  const meta = await QuizGenerationMeta.findOne({ userId, videoId });

  if (!meta || meta.status !== 'success' || !meta.quiz?.questions?.length) {
    return {
      success: false,
      quiz: null,
      ...(isQuizDebugEnabled() && meta ? { meta: { generationStatus: meta.status, jobId: meta.jobId } } : {}),
    };
  }

  const responsePayload = {
    success: true,
    quiz: {
      questions: meta.quiz.questions,
    },
  };

  if (isQuizDebugEnabled()) {
    responsePayload.meta = {
      generationStatus: meta.status,
      qualityScore: meta.qualityScore,
      attempts: meta.attempts,
      contextType: meta.contextType,
      providerUsed: meta.providerUsed,
      tokensUsed: meta.tokensUsed,
      generationLatencyMs: meta.generationLatencyMs,
      watchedStartSec: meta.watchedStartSec,
      watchedEndSec: meta.watchedEndSec,
    };
  }

  return responsePayload;
};

/**
 * Retrieves job status by jobId (admin/debug inspection endpoint).
 */
const getJobStatus = async (jobId) => {
  const meta = await QuizGenerationMeta.findOne({ jobId });
  if (!meta) return null;
  return {
    jobId: meta.jobId,
    status: meta.status,
    userId: meta.userId,
    videoId: meta.videoId,
    attempts: meta.attempts,
    qualityScore: meta.qualityScore,
    providerUsed: meta.providerUsed,
    tokensUsed: meta.tokensUsed,
    generationLatencyMs: meta.generationLatencyMs,
    errorMessage: meta.errorMessage,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
  };
};

module.exports = {
  isImprovedQuizEnabled,
  isQuizDebugEnabled,
  getTargetQuestionCount,
  generateQuizForWatchRange,
  processQuizGenerationJob,
  getQuizForVideo,
  getJobStatus,
};
