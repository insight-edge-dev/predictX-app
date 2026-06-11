/**
 * useLeaguesList — exposes the React Query state for the leagues list.
 * The actual fetch + context update now lives in LeagueProvider itself,
 * so this hook is only needed if a component wants isLoading/isError state.
 */

import { useQuery } from '@tanstack/react-query';
import api          from '@/services/api';
import type { League } from '@/contexts/LeagueContext';

export function useLeaguesList() {
  return useQuery<League[]>({
    queryKey:             ['leagues:list'],
    queryFn:              async () => {
      const res = await api.get<{ leagues: any[] }>('/leagues');
      return (res.leagues ?? []).map(l => ({
        id:       String(l.slug ?? l.id),
        leagueId: l.leagueId,
        seasonId: l.seasonId,
        name:     l.name    ?? '',
        short:    l.short   ?? '',
        season:   l.season  ?? '',
        flag:     l.flag    ?? '🏏',
        country:  l.country ?? '',
        format:   l.format  ?? 'T20',
        image:    l.image,
      }));
    },
    staleTime:            60 * 60_000,
    refetchOnWindowFocus: false,
    retry:                1,
  });
}
