import { useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { getLeagueMatches } from '@/services/matchService';
import { getFootballMatches } from '@/services/footballService';
import { adaptMatch } from '@/utils/matchAdapter';
import { adaptFootballMatches } from '@/utils/footballMatchAdapter';
import { useLeague } from '@/contexts/LeagueContext';
import type { AdaptedMatch } from '@/utils/matchAdapter';
import type { FootballMatch } from '@/types/football';

export interface HomeFeedResult {
  cricket: {
    live:      AdaptedMatch[];
    upcoming:  AdaptedMatch[];
    completed: AdaptedMatch[];
  };
  football: {
    live:      FootballMatch[];
    upcoming:  FootballMatch[];
    completed: FootballMatch[];
  };
  isLoading:    boolean;
  isRefetching: boolean;
  refetch:      () => Promise<void>;
}

const EMPTY_C = { live: [] as AdaptedMatch[],   upcoming: [] as AdaptedMatch[],   completed: [] as AdaptedMatch[]   };
const EMPTY_F = { live: [] as FootballMatch[], upcoming: [] as FootballMatch[], completed: [] as FootballMatch[] };

export function useHomeFeed(options?: { enabled?: boolean }): HomeFeedResult {
  const enabled = options?.enabled ?? true;
  const { leagues } = useLeague();

  // Every in-season cricket league, not just IPL — mirrors useAllMatches'
  // curation so the global Discovery feed actually is cross-league.
  const cricketLeagues = useMemo(
    () => leagues.filter(l => (l.sport === 'cricket' || !l.sport) && l.season === '2026'),
    [leagues],
  );

  const cricketQs = useQueries({
    queries: cricketLeagues.map((l) => ({
      queryKey:        [`homefeed:cricket:${l.id}`],
      queryFn:          () => getLeagueMatches(l.id, false),
      staleTime:        30_000,
      refetchInterval:  (q) => (q.state.data as any)?.live?.length > 0 ? 30_000 : 5 * 60_000,
      retry:            0,
      enabled,
    })),
  });

  const cricketLoading    = cricketQs.some(q => q.isLoading);
  const cricketRefetching = cricketQs.some(q => q.isRefetching);
  const cricketRefetchAll = () => Promise.all(cricketQs.map(q => q.refetch()));

  const cricket = useMemo(() => {
    const live: AdaptedMatch[] = [], upcoming: AdaptedMatch[] = [], completed: AdaptedMatch[] = [];
    cricketLeagues.forEach((l, i) => {
      const d = cricketQs[i]?.data;
      if (!d) return;
      d.live.map(adaptMatch).forEach(m      => live.push({ ...m, leagueLabel: l.short }));
      d.upcoming.map(adaptMatch).forEach(m  => upcoming.push({ ...m, leagueLabel: l.short }));
      d.completed.map(adaptMatch).forEach(m => completed.push({ ...m, leagueLabel: l.short }));
    });
    const byDate = (dir: 'asc' | 'desc') => (a: AdaptedMatch, b: AdaptedMatch) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return dir === 'asc' ? diff : -diff;
    };
    live.sort(byDate('asc'));
    upcoming.sort(byDate('asc'));
    completed.sort(byDate('desc'));
    return live.length || upcoming.length || completed.length ? { live, upcoming, completed } : EMPTY_C;
    // Use a stable string key instead of spreading the queries array, whose size
    // changes when cricketLeagues loads — a variable-size spread violates hook rules.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cricketLeagues, cricketQs.map(q => q.dataUpdatedAt).join(',')]);

  const footballQ = useQuery({
    queryKey: ['homefeed:football'],
    queryFn: async () => {
      const d = await getFootballMatches();
      return {
        live:      adaptFootballMatches(d.live      ?? []),
        upcoming:  adaptFootballMatches(d.upcoming  ?? []),
        completed: adaptFootballMatches(d.completed ?? []),
      };
    },
    staleTime:       30_000,
    refetchInterval: (q) => (q.state.data?.live.length ? 30_000 : 120_000),
    retry:   1,
    enabled,
  });

  return {
    cricket,
    football:     footballQ.data ?? EMPTY_F,
    isLoading:    cricketLoading && footballQ.isLoading,
    isRefetching: cricketRefetching || footballQ.isRefetching,
    refetch: async () => { await Promise.all([cricketRefetchAll(), footballQ.refetch()]); },
  };
}
