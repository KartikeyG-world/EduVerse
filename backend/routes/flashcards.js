const express = require('express');
const router = express.Router();
const axios = require('axios');
const Flashcard = require('../models/Flashcard');
const TopicMastery = require('../models/TopicMastery');
const { protect } = require('../middlewares/auth');
const { updateTopicMastery } = require('../utils/mastery');

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Shared OpenRouter call (mirrors ai.js helper, but kept separate to avoid coupling) */
const callAI = async (messages) => {
  const MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS) || 1500;
  const response = await axios.post(
    OPENROUTER_URL,
    { model: 'openai/gpt-3.5-turbo', messages, max_tokens: MAX_TOKENS },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5000',
        'X-OpenRouter-Title': 'EduVerse AI Flashcards',
      },
    }
  );
  const content = response.data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty AI response');
  return content;
};

/** Strip markdown code fences and parse JSON safely */
const safeParseJSON = (text) => {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned);
};

/**
 * SM-2 Algorithm (simplified)
 * rating: 0 = Forgot, 1 = Hard, 2 = Good, 3 = Easy
 * Returns { newInterval, newEaseFactor, newRepetitions, nextReviewDate }
 */
const sm2 = (card, rating) => {
  let { srsInterval, easeFactor, repetitions } = card;

  // rating < 2 → failed recall: reset repetitions, short interval
  if (rating < 2) {
    repetitions = 0;
    srsInterval = 1;
  } else {
    // Successful recall
    if (repetitions === 0) {
      srsInterval = 1;
    } else if (repetitions === 1) {
      srsInterval = 6;
    } else {
      srsInterval = Math.round(srsInterval * easeFactor);
    }
    repetitions += 1;
  }

  // Update ease factor: EF' = EF + (0.1 - (3 - rating) * (0.08 + (3 - rating) * 0.02))
  easeFactor = easeFactor + (0.1 - (3 - rating) * (0.08 + (3 - rating) * 0.02));
  easeFactor = Math.max(1.3, parseFloat(easeFactor.toFixed(2)));

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + srsInterval);

  return { newInterval: srsInterval, newEaseFactor: easeFactor, newRepetitions: repetitions, nextReviewDate };
};

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * POST /api/flashcards/generate
 * Body: { noteContent, topicName, noteId }
 * Sends note text to AI → returns saved flashcard array
 */
router.post('/generate', protect, async (req, res) => {
  try {
    const { noteContent, topicName = 'General', noteId } = req.body;

    if (!noteContent || noteContent.trim().length < 20) {
      return res.status(400).json({ success: false, message: 'Note content is too short to generate flashcards.' });
    }

    // Strip HTML tags from rich-text content
    const plainText = noteContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    const messages = [
      {
        role: 'system',
        content:
          'You are an expert educational assistant. Your only job is to extract key concepts from provided text and return them as Q&A flashcard pairs in pure valid JSON. Never add commentary.',
      },
      {
        role: 'user',
        content: `Extract 5-8 key concepts from the following educational notes and convert them into flashcard Q&A pairs.
Each card must have a concise "front" (the question or concept) and a thorough "back" (the answer or explanation).
Respond ONLY with a valid JSON array in this exact format:
[
  { "front": "What is ...?", "back": "It is ..." },
  { "front": "Define ...", "back": "... means ..." }
]

Notes:
${plainText.substring(0, 3000)}`,
      },
    ];

    const aiText = await callAI(messages);
    const pairs = safeParseJSON(aiText);

    if (!Array.isArray(pairs) || pairs.length === 0) {
      return res.status(500).json({ success: false, message: 'AI returned invalid flashcard structure.' });
    }

    // Save all flashcards to DB (Phase 2 global study queue)
    const docs = pairs.map((p) => ({
      userId: req.user.id,
      topicName,
      front: p.front?.trim() || 'Question',
      back: p.back?.trim() || 'Answer',
      sourceNoteId: noteId || null,
      nextReviewDate: new Date(),
      srsInterval: 1,
      easeFactor: 2.5,
      repetitions: 0,
    }));

    const saved = await Flashcard.insertMany(docs);

    // Also embed into Note directly (Phase 1 legacy / immediate viewing)
    if (noteId) {
      const Note = require('../models/Note');
      const embeddedCards = pairs.map(p => ({
        question: p.front?.trim() || 'Question',
        answer: p.back?.trim() || 'Answer'
      }));
      await Note.findByIdAndUpdate(noteId, { $push: { flashcards: { $each: embeddedCards } } });
    }

    res.status(201).json({ success: true, flashcards: saved, count: saved.length });
  } catch (err) {
    console.error('[Flashcard Generate Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to generate flashcards. Your notes and other features are unaffected.' });
  }
});

