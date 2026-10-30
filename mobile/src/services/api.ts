import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default to the live Render backend
export const DEFAULT_BASE_URL = 'https://glovacrm-backend.onrender.com/api';

const api = axios.create({
  baseURL: DEFAULT_BASE_URL,
  timeout: 60000, // 60s timeout for mobile networks & cloud cold starts
});

export const checkBackendHealth = async (): Promise<{ ok: boolean; message: string }> => {
  try {
    const baseUrl = api.defaults.baseURL || DEFAULT_BASE_URL;
    const healthUrl = baseUrl.replace(/\/api\/?$/, '') + '/health';
    const res = await axios.get(healthUrl, { timeout: 20000 });
    return { ok: true, message: `Connected to Server: ${res.data?.message || 'GlovaCRM Online'}` };
  } catch (err: any) {
    return { ok: false, message: `Server error: ${err.message || 'Offline'}` };
  }
};

// Load saved server URL on init
export const initApiConfig = async (): Promise<string> => {
  try {
    const savedUrl = await AsyncStorage.getItem('server_url');
    if (savedUrl && !savedUrl.includes('192.168.') && !savedUrl.includes('localhost')) {
      api.defaults.baseURL = savedUrl;
      return savedUrl;
    } else {
      // Overwrite any old local IP with live Render backend
      api.defaults.baseURL = DEFAULT_BASE_URL;
      await AsyncStorage.setItem('server_url', DEFAULT_BASE_URL);
      return DEFAULT_BASE_URL;
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

export const createLead = async (data: {
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  companyName?: string;
  notes?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}) => {
  const res = await api.post('/leads', data);
  return res.data;
};

// ── Campaigns ────────────────────────────────────────────────────────────────
export const fetchCampaigns = async () => {
  try {
    const res = await api.get('/campaigns');
    return res.data?.data || res.data || [];
  } catch {
    return [];
  }
};

// ── Team ─────────────────────────────────────────────────────────────────────
export const fetchTeam = async () => {
  try {
    const res = await api.get('/users');
    return res.data?.data || res.data || [];
  } catch {
    return [];
  }
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

// ── Analytics / Dashboard ───────────────────────────────────────────────────
export const fetchAnalytics = async () => {
  try {
    const res = await api.get('/analytics');
    return res.data;
  } catch (err) {
    // If user is super admin or tenant analytics failed, fallback
    return null;
  }
};

// ── WhatsApp ─────────────────────────────────────────────────────────────────
export const fetchWhatsAppConversations = async () => {
  const res = await api.get('/whatsapp/conversations');
  return res.data || [];
};

export const fetchWhatsAppMessages = async (leadId: string) => {
  const res = await api.get(`/whatsapp/messages`, { params: { leadId } });
  return res.data || [];
};

export const sendWhatsAppMessage = async (leadId: string, message: string) => {
  const res = await api.post('/whatsapp/send', { leadId, message });
  return res.data;
};

export default api;
