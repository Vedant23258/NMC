import { create } from 'zustand';
import { ApiError } from '@/core/api/errors';
import { authService } from '@/core/api/services';
import { appEnv } from '@/core/config/env';
import type { Role, User } from '@/core/types/domain';

interface AuthState {
  token: string | null;
  currentUser: User | null;
  status: 'anonymous' | 'authenticating' | 'authenticated';
  lastError?: string;
  loginWithRole: (role: Role) => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  restore: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const storageKey = 'nmc-dashboard-session';

const persistSession = (token: string | null) => {
  if (!token) localStorage.removeItem(storageKey);
  else localStorage.setItem(storageKey, token);
};

const login = async (
  set: (partial: Partial<AuthState>) => void,
  credentials: Parameters<typeof authService.login>[0],
) => {
  set({ status: 'authenticating', lastError: undefined });
  try {
    const response = await authService.login(credentials);
    persistSession(response.token);
    set({ token: response.token, currentUser: response.user, status: 'authenticated' });
  } catch (error) {
    set({
      status: 'anonymous',
      lastError: error instanceof ApiError || error instanceof Error ? error.message : 'Unable to sign in.',
    });
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  currentUser: null,
  status: 'anonymous',
  loginWithRole: (role) => login(set, { role }),
  loginWithPassword: (email, password) => login(set, { email, password }),
  async restore() {
    // Gateway mode: Supabase owns the session (its own storage), so ask it
    // directly rather than replaying our own token through authService.me.
    if (appEnv.apiMode === 'gateway') {
      const session = await authService.restoreSession();
      if (session) {
        set({ token: session.token, currentUser: session.user, status: 'authenticated' });
      }
      return;
    }
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
