/**
 * useMatches.ts — React Query hooks for all match data.
 *
 * Hooks:
 *   useMatchCategories()      — live / upcoming / completed; auto-polls when live
 *   useIPLFixtures()          — full season schedule (6 h TTL)
 *   useUpcomingWithFixtures() — merged upcoming (deduped)
 *   useMatches()              — flat Match[] across all categories
 *   useFullMatch(id)          — single match, polls 30 s when live
 *   useCachedMatch(id)        — synchronous cache lookup (no network)
 *
 * Double-call prevention:
 *   - All three list hooks share query key 'ipl:matches' — React Query
 *     fires exactly one network request regardless of how many components
 *     subscribe.
 *   - matchService.getIPLMatches stores the in-flight Promise so concurrent
 *     calls outside React Query also deduplicate.
 *   - refetch() is guarded by an isRefetching ref so rapid pull-to-refresh
 *     taps don't fire multiple invalidations.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useRef, useCallback } from 'react';
import {
  getIPLMatches,
  getIPLFixtures,
  getIPLTable,
  getMatchFull,
  getMatchFromCache,
  invalidateCache,
  type MatchData,
  type FullMatch,
  type StandingsRow,
} from '@/services/matchService';
import {
  adaptMatches,
  dedupeMatches,
  type AdaptedMatch,
} from '@/utils/matchAdapter';
import type { Match } from '@/types/match';

// ── useMatchCategories ────────────────────────────────────────
//
// Primary hook for the Matches screen.
//
// Auto-refresh rules:
//   • live matches present  → refetch every 30 s
//   • no live matches       → no background polling
//
// refetch() is guarded: if a refetch is already in-flight, the call is
// a no-op so rapid pull-to-refresh taps don't fire duplicate requests.

export function useMatchCategories() {
  const query            = useQuery<MatchData>({
    queryKey:             ['ipl:matches'],
    queryFn:              () => getIPLMatches(false),
    staleTime:            30_000,
    refetchOnMount:       true,
    refetchOnWindowFocus: false,
    // Only one retry — on AbortError matchService already retries internally
    retry:                0,
    placeholderData:      (prev) => prev,
    refetchInterval:      (q) => {
      const live = q.state.data?.live ?? [];
      return live.length > 0 ? 30_000 : false;
    },
  });

  // Guard: prevent firing invalidateCache + refetch while already refetching
  const isRefetchingRef = useRef(false);

  const refetch = useCallback(async () => {
    if (isRefetchingRef.current) return;
    isRefetchingRef.current = true;
    try {
      invalidateCache();
      await query.refetch();
    } finally {
      isRefetchingRef.current = false;
    }
  }, [query]);

  return {
    liveMatches:      adaptMatches(query.data?.live      ?? []),
    upcomingMatches:  adaptMatches(query.data?.upcoming  ?? []),
    completedMatches: adaptMatches(query.data?.completed ?? []),
    isLoading:        query.isLoading,
    isError:          query.isError,
    isRefetching:     query.isRefetching,
    refetch,
  };
}

// ── useIPLFixtures ────────────────────────────────────────────
//
// Full IPL season schedule from GET /api/ipl/fixtures.
// 6-hour stale time — fixtures rarely change.

export function useIPLFixtures() {
  return useQuery<AdaptedMatch[]>({
    queryKey:             ['ipl:fixtures'],
    queryFn:              async () => adaptMatches(await getIPLFixtures()),
    staleTime:            6 * 60 * 60_000,
    refetchOnMount:       false,
    refetchOnWindowFocus: false,
    retry:                0,
    placeholderData:      (prev) => prev ?? [],
  });
}

// ── useUpcomingWithFixtures ───────────────────────────────────
//
// Combines matches.upcoming (real-time) with fixtures (full schedule),
// deduped by id.  Ensures upcoming fixtures appear even before they
// enter the currentMatches window.

export function useUpcomingWithFixtures(): {
  upcoming:     AdaptedMatch[];
  isLoading:    boolean;
  isError:      boolean;
} {
  const {
    upcomingMatches,
    isLoading: loadingMatches,
    isError:   errorMatches,
  } = useMatchCategories();

  const {
    data:      fixtures = [],
    isLoading: loadingFixtures,
    isError:   errorFixtures,
  } = useIPLFixtures();

  const fixtureUpcoming = fixtures.filter((f) => f.isUpcoming);
  const merged          = dedupeMatches([...upcomingMatches, ...fixtureUpcoming]);

  return {
    upcoming:  merged,
    isLoading: loadingMatches || loadingFixtures,
    isError:   errorMatches   || errorFixtures,
  };
}

// ── useMatches ────────────────────────────────────────────────
//
// Flat deduped Match[] across all categories.
// Same query key as useMatchCategories → zero extra API calls.

export function useMatches(): UseQueryResult<Match[], Error> {
  return useQuery<MatchData, Error, Match[]>({
    queryKey: ['ipl:matches'],
    queryFn:  () => getIPLMatches(false),
    select:   (data) => {
      const seen = new Set<string>();
      const out: Match[] = [];
      for (const m of [...data.live, ...data.upcoming, ...data.completed]) {
        if (!seen.has(m.id)) {
          seen.add(m.id);
          out.push(m);
        }
      }
      return out;
    },
    staleTime:            30_000,
    refetchOnMount:       true,
    refetchOnWindowFocus: false,
    retry:                0,
    placeholderData:      (_, prev) => prev,
  });
}

// ── useFullMatch ──────────────────────────────────────────────
//
// Single match detail. Polls every 30 s while live.
// retry: 0 — matchService.getMatchFull already retries on AbortError.

export function useFullMatch(id: string) {
  return useQuery<FullMatch | null>({
    queryKey:             ['match:full', id],
    queryFn:              () => getMatchFull(id, false),
    staleTime:            0,
    refetchOnMount:       true,
    refetchOnWindowFocus: false,
    refetchInterval:      (q) =>
      q.state.data?.status === 'live' ? 30_000 : false,
    retry:   0,
    enabled: !!id,
  });
}

// ── useIPLTable ───────────────────────────────────────────────
//
// IPL 2026 points table. 15-min stale time — updates after every match.

export function useIPLTable() {
  return useQuery<StandingsRow[]>({
    queryKey:             ['ipl:table'],
    queryFn:              () => getIPLTable(),
    staleTime:            15 * 60_000,
    refetchOnMount:       true,
    refetchOnWindowFocus: false,
    retry:                0,
    placeholderData:      (prev) => prev ?? [],
  });
}

// ── useCachedMatch ────────────────────────────────────────────
//
// Synchronous cache lookup — no network call.

export function useCachedMatch(matchId: string): Match | null {
  return getMatchFromCache(matchId);
}
