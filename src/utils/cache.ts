/**
 * Generic in-memory TTL cache.
 * Single source of truth for all service caches.
 */

interface Entry<T> {
  data: T;
  expiry: number;
}

const store = new Map<string, Entry<unknown>>();

/** Return cached data if still fresh, else null. */
export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key) as Entry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

/** Store data with TTL in milliseconds. */
export function cacheSet<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, { data, expiry: Date.now() + ttlMs });
}

/**
 * Return cached data regardless of expiry.
 * Used for 429 fallback — stale data is better than no data.
 */
export function cacheGetStale<T>(key: string): T | null {
  const entry = store.get(key) as Entry<T> | undefined;
  return entry ? entry.data : null;
}

/** Remove a specific key. */
export function cacheDelete(key: string): void {
  store.delete(key);
}

/** Clear all cache entries. */
export function cacheInvalidateAll(): void {
  store.clear();
}
