/**
 * useHomeBundle — fires ONE request to /api/home/bundle that returns all
 * Discovery-screen data computed in parallel on the server.
 *
 * Why: HTTP/1.1 allows only ~6 concurrent connections per host. Discovery
 * previously fired 15+ separate requests that queued in rounds of 6, causing
 * 8-second cold loads. This collapses them into a single connection.
 *
 * Side-effect: populates individual React Query caches so navigating from
 * Discovery to Matches/Tips/News screens is instant (cache already warm).
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { adaptFootballMatches } from '@/utils/footballMatchAdapter';

export interface HomeBundle {
  matches:     Record<string, { live: unknown[]; upcoming: unknown[]; completed: unknown[] }>;
  football:    { live: unknown[]; upcoming: unknown[]; completed: unknown[] };
  intlSeries:  unknown[];
  intlSchedule:{ live: unknown[]; today: unknown[]; upcoming: unknown[] };
  leagueCards: unknown[];
  news:        unknown[];
}

const EMPTY_BUNDLE: HomeBundle = {
  matches:      {},
  football:     { live: [], upcoming: [], completed: [] },
  intlSeries:   [],
  intlSchedule: { live: [], today: [], upcoming: [] },
  leagueCards:  [],
  news:         [],
};

export function useHomeBundle() {
  const queryClient = useQueryClient();

  const query = useQuery<HomeBundle>({
    queryKey:             ['home:bundle'],
    queryFn:              () => api.get<HomeBundle>('/home/bundle'),
    staleTime:            30_000,
    refetchInterval:      (query) => {
      const d = query.state.data as HomeBundle | undefined;
      if (!d) return 60_000;
      const hasLive =
        Object.values(d.matches).some((m: any) => m.live?.length > 0) ||
        (d.football?.live?.length  ?? 0) > 0 ||
        (d.intlSchedule?.live?.length ?? 0) > 0;
      return hasLive ? 30_000 : 5 * 60_000;
    },
    refetchOnMount:       true,
    refetchOnWindowFocus: false,
    retry:                1,
    placeholderData:      (prev) => prev ?? EMPTY_BUNDLE,
  });

  // When bundle arrives, populate every individual query cache.
  // This means hooks on other screens (Matches, Tips, etc.) find warm data
  // and skip their own network requests on first render.
  useEffect(() => {
    const d = query.data;
    if (!d || d === EMPTY_BUNDLE) return;

    // Cricket matches — one key per league slug
    for (const [slug, data] of Object.entries(d.matches)) {
      queryClient.setQueryData([`homefeed:cricket:${slug}`], data, { updatedAt: Date.now() });
    }

    // Football — warm both keys so Home feed and Matches tab both hit cache
    if (d.football) {
      queryClient.setQueryData(['homefeed:football'], d.football, { updatedAt: Date.now() });
      queryClient.setQueryData(['football:matches'], {
        live:      adaptFootballMatches((d.football.live      ?? []) as any[]),
        upcoming:  adaptFootballMatches((d.football.upcoming  ?? []) as any[]),
        completed: adaptFootballMatches((d.football.completed ?? []) as any[]),
      }, { updatedAt: Date.now() });
    }

    // International
    if (d.intlSeries?.length)   queryClient.setQueryData(['intl:series:list'], d.intlSeries,   { updatedAt: Date.now() });
    if (d.intlSchedule)         queryClient.setQueryData(['intl:schedule'],     d.intlSchedule, { updatedAt: Date.now() });

    // League cards
    if (d.leagueCards?.length)  queryClient.setQueryData(['home:league-cards', 5], d.leagueCards, { updatedAt: Date.now() });

    // News
    if (d.news?.length)         queryClient.setQueryData(['home:news'], d.news, { updatedAt: Date.now() });
  }, [query.data, queryClient]);

  return query;
}
