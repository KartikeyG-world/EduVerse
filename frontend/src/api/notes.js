import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

// Add JWT token to all requests
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export const fetchNotes = () => API.get('/notes');
export const fetchSingleNote = (id) => API.get(`/notes/${id}`);
export const createNote = () => API.post('/notes');
export const updateNote = (id, data) => API.put(`/notes/${id}`, data);
export const deleteNote = (id) => API.delete(`/notes/${id}`);
export const summarizeNote = (content) => API.post('/ai/summarize', { content });

export default API;
