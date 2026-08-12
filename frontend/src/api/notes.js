import api from '../utils/api';

export const fetchNotes = () => api.get('/notes');
export const fetchSingleNote = (id) => api.get(`/notes/${id}`);
export const createNote = () => api.post('/notes');
export const updateNote = (id, data) => api.put(`/notes/${id}`, data);
export const deleteNote = (id) => api.delete(`/notes/${id}`);
export const summarizeNote = (content) => api.post('/ai/summarize', { content });

export default api;
