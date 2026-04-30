/**
 * matchService.ts — data layer for all match-related backend calls.
 *
 * Data flow:  Frontend → api.get() → Node backend → CricketData API
 *
 * Abort / timeout handling:
 *   api.ts races fetch() against a 15 s timeout Promise.  An AbortError is NOT a
 *   real error — it means the request timed out or was cancelled.
 *   We catch it silently, retry once, then return the last-known cache.
 *
 * Request deduplication:
 *   In-flight promises are stored by key.  Concurrent callers receive the
 *   same Promise — no duplicate network requests.
 *
 * Caching strategy:
 *   - /ipl/matches     → 60 s module-level cache  (isFetching lock → promise ref)
 *   - /ipl/fixtures    → 6 h via cache utils
 *   - /ipl/table       → 6 h via cache utils
 *   - /matches/:id/full → 60 s (30 s when live)
 *   - squad / scorecard → 10 min
 */

import api from './api';
import type { Match } from '@/types/match';
import { cacheGet, cacheSet } from '@/utils/cache';

// ── Response shapes ───────────────────────────────────────────

export interface MatchData {
  live:      Match[];
  upcoming:  Match[];
  completed: Match[];
}

export interface Player {
  id:           string;
  name:         string;
  role:         string;
  battingStyle: string;
  bowlingStyle: string;
  isCaptain:    boolean;
  isKeeper:     boolean;
}

export interface SquadData {
  matchId:      string;
  team1:        { name: string; shortName: string };
  team2:        { name: string; shortName: string };
  team1Players: Player[];
  team2Players: Player[];
}

export interface BatsmanRow {
  id:         string;
  name:       string;
  runs:       number;
  balls:      number;
  fours:      number;
  sixes:      number;
  strikeRate: number;
  dismissal:  string;
  isNotOut:   boolean;
  isCaptain?: boolean;
  isKeeper?:  boolean;
}

export interface BowlerRow {
  id:      string;
  name:    string;
  overs:   number;
  maidens: number;
  runs:    number;
  wickets: number;
  economy: number;
}

export interface InningsExtras {
  runs: number;
  nb:   number;
  wd:   number;
  lb:   number;
  b:    number;
}

export interface InningsTotal {
  runs:    number;
  wickets: number;
  overs:   string;
}

export interface FowEntry {
  player: string;
  runs:   number;
  over:   string;
}

export interface Innings {
  inning:    string;
  batsmen:   BatsmanRow[];
  bowlers:   BowlerRow[];
  extras:    InningsExtras | null;
  total:     InningsTotal  | null;
  yetToBat:  string[];
  fow:       FowEntry[];
}

export interface FullMatch extends Match {
  squad:     SquadData | null;
  scorecard: Innings[] | null;
  seriesId?: string;
}

export interface StandingsRow {
  teamShort:  string;
  teamName:   string;
  logo:       string;
  played:     number;
  wins:       number;
  losses:     number;
  nrr:        number;
  points:     number;
  last5:      ('W' | 'L' | 'N')[];
}

// ── TTLs ──────────────────────────────────────────────────────

const TTL_MATCHES = 60_000;       // 60 s
const TTL_DETAIL  = 60_000;       // 60 s (30 s for live)
const TTL_STATIC  = 10 * 60_000;  // 10 min

// ── Safe empty states ─────────────────────────────────────────

const EMPTY: MatchData = { live: [], upcoming: [], completed: [] };

// ── Abort / error helpers ─────────────────────────────────────

function isAbortError(e: unknown): boolean {
  if (e instanceof Error) {
    return e.name === 'AbortError' || e.message === 'Aborted' || e.message === 'aborted';
  }
  return false;
}

/**
 * fetchWithRetry — wraps a single API call with abort-aware retry logic.
 *
 * On AbortError (timeout / cancellation):
 *   - logs a low-severity message (not console.error)
 *   - waits 300 ms then retries once
 *   - on second failure returns `fallback`
 *
 * On any other error:
 *   - logs as error and returns `fallback` immediately
 */
async function fetchWithRetry<T>(
  label:    string,
  fn:       () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (isAbortError(e)) {
      console.log(`[matchService] ${label}: request cancelled/timeout — retrying once…`);
      // Brief pause before retry so we don't immediately hammer a slow backend
      await new Promise((r) => setTimeout(r, 300));
      try {
        return await fn();
      } catch (e2) {
        if (isAbortError(e2)) {
          console.log(`[matchService] ${label}: retry also cancelled — returning cached fallback`);
        } else {
          console.error(`[matchService] ${label}: retry failed:`, (e2 as Error).message);
        }
        return fallback;
      }
    }
    console.error(`[matchService] ${label} error:`, (e as Error).message);
    return fallback;
  }
}

// ── Module-level cache ────────────────────────────────────────

let matchCache: MatchData | null = null;
let lastFetch  = 0;

