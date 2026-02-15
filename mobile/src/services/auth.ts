import { api } from './api';
import { useAuthStore } from '../stores/auth';

interface RegisterParams {
  email: string;
  password: string;
  displayName: string;
}

interface LoginParams {
  email: string;
  password: string;
}

export async function register(params: RegisterParams) {
  const { data } = await api.post('/auth/register', params);
  useAuthStore
    .getState()
    .setAuth(data.user, data.accessToken, data.refreshToken);
  return data;
}

export async function login(params: LoginParams) {
  const { data } = await api.post('/auth/login', params);
  useAuthStore
    .getState()
    .setAuth(data.user, data.accessToken, data.refreshToken);
  return data;
}

export function logout() {
  useAuthStore.getState().logout();
}
