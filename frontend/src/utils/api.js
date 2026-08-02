import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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
