import { useQuery } from '@tanstack/react-query';
import { getLeagueMatches } from '@/services/matchService';
import { getFootballMatches } from '@/services/footballService';
import { adaptMatch } from '@/utils/matchAdapter';
import { adaptFootballMatches } from '@/utils/footballMatchAdapter';
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

export function useHomeFeed(): HomeFeedResult {
  const cricketQ = useQuery({
    queryKey: ['homefeed:cricket'],
    queryFn: async () => {
      const d = await getLeagueMatches('ipl');
      return {
        live:      d.live.map(adaptMatch),
        upcoming:  d.upcoming.map(adaptMatch),
        completed: d.completed.map(adaptMatch),
      };
    },
    staleTime:       30_000,
    refetchInterval: (q) => (q.state.data?.live.length ? 30_000 : 120_000),
    retry: 1,
  });

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
    retry: 1,
  });

  return {
    cricket:      cricketQ.data  ?? EMPTY_C,
    football:     footballQ.data ?? EMPTY_F,
    isLoading:    cricketQ.isLoading && footballQ.isLoading,
    isRefetching: cricketQ.isRefetching || footballQ.isRefetching,
    refetch: async () => { await Promise.all([cricketQ.refetch(), footballQ.refetch()]); },
  };
}
