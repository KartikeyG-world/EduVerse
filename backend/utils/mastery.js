const TopicMastery = require('../models/TopicMastery');

/**
 * Updates mastery for a specific topic.
 * @param {string} userId 
 * @param {string} topicName 
 * @param {string} category 
 * @param {Object} updateData - { isCorrect, confidence, difficulty, notes }
 */
const updateTopicMastery = async (userId, topicName, category, updateData) => {
  const { isCorrect, confidence, difficulty, notes } = updateData;

  let topic = await TopicMastery.findOne({ userId, topicName, category });

  if (!topic) {
    topic = new TopicMastery({
      userId,
      topicName,
      category,
      masteryScore: isCorrect ? 20 : 0,
      correctAttempts: isCorrect ? 1 : 0,
      wrongAttempts: isCorrect ? 0 : 1,
      difficultyLevel: difficulty || 'medium',
      confidenceScore: confidence || 50,
      notes: notes || '',
    });
  } else {
    // Update attempts
    if (isCorrect !== undefined) {
      if (isCorrect) {
        topic.correctAttempts += 1;
        topic.masteryScore = Math.min(100, topic.masteryScore + 10);
      } else {
        topic.wrongAttempts += 1;
        topic.masteryScore = Math.max(0, topic.masteryScore - 15);
      }
    }

    if (confidence !== undefined) topic.confidenceScore = confidence;
    if (difficulty !== undefined) topic.difficultyLevel = difficulty;
    if (notes !== undefined) topic.notes = notes;
    
    topic.lastStudiedAt = Date.now();
  }

  // Update weak area flag
  // If mastery is low and wrong attempts are high, or just low mastery
  topic.isWeakArea = topic.masteryScore < 40 || (topic.wrongAttempts > topic.correctAttempts && topic.masteryScore < 60);

  // Spaced Repetition Logic (Simple)
  // Higher mastery = longer gap
  let daysToAdd = 1;
  if (topic.masteryScore >= 90) daysToAdd = 30;
  else if (topic.masteryScore >= 75) daysToAdd = 14;
  else if (topic.masteryScore >= 60) daysToAdd = 7;
  else if (topic.masteryScore >= 40) daysToAdd = 3;

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + daysToAdd);
  topic.nextRevisionDue = nextDate;

  await topic.save();
  return topic;
};

module.exports = {
  updateTopicMastery,
};
