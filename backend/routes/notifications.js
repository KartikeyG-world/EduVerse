const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middlewares/auth');

// @route   GET /api/notifications
// @desc    Get latest 20 notifications for the authenticated user
router.get('/', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// @route   PUT /api/notifications/read
// @desc    Mark all notifications as read for the authenticated user
router.put('/read', protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, read: false },
      { $set: { read: true } }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update read status' });
  }
});

module.exports = router;
