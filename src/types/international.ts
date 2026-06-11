import type { Match } from './match';
import type { Team } from './match';
import type { LightTip, MatchTip } from '@/services/tipsService';

export type SeriesStatus = 'live' | 'upcoming' | 'completed';

export interface InternationalSeries {
  id:             string;
  name:           string;
  format:         string;
  leagueSlug:     string;
  teams:          Team[];
  matchCount:     number;
  completedCount: number;
  status:         SeriesStatus;
  startDate:      string;
  endDate:        string;
}

export interface LiveBatsman {
  name:     string;
  runs:     number;
  balls:    number;
  fours:    number;
  sixes:    number;
  sr:       string;
  isStrike: boolean;
}

export interface LiveBowler {
  name:    string;
  overs:   number;
  wickets: number;
  runs:    number;
  eco:     string;
  active:  boolean;
}

export interface MatchToss {
  winner:   string;
  decision: string;
}

export interface ManOfMatch {
  id:    number | string;
  name:  string;
  image: string;
  role:  string;
}

export type InternationalMatch = Match & {
  tip:         LightTip | null;
  overs1?:     string | null;
  overs2?:     string | null;
  statusText?: string;
  toss?:       MatchToss | null;
  winner?:     string | null;
  manOfMatch?: ManOfMatch | null;
  batsmen?:    LiveBatsman[];
  bowlers?:    LiveBowler[];
};

export interface InternationalSeriesDetail {
  series:  InternationalSeries;
  matches: {
    live:      InternationalMatch[];
    upcoming:  InternationalMatch[];
    completed: InternationalMatch[];
  };
}

export interface InternationalMatchTip {
  match: Match;
  tip:   MatchTip;
}
