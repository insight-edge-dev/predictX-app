import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import * as authService from '@/services/authService';
import { setAccessToken, getAccessToken, onAuthExpired } from '@/services/api';
import type { AppUser } from '@/services/authService';
import type { UserProfile } from '@/types/prediction';
import api from '@/services/api';

// ── Types ─────────────────────────────────────────────────────

interface AuthState {
  user:            AppUser | null;
  profile:         UserProfile | null;
  isLoading:       boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  sendOtp:              (phone: string) => Promise<{ success: boolean; error: string | null }>;
  verifyOtpLogin:       (phone: string, otp: string) => Promise<{ success: boolean; isNewUser: boolean; error: string | null }>;
  completeSignup:       (name: string) => Promise<{ success: boolean; error: string | null }>;
  logout:               () => Promise<void>;
  deleteAccount:        () => Promise<{ success: boolean; error: string | null }>;
  refreshProfile:       () => Promise<void>;
  updateFavouriteTeams: (teams: string[]) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null, profile: null, isLoading: true, isAuthenticated: false,
  });

  const mountedRef     = useRef(true);
  const accessTokenRef = useRef<string | null>(null);

  const safeSet = useCallback(
    (updater: AuthState | ((p: AuthState) => AuthState)) => {
      if (mountedRef.current) setState(updater);
    }, [],
  );

  // ── Profile loader ────────────────────────────────────────

  const loadProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      return await api.get<UserProfile>(`/user/profile`);
    } catch {
      return null;
    }
  }, []);

  // ── Authenticate state from tokens + user ─────────────────

  const setAuthenticated = useCallback(async (user: AppUser, tokens: authService.AuthTokens) => {
    await authService.persistTokens(tokens);
    accessTokenRef.current = tokens.accessToken;
    const profile = await loadProfile(user.id);
    safeSet({ user, profile, isLoading: false, isAuthenticated: true });
  }, [loadProfile, safeSet]);

  const clearState = useCallback(async () => {
    await authService.clearTokens();
    accessTokenRef.current = null;
    safeSet({ user: null, profile: null, isLoading: false, isAuthenticated: false });
  }, [safeSet]);

  // ── Init on app start ─────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;

    async function init() {
      const result = await authService.refreshSession();
      if (!mountedRef.current) return;

      if (result.success && result.user && result.tokens) {
        await authService.persistTokens(result.tokens);
        accessTokenRef.current = result.tokens.accessToken;
        const profile = await loadProfile(result.user.id);
        safeSet({ user: result.user, profile, isLoading: false, isAuthenticated: true });
      } else {
        await authService.clearTokens();
        safeSet({ user: null, profile: null, isLoading: false, isAuthenticated: false });
      }
    }

    init();

    // Listen for token expiry that couldn't be recovered
    const unsub = onAuthExpired(() => {
      if (mountedRef.current) clearState();
    });

    return () => {
      mountedRef.current = false;
      unsub();
    };
  }, [loadProfile, safeSet, clearState]);

  // ── Auth actions ──────────────────────────────────────────

  const sendOtp = useCallback(async (phone: string) => {
    return authService.sendOtp(phone);
  }, []);

  const verifyOtpLogin = useCallback(async (phone: string, otp: string) => {
    const result = await authService.verifyOtp(phone, otp);
    if (!result.success || !result.user || !result.tokens) {
      return { success: false, isNewUser: false, error: result.error ?? 'Verification failed' };
    }
    await setAuthenticated(result.user, result.tokens);
    return { success: true, isNewUser: !!result.user.isNewUser, error: null };
  }, [setAuthenticated]);

  const completeSignup = useCallback(async (name: string) => {
    const token = getAccessToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    const result = await authService.setDisplayName(name, token);
    if (!result.success) return result;

    // Update local state with the name
    safeSet(prev => ({
      ...prev,
      user:    prev.user ? { ...prev.user, displayName: name } : prev.user,
      profile: prev.profile ? { ...prev.profile, displayName: name } : prev.profile,
    }));
    return { success: true, error: null };
  }, [safeSet]);

  const deleteAccount = useCallback(async () => {
    try {
      await api.delete('/auth/account');
      await clearState();
      return { success: true, error: null };
    } catch (e: any) {
      return { success: false, error: e.message ?? 'Failed to delete account' };
    }
  }, [clearState]);

  const logout = useCallback(async () => {
    const accessToken  = getAccessToken() ?? '';
    const refreshToken = (await authService.getStoredRefreshToken()) ?? '';
    // Revoke on backend (fire and forget — don't block UI)
    void authService.logout(accessToken, refreshToken);
    await clearState();
  }, [clearState]);

  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    const profile = await loadProfile(state.user.id);
    safeSet(prev => ({ ...prev, profile }));
  }, [state.user, loadProfile, safeSet]);

  const updateFavouriteTeams = useCallback(async (teams: string[]) => {
    if (!state.user) return;
    try {
      await api.patch('/user/profile', { favouriteTeams: teams });
      safeSet(prev => ({
        ...prev,
        user:    prev.user    ? { ...prev.user, favouriteTeams: teams } : prev.user,
        profile: prev.profile ? { ...prev.profile, favoriteTeams: teams } : prev.profile,
      }));
    } catch (e: any) {
      console.error('[Auth] updateFavouriteTeams:', e.message);
    }
  }, [state.user, safeSet]);

  return (
    <AuthContext.Provider value={{
      ...state,
      sendOtp, verifyOtpLogin, completeSignup,
      logout, deleteAccount, refreshProfile, updateFavouriteTeams,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
