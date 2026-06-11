/**
 * useLineup.ts — confirmed Playing XI for a match.
 * Lineup is only available after toss (~45 min before start).
 * Fetched once and cached for the day.
 */

import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';

export interface LineupPlayer {
  id:           string;
  name:         string;
  role:         string;
  battingStyle: string;
  bowlingStyle: string;
  image:        string;
}

export interface LineupData {
  team1XI: LineupPlayer[];
  team2XI: LineupPlayer[];
}

export function useLineup(matchId: string | undefined) {
  return useQuery<LineupData>({
    queryKey:    ['match:lineup', matchId],
    queryFn:     () => api.get<LineupData>(`/matches/${matchId}/lineup`),
    enabled:     !!matchId,
    staleTime:   30 * 60_000,
    retry:       1,
    placeholderData: { team1XI: [], team2XI: [] },
  });
}
