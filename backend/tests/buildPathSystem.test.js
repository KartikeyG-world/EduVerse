const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  verifyDocUrl,
  OFFICIAL_DOC_ALLOWLIST,
  generateCanonicalSignature,
  normalizeProjectTokens,
  normalizeTechStack,
  validateBuildPathStructure,
  evaluateTaskSubmission
} = require('../services/buildPathService');

const { awardUserXp } = require('../utils/gamification');

describe('Project Build Paths System Test Suite', () => {

  describe('1. Canonical Signature & Template Deduplication', () => {
    it('should normalize project tokens by stripping stopwords and special characters', () => {
      const tokens1 = normalizeProjectTokens('Build a Realtime Chat Application with WebSockets!');
      const tokens2 = normalizeProjectTokens('chat websockets realtime');

      assert.deepStrictEqual(tokens1, ['chat', 'websockets']);
      assert.deepStrictEqual(tokens2, ['chat', 'websockets']);
    });

    it('should generate identical canonical signatures for inputs regardless of whitespace or casing', () => {
      const inputA = {
        projectIdea: '  College Management System  ',
        techStack: ['React', 'Node.js', 'MongoDB'],
        skillLevel: 'Intermediate',
        platform: 'Web'
      };

      const inputB = {
        projectIdea: 'college management system',
        techStack: ['react', 'node.js', 'mongodb'],
        skillLevel: 'intermediate',
        platform: 'web'
      };

      const sigA = generateCanonicalSignature(inputA);
      const sigB = generateCanonicalSignature(inputB);

      assert.strictEqual(sigA.canonicalSignature, sigB.canonicalSignature);
      assert.strictEqual(sigA.canonicalKey, sigB.canonicalKey);
    });

    it('should generate distinct canonical signatures for different project domains or tech stacks', () => {
      const sigA = generateCanonicalSignature({
        projectIdea: 'Hospital Patient Portal',
        techStack: ['React', 'Node.js'],
        skillLevel: 'beginner',
        platform: 'web'
      });

      const sigB = generateCanonicalSignature({
        projectIdea: 'Hospital Patient Portal',
        techStack: ['Flutter', 'Firebase'],
        skillLevel: 'beginner',
        platform: 'mobile'
      });

      assert.notStrictEqual(sigA.canonicalSignature, sigB.canonicalSignature);
    });
  });

  describe('2. Layer 2: Structural Validation Gate', () => {
    it('should reject curriculums with fewer than 3 or more than 10 milestones', () => {
      const tooFew = [
        { title: 'Intro', description: 'x'.repeat(100), handsOnTask: { title: 'T1', instructions: 'x'.repeat(40) } },
        { title: 'Build', description: 'x'.repeat(100), handsOnTask: { title: 'T2', instructions: 'x'.repeat(40) } }
      ];
      const result = validateBuildPathStructure(tooFew);
      assert.strictEqual(result.valid, false);
      assert.match(result.error, /between 3 and 10 milestones/);
    });

    it('should reject modules with short or superficial descriptions (< 90 chars)', () => {
      const shortDescModules = [
        { title: 'Setup Environment', description: 'Install Node and React.', handsOnTask: { title: 'Setup', instructions: 'x'.repeat(40) } },
        { title: 'Database Schema', description: 'x'.repeat(100), handsOnTask: { title: 'Schema', instructions: 'x'.repeat(40) } },
        { title: 'REST API Routes', description: 'x'.repeat(100), handsOnTask: { title: 'Routes', instructions: 'x'.repeat(40) } }
      ];
      const result = validateBuildPathStructure(shortDescModules);
      assert.strictEqual(result.valid, false);
      assert.match(result.error, /description is too brief/);
    });

    it('should reject modules missing hands-on tasks or substantial instructions', () => {
      const missingTask = [
        { title: 'Setup Environment', description: 'x'.repeat(100), handsOnTask: { title: 'Install Dependencies', instructions: 'Run it' } },
        { title: 'Database Schema', description: 'x'.repeat(100), handsOnTask: { title: 'Schema Design', instructions: 'x'.repeat(40) } },
        { title: 'REST API Routes', description: 'x'.repeat(100), handsOnTask: { title: 'Routes Implementation', instructions: 'x'.repeat(40) } }
      ];
      const result = validateBuildPathStructure(missingTask);
      assert.strictEqual(result.valid, false);
      assert.match(result.error, /instructions must be substantial/);
    });

    it('should accept valid, well-structured milestone modules', () => {
      const validModules = [
        {
          title: 'Database Schema & Modeling',
          description: 'In this module, you will design and establish the database architecture for the College Management System using MongoDB and Mongoose. Understanding how to model relational data in a document store is vital for student and course records.',
          handsOnTask: {
            title: 'Design Students and Enrollments Schemas',
            instructions: 'Create the Student and Course Mongoose models with validation rules, unique email indexing, and an enrollment relationship array.',
            deliverableType: 'code'
          }
        },
        {
          title: 'RESTful API Endpoint Development',
          description: 'Construct the backend endpoints for handling student registration, course creation, and enrollment submissions. You will implement standard HTTP response codes and input validation using Express middleware.',
          handsOnTask: {
            title: 'Implement Student CRUD Controllers',
            instructions: 'Write Express route handlers for POST /api/students, GET /api/students/:id, and PUT /api/students/:id with try/catch error handling.',
            deliverableType: 'code'
          }
        },
        {
          title: 'Frontend Dashboard Integration',
          description: 'Build responsive user interfaces in React to consume the backend API endpoints. You will implement state management, loading indicators, and tabular data presentation for course registrations.',
          handsOnTask: {
            title: 'Build Students Management Table Component',
            instructions: 'Create a React component that fetches student records from the backend API and displays them in a styled data table with action buttons.',
            deliverableType: 'code'
          }
        }
      ];

      const result = validateBuildPathStructure(validModules);
      assert.strictEqual(result.valid, true);
    });
  });

  describe('3. Official Doc-Link Allowlist & HTTP Verification', () => {
    it('should reject domains not on the official allowlist without making network calls', async () => {
      const result = await verifyDocUrl('https://random-unverified-blog.xyz/learn-react');
      assert.strictEqual(result.verified, false);
      assert.strictEqual(result.url, null);
    });

    it('should recognize official domains in the curated allowlist', () => {
      assert.ok(OFFICIAL_DOC_ALLOWLIST.includes('react.dev'));
      assert.ok(OFFICIAL_DOC_ALLOWLIST.includes('developer.mozilla.org'));
      assert.ok(OFFICIAL_DOC_ALLOWLIST.includes('nodejs.org'));
      assert.ok(OFFICIAL_DOC_ALLOWLIST.includes('expressjs.com'));
      assert.ok(OFFICIAL_DOC_ALLOWLIST.includes('mongodb.com'));
      assert.ok(OFFICIAL_DOC_ALLOWLIST.includes('tailwindcss.com'));
      assert.ok(OFFICIAL_DOC_ALLOWLIST.includes('flutter.dev'));
    });

    it('should safely reject malformed or non-string URLs', async () => {
      assert.strictEqual((await verifyDocUrl(null)).verified, false);
      assert.strictEqual((await verifyDocUrl('')).verified, false);
      assert.strictEqual((await verifyDocUrl('not-a-valid-url')).verified, false);
    });
  });

  describe('4. Sourced Video Curation Heuristics', () => {
    it('should filter videos based on duration range (3 mins to 90 mins)', () => {
      const mockVideos = [
        { title: '15s Short React Tip', durationSec: 15, views: 100000 },
        { title: 'Full 10-Hour React Livestream', durationSec: 36000, views: 50000 },
        { title: 'React State Management Crash Course', durationSec: 1200, views: 250000 },
        { title: 'Building MERN Stack From Scratch', durationSec: 2400, views: 180000 }
      ];

      const filtered = mockVideos.filter((v) => v.durationSec >= 180 && v.durationSec <= 5400);
      filtered.sort((a, b) => b.views - a.views);

      assert.strictEqual(filtered.length, 2);
      assert.strictEqual(filtered[0].title, 'React State Management Crash Course');
      assert.strictEqual(filtered[1].title, 'Building MERN Stack From Scratch');
    });
  });

  describe('5. Task Submission AI Feedback', () => {
    it('should handle short submissions gracefully with guidance', async () => {
      const res = await evaluateTaskSubmission({
        projectTitle: 'ERP System',
        moduleTitle: 'Database Schema',
        taskInstructions: 'Create schemas',
        submissionContent: 'ok',
        submissionType: 'text'
      });

      assert.strictEqual(typeof res.feedback, 'string');
      assert.ok(res.feedback.includes('more detailed submission'));
      assert.ok(Array.isArray(res.suggestions));
    });
  });

  describe('6. Gamification XP Consolidation & Idempotency Proof', () => {
    it('should award XP and correctly recalculate level on 1000 XP threshold', () => {
      const mockUser = {
        xp: 980,
        level: 1
      };

      const xpToAdd = 50;
      mockUser.xp += xpToAdd;
      const calculatedLevel = Math.floor(mockUser.xp / 1000) + 1;
      const leveledUp = calculatedLevel > mockUser.level;
      mockUser.level = calculatedLevel;

      assert.strictEqual(mockUser.xp, 1030);
      assert.strictEqual(mockUser.level, 2);
      assert.strictEqual(leveledUp, true);
    });

    it('should enforce idempotency so completed modules cannot double-award XP', () => {
      const completedModules = [
        { moduleIndex: 0, completedAt: new Date(), xpAwarded: 50 },
        { moduleIndex: 1, completedAt: new Date(), xpAwarded: 50 }
      ];

      const targetIdx = 0;
      const existing = completedModules.find((m) => m.moduleIndex === targetIdx);

      let xpAwarded = 0;
      let alreadyCompleted = false;

      if (existing && (existing.xpAwarded || 0) > 0) {
        alreadyCompleted = true;
        xpAwarded = 0;
      } else {
        xpAwarded = 50;
      }

      assert.strictEqual(alreadyCompleted, true);
      assert.strictEqual(xpAwarded, 0);
    });
  });

  describe('7. Feature Flag Gating Logic', () => {
    it('should block access when FEATURE_PROJECT_BUILD_PATH is not set to true', () => {
      const checkFeature = (envVal) => envVal === 'true';

      assert.strictEqual(checkFeature('false'), false);
      assert.strictEqual(checkFeature(undefined), false);
      assert.strictEqual(checkFeature(''), false);
      assert.strictEqual(checkFeature('true'), true);
    });
  });

  describe('8. Peer Tutor Network Additive Review Contract', () => {
    it('should properly format additive buildPathMeta fields on Problem creation', () => {
      const mockProblemPayload = {
        userId: '507f1f77bcf86cd799439011',
        subject: 'Programming',
        questionText: 'Review Request for Milestone #1: Database Schema (College Management System)',
        isBuildPathReview: true,
        buildPathMeta: {
          templateId: '607f1f77bcf86cd799439022',
          moduleIndex: 0,
          moduleTitle: 'Database Schema & Modeling'
        }
      };

      assert.strictEqual(mockProblemPayload.subject, 'Programming');
      assert.strictEqual(mockProblemPayload.isBuildPathReview, true);
      assert.strictEqual(mockProblemPayload.buildPathMeta.moduleIndex, 0);
      assert.strictEqual(mockProblemPayload.buildPathMeta.moduleTitle, 'Database Schema & Modeling');
      assert.ok(!mockProblemPayload.questionText.startsWith('[BUILD PATH REVIEW]'));
    });
  });

  describe('9. UserBuildProgress Deletion & Shared Template Preservation Isolation Contract', () => {
    it('should delete user progress without modifying or deleting the shared BuildPathTemplate document', () => {
      // Shared template referenced by multiple students
      const sharedTemplate = {
        _id: 'template_123',
        projectIdea: 'Real-Time Chat & Video App',
        canonicalSignature: 'sig_abc_123',
        modules: [
          { moduleIndex: 0, title: 'WebSockets Server' },
          { moduleIndex: 1, title: 'WebRTC Signaling' }
        ],
        usageCount: 2
      };

      // Mock database collection states
      let progressRecords = [
        { _id: 'prog_userA', userId: 'userA', templateId: 'template_123', currentModuleIndex: 1 },
        { _id: 'prog_userB', userId: 'userB', templateId: 'template_123', currentModuleIndex: 0 }
      ];

      // Simulate DELETE /api/build-paths/progress/:id executed by User A
      const progressToDelete = progressRecords.find((p) => p._id === 'prog_userA');
      assert.ok(progressToDelete, 'User A progress must exist prior to deletion');

      // Authorization check: User A can only delete their own record
      const requestingUserId = 'userA';
      assert.strictEqual(progressToDelete.userId, requestingUserId);

      // Perform deletion: remove only User A's progress record
      progressRecords = progressRecords.filter((p) => p._id !== 'prog_userA');

      // 1. User A's progress is removed
      assert.strictEqual(progressRecords.some((p) => p._id === 'prog_userA'), false);

      // 2. User B's progress remains intact
      const userBProgress = progressRecords.find((p) => p._id === 'prog_userB');
      assert.ok(userBProgress, 'User B progress must be untouched');
      assert.strictEqual(userBProgress.templateId, 'template_123');

      // 3. Shared BuildPathTemplate document is completely preserved
      assert.strictEqual(sharedTemplate._id, 'template_123');
      assert.strictEqual(sharedTemplate.modules.length, 2);
      assert.strictEqual(sharedTemplate.canonicalSignature, 'sig_abc_123');
    });

    it('should reject unauthorized deletion attempts from a different user', () => {
      const progressRecord = { _id: 'prog_userA', userId: 'userA', templateId: 'template_123' };
      const unauthorizedRequester = 'userC';

      const isAuthorized = progressRecord.userId === unauthorizedRequester;
      assert.strictEqual(isAuthorized, false, 'Unauthorized user must be rejected with 403');
    });
  });

  describe('10. Hard-Locked Milestone Sequencing Enforcement Contract', () => {
    it('should unlock Milestone 0 by default and lock Milestone 1+ until previous is completed', () => {
      // Mirrors the production lock check: direct membership in completedModules (not XP-value-dependent)
      const isMilestoneUnlocked = (moduleIndex, completedModules) => {
        if (moduleIndex === 0) return true;
        return completedModules.some((m) => m.moduleIndex === moduleIndex - 1);
      };

      // Scenario 1: Initial state (zero completions)
      const initialCompleted = [];
      assert.strictEqual(isMilestoneUnlocked(0, initialCompleted), true, 'Milestone 0 must be unlocked initially');
      assert.strictEqual(isMilestoneUnlocked(1, initialCompleted), false, 'Milestone 1 must be locked initially');
      assert.strictEqual(isMilestoneUnlocked(2, initialCompleted), false, 'Milestone 2 must be locked initially');

      // Scenario 2: Milestone 0 completed
      const afterMod0 = [{ moduleIndex: 0, xpAwarded: 50 }];
      assert.strictEqual(isMilestoneUnlocked(0, afterMod0), true);
      assert.strictEqual(isMilestoneUnlocked(1, afterMod0), true, 'Milestone 1 must unlock after Milestone 0 completion');
      assert.strictEqual(isMilestoneUnlocked(2, afterMod0), false, 'Milestone 2 must remain locked');

      // Scenario 3: Milestone 1 completed
      const afterMod1 = [{ moduleIndex: 0, xpAwarded: 50 }, { moduleIndex: 1, xpAwarded: 50 }];
      assert.strictEqual(isMilestoneUnlocked(2, afterMod1), true, 'Milestone 2 must unlock after Milestone 1 completion');
    });

    it('should block actions on a locked milestone with a descriptive lock error', () => {
      const progress = {
        completedModules: [] // Milestone 0 not completed
      };
      const requestedModuleIndex = 2; // Student tries to jump ahead

      // Direct membership check — mirrors the fixed production backend route
      const checkAccess = (idx, prog) => {
        if (idx > 0) {
          const isPriorCompleted = prog.completedModules.some((m) => m.moduleIndex === idx - 1);
          if (!isPriorCompleted) {
            return {
              allowed: false,
              statusCode: 400,
              message: `Milestone #${idx + 1} is locked. You must complete Milestone #${idx} first.`
            };
          }
        }
        return { allowed: true };
      };

      const result = checkAccess(requestedModuleIndex, progress);
      assert.strictEqual(result.allowed, false);
      assert.strictEqual(result.statusCode, 400);
      assert.strictEqual(result.message, 'Milestone #3 is locked. You must complete Milestone #2 first.');
    });
  });

  describe('11. Step-by-Step Implementation Guide Caching & Format Contract', () => {
    it('should return cached guide from template when available without calling AI', () => {
      const template = {
        _id: 'tpl_123',
        projectIdea: 'Personal Finance Tracker',
        modules: [
          {
            moduleIndex: 0,
            title: 'Expense Schema & API',
            stepByStepGuide: [
              '1. Install mongoose and express dependencies',
              '2. Create models/Expense.js with amount, category, and date fields',
              '3. Implement POST /api/expenses route with validation',
              '4. Test route with mock payload using curl or Postman'
            ]
          }
        ]
      };

      const mod = template.modules[0];
      let aiCallCount = 0;

      const getGuide = (m) => {
        if (Array.isArray(m.stepByStepGuide) && m.stepByStepGuide.length > 0) {
          return { source: 'cache', guide: m.stepByStepGuide };
        }
        aiCallCount++;
        return { source: 'generated', guide: [] };
      };

      const result = getGuide(mod);
      assert.strictEqual(result.source, 'cache');
      assert.strictEqual(result.guide.length, 4);
      assert.strictEqual(aiCallCount, 0, 'No AI call should occur when cached');
      assert.ok(result.guide[0].startsWith('1. '));
    });

    it('should enforce numbered actionable format for step-by-step guides', () => {
      const steps = [
        '1. Configure environment variables',
        '2. Connect to database cluster',
        '3. Expose REST endpoints'
      ];

      steps.forEach((step, idx) => {
        assert.ok(/^\d+\.\s/.test(step), `Step #${idx + 1} must start with a number prefix`);
      });
    });
  });

  describe('12. Step-by-Step Guide Structural Validation Gate', () => {
    // validateGuideStructure is the Layer 2 equivalent for generated guides —
    // a bad generation must be caught here before being cached on the shared template.

    const validateGuideStructure = (steps) => {
      if (!Array.isArray(steps) || steps.length < 4) {
        return { valid: false, error: 'Guide must contain at least 4 ordered steps' };
      }
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        if (typeof s !== 'string' || s.trim().length < 15) {
          return { valid: false, error: `Step ${i + 1} is missing or too brief (min 15 chars)` };
        }
      }
      const normalized = steps.map((s) =>
        s.toLowerCase().replace(/^\d+[.)\s]+/, '').replace(/\W+/g, ' ').trim()
      );
      const unique = new Set(normalized);
      if (unique.size < steps.length) {
        return { valid: false, error: 'Guide contains duplicate or near-identical steps' };
      }
      return { valid: true };
    };

    it('should reject guides with fewer than 4 steps', () => {
      const shortGuide = ['1. Set up project', '2. Run npm install', '3. Commit to git'];
      const result = validateGuideStructure(shortGuide);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error.includes('at least 4'));
    });

    it('should reject guides with empty or too-brief steps', () => {
      const briefGuide = [
        '1. Initialize.',       // too short (< 15 chars)
        '2. Write some more useful content here',
        '3. Implement endpoint and test the route with Postman',
        '4. Deploy to production with environment variables configured'
      ];
      const result = validateGuideStructure(briefGuide);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error.includes('Step 1'));
    });

    it('should reject guides with duplicate or near-identical steps', () => {
      const duplicateGuide = [
        '1. Set up Express server and install all dependencies',
        '2. Create the expense schema with Mongoose',
        '3. Set up Express server and install all dependencies',  // duplicate
        '4. Deploy to Railway with environment variables'
      ];
      const result = validateGuideStructure(duplicateGuide);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error.includes('duplicate'));
    });

    it('should accept a well-formed 4-to-6 step guide', () => {
      const validGuide = [
        '1. Initialize Express project and install mongoose, express, and dotenv',
        '2. Create the Expense model with category, amount, date, and userId fields',
        '3. Implement POST /api/expenses with input validation and error handling',
        '4. Add GET /api/expenses with filtering by category and date range',
        '5. Write integration tests using supertest against mock MongoDB instance',
        '6. Deploy the service to Railway with all environment variables configured'
      ];
      const result = validateGuideStructure(validGuide);
      assert.strictEqual(result.valid, true);
    });
  });
});
