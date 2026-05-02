import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
});

// Response interceptor to handle global errors (like 401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized, clear local storage and potentially redirect
      console.warn("Unauthorized request detected. Clearing session.");
      localStorage.removeItem("token");
      // Optionally reload or redirect if not already on login/register
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
          window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

