import { useQuery } from '@tanstack/react-query';
import { getFootballMatches, getFootballLive } from '@/services/footballService';
import { adaptFootballMatches } from '@/utils/footballMatchAdapter';
import type { FootballMatch } from '@/types/football';

interface FootballMatchCategories {
  liveMatches:      FootballMatch[];
  upcomingMatches:  FootballMatch[];
  completedMatches: FootballMatch[];
  isLoading:        boolean;
  isError:          boolean;
  isRefetching:     boolean;
  refetch:          () => Promise<void>;
}

export function useFootballMatches(): FootballMatchCategories {
  const { data, isLoading, isError, isRefetching, refetch } = useQuery({
    queryKey: ['football:matches'],
    queryFn:  async () => {
      const res = await getFootballMatches();
      return {
        live:      adaptFootballMatches(res.live      ?? []),
        upcoming:  adaptFootballMatches(res.upcoming  ?? []),
        completed: adaptFootballMatches(res.completed ?? []),
      };
    },
    staleTime:       30 * 1000,   // 30s
    refetchInterval: (query) => {
      // Poll faster if there are live matches
      const live = query.state.data?.live ?? [];
      return live.length > 0 ? 60_000 : 2 * 60_000;
    },
    retry: 1,
  });

  return {
    liveMatches:      data?.live      ?? [],
    upcomingMatches:  data?.upcoming  ?? [],
    completedMatches: data?.completed ?? [],
    isLoading,
    isError,
    isRefetching,
    refetch: async () => { await refetch(); },
  };
}

export function useFootballMatchDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['football:match', id],
    queryFn:  async () => {
      const { match } = await import('@/services/footballService').then(s => s.getFootballMatchById(id!));
      return adaptFootballMatches([match])[0];
    },
    enabled:         !!id,
    staleTime:       5 * 60 * 1000,
    refetchInterval: (query) => {
      const match = query.state.data;
      return match?.status === 'live' ? 60_000 : false;
    },
    retry: 1,
  });
}
