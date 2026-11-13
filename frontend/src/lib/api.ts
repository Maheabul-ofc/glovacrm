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

// Auto-retry on 429 (rate-limited) and 503 (waking up) with exponential backoff
const RETRY_DELAYS = [2000, 4000, 8000];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!config) return Promise.reject(error);

    // Initialize retry count
    config.__retryCount = config.__retryCount || 0;

    const status = error.response?.status;
    const isRetryable = status === 429 || status === 503;

    if (isRetryable && config.__retryCount < RETRY_DELAYS.length) {
      const delay = RETRY_DELAYS[config.__retryCount];
      config.__retryCount += 1;
      console.log(`[api] ${status} on ${config.url}, retry #${config.__retryCount} in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
      return api(config);
    }

    return Promise.reject(error);
  }
);

export default api;
