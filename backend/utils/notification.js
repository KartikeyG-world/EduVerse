const Notification = require('../models/Notification');

/**
 * Creates a notification securely mapped towards a specific user identity.
 * @param {string} userId - ID of the target user.
 * @param {string} type - Enum representing LOGIN, FOCUS, XP, SYSTEM, or TUTOR.
 * @param {string} message - Human-readable notification description.
 */
const createNotification = async (userId, type, message) => {
  try {
    if (!userId) return; // Silent skip for guest previewers
    const notification = new Notification({
      userId,
      type,
      message,
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error(`Failed to generate notification [${type}]:`, error.message);
  }
};

module.exports = { createNotification };
