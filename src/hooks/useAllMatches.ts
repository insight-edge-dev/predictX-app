/**
 * useAllMatches.ts — aggregates Live/Upcoming/Completed matches across every
 * cricket league plus football, for the default cross-league Matches feed.
 */

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { getLeagueMatches } from '@/services/matchService';
import { adaptMatches, type AdaptedMatch } from '@/utils/matchAdapter';
import { useFootballMatches } from '@/hooks/useFootballMatches';
import { useLeague } from '@/contexts/LeagueContext';
import type { FootballMatch } from '@/types/football';

export interface CricketMatchItem  { kind: 'cricket';  leagueId: string; leagueLabel: string; match: AdaptedMatch; }
export interface FootballMatchItem { kind: 'football'; leagueId: string; leagueLabel: string; match: FootballMatch; }
export type AllMatchItem = CricketMatchItem | FootballMatchItem;

function sortByDate(items: AllMatchItem[], dir: 'asc' | 'desc') {
  return [...items].sort((a, b) => {
    const ta = new Date(a.match.date).getTime();
    const tb = new Date(b.match.date).getTime();
    return dir === 'asc' ? ta - tb : tb - ta;
  });
}

export function useAllMatches() {
  const { leagues } = useLeague();

  // Only the in-season (2026) cricket leagues — mirrors the league picker's curation.
  const cricketLeagues = useMemo(
    () => leagues.filter(l => (l.sport === 'cricket' || !l.sport) && l.season === '2026'),
    [leagues],
  );

  const results = useQueries({
    queries: cricketLeagues.map((l) => ({
      queryKey:             [`${l.id}:matches`],
      queryFn:              () => getLeagueMatches(l.id, false),
      staleTime:            30_000,
      refetchOnWindowFocus: false,
      retry:                0,
    })),
  });

  const {
    liveMatches: fbLive, upcomingMatches: fbUpcoming, completedMatches: fbCompleted,
    isLoading: fbLoading, isRefetching: fbRefetching, refetch: fbRefetch,
  } = useFootballMatches();

  const queryData = results.map(r => r.data);
  const isLoading = results.some(r => r.isLoading) || fbLoading;

  const { live, upcoming, completed } = useMemo(() => {
    const live: AllMatchItem[]      = [];
    const upcoming: AllMatchItem[]  = [];
    const completed: AllMatchItem[] = [];

    cricketLeagues.forEach((l, i) => {
      const data = queryData[i];
      if (!data) return;
      adaptMatches(data.live).forEach(match      => live.push({ kind: 'cricket', leagueId: l.id, leagueLabel: l.short, match }));
      adaptMatches(data.upcoming).forEach(match  => upcoming.push({ kind: 'cricket', leagueId: l.id, leagueLabel: l.short, match }));
      adaptMatches(data.completed).forEach(match => completed.push({ kind: 'cricket', leagueId: l.id, leagueLabel: l.short, match }));
    });

    const fbLeague = leagues.find(l => l.sport === 'football')?.id ?? 'wc2026';
    fbLive.forEach(match      => live.push({ kind: 'football', leagueId: fbLeague, leagueLabel: 'WC 2026', match }));
    fbUpcoming.forEach(match  => upcoming.push({ kind: 'football', leagueId: fbLeague, leagueLabel: 'WC 2026', match }));
    fbCompleted.forEach(match => completed.push({ kind: 'football', leagueId: fbLeague, leagueLabel: 'WC 2026', match }));

    return {
      live:      sortByDate(live, 'asc'),
      upcoming:  sortByDate(upcoming, 'asc'),
      completed: sortByDate(completed, 'desc'),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cricketLeagues, fbLive, fbUpcoming, fbCompleted, ...queryData]);

  return {
    live, upcoming, completed,
    isLoading,
    isRefetching: fbRefetching,
    refetch: fbRefetch,
  };
}
