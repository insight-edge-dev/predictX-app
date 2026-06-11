import { useQuery } from '@tanstack/react-query';
import { getTipsList, getMatchTip } from '@/services/tipsService';
import type { MatchWithTip, TipResponse } from '@/services/tipsService';
import { useLeague } from '@/contexts/LeagueContext';

export function useTipsList() {
  const { league } = useLeague();
  return useQuery<MatchWithTip[]>({
    queryKey:             ['tips:list', league.id],
    queryFn:              () => getTipsList(league.id),
    staleTime:            2 * 60_000,
    refetchOnMount:       false,
    refetchOnWindowFocus: false,
    retry:                1,
    placeholderData:      (prev) => prev,
  });
}

export function useMatchTip(matchId: string) {
  const { league } = useLeague();
  return useQuery<TipResponse>({
    queryKey:             ['tips:match', matchId, league.id],
    queryFn:              () => getMatchTip(matchId, league.id),
    enabled:              !!matchId,
    staleTime:            6 * 60 * 60_000,
    refetchOnMount:       false,
    refetchOnWindowFocus: false,
    retry:                1,
  });
}