/**
 * GET /api/flashcards
 * Returns all flashcards for the user, optionally filtered by ?due=true for today's review queue
 */
router.get('/', protect, async (req, res) => {
  try {
    const filter = { userId: req.user.id };

    if (req.query.due === 'true') {
      filter.nextReviewDate = { $lte: new Date() };
    }

    const cards = await Flashcard.find(filter).sort({ nextReviewDate: 1 });
    res.json({ success: true, flashcards: cards, count: cards.length });
  } catch (err) {
    console.error('[Flashcard GET Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch flashcards.' });
  }
});

/**
 * GET /api/flashcards/pending-count
 * Returns count of cards due today — used by Dashboard widget
 */
router.get('/pending-count', protect, async (req, res) => {
  try {
    const count = await Flashcard.countDocuments({
      userId: req.user.id,
      nextReviewDate: { $lte: new Date() },
    });
    res.json({ success: true, count });
  } catch (err) {
    console.error('[Flashcard Pending Count Error]', err.message);
    res.status(500).json({ success: false, count: 0 });
  }
});

/**
 * PUT /api/flashcards/:id/review
 * Body: { rating: 0|1|2|3 }  (0=Forgot, 1=Hard, 2=Good, 3=Easy)
 * Applies SM-2, saves card, and updates Mastery Engine
 */
router.put('/:id/review', protect, async (req, res) => {
  try {
    const { rating } = req.body;

    if (rating === undefined || rating < 0 || rating > 3) {
      return res.status(400).json({ success: false, message: 'Rating must be 0 (Forgot), 1 (Hard), 2 (Good), or 3 (Easy).' });
    }

    const card = await Flashcard.findOne({ _id: req.params.id, userId: req.user.id });
    if (!card) {
      return res.status(404).json({ success: false, message: 'Flashcard not found.' });
    }

    // Apply SM-2
    const { newInterval, newEaseFactor, newRepetitions, nextReviewDate } = sm2(card, rating);

    card.srsInterval = newInterval;
    card.easeFactor = newEaseFactor;
    card.repetitions = newRepetitions;
    card.nextReviewDate = nextReviewDate;
    card.totalReviews = (card.totalReviews || 0) + 1;
    await card.save();

    // ── Mastery Engine Integration ────────────────────────────────────────────
    // rating 3 (Easy) → isCorrect=true  → +10 mastery
    // rating 2 (Good) → isCorrect=true  → +10 mastery
    // rating 1 (Hard) → isCorrect=false → -15 mastery (but not weak area)
    // rating 0 (Forgot) → isCorrect=false + mark weak area
    try {
      const isCorrect = rating >= 2;
      const topicName = card.topicName || 'Flashcard Review';
      const category = 'Flashcards';

      const updatedTopic = await updateTopicMastery(req.user.id, topicName, category, {
        isCorrect,
        notes: `Flashcard reviewed with rating ${rating}`,
      });

      // Extra: if user forgot (rating=0), force weak area flag regardless of score
      if (rating === 0 && updatedTopic) {
        updatedTopic.isWeakArea = true;
        await updatedTopic.save();
      }
    } catch (masteryErr) {
      // Mastery update is non-critical — log but don't fail the response
      console.warn('[Flashcard Review] Mastery update failed (non-fatal):', masteryErr.message);
    }

    res.json({
      success: true,
      card,
      nextReviewDate,
      interval: newInterval,
    });
  } catch (err) {
    console.error('[Flashcard Review Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to record review.' });
  }
});

/**
 * DELETE /api/flashcards/:id
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const card = await Flashcard.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!card) {
      return res.status(404).json({ success: false, message: 'Flashcard not found.' });
    }
    res.json({ success: true, message: 'Flashcard deleted.' });
  } catch (err) {
    console.error('[Flashcard Delete Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete flashcard.' });
  }
});

module.exports = router;
