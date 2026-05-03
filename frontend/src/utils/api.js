import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
});

// Intercept responses to handle 401s gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If it's a 401 (Unauthorized), just reject the promise silently
    // so the UI can handle it without spamming console.error unnecessarily
    // if the UI expects it (e.g., Guest mode)
    return Promise.reject(error);
  }
);

export default api;

