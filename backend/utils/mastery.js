const TopicMastery = require('../models/TopicMastery');

/**
 * Normalizes a topic name to a canonical lowercase trimmed representation.
 * @param {string} name 
 * @returns {string}
 */
const normalizeTopicName = (name) => {
  if (!name || typeof name !== 'string') return '';
  return name.trim().toLowerCase();
};

/**
 * Determines whether a topic is currently due for spaced-repetition revision.
 * Single source of truth across all endpoints.
 * @param {Object} topic 
 * @param {Date} now 
 * @returns {boolean}
 */
const isRevisionDue = (topic, now = new Date()) => {
  if (!topic || !topic.nextRevisionDue) return false;
  const hasAssessment = ((topic.correctAttempts || 0) > 0 || (topic.wrongAttempts || 0) > 0);
  return hasAssessment && new Date(topic.nextRevisionDue) <= now;
};

/**
 * Updates or creates mastery for a canonical topic.
 * @param {string} userId 
 * @param {string} topicName 
 * @param {string} category 
 * @param {Object} updateData - { isCorrect, confidence, difficulty, notes, sourceType }
 */
const updateTopicMastery = async (userId, topicName, category, updateData = {}) => {
  const { isCorrect, confidence, difficulty, notes, sourceType = 'manual' } = updateData;

  const trimmedTopicName = (topicName || '').trim();
  const canonical = normalizeTopicName(trimmedTopicName);
  const trimmedCategory = (category || 'General').trim();

  // Find existing record by canonical name or legacy exact match
  let topic = await TopicMastery.findOne({
    userId,
    $or: [
      { canonicalTopicName: canonical },
      { topicName: trimmedTopicName }
    ]
  });

  const now = new Date();

  if (!topic) {
    const isAssessment = isCorrect !== undefined;
    const initialScore = isAssessment ? (isCorrect ? 20 : 0) : 0;
    
    // Spaced repetition interval for initial assessment
    let initialRevisionDue = null;
    if (isAssessment) {
      const daysToAdd = isCorrect ? 3 : 1;
      initialRevisionDue = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    }

    topic = new TopicMastery({
      userId,
      topicName: trimmedTopicName,
      canonicalTopicName: canonical,
      category: trimmedCategory,
      categories: [trimmedCategory],
      sources: [{ type: sourceType, lastStudiedAt: now, count: 1 }],
      masteryScore: initialScore,
      correctAttempts: isAssessment && isCorrect ? 1 : 0,
      wrongAttempts: isAssessment && !isCorrect ? 1 : 0,
      difficultyLevel: difficulty || 'medium',
      confidenceScore: confidence !== undefined ? confidence : 50,
      notes: notes || '',
      lastStudiedAt: now,
      nextRevisionDue: initialRevisionDue,
      isWeakArea: isAssessment && !isCorrect
    });
  } else {
    // Maintain display name if previously missing/empty
    if (!topic.topicName || topic.topicName === '') {
      topic.topicName = trimmedTopicName;
    }
    topic.canonicalTopicName = canonical;

    // Track multi-source categories without duplication
    if (!Array.isArray(topic.categories)) {
      topic.categories = topic.category ? [topic.category] : [];
    }
    if (trimmedCategory && !topic.categories.includes(trimmedCategory)) {
      topic.categories.push(trimmedCategory);
    }
    topic.category = trimmedCategory; // Keep primary display category

    // Bounded source metadata tracking
    if (!Array.isArray(topic.sources)) {
      topic.sources = [];
    }
    const existingSource = topic.sources.find(s => s.type === sourceType);
    if (existingSource) {
      existingSource.count = (existingSource.count || 1) + 1;
      existingSource.lastStudiedAt = now;
    } else if (topic.sources.length < 10) {
      topic.sources.push({ type: sourceType, lastStudiedAt: now, count: 1 });
    }

    // Only update attempts and revision scheduling if a real assessment result is provided
    if (isCorrect !== undefined) {
      if (isCorrect) {
        topic.correctAttempts = (topic.correctAttempts || 0) + 1;
        topic.masteryScore = Math.min(100, (topic.masteryScore || 0) + 10);
      } else {
        topic.wrongAttempts = (topic.wrongAttempts || 0) + 1;
        topic.masteryScore = Math.max(0, (topic.masteryScore || 0) - 15);
      }

      // Spaced Repetition calculation based on new score
      let daysToAdd = 1;
      if (topic.masteryScore >= 90) daysToAdd = 30;
      else if (topic.masteryScore >= 75) daysToAdd = 14;
      else if (topic.masteryScore >= 60) daysToAdd = 7;
      else if (topic.masteryScore >= 40) daysToAdd = 3;

      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + daysToAdd);
      topic.nextRevisionDue = nextDate;
    }

    if (confidence !== undefined) topic.confidenceScore = confidence;
    if (difficulty !== undefined) topic.difficultyLevel = difficulty;
    if (notes !== undefined) topic.notes = notes;
    
    topic.lastStudiedAt = now;

    // Weak area determination
    const totalAttempts = (topic.correctAttempts || 0) + (topic.wrongAttempts || 0);
    if (totalAttempts > 0) {
      topic.isWeakArea = topic.masteryScore < 40 || (topic.wrongAttempts > topic.correctAttempts && topic.masteryScore < 60);
    }
  }

  await topic.save();
  return topic;
};

module.exports = {
  updateTopicMastery,
  normalizeTopicName,
  isRevisionDue
};
