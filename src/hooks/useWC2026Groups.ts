import { useQuery } from '@tanstack/react-query';
import { getFootballGroups, getFootballGroup } from '@/services/footballService';
import type { FootballGroupStanding } from '@/types/football';
import { getWCTeam } from '@/constants/wc2026Teams';

function enrichStandings(standings: FootballGroupStanding[]): FootballGroupStanding[] {
  return standings.map(s => ({
    ...s,
    team: {
      ...s.team,
      flag:  getWCTeam(s.team.shortName)?.flag  ?? s.team.flag  ?? '🏳',
      color: getWCTeam(s.team.shortName)?.color ?? s.team.color ?? '#6B7280',
    },
  }));
}

export function useWC2026Groups() {
  return useQuery<Record<string, FootballGroupStanding[]>>({
    queryKey: ['football:groups'],
    queryFn:  async () => {
      const { groups } = await getFootballGroups();
      const enriched: Record<string, FootballGroupStanding[]> = {};
      for (const [name, standings] of Object.entries(groups)) {
        enriched[name] = enrichStandings(standings);
      }
      return enriched;
    },
    staleTime: 60 * 60 * 1000, // 1h
    retry:     1,
  });
}

export function useWC2026Group(letter: string | undefined) {
  return useQuery<FootballGroupStanding[]>({
    queryKey: ['football:group', letter],
    queryFn:  async () => {
      const { group } = await getFootballGroup(letter!);
      return enrichStandings(group);
    },
    enabled:   !!letter,
    staleTime: 60 * 60 * 1000,
    retry:     1,
  });
}
