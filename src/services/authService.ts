/**
 * authService.ts — custom phone OTP auth.
 * Calls backend directly (not Supabase Auth).
 */

import { API_BASE_URL } from '@/config/api';
import { setAccessToken, setRefreshToken, clearRefreshToken, getRefreshToken } from './api';

export interface AppUser {
  id:             string;
  phone:          string;
  displayName:    string | null;
  favouriteTeams: string[];
  isNewUser?:     boolean;
}

export interface AuthTokens {
  accessToken:  string;
  refreshToken: string;
  expiresIn:    number;
}

export interface SimpleResult {
  success: boolean;
  error:   string | null;
}

export interface VerifyResult {
  success: boolean;
  user:    AppUser | null;
  tokens:  AuthTokens | null;
  error:   string | null;
}

export interface RefreshResult {
  success: boolean;
  user:    AppUser | null;
  tokens:  AuthTokens | null;
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits.startsWith('91') ? `+${digits}` : `+91${digits}`;
}

async function post<T>(endpoint: string, body: object): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as T;
}

// ── Send OTP ─────────────────────────────────────────────────

export async function sendOtp(phone: string): Promise<SimpleResult> {
  try {
    await post('/auth/send-otp', { phone: formatPhone(phone) });
    return { success: true, error: null };
  } catch (e: any) {
    return { success: false, error: e.message ?? 'Failed to send OTP' };
  }
}

// ── Verify OTP ────────────────────────────────────────────────

export async function verifyOtp(phone: string, otp: string): Promise<VerifyResult> {
  try {
    const data = await post<{ accessToken: string; refreshToken: string; expiresIn: number; user: AppUser }>(
      '/auth/verify-otp',
      { phone: formatPhone(phone), otp },
    );
    return {
      success: true,
      user:    data.user,
      tokens:  { accessToken: data.accessToken, refreshToken: data.refreshToken, expiresIn: data.expiresIn },
      error:   null,
    };
  } catch (e: any) {
    return { success: false, user: null, tokens: null, error: e.message ?? 'Verification failed' };
  }
}

// ── Refresh session (called on app start) ─────────────────────

export async function refreshSession(): Promise<RefreshResult> {
  const raw = await getRefreshToken();
  if (!raw) return { success: false, user: null, tokens: null };

  try {
    const data = await post<{ accessToken: string; refreshToken: string; expiresIn: number; user: AppUser }>(
      '/auth/refresh',
      { refreshToken: raw },
    );
    return {
      success: true,
      user:    data.user,
      tokens:  { accessToken: data.accessToken, refreshToken: data.refreshToken, expiresIn: data.expiresIn },
    };
  } catch {
    return { success: false, user: null, tokens: null };
  }
}

// ── Set display name ──────────────────────────────────────────

export async function setDisplayName(name: string, accessToken: string): Promise<SimpleResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/set-name`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body:    JSON.stringify({ displayName: name }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error ?? 'Failed to save name' };
    return { success: true, error: null };
  } catch (e: any) {
    return { success: false, error: e.message ?? 'Failed to save name' };
  }
}

// ── Read stored refresh token (for logout) ───────────────────

export async function getStoredRefreshToken(): Promise<string | null> {
  return getRefreshToken();
}

// ── Persist tokens after login ────────────────────────────────

export async function persistTokens(tokens: AuthTokens): Promise<void> {
  setAccessToken(tokens.accessToken);
  await setRefreshToken(tokens.refreshToken);
}

// ── Clear tokens on logout ────────────────────────────────────

export async function clearTokens(): Promise<void> {
  setAccessToken(null);
  await clearRefreshToken();
}

// ── Logout ────────────────────────────────────────────────────

export async function logout(accessToken: string, refreshToken: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body:    JSON.stringify({ refreshToken }),
    });
  } catch { /* fire and forget */ }
  await clearTokens();
}
