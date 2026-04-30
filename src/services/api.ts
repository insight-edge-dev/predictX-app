/**
 * api.ts — thin HTTP client over fetch.
 *
 * Base URL:  src/config/api.ts → API_BASE_URL
 * Timeout:   10 seconds (AbortController)
 * Methods:   get, patch, post
 * Auth:      optional Bearer token on any call
 */

import { API_BASE_URL } from '@/config/api';

// 25 s — covers cold-cache backend startup (CricketData + Supabase)
const TIMEOUT_MS = 25_000;

async function request<T>(
  method: 'GET' | 'PATCH' | 'POST',
  endpoint: string,
  options: { body?: object; token?: string } = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`[API] ${method} ${url}`);

  // Race the actual fetch against a plain timeout Promise.
  // We do NOT use AbortController here — aborting mid-flight causes an
  // AbortError that is hard to distinguish from intentional cancellation.
  // matchService.fetchWithRetry handles the timeout rejection and retries.
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })),
      TIMEOUT_MS,
    ),
  );

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const fetchPromise = fetch(url, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  }).then(async (res) => {
    if (!res.ok) {
      throw new Error(`[API] ${method} ${endpoint} → HTTP ${res.status}`);
    }
    return res.json() as T;
  });

  return Promise.race([fetchPromise, timeoutPromise]);
}

const api = {
  get:  <T>(endpoint: string, token?: string) =>
    request<T>('GET', endpoint, { token }),

  patch: <T>(endpoint: string, body: object, token?: string) =>
    request<T>('PATCH', endpoint, { body, token }),

  post: <T>(endpoint: string, body: object, token?: string) =>
    request<T>('POST', endpoint, { body, token }),
};

export default api;
