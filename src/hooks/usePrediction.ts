import { useMemo } from "react";
import { predictMatch } from "@/services/predictionService";
import type { MatchPrediction } from "@/types/prediction";
import type { Match } from "@/types/match";

/**
 * Hook for match prediction. Pure computation, no API call.
 */
export function usePrediction(match: Match | null): MatchPrediction | null {
  return useMemo(() => {
    if (!match) return null;
    return predictMatch(match);
  }, [match]);
}
