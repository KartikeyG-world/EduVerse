/**
 * Flashcard API — Phase 2 SRS
 * All calls go through the central api utility so the JWT interceptor applies.
 */
import api from '../utils/api';

/** Generate flashcards from note content */
export const generateFlashcards = (noteContent, topicName, noteId) =>
  api.post('/flashcards/generate', { noteContent, topicName, noteId });

/** Get all flashcards. Pass due=true to get only today's review queue */
export const getFlashcards = (dueOnly = false) =>
  api.get(`/flashcards${dueOnly ? '?due=true' : ''}`);

/** Get number of cards pending review (for dashboard widget) */
export const getPendingCount = () =>
  api.get('/flashcards/pending-count');

/** Submit a review rating (0=Forgot, 1=Hard, 2=Good, 3=Easy) */
export const reviewFlashcard = (id, rating) =>
  api.put(`/flashcards/${id}/review`, { rating });

/** Delete a flashcard */
export const deleteFlashcard = (id) =>
  api.delete(`/flashcards/${id}`);
