import axios from 'axios';
import { Platform } from 'react-native';
import { useAuthStore } from '../stores/auth';

// Production URL: Update this after deploying to Render
// Format: https://musicstream-api.onrender.com/api
const PRODUCTION_API_URL = 'https://musicstream-api.onrender.com/api';

// Android emulator uses 10.0.2.2 to reach host machine's localhost
const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const API_BASE_URL = __DEV__
  ? `http://${DEV_HOST}:3000/api`
  : PRODUCTION_API_URL;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use(config => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Guest users don't have tokens — just reject without forcing logout
      const { refreshToken, isGuest } = useAuthStore.getState();
      if (!refreshToken) {
        if (!isGuest) {
          useAuthStore.getState().logout();
        }
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });
        useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch {
        if (!isGuest) {
          useAuthStore.getState().logout();
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);
