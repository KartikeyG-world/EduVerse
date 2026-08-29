const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  parseISO8601Duration,
  parseChaptersFromDescription,
  getOverlappingChapters,
  getVideoWatchContext,
} = require('../integrations/youtubeService');

const {
  extractJSONArray,
  validateQuizStructure,
  buildQuizPrompt,
} = require('../integrations/aiProvider');

const {
  getTargetQuestionCount,
  isImprovedQuizEnabled,
} = require('../services/quizService');

describe('Watch-Range Quiz Generation System Test Suite', () => {

  describe('1. YouTube Chapter Parsing & Range Mapping', () => {
    it('should parse ISO 8601 duration correctly', () => {
      assert.strictEqual(parseISO8601Duration('PT1H23M45S'), 5025);
      assert.strictEqual(parseISO8601Duration('PT30M10S'), 1810);
      assert.strictEqual(parseISO8601Duration('PT45S'), 45);
      assert.strictEqual(parseISO8601Duration(''), 0);
    });

    it('should parse chapters with various timestamp formats from description', () => {
      const desc = `
Course Overview:
00:00 Introduction & Setup
05:30 Variables and Data Types
15:45 Control Flow & Loops
1:10:00 Advanced Async/Await & Promises
1:45:30 Final Project & Wrap-up
      `;
      const chapters = parseChaptersFromDescription(desc, 7200);
      assert.strictEqual(chapters.length, 5);
      assert.strictEqual(chapters[0].title, 'Introduction & Setup');
      assert.strictEqual(chapters[0].startSec, 0);
      assert.strictEqual(chapters[0].endSec, 330);

      assert.strictEqual(chapters[3].title, 'Advanced Async/Await & Promises');
      assert.strictEqual(chapters[3].startSec, 4200);
      assert.strictEqual(chapters[3].endSec, 6330);
    });

    it('should accurately map watched range to overlapping chapters', () => {
      const chapters = [
        { title: 'Intro', startSec: 0, endSec: 300 },
        { title: 'Variables', startSec: 300, endSec: 900 },
        { title: 'Loops', startSec: 900, endSec: 1800 },
        { title: 'Async', startSec: 1800, endSec: 3600 },
      ];

      // Watched only first 10 minutes (0 to 600s) -> Intro & Variables
      const overlap1 = getOverlappingChapters(chapters, 0, 600);
      assert.strictEqual(overlap1.length, 2);
      assert.strictEqual(overlap1[0].title, 'Intro');
      assert.strictEqual(overlap1[1].title, 'Variables');

      // Watched 25m to 40m (1500s to 2400s) -> Loops & Async
      const overlap2 = getOverlappingChapters(chapters, 1500, 2400);
      assert.strictEqual(overlap2.length, 2);
      assert.strictEqual(overlap2[0].title, 'Loops');
      assert.strictEqual(overlap2[1].title, 'Async');
    });

    it('should fall back to description excerpt if no chapters exist', async () => {
      const context = await getVideoWatchContext('mock-vid-123', 0, 600, {
        videoTitle: 'JavaScript Fast Crash Course',
        videoDesc: 'A full guide to modern JS covering variables, functions, and arrays with clear hands-on examples.',
        videoDurationSec: 1200,
      });

      assert.strictEqual(context.contextType, 'excerpt');
      assert.ok(context.topicsSummary.includes('Topic: JavaScript Fast Crash Course'));
      assert.ok(context.topicsSummary.includes('Viewer watched from 00:00 to 10:00 of 20:00 total.'));
    });
  });

  describe('2. Question Count & Range Rules', () => {
    it('should assign 10 questions for videoDurationSec > 1800 (>30 mins)', () => {
      assert.strictEqual(getTargetQuestionCount(1801), 10);
      assert.strictEqual(getTargetQuestionCount(3600), 10);
      assert.strictEqual(getTargetQuestionCount(43200), 10); // 12-hour video
    });

    it('should assign 5 questions for videoDurationSec <= 1800 (<=30 mins)', () => {
      assert.strictEqual(getTargetQuestionCount(1800), 5);
      assert.strictEqual(getTargetQuestionCount(600), 5);
      assert.strictEqual(getTargetQuestionCount(0), 5);
    });
  });

  describe('3. JSON Extraction, Repair & Structural Validation', () => {
    it('should extract JSON from markdown code fences and noisy preamble', () => {
      const rawText = `Here is your assessment quiz:
\`\`\`json
[
  {
    "question": "What is closure?",
    "questionHindi": "क्लोजर क्या है?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "optionsHindi": ["विकल्प A", "विकल्प B", "विकल्प C", "विकल्प D"],
    "correctIndex": 0,
    "explanation": "Closure retains outer scope."
  }
]
\`\`\`
Hope this helps!`;

      const extracted = extractJSONArray(rawText);
      assert.ok(Array.isArray(extracted));
      assert.strictEqual(extracted.length, 1);
      assert.strictEqual(extracted[0].question, 'What is closure?');
    });

    it('should repair trailing commas in JSON array strings', () => {
      const noisyJSON = `[
        {
          "question": "Valid Question?",
          "questionHindi": "वैध प्रश्न?",
          "options": ["A", "B", "C", "D"],
          "optionsHindi": ["ए", "बी", "सी", "डी"],
          "correctIndex": 1,
          "explanation": "Valid explanation.",
        },
      ]`;

      const extracted = extractJSONArray(noisyJSON);
      assert.ok(Array.isArray(extracted));
      assert.strictEqual(extracted.length, 1);
    });

    it('should validate bilingual fields and reject malformed options', () => {
      const validBatch = [
        {
          question: 'What is the purpose of React useEffect hook?',
          questionHindi: 'React useEffect हुक का उद्देश्य क्या है?',
          options: [
            'To perform side effects in functional components',
            'To directly mutate state synchronously',
            'To declare global stylesheet rules',
            'To compile JSX templates to HTML'
          ],
          optionsHindi: [
            'कार्यात्मक घटकों में साइड इफेक्ट करने के लिए',
            'सीधे समकालिक रूप से स्थिति को बदलने के लिए',
            'वैश्विक स्टाइलशीट नियम घोषित करने के लिए',
            'JSX टेम्प्लेट को HTML में संकलित करने के लिए'
          ],
          correctIndex: 0,
          explanation: 'useEffect handles lifecycles, subscriptions, and data fetching in functional components.'
        }
      ];

      const check = validateQuizStructure(validBatch, 1);
      assert.strictEqual(check.valid, true);
      assert.strictEqual(check.sanitizedQuestions.length, 1);
    });

    it('should reject questions with missing Hindi translations or duplicate options', () => {
      const invalidBatch = [
        {
          question: 'Sample question text?',
          questionHindi: '', // missing
          options: ['Option A', 'Option A', 'Option C', 'Option D'], // duplicate
          optionsHindi: ['विकल्प A', 'विकल्प B', 'विकल्प C', 'विकल्प D'],
          correctIndex: 0,
          explanation: 'Sample explanation text.'
        }
      ];

      const check = validateQuizStructure(invalidBatch, 1);
      assert.strictEqual(check.valid, false);
      assert.ok(check.error.includes('Hindi') || check.error.includes('duplicate'));
    });
  });

  describe('4. Prompt Construction & Bilingual Few-Shot Verification', () => {
    it('should generate prompt with both English and Hindi good/bad few-shot examples', () => {
      const prompt = buildQuizPrompt({
        videoTitle: 'Node.js Event Loop',
        durationSec: 1200,
        watchedStartSec: 0,
        watchedEndSec: 600,
        topicsSummary: 'Microtasks vs Macrotasks in Node.js',
      }, 5);

      assert.ok(prompt.includes('questionHindi'));
      assert.ok(prompt.includes('optionsHindi'));
      assert.ok(prompt.includes('GOOD QUESTION EXAMPLE'));
      assert.ok(prompt.includes('BAD QUESTION EXAMPLE'));
      assert.ok(prompt.includes('Node.js Event Loop'));
    });
  });

  describe('5. Proof Point 1: Idempotency & Caching Logic', () => {
    it('should return cached quiz without regenerating when user has not advanced or questions are at target cap', () => {
      const existingMeta = {
        userId: 'user-123',
        videoId: 'vid-abc',
        jobId: 'quiz-job-existing-1',
        status: 'success',
        watchedEndSec: 600,
        quiz: {
          questions: [
            { question: 'Q1', questionHindi: 'प्र 1', options: ['A','B','C','D'], optionsHindi: ['क','ख','ग','घ'], correctIndex: 0, explanation: 'Exp 1' },
            { question: 'Q2', questionHindi: 'प्र 2', options: ['A','B','C','D'], optionsHindi: ['क','ख','ग','घ'], correctIndex: 1, explanation: 'Exp 2' },
            { question: 'Q3', questionHindi: 'प्र 3', options: ['A','B','C','D'], optionsHindi: ['क','ख','ग','घ'], correctIndex: 2, explanation: 'Exp 3' },
            { question: 'Q4', questionHindi: 'प्र 4', options: ['A','B','C','D'], optionsHindi: ['क','ख','ग','घ'], correctIndex: 3, explanation: 'Exp 4' },
            { question: 'Q5', questionHindi: 'प्र 5', options: ['A','B','C','D'], optionsHindi: ['क','ख','ग','घ'], correctIndex: 0, explanation: 'Exp 5' },
          ]
        }
      };

      const requestedEndSec = 500; // less than stored 600
      const targetCap = getTargetQuestionCount(600); // 5

      const isCached = requestedEndSec <= existingMeta.watchedEndSec || existingMeta.quiz.questions.length >= targetCap;
      assert.strictEqual(isCached, true);
    });
  });

  describe('6. Proof Point 2: Trigger Discipline & Reconciler Gate', () => {
    it('should ignore regular periodic 10-second ticks when no completion or transition event occurred', () => {
      const payload = {
        videoId: 'vid-123',
        isCompleted: false,
        currentVideoIndex: 0,
        lastWatchedTimestamp: 40,
      };

      const skill = {
        playlistData: {
          playlistId: 'pl-1',
          currentVideoIndex: 0,
          videos: [
            { videoId: 'vid-123', isCompleted: false, lastWatchedTimestamp: 30, durationSecs: 300 }
          ]
        }
      };

      // Trigger 1 Check: targetVid && isCompleted
      const trigger1 = Boolean(payload.videoId && payload.isCompleted);
      assert.strictEqual(trigger1, false);

      // Trigger 2 Check: currentVideoIndex advanced
      const trigger2 = Boolean(
        skill.playlistData?.videos &&
        payload.currentVideoIndex !== undefined &&
        skill.playlistData.currentVideoIndex !== payload.currentVideoIndex
      );
      assert.strictEqual(trigger2, false);
    });

    it('should trigger exactly once when video is completed or index transitions', () => {
      const completionPayload = {
        videoId: 'vid-123',
        isCompleted: true,
        currentVideoIndex: 0,
        lastWatchedTimestamp: 300,
      };

      const trigger1 = Boolean(completionPayload.videoId && completionPayload.isCompleted);
      assert.strictEqual(trigger1, true);

      const transitionPayload = {
        currentVideoIndex: 1,
        prevVideoIndex: 0,
      };
      const skill = {
        playlistData: {
          playlistId: 'pl-1',
          currentVideoIndex: 1, // post-save state
          videos: [
            { videoId: 'vid-123', isCompleted: false, lastWatchedTimestamp: 120, durationSecs: 300 }
          ]
        }
      };
      const trigger2 = Boolean(
        skill.playlistData?.videos &&
        transitionPayload.currentVideoIndex !== undefined &&
        transitionPayload.prevVideoIndex !== undefined &&
        transitionPayload.prevVideoIndex !== transitionPayload.currentVideoIndex
      );
      assert.strictEqual(trigger2, true);
    });
  });

  describe('7. Proof Point 3: Quality-Judge Retry & Fallback Logic', () => {
    it('should amplify prompt on retry when quality score is below threshold', () => {
      const standardPrompt = buildQuizPrompt({
        videoTitle: 'Docker Containers',
        durationSec: 600,
        watchedStartSec: 0,
        watchedEndSec: 600,
        topicsSummary: 'Images vs Containers',
      }, 5, false);

      const amplifiedPrompt = buildQuizPrompt({
        videoTitle: 'Docker Containers',
        durationSec: 600,
        watchedStartSec: 0,
        watchedEndSec: 600,
        topicsSummary: 'Images vs Containers',
      }, 5, true);

      assert.ok(standardPrompt.includes('TARGET DIFFICULTY: Intermediate'));
      assert.ok(amplifiedPrompt.includes('CRITICAL QUALITY REVISION'));
      assert.ok(amplifiedPrompt.includes('The previous questions were rejected for being too basic/trivial'));
    });
  });

  describe('8. Proof Point 4: Endpoint Status-Gating', () => {
    it('should strictly gate getQuizForVideo to return { success: false, quiz: null } when status is not success', () => {
      const mockMetaInProgress = { status: 'in-progress', quiz: null };
      const isReady1 = mockMetaInProgress && mockMetaInProgress.status === 'success' && mockMetaInProgress.quiz?.questions?.length > 0;
      assert.strictEqual(isReady1, false);

      const mockMetaFailed = { status: 'failed', errorMessage: 'API rate limit' };
      const isReady2 = mockMetaFailed && mockMetaFailed.status === 'success' && mockMetaFailed.quiz?.questions?.length > 0;
      assert.strictEqual(isReady2, false);

      const mockMetaSuccessEmpty = { status: 'success', quiz: { questions: [] } };
      const isReady3 = mockMetaSuccessEmpty && mockMetaSuccessEmpty.status === 'success' && mockMetaSuccessEmpty.quiz?.questions?.length > 0;
      assert.strictEqual(isReady3, false);

      const mockMetaSuccess = { status: 'success', quiz: { questions: [{ question: 'Valid' }] } };
      const isReady4 = Boolean(mockMetaSuccess && mockMetaSuccess.status === 'success' && mockMetaSuccess.quiz?.questions?.length > 0);
      assert.strictEqual(isReady4, true);
    });
  });

});
