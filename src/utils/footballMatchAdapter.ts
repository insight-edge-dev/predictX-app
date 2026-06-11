import type { FootballMatch, FootballTeam } from '@/types/football';
import { getWCTeam } from '@/constants/wc2026Teams';

/**
 * Enriches a team object from the backend with flag + color from the
 * local WC2026 registry. Falls back to API-Football data if not found.
 */
function enrichTeam(team: FootballTeam): FootballTeam {
  const entry = getWCTeam(team.shortName);
  return {
    ...team,
    flag:  entry?.flag  ?? team.flag  ?? '🏳',
    color: entry?.color ?? team.color ?? '#6B7280',
  };
}

/**
 * Ensures a FootballMatch has fully enriched team data and normalized fields.
 * Call this on every match returned from the football API.
 */
export function adaptFootballMatch(raw: FootballMatch): FootballMatch {
  return {
    ...raw,
    homeTeam: enrichTeam(raw.homeTeam),
    awayTeam: enrichTeam(raw.awayTeam),
    sport: 'football',
  };
}

export function adaptFootballMatches(matches: FootballMatch[]): FootballMatch[] {
  return matches.map(adaptFootballMatch);
}
