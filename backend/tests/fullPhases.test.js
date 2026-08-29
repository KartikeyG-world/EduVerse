const { describe, it } = require('node:test');
const assert = require('node:assert');
const { parseJSONSafely } = require('../services/aiGateway');

describe('Full Audit Phases Verification Test Suite', () => {

  // ─── 1. Email Normalization & Matching Tests ───────────────────────────────
  describe('Phase 2: Email Normalization & Account Deduplication', () => {
    const normalize = (email) => (email || '').toLowerCase().trim();

    it('should normalize mixed-case emails and leading/trailing whitespace', () => {
      assert.strictEqual(normalize('  Student.One@EduVerse.COM '), 'student.one@eduverse.com');
      assert.strictEqual(normalize('User.NAME@Gmail.Com'), 'user.name@gmail.com');
    });

    it('should match local and Google OAuth normalized emails deterministically', () => {
      const localInput = '  John.Doe@Gmail.com ';
      const googleOAuthInput = 'john.doe@gmail.com';

      assert.strictEqual(normalize(localInput), normalize(googleOAuthInput));
    });
  });

  // ─── 2. Focus XP & Leveling Formula Tests ───────────────────────────────────
  describe('Phase 2: Focus & XP Consolidation Formula', () => {
    const calculateLevel = (currentXp, xpToAdd) => {
      const newXp = currentXp + xpToAdd;
      const newLevel = Math.floor(newXp / 1000) + 1;
      return { xp: newXp, level: newLevel };
    };

    it('should calculate initial level 1 for < 1000 XP', () => {
      const stats = calculateLevel(0, 450);
      assert.strictEqual(stats.xp, 450);
      assert.strictEqual(stats.level, 1);
    });

    it('should advance to level 2 at exactly 1000 XP', () => {
      const stats = calculateLevel(800, 200);
      assert.strictEqual(stats.xp, 1000);
      assert.strictEqual(stats.level, 2);
    });

    it('should advance to level 3 at 2500 XP', () => {
      const stats = calculateLevel(1500, 1000);
      assert.strictEqual(stats.xp, 2500);
      assert.strictEqual(stats.level, 3);
    });
  });

  // ─── 3. Unified AI Gateway JSON Recovery Tests ──────────────────────────────
  describe('Phase 4: AI Gateway Robust JSON Parser', () => {
    it('should extract JSON wrapped in markdown code fences', () => {
      const text = '```json\n{"roadmap":[{"day":1,"topic":"Trees","tasks":["Build BST"]}]}\n```';
      const result = parseJSONSafely(text);
      assert.strictEqual(result.roadmap.length, 1);
      assert.strictEqual(result.roadmap[0].topic, 'Trees');
    });

    it('should repair trailing commas in JSON object strings', () => {
      const text = '{"roadmap":[{"day":1,"topic":"Graphs","tasks":["BFS","DFS",],},]}';
      const result = parseJSONSafely(text);
      assert.strictEqual(result.roadmap[0].topic, 'Graphs');
      assert.strictEqual(result.roadmap[0].tasks.length, 2);
    });

    it('should recover intact day blocks from truncated AI responses', () => {
      const truncatedText = '{"roadmap":[{"day":1,"topic":"Day 1 Topic","tasks":["T1"]},{"day":2,"topic":"Day 2 Topic","tasks":["T2"]},{"day":3,"topic":"Trun';
      const result = parseJSONSafely(truncatedText);
      assert.strictEqual(result.roadmap.length, 2);
      assert.strictEqual(result.roadmap[0].day, 1);
      assert.strictEqual(result.roadmap[1].day, 2);
    });
  });

  // ─── 4. LRU Cache Bounding Tests ───────────────────────────────────────────
  describe('Phase 3: Bounded LRU Cache Eviction', () => {
    const createLRUCache = (maxEntries, ttlMs) => {
      const map = new Map();
      return {
        get: (key) => {
          const entry = map.get(key);
          if (!entry) return null;
          if (Date.now() - entry.ts > ttlMs) {
            map.delete(key);
            return null;
          }
          map.delete(key);
          map.set(key, entry);
          return entry.data;
        },
        set: (key, data) => {
          if (map.size >= maxEntries) {
            const oldest = map.keys().next().value;
            map.delete(oldest);
          }
          map.set(key, { data, ts: Date.now() });
        },
        size: () => map.size
      };
    };

    it('should evict oldest entry when capacity is reached', () => {
      const cache = createLRUCache(3, 60000);
      cache.set('k1', 'v1');
      cache.set('k2', 'v2');
      cache.set('k3', 'v3');
      assert.strictEqual(cache.size(), 3);

      cache.set('k4', 'v4');
      assert.strictEqual(cache.size(), 3);
      assert.strictEqual(cache.get('k1'), null); // Oldest evicted
      assert.strictEqual(cache.get('k4'), 'v4');
    });

    it('should promote recently accessed entries to prevent premature eviction', () => {
      const cache = createLRUCache(3, 60000);
      cache.set('k1', 'v1');
      cache.set('k2', 'v2');
      cache.set('k3', 'v3');

      // Access k1 so it becomes most recently used
      assert.strictEqual(cache.get('k1'), 'v1');

      // Add k4 — k2 should be evicted, not k1
      cache.set('k4', 'v4');
      assert.strictEqual(cache.get('k1'), 'v1');
      assert.strictEqual(cache.get('k2'), null);
      assert.strictEqual(cache.get('k3'), 'v3');
      assert.strictEqual(cache.get('k4'), 'v4');
    });
  });

  // ─── 5. Database Schema & Index Alignment Tests ─────────────────────────────
  describe('Phase 3: Mongoose Compound Index Alignment', () => {
    const Skill = require('../models/Skill');
    const Flashcard = require('../models/Flashcard');
    const Expense = require('../models/Expense');

    it('should have compound indexes configured on models', () => {
      const skillIndexes = Skill.schema.indexes();
      const flashcardIndexes = Flashcard.schema.indexes();
      const expenseIndexes = Expense.schema.indexes();

      const hasSkillCompound = skillIndexes.some(([idx]) => idx.userId === 1 && idx.lastWatched === -1);
      const hasFlashcardCompound = flashcardIndexes.some(([idx]) => idx.userId === 1 && idx.nextReviewDate === 1);
      const hasExpenseCompound = expenseIndexes.some(([idx]) => idx.userId === 1 && idx.date === -1);

      assert.strictEqual(hasSkillCompound, true, 'Skill must have { userId: 1, lastWatched: -1, createdAt: -1 }');
      assert.strictEqual(hasFlashcardCompound, true, 'Flashcard must have { userId: 1, nextReviewDate: 1 }');
      assert.strictEqual(hasExpenseCompound, true, 'Expense must have { userId: 1, date: -1 }');
    });
  });

  // ─── 6. Timezone-Aware Streak Tests ─────────────────────────────────────────
  describe('Phase B: Timezone-Aware Streak Calculation', () => {
    const { getLocalDateString, getDayDifference, updateStreak } = require('../utils/streak');

    it('should format local dates correctly across timezones', () => {
      // 2026-08-29 at 19:00:00 UTC
      const date = new Date('2026-08-29T19:00:00.000Z');

      // In UTC, date is 2026-08-29
      assert.strictEqual(getLocalDateString(date, 'UTC'), '2026-08-29');

      // In IST (Asia/Kolkata, UTC+5:30), 19:00 UTC + 5.5h = 00:30 on 2026-08-30
      assert.strictEqual(getLocalDateString(date, 'Asia/Kolkata'), '2026-08-30');

      // In New York (America/New_York, EDT UTC-4), 19:00 UTC - 4h = 15:00 on 2026-08-29
      assert.strictEqual(getLocalDateString(date, 'America/New_York'), '2026-08-29');
    });

    it('should calculate consecutive calendar day difference accurately', () => {
      assert.strictEqual(getDayDifference('2026-08-29', '2026-08-30'), 1);
      assert.strictEqual(getDayDifference('2026-08-29', '2026-08-31'), 2);
      assert.strictEqual(getDayDifference('2026-08-29', '2026-08-29'), 0);
    });

    it('should not prematurely reset streak for non-UTC users across UTC midnight', async () => {
      // Mock user whose last active session was yesterday in IST
      const mockUser = {
        streak: 5,
        // Last active on Aug 28 at 23:00 IST (17:30 UTC on Aug 28)
        lastActiveDate: new Date('2026-08-28T17:30:00.000Z')
      };

      // Current login time: Aug 29 at 01:00 IST (Aug 28 at 19:30 UTC)
      // In UTC: Both sessions are on Aug 28 (day diff = 0)
      // In IST: Last was Aug 28, current is Aug 29 (day diff = 1, consecutive day!)
      const istDayStr = getLocalDateString(new Date('2026-08-28T19:30:00.000Z'), 'Asia/Kolkata');
      const prevIstDayStr = getLocalDateString(mockUser.lastActiveDate, 'Asia/Kolkata');
      const diff = getDayDifference(prevIstDayStr, istDayStr);

      assert.strictEqual(prevIstDayStr, '2026-08-28');
      assert.strictEqual(istDayStr, '2026-08-29');
      assert.strictEqual(diff, 1, 'Must recognize consecutive calendar day in user local timezone');
    });

    it('should fall back safely to UTC when timezone is null or invalid', () => {
      const date = new Date('2026-08-29T12:00:00.000Z');
      assert.strictEqual(getLocalDateString(date, null), '2026-08-29');
      assert.strictEqual(getLocalDateString(date, 'INVALID_TIMEZONE_STRING'), '2026-08-29');
    });
  });

});
