import { useQuery } from "@tanstack/react-query";
import { getSquad, type SquadData } from "@/services/matchService";

const SQUAD_RETRY_INTERVAL = 5 * 60 * 1000; // 5 min
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

/**
 * Fetch squad for a match.
 *
 * - staleTime: Infinity → cached forever once squad is populated
 * - matchService caches only when players are present (skips empty squads)
 * - Auto-retry every 5 min when match is within 6 hours — squads are
 *   announced at toss (~45 min before start)
 */
export function useSquad(matchId: string, matchDate?: string) {
  const isWithin6Hours =
    matchDate
      ? new Date(matchDate).getTime() - Date.now() < SIX_HOURS_MS
      : true; // unknown date → assume eligible

  return useQuery<SquadData>({
    queryKey: ["squad", matchId],
    queryFn:  () => getSquad(matchId),
    enabled:  !!matchId,
    staleTime: Infinity,
    retry:     1,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const isEmpty =
        data.team1Players.length === 0 && data.team2Players.length === 0;
      if (!isEmpty) return false;
      return isWithin6Hours ? SQUAD_RETRY_INTERVAL : false;
    },
  });
}
