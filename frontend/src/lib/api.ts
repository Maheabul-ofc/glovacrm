import axios from 'axios';

// Routes through Next.js catch-all route handler /api/[...path]
const api = axios.create({
  baseURL: '/api',
  timeout: 60000, // 60s timeout — Render free tier can take 25-30s to wake up
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        if (config.headers && typeof config.headers.set === 'function') {
          config.headers.set('Authorization', `Bearer ${token}`);
        } else {
          config.headers = config.headers || {};
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
