export interface FootballTeam {
  id:        string;
  name:      string;
  shortName: string;  // "BRA", "ARG", "ENG"
  logo:      string;  // API-Football CDN URL
  flag:      string;  // "🇧🇷"
  color:     string;  // primary team color
}

export interface FootballScore {
  home:    number | null;  // null = not played yet
  away:    number | null;
  htHome?: number;         // half-time
  htAway?: number;
}

export type FootballMatchStatus = 'upcoming' | 'live' | 'completed';

export type WCStage =
  | 'Group Stage'
  | 'Round of 32'
  | 'Round of 16'
  | 'Quarter-Final'
  | 'Semi-Final'
  | '3rd Place'
  | 'Final';

export interface FootballMatch {
  id:         string;
  homeTeam:   FootballTeam;
  awayTeam:   FootballTeam;
  score:      FootballScore;
  status:     FootballMatchStatus;
  statusText: string;      // "HT", "FT", "45'", "90+2'"
  minute:     number | null;
  venue:      string;
  city:       string;
  date:       string;      // ISO "2026-06-15"
  time:       string;      // "7:30 PM IST"
  stage:      WCStage;
  group?:     string;      // "A" through "L" (group stage only)
  sport:      'football';
  events?:    FootballEvent[];
  stats?:     Record<string, Record<string, number | string | null>>;
}

export interface FootballEvent {
  minute:   number;
  extra:    number | null;
  teamId:   string;
  teamName: string;
  player:   string;
  assist:   string | null;
  type:     string;    // "Goal", "Card", "subst"
  detail:   string;    // "Normal Goal", "Yellow Card", "Red Card", "Own Goal"
  comments: string | null;
}

export interface PredictionFactor {
  label:     string;
  homeValue: string;
  awayValue: string;
  advantage: 'home' | 'away' | 'neutral';
}

export interface FootballH2HResult {
  date:      string;
  home:      string;
  away:      string;
  scoreHome: number | null;
  scoreAway: number | null;
}

export interface FootballH2H {
  total:        number;
  homeWins:     number;
  awayWins:     number;
  draws:        number;
  homeWinPct:   number;
  awayWinPct:   number;
  recentResults: FootballH2HResult[];
}

export interface FootballFormEntry {
  result: 'W' | 'D' | 'L';
}

export interface FootballPrediction {
  matchId:         string;
  homeTeam:        string;  // shortName
  awayTeam:        string;
  homeWin:         number;  // percentage 0-100
  draw:            number;  // 0 in knockout rounds
  awayWin:         number;
  winner:          string | null;
  confidence:      number;
  confidenceLabel: 'HIGH' | 'MEDIUM' | 'LOW';
  factors:         PredictionFactor[];
  h2hData:         FootballH2H;
  recentForm:      { home: FootballFormEntry[]; away: FootballFormEntry[] };
  isKnockout:      boolean;
}

export interface FootballGroupStanding {
  rank:         number;
  team:         FootballTeam;
  played:       number;
  won:          number;
  drawn:        number;
  lost:         number;
  goalsFor:     number;
  goalsAgainst: number;
  goalDiff:     number;
  points:       number;
  form:         string;    // "WWDLW"
  qualified?:   boolean;   // top 2 advance
}

export interface FootballMatchWithTip extends FootballMatch {
  tip: Omit<FootballPrediction, 'factors' | 'h2hData' | 'recentForm'> | null;
}

// ── WC Historical Stats (from 1970-2022 dataset) ─────────────────

export interface WCTeamLegend {
  code:               string;
  name:               string;
  titles:             number;
  appearances:        number;
  wcWinRate:          number;         // 0-100
  wcKnockoutWinRate:  number | null;  // null if no KO data
  wcGoalDiffAvg:      number;
}

export interface WCPenaltyRecord {
  code:             string;
  name:             string;
  penaltyWinRate:   number;  // 0-100
  penaltyMatches:   number;
}

export interface WCRivalry {
  teamA: { code: string; name: string };
  teamB: { code: string; name: string };
  total: number;
  aWins: number;
  bWins: number;
  draws: number;
}

export interface WCHistoryStats {
  legends:      WCTeamLegend[];
  penaltyBest:  WCPenaltyRecord[];
  penaltyWorst: WCPenaltyRecord[];
  rivalries:    WCRivalry[];
  hostWinRate:  number | null;
  dataAsOf:     string;
}
