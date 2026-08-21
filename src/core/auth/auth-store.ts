import { create } from 'zustand';
import { ApiError } from '@/core/api/errors';
import { authService } from '@/core/api/services';
import type { Role, User } from '@/core/types/domain';

interface AuthState {
  token: string | null;
  currentUser: User | null;
  status: 'anonymous' | 'authenticating' | 'authenticated';
  lastError?: string;
  login: (role: Role) => Promise<void>;
  restore: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const storageKey = 'nmc-dashboard-session';

const persistSession = (token: string | null) => {
  if (!token) localStorage.removeItem(storageKey);
  else localStorage.setItem(storageKey, token);
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  currentUser: null,
  status: 'anonymous',
  async login(role) {
    set({ status: 'authenticating', lastError: undefined });
    try {
      const response = await authService.login(role);
      persistSession(response.token);
      set({ token: response.token, currentUser: response.user, status: 'authenticated' });
    } catch (error) {
      set({
        status: 'anonymous',
        lastError: error instanceof ApiError ? error.message : 'Unable to sign in.',
      });
    }
  },
  async restore() {
    const storedToken = localStorage.getItem(storageKey);
    if (!storedToken) return;
    try {
      const user = await authService.me(storedToken);
      set({ token: storedToken, currentUser: user, status: 'authenticated' });
    } catch {
      persistSession(null);
      set({ token: null, currentUser: null, status: 'anonymous' });
    }
  },
  async logout() {
    const token = get().token;
    if (token) {
      try {
        await authService.logout(token);
      } catch {
        // Local logout still proceeds.
      }
    }
    persistSession(null);
    set({ token: null, currentUser: null, status: 'anonymous', lastError: undefined });
  },
  clearError() {
    set({ lastError: undefined });
  },
}));
