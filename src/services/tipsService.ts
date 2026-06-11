import api from './api';
import type { Match } from '@/types/match';

export interface TipFactor {
  label:      string;
  team1Value: string;
  team2Value: string;
  advantage:  'team1' | 'team2' | 'neutral';
}

export interface VenueInsights {
  venueName:            string;
  totalMatches:         number;
  avgFirstInningsScore: number;
  batFirstWinPct:       number;
  chaseWinPct:          number;
  tossWinnerWinPct:     number;
}

export interface H2HData {
  total:       number;
  team1Wins:   number;
  team2Wins:   number;
  noResult:    number;
  team1WinPct: number;
  team2WinPct: number;
}

export interface SeasonForm {
  season:  number;
  wins:    number;
  losses:  number;
  matches: number;
  winPct:  number;
}

export interface BatterStat {
  player:     string;
  runs:       number;
  balls:      number;
  dismissals: number;
  average:    number;
  strikeRate: number;
}

export interface BowlerStat {
  player:  string;
  wickets: number;
  runs:    number;
  balls:   number;
  economy: number;
}

export interface TopPerformers {
  battersVsT2:  BatterStat[];
  battersVsT1:  BatterStat[];
  bowlersVsT2:  BowlerStat[];
  bowlersVsT1:  BowlerStat[];
}

export interface StrengthStats {
  batAvgScore:  number | null;
  batAvgSR:     number | null;
  bowlEconomy:  number | null;
  bowlWpm:      number | null;
}

/** Lightweight tip attached to each match in the tips list */
export interface LightTip {
  team1Pct:        number;
  team2Pct:        number;
  winner:          string;
  confidence:      number;
  confidenceLabel: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface MatchTip extends LightTip {
  factors:       TipFactor[];
  venueInsights: VenueInsights | null;
  h2hData:       H2HData | null;
  recentForm:    { team1: SeasonForm[]; team2: SeasonForm[] };
  strengthData:  { team1: StrengthStats; team2: StrengthStats };
  topPerformers: TopPerformers;
}

export interface TipResponse {
  match: Match;
  tip:   MatchTip;
}

/** Match with optional lightweight prediction attached */
export type MatchWithTip = Match & { tip: LightTip | null };

export async function getTipsList(leagueId?: string): Promise<MatchWithTip[]> {
  const qs = leagueId ? `?league=${encodeURIComponent(leagueId)}` : '';
  const data = await api.get<{ matches: MatchWithTip[] }>(`/tips${qs}`);
  return data.matches ?? [];
}

export async function getMatchTip(matchId: string, leagueId?: string): Promise<TipResponse> {
  const qs = leagueId ? `?league=${encodeURIComponent(leagueId)}` : '';
  return api.get<TipResponse>(`/tips/${matchId}${qs}`);
}
