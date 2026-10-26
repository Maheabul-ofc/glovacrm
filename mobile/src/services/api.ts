import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 192.168.137.1 is Windows Mobile Hotspot default IP
export const DEFAULT_BASE_URL = 'http://192.168.137.1:5000/api';

const api = axios.create({
  baseURL: DEFAULT_BASE_URL,
  timeout: 15000,
});

// Load saved server URL on init
export const initApiConfig = async (): Promise<string> => {
  try {
    const savedUrl = await AsyncStorage.getItem('server_url');
    if (savedUrl) {
      api.defaults.baseURL = savedUrl;
      return savedUrl;
    }
  } catch (e) {
    console.warn('Failed to load server_url', e);
  }
  return DEFAULT_BASE_URL;
};

// Set and persist new server URL
export const setServerUrl = async (url: string) => {
  let cleanUrl = url.trim().replace(/\/+$/, '');
  if (!cleanUrl.endsWith('/api')) {
    cleanUrl = `${cleanUrl}/api`;
  }
  await AsyncStorage.setItem('server_url', cleanUrl);
  api.defaults.baseURL = cleanUrl;
  return cleanUrl;
};

export const getServerUrl = async (): Promise<string> => {
  const savedUrl = await AsyncStorage.getItem('server_url');
  return savedUrl || DEFAULT_BASE_URL;
};

// Attach JWT token automatically to every request
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore
  }
  return config;
});

// ── Auth ─────────────────────────────────────────────────────────────────────
export const login = async (email: string, password: string) => {
  const res = await api.post('/auth/login', { email, password });
  const { accessToken, user } = res.data;
  await AsyncStorage.setItem('access_token', accessToken);
  await AsyncStorage.setItem('user', JSON.stringify(user));
  return { accessToken, user };
};

export const logout = async () => {
  await AsyncStorage.removeItem('access_token');
  await AsyncStorage.removeItem('user');
};

export const getStoredUser = async () => {
  try {
    const userStr = await AsyncStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

// ── Leads ─────────────────────────────────────────────────────────────────────
export const fetchLeads = async (page = 1, limit = 50, search = '') => {
  const res = await api.get('/leads', { params: { page, limit, search } });
  return res.data;
};

// ── Calls ─────────────────────────────────────────────────────────────────────

/**
 * Log a completed call with auto-detected or manually entered duration.
 */
export const logCall = async (params: {
  leadId: string;
  status: string;
  duration: number; // in seconds
  notes?: string;
}) => {
  const res = await api.post('/calls/log', params);
  return res.data;
};

/**
 * Fetch calls list
 */
export const fetchCalls = async (params?: { leadId?: string; search?: string }) => {
  const res = await api.get('/calls', { params });
  return res.data?.data || [];
};

/**
 * Android Mobile Sync: Fetch calls queued from Web CRM with provider=ANDROID_APP
 */
export const getPendingMobileCalls = async () => {
  const res = await api.get('/calls/mobile-sync');
  return res.data?.data || [];
};

/**
 * Android Mobile Sync: Report call outcome & duration back to the Web CRM
 */
export const syncMobileCallResult = async (params: {
  callId: string;
  status: 'COMPLETED' | 'MISSED' | 'FAILED' | 'REJECTED';
  duration: number; // duration in seconds
}) => {
  const res = await api.post('/calls/mobile-sync', params);
  return res.data;
};

export default api;
