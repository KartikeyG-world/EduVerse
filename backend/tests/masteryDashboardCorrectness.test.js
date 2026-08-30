const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const { validateIanaTimezone, getLocalDateString, getRecentDaysArray } = require('../utils/streak');
const { normalizeTopicName, isRevisionDue } = require('../utils/mastery');

describe('Dashboard & Mastery Engine Corrective Architecture Verification Suite', () => {

  // ──────────────────────────────────────────────────────────────────────────
  // 1. IANA Timezone Handling & DST Safety
  // ──────────────────────────────────────────────────────────────────────────
  describe('1. IANA Timezone Handling & Calendar Day Boundaries', () => {
    it('should validate valid IANA timezone identifiers accurately', () => {
      assert.strictEqual(validateIanaTimezone('Asia/Kolkata'), 'Asia/Kolkata');
      assert.strictEqual(validateIanaTimezone('America/New_York'), 'America/New_York');
      assert.strictEqual(validateIanaTimezone('Europe/London'), 'Europe/London');
      assert.strictEqual(validateIanaTimezone('Australia/Sydney'), 'Australia/Sydney');
    });

    it('should safely fall back to UTC for invalid, null, or non-string timezones', () => {
      assert.strictEqual(validateIanaTimezone(null), 'UTC');
      assert.strictEqual(validateIanaTimezone(undefined), 'UTC');
      assert.strictEqual(validateIanaTimezone('Invalid/Nonexistent_Timezone'), 'UTC');
      assert.strictEqual(validateIanaTimezone(12345), 'UTC');
    });

    it('should calculate local calendar day accurately across UTC midnight for late-night sessions', () => {
      // 2026-08-30 at 18:30 UTC = 2026-08-31 at 00:00 (midnight) in Asia/Kolkata (+05:30)
      const lateNightUtc = new Date('2026-08-30T18:45:00.000Z');
      
      const istDateStr = getLocalDateString(lateNightUtc, 'Asia/Kolkata');
      const utcDateStr = getLocalDateString(lateNightUtc, 'UTC');
      const nyDateStr = getLocalDateString(lateNightUtc, 'America/New_York');

      assert.strictEqual(istDateStr, '2026-08-31', 'In IST (+5:30), 18:45 UTC is already the next calendar day 2026-08-31');
      assert.strictEqual(utcDateStr, '2026-08-30', 'In UTC, 18:45 UTC is 2026-08-30');
      assert.strictEqual(nyDateStr, '2026-08-30', 'In New York (EDT -4:00), 18:45 UTC is 14:45 on 2026-08-30');
    });

    it('should generate a 7-day dense local calendar array in the target timezone', () => {
      const days = getRecentDaysArray(7, 'Asia/Kolkata');
      assert.strictEqual(days.length, 7);
      days.forEach(d => {
        assert.ok(d.date && /^\d{4}-\d{2}-\d{2}$/.test(d.date), 'Date must match YYYY-MM-DD');
        assert.ok(d.day && typeof d.day === 'string', 'Day must be a formatted weekday string');
      });
    });

    it('should verify routes/dashboard.js uses IANA timezone in Activity aggregation', () => {
      const dashboardRoutePath = path.resolve(__dirname, '../routes/dashboard.js');
      const content = fs.readFileSync(dashboardRoutePath, 'utf8');
      assert.ok(content.includes('validateIanaTimezone(req.headers[\'x-timezone\'])'), 'dashboard.js must validate x-timezone');
      assert.ok(content.includes('timezone: userTimezone'), 'dashboard.js must pass timezone to $dateToString');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Mastery Decoupling from Notes
  // ──────────────────────────────────────────────────────────────────────────
  describe('2. Notes Mastery Signal Decoupling', () => {
    it('should verify routes/notes.js does NOT call updateTopicMastery', () => {
      const notesRoutePath = path.resolve(__dirname, '../routes/notes.js');
      const content = fs.readFileSync(notesRoutePath, 'utf8');
      assert.ok(!content.includes('updateTopicMastery'), 'notes.js must not invoke updateTopicMastery');
      assert.ok(!content.includes("isCorrect: true"), 'notes.js must not pass isCorrect to mastery');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Canonical Topic Identity Normalization
  // ──────────────────────────────────────────────────────────────────────────
  describe('3. Canonical Topic Identity & Case/Whitespace Normalization', () => {
    it('should normalize topic names to lowercase trimmed canonical form', () => {
      assert.strictEqual(normalizeTopicName('  Binary Search  '), 'binary search');
      assert.strictEqual(normalizeTopicName('DYNAMIC PROGRAMMING'), 'dynamic programming');
      assert.strictEqual(normalizeTopicName('Graph Theory \n'), 'graph theory');
      assert.strictEqual(normalizeTopicName(null), '');
      assert.strictEqual(normalizeTopicName(undefined), '');
    });

    it('should map different casing and whitespace variations to the exact same canonical string', () => {
      const variations = [
        'Sorting Algorithms',
        'sorting algorithms',
        '  Sorting Algorithms  ',
        'SORTING ALGORITHMS',
        '\tsorting algorithms\n'
      ];
      const normalizedSet = new Set(variations.map(v => normalizeTopicName(v)));
      assert.strictEqual(normalizedSet.size, 1, 'All variations must produce exactly 1 canonical key');
      assert.strictEqual(normalizedSet.has('sorting algorithms'), true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Strict Revision Scheduling Logic
  // ──────────────────────────────────────────────────────────────────────────
  describe('4. Strict Revision Scheduling & isRevisionDue Single Source of Truth', () => {
    it('should return false for unassessed topic (nextRevisionDue is null)', () => {
      const topic = {
        topicName: 'Binary Trees',
        nextRevisionDue: null,
        correctAttempts: 0,
        wrongAttempts: 0
      };
      assert.strictEqual(isRevisionDue(topic, new Date()), false, 'Unassessed topic must never be revision due');
    });

    it('should return false if topic has 0 attempts even if nextRevisionDue is set', () => {
      const topic = {
        topicName: 'Binary Trees',
        nextRevisionDue: new Date(Date.now() - 10000), // in the past
        correctAttempts: 0,
        wrongAttempts: 0
      };
      assert.strictEqual(isRevisionDue(topic, new Date()), false, 'Topic with 0 attempts must not be revision due');
    });

    it('should return true if topic has completed assessments and nextRevisionDue is in past or now', () => {
      const topic = {
        topicName: 'Binary Trees',
        nextRevisionDue: new Date(Date.now() - 60000), // 1 min ago
        correctAttempts: 2,
        wrongAttempts: 0
      };
      assert.strictEqual(isRevisionDue(topic, new Date()), true, 'Assessed overdue topic must be revision due');
    });

    it('should return false if topic has completed assessments but nextRevisionDue is in the future', () => {
      const topic = {
        topicName: 'Binary Trees',
        nextRevisionDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days in future
        correctAttempts: 5,
        wrongAttempts: 1
      };
      assert.strictEqual(isRevisionDue(topic, new Date()), false, 'Assessed future topic must not be revision due');
    });

    it('should verify dashboard.js and mastery.js use isRevisionDue helper consistently', () => {
      const dashboardPath = path.resolve(__dirname, '../routes/dashboard.js');
      const masteryRoutePath = path.resolve(__dirname, '../routes/mastery.js');

      const dashContent = fs.readFileSync(dashboardPath, 'utf8');
      const masteryContent = fs.readFileSync(masteryRoutePath, 'utf8');

      assert.ok(dashContent.includes('isRevisionDue(t, now)'), 'dashboard.js must use isRevisionDue helper');
      assert.ok(masteryContent.includes('isRevisionDue(t, now)'), 'mastery.js must use isRevisionDue helper');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Multi-Source Evidence & Migration Tooling
  // ──────────────────────────────────────────────────────────────────────────
  describe('5. Multi-Source Evidence & Migration Safety', () => {
    it('should verify TopicMastery schema defines canonicalTopicName, categories, and bounded sources', () => {
      const modelPath = path.resolve(__dirname, '../models/TopicMastery.js');
      const content = fs.readFileSync(modelPath, 'utf8');

      assert.ok(content.includes('canonicalTopicName: {'), 'TopicMastery must define canonicalTopicName');
      assert.ok(content.includes('categories: {') || content.includes('categories: [String]'), 'TopicMastery must define categories array');
      assert.ok(content.includes('sources: {') || content.includes('sources: [{'), 'TopicMastery must define bounded sources array');
      assert.ok(content.includes('default: null'), 'TopicMastery nextRevisionDue must default to null');
    });

    it('should verify inspectTopicMasteryDuplicates and migrateTopicMastery scripts exist', () => {
      const inspectPath = path.resolve(__dirname, '../scripts/inspectTopicMasteryDuplicates.js');
      const migratePath = path.resolve(__dirname, '../scripts/migrateTopicMastery.js');

      assert.ok(fs.existsSync(inspectPath), 'inspectTopicMasteryDuplicates.js must exist');
      assert.ok(fs.existsSync(migratePath), 'migrateTopicMastery.js must exist');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Frontend Presentation & Navigation
  // ──────────────────────────────────────────────────────────────────────────
  describe('6. Frontend Presentation & Route Wiring', () => {
    it('should verify Deep Work hours formatting in Dashboard.jsx', () => {
      const dashboardPath = path.resolve(__dirname, '../../frontend/src/pages/Dashboard.jsx');
      const content = fs.readFileSync(dashboardPath, 'utf8');

      assert.ok(content.includes('stats.focusHours > 0 && stats.focusHours < 1'), 'Dashboard must format < 1 hr as minutes');
      assert.ok(content.includes('stats.focusHours * 60'), 'Dashboard must convert sub-hour focus time to minutes');
      assert.ok(content.includes('.toFixed(1)'), 'Dashboard must round >= 1 hr to 1 decimal place');
    });

    it('should verify MasteryOverview.jsx is wired to existing routes with interactive styles', () => {
      const overviewPath = path.resolve(__dirname, '../../frontend/src/components/dashboard/MasteryOverview.jsx');
      const content = fs.readFileSync(overviewPath, 'utf8');

      assert.ok(content.includes("navigate(card.path)"), 'MasteryOverview must navigate on card click');
      assert.ok(content.includes("'/analytics'"), 'MasteryOverview must reference /analytics');
      assert.ok(content.includes("'/flashcards/study'"), 'MasteryOverview must reference /flashcards/study');
      assert.ok(content.includes('cursor-pointer'), 'MasteryOverview cards must have cursor-pointer');
    });
  });

});
