import { create } from 'zustand';
import type { User } from '../services/authApi';
import { refreshToken as apiRefreshToken, logout as apiLogout } from '../services/authApi';

interface AuthState {
  user: User | null;
  token: string | null;
  isInitializing: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  refreshSession: () => Promise<string | null>;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
}

// Ensure any stale legacy tokens in localStorage are cleaned up immediately
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('auth-storage');
    localStorage.removeItem('token');
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

// Deduplicate concurrent in-flight refresh requests
let activeRefreshPromise: Promise<string | null> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isInitializing: true,

  setAuth: (user, token) => set({ user, token, isInitializing: false }),

  clearAuth: () => set({ user: null, token: null, isInitializing: false }),

  logout: async () => {
    try {
      await apiLogout();
    } catch (err) {
      console.warn('Backend logout warning:', err);
    } finally {
      activeRefreshPromise = null;
      get().clearAuth();
    }
  },

  initializeAuth: async () => {
    try {
      const token = await get().refreshSession();
      if (token) return;
    } catch {
      // No active or valid refresh cookie, user is a guest
    }
    set({ user: null, token: null, isInitializing: false });
  },

  refreshSession: async () => {
    if (activeRefreshPromise) {
      return activeRefreshPromise;
    }

    activeRefreshPromise = (async () => {
      try {
        const res = await apiRefreshToken();
        if (res.token && res.user) {
          set({ user: res.user, token: res.token, isInitializing: false });
          return res.token;
        }
      } catch (err) {
        console.warn('Session refresh failed:', err);
        get().clearAuth();
      } finally {
        activeRefreshPromise = null;
      }
      return null;
    })();

    return activeRefreshPromise;
  },

  isAuthenticated: () => !!get().token,
  isAdmin: () => get().user?.role === 'ADMIN',
}));
