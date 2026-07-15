/**
 * useTipsBundle — fires ONE request to /api/tips/bundle that returns tip
 * predictions for all active (2026-season) cricket leagues computed in
 * parallel on the server.
 *
 * Why: the AllTips screen previously fired 8+ separate requests that queued
 * behind the HTTP/1.1 6-connection limit, causing 25-second cold loads.
 * This collapses them into a single connection.
 *
 * Side-effect: populates individual ['tips:list', slug] React Query caches
 * so useAllTips hooks find warm data and skip their own network requests.
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import type { MatchWithTip } from '@/services/tipsService';

type LeaguePayload = { matches: MatchWithTip[] };
type TipsBundle    = Record<string, LeaguePayload>;

const EMPTY_BUNDLE: TipsBundle = {};

export function useTipsBundle() {
  const queryClient = useQueryClient();

  const query = useQuery<TipsBundle>({
    queryKey:             ['tips:bundle'],
    queryFn:              () => api.get<TipsBundle>('/tips/bundle'),
    staleTime:            5 * 60_000,
    refetchInterval:      10 * 60_000,
    refetchOnMount:       true,
    refetchOnWindowFocus: false,
    retry:                1,
    placeholderData:      (prev) => prev ?? EMPTY_BUNDLE,
  });

  // Populate per-league caches from the bundle so useAllTips queries find
  // warm data and don't fire redundant individual requests.
  useEffect(() => {
    const d = query.data;
    if (!d || d === EMPTY_BUNDLE) return;
    for (const [slug, payload] of Object.entries(d)) {
      if (payload?.matches) {
        queryClient.setQueryData(['tips:list', slug], payload.matches, { updatedAt: Date.now() });
      }
    }
  }, [query.data, queryClient]);

  return query;
}
