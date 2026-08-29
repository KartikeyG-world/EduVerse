const express = require('express');
const router = express.Router();
const Problem = require('../models/Problem');
const Solution = require('../models/Solution');
const User = require('../models/User');
const { protect, optionalAuth } = require('../middlewares/auth');

// ----------------------------------------
// STUDENT ROUTES
// ----------------------------------------

// @route   POST /api/tutor/problem
// @desc    Post a new problem
router.post('/problem', protect, async (req, res) => {
  try {
    const { subject, questionText, image } = req.body;
    
    if (!subject || !questionText) {
      return res.status(400).json({ message: 'Subject and question text are required' });
    }

    const problem = await Problem.create({
      userId: req.user.id,
      subject,
      questionText,
      image
    });

    res.status(201).json(problem);
  } catch (err) {
    console.error("Error creating problem:", err);
    res.status(500).json({ message: 'Server error creating problem' });
  }
});

// @route   GET /api/tutor/my-problems
// @desc    Get all problems posted by the logged in student
router.get('/my-problems', optionalAuth, async (req, res) => {
  try {
    if (!req.user) return res.json([]);

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const problems = await Problem.find({ userId: req.user.id })
      .populate({
        path: 'solutions',
        populate: {
          path: 'teacherId',
          select: 'name xp level avatar'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    res.json(problems);
  } catch (err) {
    console.error("Error fetching my problems:", err);
    res.status(500).json({ message: 'Server error fetching problems' });
  }
});

// @route   POST /api/tutor/accept
// @desc    Student accepts a solution
router.post('/accept', protect, async (req, res) => {
  try {
    const { problemId, solutionId } = req.body;

    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    if (problem.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized to accept solutions for this problem' });
    }

    if (problem.status === 'solved') {
      return res.status(400).json({ message: 'Problem is already solved' });
    }

    const solution = await Solution.findById(solutionId);
    if (!solution) {
      return res.status(404).json({ message: 'Solution not found' });
    }

    // Guard: Prevent self-rewarding XP and tutor points
    if (solution.teacherId.toString() === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot accept your own solution.' });
    }

    // Update Problem
    problem.status = 'solved';
    problem.acceptedSolution = solutionId;
    await problem.save();

    // Award +10 XP and +10 Tutor Points to the teacher
    const teacher = await User.findById(solution.teacherId);
    if (teacher) {
      teacher.xp += 10;
      teacher.tutorPoints = (teacher.tutorPoints || 0) + 10;
      // Simple level math logic fallback
      if (teacher.xp >= teacher.level * 1000) {
        teacher.level += 1;
      }
      await teacher.save();
    }

    res.json({ message: 'Solution accepted successfully', problem });
  } catch (err) {
    console.error("Error accepting solution:", err);
    res.status(500).json({ message: 'Server error accepting solution' });
  }
});

// ----------------------------------------
// TEACHER ROUTES
// ----------------------------------------

// @route   GET /api/tutor/problems
// @desc    Get all unsolved problems for a specific subject
router.get('/problems', optionalAuth, async (req, res) => {
  try {
    const { subject } = req.query;
    if (!subject) {
      return res.status(400).json({ message: 'Subject query parameter is required' });
    }

    const problems = await Problem.find({ subject, status: 'unsolved' })
      .populate('userId', 'name')
      .populate({
        path: 'solutions',
        populate: {
          path: 'teacherId',
          select: 'name'
        }
      })
      .sort({ createdAt: -1 });

    res.json(problems);
  } catch (err) {
    console.error("Error fetching subject problems:", err);
    res.status(500).json({ message: 'Server error fetching problems' });
  }
});

// @route   POST /api/tutor/solution
// @desc    Teacher submits a solution to a problem
router.post('/solution', protect, async (req, res) => {
  try {
    const { problemId, solutionText, image } = req.body;

    if (!problemId || !solutionText) {
      return res.status(400).json({ message: 'Problem ID and solution text are required' });
    }

    const problem = await Problem.findById(problemId);
    if (!problem) {
        return res.status(404).json({ message: 'Problem not found' });
    }
    
    if (problem.status === 'solved') {
        return res.status(400).json({ message: 'This problem is already solved' });
    }

    // Guard: Prevent users from submitting solutions to their own problem
    if (problem.userId.toString() === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot submit a solution to your own problem.' });
    }

    const solution = await Solution.create({
      problemId,
      teacherId: req.user.id,
      solutionText,
      image
    });

    // Push into problem's solutions array
    problem.solutions.push(solution._id);
    await problem.save();

    res.status(201).json(solution);
  } catch (err) {
    console.error("Error posting solution:", err);
    res.status(500).json({ message: 'Server error submitting solution' });
  }
});

// ----------------------------------------
// ANALYTICS ROUTES
// ----------------------------------------

// @route   GET /api/tutor/stats
// @desc    Get tutor tracking statistics for both roles
router.get('/stats', optionalAuth, async (req, res) => {
  try {
    if (!req.user) return res.json({ totalPosted: 0, totalSolved: 0, totalPoints: 0 });

    const userId = req.user.id;
    
    // 1. Total Problems Posted
    const totalPosted = await Problem.countDocuments({ userId });
    
    // 2. Total Problems Solved (Solutions accepted by students where this user is teacher)
    const solutionIds = await Solution.find({ teacherId: userId }).distinct('_id');
    const totalSolved = await Problem.countDocuments({ acceptedSolution: { $in: solutionIds } });
    
    // 3. Total Points
    const totalPoints = req.user.tutorPoints || 0;
    
    res.json({
       totalPosted,
       totalSolved,
       totalPoints
    });
  } catch (err) {
    console.error("Error fetching tutor stats:", err);
    res.status(500).json({ message: 'Server error fetching tutor stats' });
  }
});

module.exports = router;
