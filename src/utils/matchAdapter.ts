/**
 * matchAdapter.ts — converts raw backend Match into UI-ready AdaptedMatch.
 *
 * The backend normalizer returns a superset of the frontend Match type.
 * This adapter safely extracts every field the UI needs, defaulting all
 * optional / nullable values so components never have to guard against null.
 *
 * Usage:
 *   const adapted = adaptMatch(rawMatch);
 *   const list    = adaptMatches(rawMatches);
 */

import type { Match } from '@/types/match';

// ── Extra fields the backend sends beyond the typed Match ─────
// (normalizer.js adds these but the TS type doesn't declare them)

interface BackendExtras {
  statusText?: string;
  overs1?:     string | number;
  overs2?:     string | number;
  winner?:     string;
  series?:     string;        // backend key; TS type uses seriesName
  seriesId?:   string | null;
  toss?:       { winner: string; decision: string } | null;
}

type RawMatch = Match & BackendExtras;

// ── UI data contract ──────────────────────────────────────────

export interface AdaptedMatch {
  // Identity
  id:           string;

  // Team 1
  team1Name:    string;
  team1Short:   string;
  team1Logo:    string;

  // Team 2
  team2Name:    string;
  team2Short:   string;
  team2Logo:    string;

  // Live score
  score1:       string;   // e.g. "187/4"
  score2:       string;
  overs1:       string;   // e.g. "20.0"
  overs2:       string;

  // Status
  status:       'live' | 'upcoming' | 'completed';
  statusText:   string;   // human-readable status from API
  isLive:       boolean;
  isUpcoming:   boolean;
  isCompleted:  boolean;

  // Result line (non-null only for completed)
  result:       string | null;

  // Context
  venue:        string;
  date:         string;   // ISO date string
  time:         string;   // IST time string e.g. "7:30 PM"
  matchDesc:    string;   // "CSK vs MI, 14th Match"
  matchStage:   string;   // "LEAGUE" | "QUALIFIER" | "ELIMINATOR" | "FINAL"
  seriesName:   string;
  seriesId:     string | null;
}

// ── adaptMatch ────────────────────────────────────────────────

export function adaptMatch(raw: Match): AdaptedMatch {
  const r = raw as RawMatch;

  const status      = r.status ?? 'upcoming';
  const statusText  = r.statusText ?? r.matchDesc ?? '';
  const isCompleted = status === 'completed';
  const isLive      = status === 'live';
  const isUpcoming  = status === 'upcoming';

  // Result line: use statusText when completed (it carries "CSK won by 5 wkts" etc.)
  const result = isCompleted && statusText ? statusText : null;

  return {
    id:          r.id          ?? '',

    team1Name:   r.team1?.name      ?? '',
    team1Short:  r.team1?.shortName ?? '',
    team1Logo:   r.team1?.logo      ?? '',

    team2Name:   r.team2?.name      ?? '',
    team2Short:  r.team2?.shortName ?? '',
    team2Logo:   r.team2?.logo      ?? '',

    score1:      r.score1 ?? '',
    score2:      r.score2 ?? '',
    overs1:      r.overs1 != null ? String(r.overs1) : '',
    overs2:      r.overs2 != null ? String(r.overs2) : '',

    status,
    statusText,
    isLive,
    isUpcoming,
    isCompleted,

    result,

    venue:       r.venue      ?? '',
    date:        r.date       ?? '',
    time:        r.time       ?? '',
    matchDesc:   r.matchDesc  ?? '',
    matchStage:  r.matchStage ?? 'LEAGUE',
    seriesName:  r.seriesName ?? r.series ?? '',
    seriesId:    r.seriesId   ?? null,
  };
}

// ── adaptMatches ──────────────────────────────────────────────

export function adaptMatches(matches: Match[]): AdaptedMatch[] {
  if (!Array.isArray(matches)) return [];
  return matches.map(adaptMatch);
}

// ── dedupeMatches ─────────────────────────────────────────────
// Deduplicates by id, preserving insertion order.
// Used when merging matches.upcoming + fixtures.

export function dedupeMatches(matches: AdaptedMatch[]): AdaptedMatch[] {
  const seen = new Set<string>();
  return matches.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

// ── Status helpers ────────────────────────────────────────────

export function isStageMatch(match: AdaptedMatch): boolean {
  return (
    match.matchStage === 'QUALIFIER' ||
    match.matchStage === 'ELIMINATOR' ||
    match.matchStage === 'FINAL'
  );
}
