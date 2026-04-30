// ── Base ─────────────────────────────────────────────────────

/**
 * Team — strict shape guaranteed by the backend normalizer.
 * All fields are always present; shortName is never empty.
 */
export interface Team {
  id:        string;
  name:      string;
  shortName: string;   // e.g. "CSK", "MI" — never null/undefined
  logo:      string;   // Cloudinary URL or "" (not API URL)
}

/** @deprecated Use Team */
export type TeamInfo = Team;

export type MatchStatus = "upcoming" | "live" | "completed";

export type MatchStage = "LEAGUE" | "QUALIFIER" | "ELIMINATOR" | "FINAL";

export interface Match {
  id: string;
  team1: Team;
  team2: Team;
  venue: string;
  date: string;
  time: string;
  status: MatchStatus;
  seriesName: string;
  score1?: string;
  score2?: string;
  matchDesc?: string;
  matchStage?: MatchStage;
}

// ── Legacy detail (kept for backward compat) ─────────────────

export interface MatchDetail extends Match {
  tossWinner?: string;
  tossDecision?: string;
  matchStatus?: string;
  commentary?: string[];
}

// ── Expanded detail types ─────────────────────────────────────

export interface BatsmanStats {
  id: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  dismissal: string; // "not out", "c Rohit b Bumrah", etc.
  isCaptain: boolean;
  isKeeper: boolean;
  didBat: boolean;
}

export interface BowlerStats {
  id: string;
  name: string;
  overs: string;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
  isCaptain: boolean;
}

export interface InningsDetail {
  inningsId: number;
  teamId: string;
  teamName: string;
  teamShortName: string;
  runs: number;
  wickets: number;
  overs: string;
  batsmen: BatsmanStats[];
  bowlers: BowlerStats[];
}

export interface CommentaryEntry {
  overBall: string; // "18.4"
  text: string;
  isWicket: boolean;
  isBoundary: boolean;
  isSix: boolean;
}

export interface FullMatchDetail extends Match {
  tossWinner?: string;
  tossDecision?: string;
  matchStatus?: string;
  umpire1?: string;
  umpire2?: string;
  tvUmpire?: string;
  venueGround?: string;
  innings: InningsDetail[];
  recentCommentary: CommentaryEntry[];
  // matchDesc and matchStage inherited from Match
}
