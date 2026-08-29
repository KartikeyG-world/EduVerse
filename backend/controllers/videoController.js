const {
  isImprovedQuizEnabled,
  generateQuizForWatchRange,
  getQuizForVideo,
  getJobStatus,
} = require('../services/quizService');

/**
 * POST /api/track/video-finished
 * Event hook triggered when a video finishes or advances.
 * Returns 202 with jobId when background generation starts, or 200 with cached quiz.
 */
const handleVideoFinished = async (req, res) => {
  try {
    const {
      userId: bodyUserId,
      videoId,
      skillId,
      playlistId,
      watchedStartSec = 0,
      watchedEndSec = 0,
      videoDurationSec = 0,
      videoTitle = '',
      videoDesc = '',
    } = req.body;

    const userId = req.user?.id || req.user?._id || bodyUserId;

    if (!videoId || !userId) {
      return res.status(400).json({ success: false, message: 'videoId and userId are required' });
    }

    if (!isImprovedQuizEnabled()) {
      return res.status(200).json({ success: true, message: 'Tracking recorded (improved quiz disabled)' });
    }

    const result = await generateQuizForWatchRange(
      userId,
      videoId,
      Number(watchedStartSec) || 0,
      Number(watchedEndSec) || 0,
      {
        skillId,
        playlistId,
        videoDurationSec: Number(videoDurationSec) || 0,
        videoTitle,
        videoDesc,
      }
    );

    if (result.skipped) {
      return res.status(200).json({ success: true, skipped: true, reason: result.reason });
    }

    if (result.status === 'in-progress') {
      return res.status(202).json({
        success: true,
        status: 'in-progress',
        jobId: result.jobId,
        message: 'Quiz generation started in background',
      });
    }

    // Cached or synchronously finished result
    return res.status(200).json({
      success: true,
      status: 'success',
      jobId: result.jobId,
      quiz: result.quiz,
    });
  } catch (err) {
    console.error('[VideoController:VideoFinished Error]:', err);
    return res.status(500).json({ success: false, message: 'Error processing video finish event' });
  }
};

/**
 * GET /api/videos/:videoId/quizzes
 * Retrieves generated quiz for a given video and user.
 * Contract:
 * - When generationStatus === 'success', returns non-empty questions[] array
 * - When in-progress, failed, or missing, returns { success: false, quiz: null }
 */
const getVideoQuiz = async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.user?.id || req.user?._id || req.query.userId;

    if (!videoId || !userId) {
      return res.status(200).json({ success: false, quiz: null });
    }

    if (!isImprovedQuizEnabled()) {
      return res.status(200).json({ success: false, quiz: null, message: 'Improved quiz feature disabled' });
    }

    const result = await getQuizForVideo(userId, videoId);
    return res.status(200).json(result);
  } catch (err) {
    console.error('[VideoController:GetVideoQuiz Error]:', err);
    return res.status(200).json({ success: false, quiz: null });
  }
};

/**
 * GET /api/quiz-generation/:jobId/status
 * Admin / debug endpoint to inspect background job status and metrics.
 */
const getQuizJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await getJobStatus(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    return res.status(200).json({ success: true, job });
  } catch (err) {
    console.error('[VideoController:GetJobStatus Error]:', err);
    return res.status(500).json({ success: false, message: 'Error retrieving job status' });
  }
};

module.exports = {
  handleVideoFinished,
  getVideoQuiz,
  getQuizJobStatus,
};
