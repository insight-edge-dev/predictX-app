/**
 * useAllTips.ts — aggregates AI tips (PredictX Picks) across every cricket
 * league plus football, for the default cross-league PredictX feed.
 */

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { getTipsList, type MatchWithTip } from '@/services/tipsService';
import type { FootballMatchWithTip } from '@/types/football';
import { useFootballTips } from '@/hooks/useFootballTips';
import { useLeague } from '@/contexts/LeagueContext';

export interface CricketTipItem  { kind: 'cricket';  leagueId: string; leagueLabel: string; match: MatchWithTip; }
export interface FootballTipItem { kind: 'football'; leagueId: string; leagueLabel: string; match: FootballMatchWithTip; }
export type AllTipItem = CricketTipItem | FootballTipItem;

export function useAllTips(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const { leagues } = useLeague();

  // Only the in-season (2026) cricket leagues — mirrors the league picker's curation.
  const cricketLeagues = useMemo(
    () => leagues.filter(l => (l.sport === 'cricket' || !l.sport) && l.season === '2026'),
    [leagues],
  );

  const results = useQueries({
    queries: cricketLeagues.map((l) => ({
      queryKey:             ['tips:list', l.id],
      queryFn:              () => getTipsList(l.id),
      staleTime:            2 * 60_000,
      refetchOnWindowFocus: false,
      retry:                1,
      enabled,
    })),
  });

  const { data: footballTips = [], isLoading: footballLoading } = useFootballTips();

  const isLoading = results.some(r => r.isLoading) || footballLoading;

  const items = useMemo<AllTipItem[]>(() => {
    const out: AllTipItem[] = [];

    cricketLeagues.forEach((l, i) => {
      const matches = results[i]?.data ?? [];
      for (const match of matches) {
        if (!match.tip) continue;
        out.push({ kind: 'cricket', leagueId: l.id, leagueLabel: l.short, match });
      }
    });

    const fbLeague = leagues.find(l => l.sport === 'football')?.id ?? 'wc2026';
    for (const match of footballTips) {
      if (!match.tip) continue;
      out.push({ kind: 'football', leagueId: fbLeague, leagueLabel: 'WC 2026', match });
    }

    out.sort((a, b) => new Date(a.match.date).getTime() - new Date(b.match.date).getTime());
    return out;
    // Stable string key — avoids the variable-size spread that violates hook rules
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cricketLeagues, footballTips, results.map(r => r.dataUpdatedAt).join(',')]);

  return { items, isLoading };
}