// In-flight promise refs — deduplication so concurrent callers share one request
let inflightMatches:  Promise<MatchData>    | null = null;
let inflightFixtures: Promise<Match[]>      | null = null;
let inflightTable:    Promise<StandingsRow[]> | null = null;

// ── getIPLMatches ─────────────────────────────────────────────
// GET /api/ipl/matches → { live, upcoming, completed }
//
// Primary entry point. Deduplicates concurrent calls — only one
// network request is ever in-flight at a time.

export async function getIPLMatches(forceRefresh = false): Promise<MatchData> {
  // 1. Return fresh cache
  if (!forceRefresh && matchCache && Date.now() - lastFetch < TTL_MATCHES) {
    return matchCache;
  }
  // 2. Deduplicate: return the same in-flight promise to all concurrent callers
  if (inflightMatches) {
    return inflightMatches;
  }

  // 3. Fire the request
  inflightMatches = fetchWithRetry(
    'getIPLMatches',
    async () => {
      const data = await api.get<MatchData>('/ipl/matches');
      const safe: MatchData = {
        live:      Array.isArray(data.live)      ? data.live      : [],
        upcoming:  Array.isArray(data.upcoming)  ? data.upcoming  : [],
        completed: Array.isArray(data.completed) ? data.completed : [],
      };
      matchCache = safe;
      lastFetch  = Date.now();
      return safe;
    },
    matchCache ?? EMPTY,
  ).finally(() => {
    inflightMatches = null;
  });

  return inflightMatches;
}

// ── getMatches ────────────────────────────────────────────────

export async function getMatches(forceRefresh = false): Promise<MatchData> {
  return getIPLMatches(forceRefresh);
}

// ── Individual category endpoints ─────────────────────────────

export async function getLiveMatches(): Promise<Match[]> {
  return fetchWithRetry(
    'getLiveMatches',
    async () => {
      const data = await api.get<{ live: Match[] }>('/matches/live');
      return Array.isArray(data.live) ? data.live : [];
    },
    matchCache?.live ?? [],
  );
}

export async function getUpcomingMatches(): Promise<Match[]> {
  return fetchWithRetry(
    'getUpcomingMatches',
    async () => {
      const data = await api.get<{ upcoming: Match[] }>('/matches/upcoming');
      return Array.isArray(data.upcoming) ? data.upcoming : [];
    },
    matchCache?.upcoming ?? [],
  );
}

export async function getResults(): Promise<Match[]> {
  return fetchWithRetry(
    'getResults',
    async () => {
      const data = await api.get<{ completed: Match[] }>('/matches/results');
      return Array.isArray(data.completed) ? data.completed : [];
    },
    matchCache?.completed ?? [],
  );
}

// ── getIPLFixtures ────────────────────────────────────────────
// GET /api/ipl/fixtures → { fixtures: Match[] }

export async function getIPLFixtures(): Promise<Match[]> {
  const cacheKey = 'ipl:fixtures';
  const cached   = cacheGet<Match[]>(cacheKey);
  if (cached) return cached;

  if (inflightFixtures) return inflightFixtures;

  inflightFixtures = fetchWithRetry(
    'getIPLFixtures',
    async () => {
      const data     = await api.get<{ fixtures: Match[] }>('/ipl/fixtures');
      const fixtures = Array.isArray(data.fixtures) ? data.fixtures : [];
      cacheSet(cacheKey, fixtures, 6 * 60 * 60_000); // 6 h
      return fixtures;
    },
    cacheGet<Match[]>(cacheKey) ?? [],
  ).finally(() => {
    inflightFixtures = null;
  });

  return inflightFixtures;
}

// ── getIPLTable ───────────────────────────────────────────────
// GET /api/ipl/table → { table: StandingsRow[] }

export async function getIPLTable(): Promise<StandingsRow[]> {
  const cacheKey = 'ipl:table';
  const cached   = cacheGet<StandingsRow[]>(cacheKey);
  if (cached) return cached;

  if (inflightTable) return inflightTable;

  inflightTable = fetchWithRetry(
    'getIPLTable',
    async () => {
      const res  = await api.get<{ table: StandingsRow[] }>('/ipl/table');
      const rows = Array.isArray(res.table) ? res.table : [];
      cacheSet(cacheKey, rows, 6 * 60 * 60_000); // 6 h
      return rows;
    },
    cacheGet<StandingsRow[]>(cacheKey) ?? [],
  ).finally(() => {
    inflightTable = null;
  });

  return inflightTable;
}

// ── Single match ──────────────────────────────────────────────

export async function getMatch(id: string): Promise<Match | null> {
  const key    = `match:${id}`;
  const cached = cacheGet<Match>(key);
  if (cached) return cached;

  return fetchWithRetry(
    `getMatch(${id})`,
    async () => {
      const data = await api.get<Match>(`/matches/${id}`);
      cacheSet(key, data, TTL_MATCHES);
      return data;
    },
    getMatchFromCache(id),
  );
}

