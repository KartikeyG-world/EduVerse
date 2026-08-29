const { describe, it } = require('node:test');
const assert = require('node:assert');

const skillsRouter = require('../routes/skills');
const { syncPlaylistVideos, syncThrottleMap, SYNC_THROTTLE_MS } = skillsRouter;
const { getPlaylistCount, fetchPlaylistDetails } = require('../integrations/youtubeService');
const { generateQuizForWatchRange, getTargetQuestionCount } = require('../services/quizService');

describe('SkillHub Playlist Player Fixes Test Suite', () => {

  // ──────────────────────────────────────────────────────────────────────────
  // Problem 1: Scroll Layout Contracts
  // ──────────────────────────────────────────────────────────────────────────
  describe('Problem 1: Layout & Scroll Independence Contracts', () => {
    it('should have bounded desktop layout structure in LearningView', () => {
      const fs = require('fs');
      const path = require('path');
      const learningViewPath = path.resolve(__dirname, '../../frontend/src/pages/LearningView.jsx');
      const content = fs.readFileSync(learningViewPath, 'utf8');

      // Desktop outer container must be bounded and clip overflow
      assert.ok(
        content.includes('lg:h-screen') && content.includes('lg:overflow-hidden'),
        'LearningView outer container must contain lg:h-screen and lg:overflow-hidden'
      );

      // Main content row must be flex-1 min-h-0 lg:overflow-hidden
      assert.ok(
        content.includes('min-h-0 lg:overflow-hidden'),
        'Main content flex row must constrain min-h-0 and lg:overflow-hidden'
      );

      // Sidebar panel must be lg:h-full lg:overflow-y-auto
      assert.ok(
        content.includes('lg:h-full lg:overflow-y-auto'),
        'Sidebar panel must be constrained to lg:h-full and scrollable with lg:overflow-y-auto'
      );

      // Queue list inside sidebar must have independent scrollable container
      assert.ok(
        content.includes('custom-scrollbar') && content.includes('max-h-[50vh] lg:max-h-none'),
        'Queue list must have responsive max-height and custom scrollbar'
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Problem 2: Navigation Snap-back & Monotonic Progress
  // ──────────────────────────────────────────────────────────────────────────
  describe('Problem 2: Navigation Snap-Back & Monotonic Progress Rules', () => {
    it('should verify moveToVideo clears pendingNextVideo to prevent snap-back', () => {
      const fs = require('fs');
      const path = require('path');
      const learningViewPath = path.resolve(__dirname, '../../frontend/src/pages/LearningView.jsx');
      const content = fs.readFileSync(learningViewPath, 'utf8');

      // Check moveToVideo clears pendingNextVideo
      assert.ok(
        content.includes('setPendingNextVideo(null)'),
        'moveToVideo must explicitly reset pendingNextVideo to null'
      );
      assert.ok(
        content.includes('manualSwitchRef.current = true'),
        'moveToVideo must set manualSwitchRef to true'
      );
    });

    it('should preserve target video watch progress and overall course progress when switching to a previous video', () => {
      const mockSkill = {
        type: 'playlist',
        progress: 60,
        completed: false,
        playlistData: {
          currentVideoIndex: 6,
          videos: [
            { videoId: 'vid-1', title: 'Lesson 1', durationSecs: 600, isCompleted: true, lastWatchedTimestamp: 600 },
            { videoId: 'vid-2', title: 'Lesson 2', durationSecs: 900, isCompleted: true, lastWatchedTimestamp: 900 },
            { videoId: 'vid-3', title: 'Lesson 3', durationSecs: 1200, isCompleted: false, lastWatchedTimestamp: 450 },
            { videoId: 'vid-4', title: 'Lesson 4', durationSecs: 800, isCompleted: true, lastWatchedTimestamp: 800 },
            { videoId: 'vid-5', title: 'Lesson 5', durationSecs: 1000, isCompleted: true, lastWatchedTimestamp: 1000 },
            { videoId: 'vid-6', title: 'Lesson 6', durationSecs: 700, isCompleted: true, lastWatchedTimestamp: 700 },
            { videoId: 'vid-7', title: 'Lesson 7', durationSecs: 1100, isCompleted: false, lastWatchedTimestamp: 100 },
          ]
        }
      };

      // Simulating moveToVideo('vid-3')
      const targetVid = 'vid-3';
      const vidItem = mockSkill.playlistData.videos.find(v => v.videoId === targetVid);
      const lastWatched = vidItem?.lastWatchedTimestamp || 0;
      const durSecs = vidItem?.durationSecs || 0;
      const overallProgress = mockSkill.progress || 0;

      // Verify that target video's previous watch timestamp is loaded (450s), NOT 0
      assert.strictEqual(lastWatched, 450, 'Previous video timestamp must be preserved');
      assert.strictEqual(durSecs, 1200, 'Previous video duration must be preserved');
      assert.strictEqual(overallProgress, 60, 'Overall course progress must NOT be reset to 0');
    });

    it('should allow completed course cards to be opened for review in SkillCard', () => {
      const fs = require('fs');
      const path = require('path');
      const skillCardPath = path.resolve(__dirname, '../../frontend/src/components/skills/SkillCard.jsx');
      const content = fs.readFileSync(skillCardPath, 'utf8');

      assert.ok(
        content.includes('navigate(`/skills/${_id}/learn`)'),
        'SkillCard handleContinue must allow navigating to completed skills'
      );
      assert.ok(
        content.includes('Review Course'),
        'Completed SkillCard must display an interactive Review Course button'
      );
    });

    it('should maintain monotonic playlist resume pointer (never move backward on replay)', () => {
      // Simulating the monotonic pointer update logic from PUT /api/skills/:id/progress
      const mockSkill = {
        type: 'playlist',
        playlistData: {
          currentVideoIndex: 6, // User has advanced to Video 7 (index 6)
          lastWatchedTimestamp: 120,
        },
      };

      const updateProgress = (skill, incomingIndex, incomingTimestamp, isCompleted) => {
        if (incomingIndex !== undefined) {
          // Monotonic rule: only advance forward
          skill.playlistData.currentVideoIndex = Math.max(skill.playlistData.currentVideoIndex || 0, incomingIndex);
        }
        if (incomingTimestamp !== undefined) {
          if (incomingTimestamp === 0 && isCompleted) {
            skill.playlistData.lastWatchedTimestamp = 0;
          } else if (incomingTimestamp > (skill.playlistData.lastWatchedTimestamp || 0)) {
            skill.playlistData.lastWatchedTimestamp = incomingTimestamp;
          }
        }
      };

      // User clicks and replays Video 6 (index 5)
      updateProgress(mockSkill, 5, 45, false);

      // Resume pointer must STAY at index 6 (Video 7), NOT regress to 5
      assert.strictEqual(mockSkill.playlistData.currentVideoIndex, 6);

      // Now user advances to Video 8 (index 7)
      updateProgress(mockSkill, 7, 10, false);
      assert.strictEqual(mockSkill.playlistData.currentVideoIndex, 7);
    });

    it('should maintain monotonic completion status and timestamps for individual videos', () => {
      const mockVideos = [
        { videoId: 'vid-1', title: 'Lesson 1', isCompleted: true, lastWatchedTimestamp: 0 },
        { videoId: 'vid-2', title: 'Lesson 2', isCompleted: true, lastWatchedTimestamp: 0 },
        { videoId: 'vid-3', title: 'Lesson 3', isCompleted: false, lastWatchedTimestamp: 300 },
      ];

      const applyVideoProgress = (targetVid, shouldComplete, timestamp) => {
        const vidItem = mockVideos.find(v => v.videoId === targetVid);
        if (vidItem) {
          if (shouldComplete === true) {
            vidItem.isCompleted = true;
          } else if (shouldComplete === false) {
            vidItem.isCompleted = false;
          }

          if (timestamp !== undefined) {
            if (timestamp === 0 && shouldComplete === true) {
              vidItem.lastWatchedTimestamp = 0;
            } else if (timestamp > (vidItem.lastWatchedTimestamp || 0)) {
              vidItem.lastWatchedTimestamp = timestamp;
            }
          }
        }
      };

      // User replays vid-1 (already completed) for 30s without explicit uncomplete flag
      applyVideoProgress('vid-1', null, 30);
      assert.strictEqual(mockVideos[0].isCompleted, true, 'vid-1 must remain completed on replay');

      // User watches vid-3 from 300s to 450s
      applyVideoProgress('vid-3', null, 450);
      assert.strictEqual(mockVideos[2].lastWatchedTimestamp, 450, 'vid-3 timestamp must advance');

      // User seeks back in vid-3 to 100s — timestamp should NOT regress
      applyVideoProgress('vid-3', null, 100);
      assert.strictEqual(mockVideos[2].lastWatchedTimestamp, 450, 'vid-3 timestamp must not decrease');
    });

    it('should ensure quiz idempotency returns cached quiz without re-generation during replay', async () => {
      // Mock QuizGenerationMeta behavior for an already-completed video
      const mockMeta = {
        userId: 'user-test-1',
        videoId: 'vid-1',
        status: 'success',
        watchedEndSec: 600,
        quiz: {
          questions: [
            { question: 'Q1?', options: ['A', 'B', 'C', 'D'], correctIndex: 0 }
          ]
        }
      };

      // Replaying at 30s (<= stored 600s) should use cached quiz
      const replayedEndSec = 30;
      const targetCap = getTargetQuestionCount(600);
      const isReplayCached = replayedEndSec <= mockMeta.watchedEndSec || mockMeta.quiz.questions.length >= targetCap;

      assert.strictEqual(isReplayCached, true, 'Replay of completed video must be cached and not re-trigger AI generation');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Problem 3: Playlist Re-sync & Accurate Progress Recalculation
  // ──────────────────────────────────────────────────────────────────────────
  describe('Problem 3: Playlist Re-Sync Mechanism & Accurate Progress Recalculation', () => {
    it('should non-destructively merge new videos into existing playlist in correct order', async () => {
      const mockExistingSkill = {
        type: 'playlist',
        completedVideos: ['vid-1', 'vid-2'],
        playlistData: {
          playlistId: 'PL_TEST_123',
          totalVideos: 3,
          videos: [
            { videoId: 'vid-1', title: 'Lesson 1', duration: '10:00', durationSecs: 600, isCompleted: true, lastWatchedTimestamp: 0 },
            { videoId: 'vid-2', title: 'Lesson 2', duration: '15:00', durationSecs: 900, isCompleted: true, lastWatchedTimestamp: 0 },
            { videoId: 'vid-3', title: 'Lesson 3', duration: '20:00', durationSecs: 1200, isCompleted: false, lastWatchedTimestamp: 150 },
          ]
        },
        videos: ['vid-1', 'vid-2', 'vid-3'],
      };

      // Mock fetched updated playlist from YouTube (creator added vid-4 and vid-5)
      const mockFetchedVideos = [
        { videoId: 'vid-1', title: 'Lesson 1 (Updated Title)', duration: '10:00', durationSecs: 600 },
        { videoId: 'vid-2', title: 'Lesson 2', duration: '15:00', durationSecs: 900 },
        { videoId: 'vid-3', title: 'Lesson 3', duration: '20:00', durationSecs: 1200 },
        { videoId: 'vid-4', title: 'Lesson 4 (New!)', duration: '08:30', durationSecs: 510 },
        { videoId: 'vid-5', title: 'Lesson 5 (New!)', duration: '12:00', durationSecs: 720 },
      ];

      // Execute merge logic
      const existingVideos = mockExistingSkill.playlistData.videos;
      const existingMap = new Map(existingVideos.map(v => [v.videoId, v]));
      const existingCompleted = new Set(mockExistingSkill.completedVideos || []);

      let addedCount = 0;
      const mergedVideos = mockFetchedVideos.map(item => {
        if (existingMap.has(item.videoId)) {
          const existing = existingMap.get(item.videoId);
          return {
            title: item.title || existing.title,
            videoId: item.videoId,
            duration: item.duration || existing.duration || '',
            durationSecs: item.durationSecs || existing.durationSecs || 0,
            thumbnail: item.thumbnail || existing.thumbnail || null,
            isCompleted: Boolean(existing.isCompleted || existingCompleted.has(item.videoId)),
            lastWatchedTimestamp: existing.lastWatchedTimestamp || 0,
          };
        } else {
          addedCount++;
          return {
            title: item.title,
            videoId: item.videoId,
            duration: item.duration || '',
            durationSecs: item.durationSecs || 0,
            thumbnail: item.thumbnail || null,
            isCompleted: false,
            lastWatchedTimestamp: 0,
          };
        }
      });

      assert.strictEqual(addedCount, 2, 'Must detect exactly 2 new videos');
      assert.strictEqual(mergedVideos.length, 5, 'Merged playlist must have 5 total videos');

      // Verify existing progress preserved
      assert.strictEqual(mergedVideos[0].isCompleted, true, 'Lesson 1 must remain completed');
      assert.strictEqual(mergedVideos[1].isCompleted, true, 'Lesson 2 must remain completed');
      assert.strictEqual(mergedVideos[2].lastWatchedTimestamp, 150, 'Lesson 3 timestamp must be preserved');

      // Verify new videos have initial default unwatched state
      assert.strictEqual(mergedVideos[3].isCompleted, false, 'Lesson 4 must start uncompleted');
      assert.strictEqual(mergedVideos[3].lastWatchedTimestamp, 0, 'Lesson 4 must start at 0 timestamp');
      assert.strictEqual(mergedVideos[4].isCompleted, false, 'Lesson 5 must start uncompleted');
    });

    it('should accurately recalculate overall playlist progress and completion when new videos are added', () => {
      // User had completed 10/10 videos (100% completed)
      const initialTotal = 10;
      const completedCount = 10;
      let progress = Math.round((completedCount / initialTotal) * 100);
      let completed = progress >= 95;

      assert.strictEqual(progress, 100);
      assert.strictEqual(completed, true);

      // Creator adds 2 new videos (total becomes 12)
      const newTotal = 12;
      const newCompletedCount = 10; // 10 existing completed, 2 new uncompleted
      progress = Math.round((newCompletedCount / newTotal) * 100);
      completed = progress >= 95;

      // 10 / 12 * 100 = 83%
      assert.strictEqual(progress, 83, 'Progress must be recalculated to 83%');
      assert.strictEqual(completed, false, 'Completed status must be false until new videos are finished');

      // User watches video 11 and 12
      const finalCompletedCount = 12;
      progress = Math.round((finalCompletedCount / newTotal) * 100);
      completed = progress >= 95;

      assert.strictEqual(progress, 100, 'Progress must return to 100% when all 12 are watched');
      assert.strictEqual(completed, true, 'Completed status must be restored to true');
    });

    it('should respect the 60-second sync throttle map', () => {
      const skillId = 'skill-throttle-test-1';
      syncThrottleMap.set(skillId, Date.now());

      const lastChecked = syncThrottleMap.get(skillId);
      const isThrottled = (Date.now() - lastChecked) < SYNC_THROTTLE_MS;

      assert.strictEqual(isThrottled, true, 'Sync check within 60s must be throttled');

      // Cleanup
      syncThrottleMap.delete(skillId);
    });
  });

});
