import { useQuery } from '@tanstack/react-query';
import { getTipsList, getMatchTip } from '@/services/tipsService';
import type { MatchWithTip, TipResponse } from '@/services/tipsService';

export function useTipsList() {
  return useQuery<MatchWithTip[]>({
    queryKey:             ['tips:list'],
    queryFn:              getTipsList,
    staleTime:            2 * 60_000,
    refetchOnMount:       false,
    refetchOnWindowFocus: false,
    retry:                1,
    placeholderData:      (prev) => prev,
  });
}

export function useMatchTip(matchId: string) {
  return useQuery<TipResponse>({
    queryKey:             ['tips:match', matchId],
    queryFn:              () => getMatchTip(matchId),
    enabled:              !!matchId,
    staleTime:            6 * 60 * 60_000,
    refetchOnMount:       false,
    refetchOnWindowFocus: false,
    retry:                1,
  });
}
