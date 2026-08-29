import axios from 'axios';

// Normalize base URL: ensure it always ends with /api
// Handles all user configurations:
//   https://app.up.railway.app       → https://app.up.railway.app/api
//   https://app.up.railway.app/      → https://app.up.railway.app/api
//   https://app.up.railway.app/api   → https://app.up.railway.app/api
//   https://app.up.railway.app/api/  → https://app.up.railway.app/api
const normalizeBaseURL = (url) => {
  if (!url) return 'http://localhost:5000/api';
  let normalized = url.replace(/\/+$/, ''); // strip trailing slashes
  if (!normalized.endsWith('/api')) {
    normalized += '/api';
  }
  return normalized;
};

const api = axios.create({
  baseURL: normalizeBaseURL(import.meta.env.VITE_API_BASE_URL),
  withCredentials: true,
});


// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    try {
      config.headers['X-Timezone'] = Intl.DateTimeFormat().resolvedOptions().timeZone;
      config.headers['X-Timezone-Offset'] = new Date().getTimezoneOffset();
    } catch (_) {}
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercept responses to handle 401s gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If it's a 401 (Unauthorized) and we are not in guest mode
    // we might want to trigger a logout or prompt
    return Promise.reject(error);
  }
);

export default api;
