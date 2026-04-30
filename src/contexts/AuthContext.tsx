import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import type { Session, User } from "@supabase/supabase-js";
import * as authService from "@/services/authService";
import * as profileService from "@/services/profileService";
import type { UserProfile } from "@/types/prediction";

// ── Types ────────────────────────────────────────────────────

interface AuthState {
  user:            User | null;
  session:         Session | null;
  profile:         UserProfile | null;
  isLoading:       boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  // Login — password
  loginWithPassword: (phone: string, password: string) => Promise<{ success: boolean; error: string | null }>;
  // Login — OTP (send + verify)
  sendOtp:           (phone: string) => Promise<{ success: boolean; error: string | null }>;
  verifyOtpLogin:    (phone: string, otp: string) => Promise<{ success: boolean; error: string | null }>;
  // Signup — final step (called after screen-level OTP verify)
  completeSignup:    (name: string, password: string) => Promise<{ success: boolean; error: string | null }>;
  // Common
  logout:               () => Promise<void>;
  refreshProfile:       () => Promise<void>;
  updateFavouriteTeams: (teams: string[]) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user:            null,
    session:         null,
    profile:         null,
    isLoading:       true,
    isAuthenticated: false,
  });

  const mountedRef = useRef(true);

  const safeSetState = useCallback(
    (updater: AuthState | ((prev: AuthState) => AuthState)) => {
      if (mountedRef.current) setState(updater);
    },
    [],
  );

  const loadProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try { return await profileService.getProfile(userId); }
    catch { return null; }
  }, []);

  const setAuthenticated = useCallback(async (user: User, session: Session) => {
    const profile = await loadProfile(user.id);
    safeSetState({ user, session, profile, isLoading: false, isAuthenticated: true });
  }, [loadProfile, safeSetState]);

  const clearState = useCallback(() => {
    safeSetState({ user: null, session: null, profile: null, isLoading: false, isAuthenticated: false });
  }, [safeSetState]);

  // ── Init ──────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;

    async function init() {
      const { session } = await authService.getSession();
      if (!mountedRef.current) return;
      if (session?.user) {
        await setAuthenticated(session.user, session);
      } else {
        safeSetState((prev) => ({ ...prev, isLoading: false }));
      }
    }
    init();

    const sub = authService.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return;
      if (event === 'INITIAL_SESSION') return;
      if (event === 'SIGNED_OUT') { clearState(); return; }
      if (session?.user) await setAuthenticated(session.user, session);
    });

    return () => {
      mountedRef.current = false;
      sub.unsubscribe();
    };
  }, [setAuthenticated, clearState, safeSetState]);

  // ── Auth methods ──────────────────────────────────────────

  const loginWithPassword = useCallback(async (phone: string, password: string) => {
    const result = await authService.signInWithPassword(phone, password);
    if (!result.success || !result.user || !result.session)
      return { success: false, error: result.error ?? 'Login failed' };
    await setAuthenticated(result.user, result.session);
    return { success: true, error: null };
  }, [setAuthenticated]);

  const sendOtp = useCallback(async (phone: string) => {
    return authService.sendOtp(phone);
  }, []);

  const verifyOtpLogin = useCallback(async (phone: string, otp: string) => {
    const result = await authService.verifyOtp(phone, otp);
    if (!result.success || !result.user || !result.session)
      return { success: false, error: result.error ?? 'Verification failed' };
    await setAuthenticated(result.user, result.session);
    return { success: true, error: null };
  }, [setAuthenticated]);

  /**
   * completeSignup — called by the signup screen after it has already
   * verified the OTP (Supabase session is live but isAuthenticated is still
   * false because we bypassed the context). Sets name + password, creates
   * the profile row, then marks the user as fully authenticated.
   */
  const completeSignup = useCallback(async (name: string, password: string) => {
    const update = await authService.updateUserDetails(name, password);
    if (!update.success) return { success: false, error: update.error };

    const { session } = await authService.getSession();
    if (!session?.user) return { success: false, error: 'Session lost. Please try again.' };

    await profileService.updateProfile(session.user.id, { displayName: name });
    await setAuthenticated(session.user, session);
    return { success: true, error: null };
  }, [setAuthenticated]);

  const logout = useCallback(async () => {
    await authService.signOut();
    clearState();
  }, [clearState]);

  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    const profile = await loadProfile(state.user.id);
    safeSetState((prev) => ({ ...prev, profile }));
  }, [state.user, loadProfile, safeSetState]);

  const updateFavouriteTeams = useCallback(async (teams: string[]) => {
    if (!state.user) return;
    await profileService.updateFavouriteTeams(state.user.id, teams);
    safeSetState((prev) => ({
      ...prev,
      profile: prev.profile ? { ...prev.profile, favoriteTeams: teams } : prev.profile,
    }));
  }, [state.user, safeSetState]);

  return (
    <AuthContext.Provider value={{
      ...state,
      loginWithPassword, sendOtp, verifyOtpLogin, completeSignup,
      logout, refreshProfile, updateFavouriteTeams,
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
