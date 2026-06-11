/**
 * useMatches.ts — React Query hooks for match data, league-aware.
 *
 * All hooks read the selected league from LeagueContext and
 * automatically re-fetch when the user switches leagues.
 *
 * Hooks:
 *   useMatchCategories()      — live / upcoming / completed for selected league
 *   useLeagueFixtures()       — full season schedule (6 h TTL)
 *   useUpcomingWithFixtures() — merged upcoming (deduped)
 *   useLeagueTable()          — points table for selected league
 *   useFullMatch(id)          — single match detail, polls 30 s when live
 *   useCachedMatch(id)        — synchronous cache lookup (no network)
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useRef, useCallback } from 'react';
import {
  getLeagueMatches,
  getLeagueFixtures,
  getLeagueTable,
  getMatchFull,
  getMatchFromCache,
  invalidateLeagueCache,
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
import { useLeague } from '@/contexts/LeagueContext';

// ── useMatchCategories ────────────────────────────────────────
//
// Primary hook for the Matches screen.
// Query key includes the league slug so switching league triggers a new fetch.

export function useMatchCategories() {
  const { league } = useLeague();
  const slug = league.id;

  const query = useQuery<MatchData>({
    queryKey:             [`${slug}:matches`],
    queryFn:              () => getLeagueMatches(slug, false),
    staleTime:            30_000,
    refetchOnMount:       true,
    refetchOnWindowFocus: false,
    retry:                0,
    placeholderData:      (prev) => prev,
    refetchInterval:      (q) => {
      const live = q.state.data?.live ?? [];
      return live.length > 0 ? 30_000 : 120_000;
    },
  });

  const isRefetchingRef = useRef(false);

  const refetch = useCallback(async () => {
    if (isRefetchingRef.current) return;
    isRefetchingRef.current = true;
    try {
      invalidateLeagueCache(slug);
      await query.refetch();
    } finally {
      isRefetchingRef.current = false;
    }
  }, [query, slug]);

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

// ── useLeagueFixtures ─────────────────────────────────────────

export function useLeagueFixtures() {
  const { league } = useLeague();
  const slug = league.id;

  return useQuery<AdaptedMatch[]>({
    queryKey:             [`${slug}:fixtures`],
    queryFn:              async () => adaptMatches(await getLeagueFixtures(slug)),
    staleTime:            6 * 60 * 60_000,
    refetchOnMount:       false,
    refetchOnWindowFocus: false,
    retry:                0,
    placeholderData:      (prev) => prev ?? [],
  });
}

// Keep old name as alias so existing imports don't break
export { useLeagueFixtures as useIPLFixtures };

// ── useUpcomingWithFixtures ───────────────────────────────────

export function useUpcomingWithFixtures(): {
  upcoming:  AdaptedMatch[];
  isLoading: boolean;
  isError:   boolean;
} {
  const { upcomingMatches, isLoading: lm, isError: em } = useMatchCategories();
  const { data: fixtures = [], isLoading: lf, isError: ef } = useLeagueFixtures();

  const merged = dedupeMatches([...upcomingMatches, ...fixtures.filter(f => f.isUpcoming)]);
  return { upcoming: merged, isLoading: lm || lf, isError: em || ef };
}

// ── useLeagueTable ────────────────────────────────────────────

export function useLeagueTable() {
  const { league } = useLeague();
  const slug = league.id;

  return useQuery<StandingsRow[]>({
    queryKey:             [`${slug}:table`],
    queryFn:              () => getLeagueTable(slug),
    staleTime:            15 * 60_000,
    refetchOnMount:       true,
    refetchOnWindowFocus: false,
    retry:                0,
    placeholderData:      (prev) => prev ?? [],
  });
}

// Keep old name as alias
export { useLeagueTable as useIPLTable };

// ── useMatches ────────────────────────────────────────────────

export function useMatches(): UseQueryResult<Match[], Error> {
  const { league } = useLeague();
  const slug = league.id;

  return useQuery<MatchData, Error, Match[]>({
    queryKey: [`${slug}:matches`],
    queryFn:  () => getLeagueMatches(slug, false),
    select:   (data) => {
      const seen = new Set<string>();
      const out: Match[] = [];
      for (const m of [...data.live, ...data.upcoming, ...data.completed]) {
        if (!seen.has(m.id)) { seen.add(m.id); out.push(m); }
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

export function useFullMatch(id: string) {
  return useQuery<FullMatch | null>({
    queryKey:             ['match:full', id],
    queryFn:              () => getMatchFull(id, false),
    staleTime:            0,
    refetchOnMount:       true,
    refetchOnWindowFocus: false,
    refetchInterval:      (q) => q.state.data?.status === 'live' ? 30_000 : false,
    retry:                0,
    enabled:              !!id,
  });
}

// ── useCachedMatch ────────────────────────────────────────────

export function useCachedMatch(matchId: string): Match | null {
  return getMatchFromCache(matchId);
}
