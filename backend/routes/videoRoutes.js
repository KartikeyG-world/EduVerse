const express = require('express');
const router = express.Router();
const { optionalAuth, protect } = require('../middlewares/auth');
const {
  handleVideoFinished,
  getVideoQuiz,
  getQuizJobStatus,
} = require('../controllers/videoController');

// @route   POST /api/track/video-finished
router.post('/track/video-finished', optionalAuth, handleVideoFinished);

// @route   GET /api/videos/:videoId/quizzes
router.get('/videos/:videoId/quizzes', optionalAuth, getVideoQuiz);

// @route   GET /api/quiz-generation/:jobId/status (Admin / Debug endpoint)
router.get('/quiz-generation/:jobId/status', optionalAuth, getQuizJobStatus);

module.exports = router;
