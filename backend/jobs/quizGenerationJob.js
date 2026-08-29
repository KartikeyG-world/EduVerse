const { isImprovedQuizEnabled, generateQuizForWatchRange } = require('../services/quizService');

/**
 * Server-Side Safety Net Reconciler
 * Detects completed or transitioned videos in playlist sync payloads and triggers
 * background quiz generation asynchronously.
 */
const reconcilePlaylistProgress = async (userId, skill, payload = {}) => {
  if (!isImprovedQuizEnabled() || !skill || !userId) return;

  const { videoId, isCompleted, completedVideoId, currentVideoIndex, prevVideoIndex } = payload;
  const targetVid = videoId || completedVideoId;

  // Trigger 1: Video marked completed explicitly/naturally
  if (targetVid && isCompleted) {
    const videoItem = skill.playlistData?.videos?.find((v) => v.videoId === targetVid);
    const videoDurationSec = videoItem?.durationSecs || 0;
    const videoTitle = videoItem?.title || skill.title;

    setImmediate(() => {
      generateQuizForWatchRange(userId, targetVid, 0, videoDurationSec || 600, {
        skillId: skill._id,
        playlistId: skill.playlistData?.playlistId,
        videoDurationSec,
        videoTitle,
      }).catch((err) => {
        console.warn(`[Reconciler] Failed background quiz generation for completed video ${targetVid}:`, err.message);
      });
    });
    return;
  }

  // Trigger 2: Playlist video transition (currentVideoIndex advanced while previous video had watched time)
  if (
    skill.playlistData?.videos &&
    currentVideoIndex !== undefined &&
    prevVideoIndex !== undefined &&
    prevVideoIndex !== currentVideoIndex
  ) {
    const prevVideo = skill.playlistData.videos[prevVideoIndex];

    if (prevVideo && (prevVideo.lastWatchedTimestamp >= 60 || prevVideo.isCompleted)) {
      const watchedEnd = prevVideo.lastWatchedTimestamp || prevVideo.durationSecs || 300;
      setImmediate(() => {
        generateQuizForWatchRange(userId, prevVideo.videoId, 0, watchedEnd, {
          skillId: skill._id,
          playlistId: skill.playlistData?.playlistId,
          videoDurationSec: prevVideo.durationSecs || 0,
          videoTitle: prevVideo.title || skill.title,
        }).catch((err) => {
          console.warn(`[Reconciler] Failed transition quiz generation for video ${prevVideo.videoId}:`, err.message);
        });
      });
    }
  }
};

module.exports = {
  reconcilePlaylistProgress,
};
