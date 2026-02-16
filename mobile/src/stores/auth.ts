import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'auth-storage' });

interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;

  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  continueAsGuest: () => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>(set => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isGuest: false,
  isLoading: true,

  setAuth: (user, accessToken, refreshToken) => {
    storage.set('user', JSON.stringify(user));
    storage.set('accessToken', accessToken);
    storage.set('refreshToken', refreshToken);
    storage.delete('isGuest');
    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
      isGuest: false,
      isLoading: false,
    });
  },

  setTokens: (accessToken, refreshToken) => {
    storage.set('accessToken', accessToken);
    storage.set('refreshToken', refreshToken);
    set({ accessToken, refreshToken });
  },

  continueAsGuest: () => {
    storage.set('isGuest', true);
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isGuest: true,
      isLoading: false,
    });
  },

  logout: () => {
    storage.delete('user');
    storage.delete('accessToken');
    storage.delete('refreshToken');
    storage.delete('isGuest');
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isGuest: false,
      isLoading: false,
    });
  },

  hydrate: () => {
    try {
      const userJson = storage.getString('user');
      const accessToken = storage.getString('accessToken');
      const refreshToken = storage.getString('refreshToken');
      const isGuest = storage.getBoolean('isGuest');

      if (userJson && accessToken && refreshToken) {
        const user = JSON.parse(userJson) as User;
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isGuest: false,
          isLoading: false,
        });
      } else if (isGuest) {
        set({
          isGuest: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
