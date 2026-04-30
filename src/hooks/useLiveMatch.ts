import { useQuery } from "@tanstack/react-query";
import { getMatchFull, getMatchFromCache } from "@/services/matchService";
import type { FullMatch } from "@/services/matchService";

/**
 * Fetches full match detail (scorecard + squad).
 *
 * - Live match: polls every 30 seconds
 * - Non-live:   no polling, staleTime=10min
 * - retry: 0 — fail silently, next interval will retry naturally
 *
 * React Query handles interval cleanup on unmount automatically.
 */
export function useLiveMatch(matchId: string) {
  const cached = getMatchFromCache(matchId);
  const isLive = cached?.status === "live";

  return useQuery<FullMatch | null>({
    queryKey:        ["match:full", matchId],
    queryFn:         () => getMatchFull(matchId, isLive),
    enabled:         !!matchId,
    refetchInterval: isLive ? 30_000 : false,
    staleTime:       isLive ? 0 : 10 * 60 * 1000,
    retry:           0,
    placeholderData: (prev) => prev ?? null,
  });
}
