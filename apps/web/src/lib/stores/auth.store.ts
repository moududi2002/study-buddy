// ============================================================
// Path: apps/web/src/lib/stores/auth.store.ts
// ============================================================

'use client';

import { create } from 'zustand';
import { api, setAccessToken } from '@/lib/api';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  classLevel: number;
  avatarUrl: string | null;
  role: string;
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  isEmailVerified: boolean;
  createdAt: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  login: (accessToken: string, user: AuthUser) => void;
  logout: () => Promise<void>;
  setUser: (user: AuthUser) => void;
  refresh: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isLoading: false,
  isInitialized: false,

  login: (accessToken, user) => {
    setAccessToken(accessToken);
    set({ user, accessToken });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    setAccessToken(null);
    set({ user: null, accessToken: null });
  },

  setUser: (user) => set({ user }),

  refresh: async () => {
    try {
      const res = await api.post<{ success: true; data: { accessToken: string; user: AuthUser } }>(
        '/auth/refresh',
        undefined,
        { skipAuth: true },
      );
      setAccessToken(res.data.accessToken);
      set({ user: res.data.user, accessToken: res.data.accessToken });
    } catch {
      setAccessToken(null);
      set({ user: null, accessToken: null });
    }
  },

  initialize: async () => {
    if (get().isInitialized) return;
    set({ isLoading: true });
    await get().refresh();
    set({ isLoading: false, isInitialized: true });
  },
}));