import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';

export interface PlayerPrediction {
  name:          string;
  role:          string;
  position:      number;
  predictedRuns: number;
}

export interface MatchPredictions {
  matchId:    string;
  team1Short: string;
  team2Short: string;
  team1:      PlayerPrediction[];
  team2:      PlayerPrediction[];
}

export function usePredictions(matchId: string | number | undefined) {
  return useQuery<MatchPredictions>({
    queryKey:             ['predictions', String(matchId)],
    queryFn:              () => api.get<MatchPredictions>(`/predictions/${matchId}`),
    staleTime:            7 * 24 * 60 * 60_000,   // 7 days — predictions don't change
    refetchOnMount:       false,
    refetchOnWindowFocus: false,
    enabled:              !!matchId,
    retry:                1,
  });
}

/**
 * Find a player's predicted runs by matching name from scorecard to predictions.
 * Scorecard names are often "AB De Villiers" vs squad "Abraham de Villiers".
 * Tries: exact → last-name → any-token → initials expansion.
 */
export function findPrediction(
  name: string,
  predictions: PlayerPrediction[] | undefined,
): number | null {
  if (!predictions || predictions.length === 0) return null;

  const norm  = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, '').trim();
  const tokens = (s: string) => norm(s).split(' ').filter(Boolean);

  const target      = norm(name);
  const targetToks  = tokens(name);
  const targetLast  = targetToks[targetToks.length - 1] ?? '';

  // 1. Exact
  let m = predictions.find((p) => norm(p.name) === target);
  if (m) return m.predictedRuns;

  // 2. Last-name exact (must be > 2 chars)
  if (targetLast.length > 2) {
    m = predictions.find((p) => {
      const toks = tokens(p.name);
      return toks[toks.length - 1] === targetLast;
    });
    if (m) return m.predictedRuns;
  }

  // 3. Any token overlap — scorecard "KL Rahul" ↔ squad "Lokesh Rahul"
  m = predictions.find((p) => {
    const predToks = tokens(p.name);
    return targetToks.some(
      (t) => t.length > 2 && predToks.some((pt) => pt === t),
    );
  });
  if (m) return m.predictedRuns;

  // 4. Contains — one name is a substring of the other
  m = predictions.find((p) => {
    const pn = norm(p.name);
    return (pn.includes(targetLast) || target.includes(tokens(p.name).pop() ?? ''))
      && targetLast.length > 2;
  });
  return m ? m.predictedRuns : null;
}
