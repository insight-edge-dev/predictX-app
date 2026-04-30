/**
 * Match display helpers.
 *
 * These are pure functions with no side-effects — safe to call in render.
 */

import type { Match } from "@/types/match";

// ── Types ─────────────────────────────────────────────────────

export interface MatchSection {
  title: string;
  /** Unique key for SectionList */
  key: string;
  data: Match[];
}

// ── getFeaturedMatch ──────────────────────────────────────────

/**
 * Returns the single most important match to display as the hero card.
 *
 * Priority:
 *   1. First live match  (real-time action)
 *   2. Nearest upcoming  (next fixture)
 *   3. Latest result     (most recent completed)
 */
export function getFeaturedMatch(
  live: Match[],
  upcoming: Match[],
  results: Match[],
): Match | null {
  return live[0] ?? upcoming[0] ?? results[0] ?? null;
}

// ── groupMatchesByDate ────────────────────────────────────────

function formatSectionTitle(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const matchStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = matchStart - todayStart;

  if (diff === 0)           return "TODAY";
  if (diff === 86_400_000)  return "TOMORROW";
  if (diff === -86_400_000) return "YESTERDAY";

  return d
    .toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })
    .toUpperCase();
}

function getDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Groups a match array into SectionList-ready sections.
 * Input sort order is preserved — pass ascending for upcoming,
 * descending for results.
 */
export function groupMatchesByDate(matches: Match[]): MatchSection[] {
  const map = new Map<string, MatchSection>();

  for (const match of matches) {
    const key = getDateKey(match.date);
    if (!map.has(key)) {
      map.set(key, { title: formatSectionTitle(match.date), key, data: [] });
    }
    map.get(key)!.data.push(match);
  }

  return Array.from(map.values());
}
