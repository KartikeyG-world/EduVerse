const User = require('../models/User');
const Activity = require('../models/Activity');
const { invalidateUserCache } = require('../middlewares/auth');
const { createNotification } = require('./notification');

/**
 * Single source of truth for awarding XP and updating user levels across EduVerse.
 * Ensures consistent level calculation (1000 XP per level), user session cache invalidation,
 * activity logging, and notification creation.
 *
 * @param {string|mongoose.Types.ObjectId} userId - Target user ID
 * @param {number} amount - XP amount to award (must be > 0)
 * @param {object} options - Optional context { source, message, focusSeconds }
 * @returns {Promise<{ success: boolean, xp: number, level: number, leveledUp: boolean }>}
 */
const awardUserXp = async (userId, amount, options = {}) => {
  const parsedAmount = Math.max(0, Math.floor(Number(amount) || 0));
  if (!userId || parsedAmount <= 0) {
    return { success: false, reason: 'invalid_arguments' };
  }

  const user = await User.findById(userId);
  if (!user) {
    return { success: false, reason: 'user_not_found' };
  }

  const oldLevel = user.level || 1;
  user.xp = (user.xp || 0) + parsedAmount;
  const newLevel = Math.floor(user.xp / 1000) + 1;
  const leveledUp = newLevel > oldLevel;
  user.level = newLevel;

  const focusSeconds = Number(options.focusSeconds) || 0;
  if (focusSeconds > 0) {
    user.focusHours = (user.focusHours || 0) + (focusSeconds / 3600);
  }

  await user.save();
  invalidateUserCache(user._id);

  // Log activity for chart analytics if focus time was also completed
  if (focusSeconds > 0) {
    try {
      await Activity.create({
        userId: user._id,
        type: 'study',
        duration: focusSeconds
      });
    } catch (actErr) {
      console.warn('[Gamification:ActivityLog Failed]:', actErr.message);
    }
  }

  // Create XP Notification
  const source = options.source || 'Achievement';
  const notificationMsg = options.message || (leveledUp
    ? `🎉 You earned ${parsedAmount} XP from ${source} and leveled up to Level ${user.level}!`
    : `You earned ${parsedAmount} XP from ${source}! Keep climbing towards Level ${user.level + 1}.`);

  await createNotification(user._id, 'XP', notificationMsg);

  return {
    success: true,
    xp: user.xp,
    level: user.level,
    leveledUp
  };
};

module.exports = { awardUserXp };
