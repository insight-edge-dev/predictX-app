/**
 * useOvers.ts — ball-by-ball over data for a match.
 * Polls every 15s when match is live, static when completed.
 */

import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';

export interface Delivery {
  ball:        number;
  runs:        number;
  four:        boolean;
  six:         boolean;
  isWicket:    boolean;
  commentary:  string;
}

export interface Over {
  overNumber: number;
  balls:      Delivery[];
  overRuns:   number;
  wickets:    number;
}

export interface OversData {
  overs:       Over[];
  currentOver: number;
}

export function useOvers(matchId: string | undefined, isLive: boolean) {
  return useQuery<OversData>({
    queryKey:       ['match:overs', matchId],
    queryFn:        () => api.get<OversData>(`/matches/${matchId}/overs`),
    enabled:        !!matchId,
    staleTime:      isLive ? 15_000 : Infinity,
    refetchInterval: isLive ? 15_000 : false,
    retry:          1,
    placeholderData: { overs: [], currentOver: 0 },
  });
}
