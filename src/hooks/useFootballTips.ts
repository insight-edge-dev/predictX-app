import { useQuery } from '@tanstack/react-query';
import { getFootballTipsList, getFootballMatchTip } from '@/services/footballService';
import { adaptFootballMatch } from '@/utils/footballMatchAdapter';
import type { FootballMatchWithTip, FootballPrediction } from '@/types/football';

export function useFootballTips() {
  return useQuery({
    queryKey: ['football:tips'],
    queryFn:  async () => {
      const { matches } = await getFootballTipsList();
      return matches.map(m => ({ ...adaptFootballMatch(m), tip: m.tip })) as FootballMatchWithTip[];
    },
    staleTime: 30 * 60 * 1000, // 30 min
    retry:     1,
  });
}

export function useFootballMatchTip(matchId: string | undefined) {
  return useQuery<{ match: ReturnType<typeof adaptFootballMatch>; tip: FootballPrediction }>({
    queryKey: ['football:tip', matchId],
    queryFn:  async () => {
      const { match, tip } = await getFootballMatchTip(matchId!);
      return { match: adaptFootballMatch(match), tip };
    },
    enabled:   !!matchId,
    staleTime: 24 * 60 * 60 * 1000, // 24h — deterministic, no need to refetch often
    retry:     1,
  });
}
