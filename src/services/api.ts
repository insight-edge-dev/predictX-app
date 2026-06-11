/**
 * api.ts — HTTP client with automatic JWT refresh.
 *
 * Access token (15 min) lives in memory only.
 * Refresh token (90 days) lives in SecureStore.
 *
 * On 401 TOKEN_EXPIRED: transparently refreshes and retries once.
 * On refresh failure: fires AUTH_EXPIRED event → AuthContext clears state.
 */

import { API_BASE_URL } from '@/config/api';
import * as SecureStore from 'expo-secure-store';

const TIMEOUT_MS          = 25_000;
const REFRESH_TOKEN_KEY   = 'auth_refresh_token';
export const AUTH_EXPIRED = 'AUTH_EXPIRED';

// ── In-memory access token ────────────────────────────────────

let _accessToken: string | null = null;

export function setAccessToken(token: string | null) { _accessToken = token; }
export function getAccessToken(): string | null       { return _accessToken; }

// ── Refresh token (SecureStore) ───────────────────────────────

export async function getRefreshToken(): Promise<string | null> {
  try { return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY); }
  catch { return null; }
}

export async function setRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function clearRefreshToken(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

// ── Global auth-expired event (listened to by AuthContext) ────

export function emitAuthExpired() {
  _authExpiredListeners.forEach(fn => fn());
}

const _authExpiredListeners: Array<() => void> = [];
export function onAuthExpired(fn: () => void): () => void {
  _authExpiredListeners.push(fn);
  return () => {
    const i = _authExpiredListeners.indexOf(fn);
    if (i >= 0) _authExpiredListeners.splice(i, 1);
  };
}

// ── Refresh deduplication ─────────────────────────────────────

let _refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const raw = await getRefreshToken();
  if (!raw) return false;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken: raw }),
    });
    if (!res.ok) return false;

    const data = await res.json();
    setAccessToken(data.accessToken);
    await setRefreshToken(data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function refreshOnce(): Promise<boolean> {
  if (!_refreshPromise) {
    _refreshPromise = doRefresh().finally(() => { _refreshPromise = null; });
  }
  return _refreshPromise;
}

// ── Core request ──────────────────────────────────────────────

async function request<T>(
  method:   'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  endpoint: string,
  options:  { body?: object; skipAuth?: boolean } = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  if (__DEV__) console.log(`[API] ${method} ${url}`);

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })),
      TIMEOUT_MS,
    ),
  );

  const makeHeaders = () => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (!options.skipAuth && _accessToken) h['Authorization'] = `Bearer ${_accessToken}`;
    return h;
  };

  const doFetch = () =>
    fetch(url, {
      method,
      headers: makeHeaders(),
      body:    options.body ? JSON.stringify(options.body) : undefined,
    });

  const fetchWithRetry = async (): Promise<T> => {
    let res = await Promise.race([doFetch(), timeoutPromise]);

    // Token expired → refresh and retry once
    if (res.status === 401) {
      const body = await res.json().catch(() => ({}));
      if (body.code === 'TOKEN_EXPIRED') {
        const refreshed = await refreshOnce();
        if (refreshed) {
          res = await Promise.race([doFetch(), timeoutPromise]);
        } else {
          await clearRefreshToken();
          setAccessToken(null);
          emitAuthExpired();
          throw new Error('Session expired. Please log in again.');
        }
      }
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error ?? `HTTP ${res.status}`);
    }

    return res.json() as Promise<T>;
  };

  return fetchWithRetry();
}

// ── Public API ────────────────────────────────────────────────

const api = {
  get: <T>(endpoint: string) =>
    request<T>('GET', endpoint),

  post: <T>(endpoint: string, body: object) =>
    request<T>('POST', endpoint, { body }),

  patch: <T>(endpoint: string, body: object) =>
    request<T>('PATCH', endpoint, { body }),

  put: <T>(endpoint: string, body: object) =>
    request<T>('PUT', endpoint, { body }),

  delete: <T>(endpoint: string) =>
    request<T>('DELETE', endpoint),
};

export default api;