// ── Full match detail ─────────────────────────────────────────

export async function getMatchFull(
  id:           string,
  forceRefresh = false,
): Promise<FullMatch | null> {
  const key = `full:${id}`;
  if (!forceRefresh) {
    const cached = cacheGet<FullMatch>(key);
    if (cached) return cached;
  }

  return fetchWithRetry(
    `getMatchFull(${id})`,
    async () => {
      const data = await api.get<FullMatch>(`/matches/${id}/full`);
      const ttl  = data?.status === 'live' ? 30_000 : TTL_DETAIL;
      cacheSet(key, data, ttl);
      return data;
    },
    cacheGet<FullMatch>(key) ?? null,
  );
}

// ── Squad ─────────────────────────────────────────────────────

export async function getSquad(id: string): Promise<SquadData> {
  const key    = `squad:${id}`;
  const cached = cacheGet<SquadData>(key);
  if (cached) return cached;

  const empty: SquadData = {
    matchId:      id,
    team1:        { name: '', shortName: '' },
    team2:        { name: '', shortName: '' },
    team1Players: [],
    team2Players: [],
  };

  return fetchWithRetry(
    `getSquad(${id})`,
    async () => {
      const data = await api.get<SquadData>(`/matches/${id}/squad`);
      const hasPlayers =
        (data.team1Players?.length ?? 0) > 0 ||
        (data.team2Players?.length ?? 0) > 0;
      if (hasPlayers) cacheSet(key, data, TTL_STATIC);
      return {
        matchId:      id,
        team1:        data.team1        ?? { name: '', shortName: '' },
        team2:        data.team2        ?? { name: '', shortName: '' },
        team1Players: data.team1Players ?? [],
        team2Players: data.team2Players ?? [],
      };
    },
    empty,
  );
}

// ── Scorecard ─────────────────────────────────────────────────

export async function getScorecard(id: string): Promise<Innings[]> {
  const key    = `scorecard:${id}`;
  const cached = cacheGet<Innings[]>(key);
  if (cached) return cached;

  return fetchWithRetry(
    `getScorecard(${id})`,
    async () => {
      const data    = await api.get<{ scorecard: Innings[] }>(`/matches/${id}/scorecard`);
      const innings = Array.isArray(data.scorecard) ? data.scorecard : [];
      if (innings.length > 0) cacheSet(key, innings, TTL_STATIC);
      return innings;
    },
    [],
  );
}

// ── Match series ──────────────────────────────────────────────

export async function getMatchSeries(
  id: string,
): Promise<{ seriesId: string; seriesName: string } | null> {
  const key    = `match-series:${id}`;
  const cached = cacheGet<{ seriesId: string; seriesName: string }>(key);
  if (cached) return cached;

  return fetchWithRetry(
    `getMatchSeries(${id})`,
    async () => {
      const data = await api.get<{ seriesId: string; seriesName: string }>(
        `/matches/${id}/series`,
      );
      cacheSet(key, data, TTL_STATIC);
      return data;
    },
    null,
  );
}

// ── Cache helpers ─────────────────────────────────────────────

export function getMatchFromCache(id: string): Match | null {
  if (!matchCache) return null;
  return (
    matchCache.live.find((m) => m.id === id)      ??
    matchCache.upcoming.find((m) => m.id === id)  ??
    matchCache.completed.find((m) => m.id === id) ??
    null
  );
}

export function invalidateCache(): void {
  matchCache   = null;
  lastFetch    = 0;
  // Don't null inflightMatches — let the in-flight request complete
}

// ── checkBackendHealth ────────────────────────────────────────
// Pings GET /health and returns true if the backend is reachable.
// Use this to diagnose connectivity before blaming match data.

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(
      // Derive health URL from the configured base (strip "/api")
      (await import('@/config/api')).API_BASE_URL.replace(/\/api$/, '') + '/health',
      { signal: AbortSignal.timeout ? AbortSignal.timeout(5_000) : undefined },
    );
    if (res.ok) {
      const body = await res.json();
      console.log('[matchService] health check OK:', body);
      return true;
    }
    console.warn('[matchService] health check HTTP', res.status);
    return false;
  } catch (e) {
    console.warn('[matchService] health check failed:', (e as Error).message);
    return false;
  }
}

// ── Series standings ──────────────────────────────────────────

export async function getSeriesTable(seriesId: string): Promise<StandingsRow[]> {
  const key    = `table:${seriesId}`;
  const cached = cacheGet<StandingsRow[]>(key);
  if (cached) return cached;

  return fetchWithRetry(
    `getSeriesTable(${seriesId})`,
    async () => {
      const res  = await api.get<{ table: StandingsRow[] }>(`/series/${seriesId}/table`);
      const rows = Array.isArray(res.table) ? res.table : [];
      cacheSet(key, rows, TTL_STATIC);
      return rows;
    },
    [],
  );
}
