/**
 * Match extraction from Cricbuzz API responses.
 *
 * Handles all known response structures defensively.
 * Never returns empty unless the API itself returned no match data.
 *
 * Known structures:
 *   typeMatches[] → seriesMatches[] → seriesAdWrapper → matches[] → matchInfo
 *   typeMatches[] → seriesMatches[] → seriesWrapper   → matches[] → matchInfo
 *   (deep fallback) any nesting with { matchInfo: {...} }
 */

import type { Match, MatchStatus, MatchStage } from "@/types/match";

// ── Helpers ───────────────────────────────────────────────────

function str(v: unknown): string {
  return v != null ? String(v) : "";
}

function num(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

// ── State → status ────────────────────────────────────────────

export function stateToStatus(state: string): MatchStatus {
  const s = state.toLowerCase().trim();
  if (s === "live" || s === "in progress") return "live";
  if (s === "complete" || s === "result") return "completed";
  return "upcoming"; // Preview, Upcoming, etc.
}

// ── matchDesc → stage ─────────────────────────────────────────

function descToStage(desc: string): MatchStage {
  const d = desc.toLowerCase();
  if (d.includes("final")) return "FINAL";
  if (d.includes("qualifier")) return "QUALIFIER";
  if (d.includes("eliminator")) return "ELIMINATOR";
  return "LEAGUE";
}

// ── Single match node parser ──────────────────────────────────

export function parseMatchNode(
  m: Record<string, unknown>,
  seriesNameHint: string,
  index: number,
): Match | null {
  const info = m["matchInfo"] as Record<string, unknown> | undefined;
  if (!info) return null;

  const team1 = info["team1"] as Record<string, unknown> | undefined;
  const team2 = info["team2"] as Record<string, unknown> | undefined;
  if (!team1 || !team2) return null;

  try {
    const startMs = Number(info["startDate"]);
    const dateObj = isNaN(startMs) ? new Date() : new Date(startMs);
    const venueInfo = info["venueInfo"] as Record<string, unknown> | undefined;

    const matchScore = m["matchScore"] as Record<string, unknown> | undefined;
    const t1Inngs = (matchScore?.["team1Score"] as Record<string, unknown> | undefined)?.["inngs1"] as
      | { runs: number; wickets: number; overs: number }
      | undefined;
    const t2Inngs = (matchScore?.["team2Score"] as Record<string, unknown> | undefined)?.["inngs1"] as
      | { runs: number; wickets: number; overs: number }
      | undefined;

    const matchDesc = str(info["matchDesc"]);
    const seriesName = seriesNameHint || str(info["seriesName"]);
    const state = str(info["state"]);

    return {
      id: str(info["matchId"]) || String(index),
      seriesName,
      status: stateToStatus(state),
      team1: {
        id: str(team1["teamId"]),
        name: str(team1["teamName"]) || "TBD",
        shortName: str(team1["teamSName"]) || "TBD",
        logo: str(team1["imageId"]),
      },
      team2: {
        id: str(team2["teamId"]),
        name: str(team2["teamName"]) || "TBD",
        shortName: str(team2["teamSName"]) || "TBD",
        logo: str(team2["imageId"]),
      },
      venue: str(venueInfo?.["city"] ?? venueInfo?.["ground"]),
      date: dateObj.toISOString(),
      time: dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
      score1: t1Inngs ? `${t1Inngs.runs}/${t1Inngs.wickets} (${t1Inngs.overs})` : undefined,
      score2: t2Inngs ? `${t2Inngs.runs}/${t2Inngs.wickets} (${t2Inngs.overs})` : undefined,
      matchDesc: matchDesc || undefined,
      matchStage: matchDesc ? descToStage(matchDesc) : undefined,
    };
  } catch {
    return null;
  }
}

// ── Deep scan fallback ────────────────────────────────────────
// Walks the full JSON tree to find any { matchInfo: {...} } nodes.
// Used when normal typeMatches traversal returns 0.

function deepFindNodes(node: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 8 || !node || typeof node !== "object") return [];
  const obj = node as Record<string, unknown>;
  if (obj["matchInfo"] && typeof obj["matchInfo"] === "object") return [obj];
  const result: Record<string, unknown>[] = [];
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (Array.isArray(val)) {
      for (const item of val) result.push(...deepFindNodes(item, depth + 1));
    } else if (val && typeof val === "object") {
      result.push(...deepFindNodes(val, depth + 1));
    }
  }
  return result;
}

// ── Main extractor ────────────────────────────────────────────

export function extractMatchesFromResponse(data: unknown): Match[] {
  const raw = data as Record<string, unknown>;
  const matches: Match[] = [];

  // Log raw structure — critical for debugging
  console.log("[Extract] top-level keys:", Object.keys(raw).join(", "));

  const typeMatches = raw["typeMatches"];

  // Log enough to understand nesting without flooding
  if (Array.isArray(typeMatches)) {
    console.log(`[Extract] typeMatches.length=${typeMatches.length}`);
    if (typeMatches.length > 0) {
      const first = typeMatches[0] as Record<string, unknown>;
      console.log("[Extract] first typeMatch keys:", Object.keys(first).join(", "));
      try {
        console.log("[Extract] first typeMatch snippet:", JSON.stringify(first).slice(0, 400));
      } catch { /* */ }
    }
  } else {
    console.log("[Extract] typeMatches missing — deep scan fallback");
    const nodes = deepFindNodes(data);
    for (const m of nodes) {
      const info = m["matchInfo"] as Record<string, unknown> | undefined;
      const parsed = parseMatchNode(m, str(info?.["seriesName"]), matches.length);
      if (parsed) matches.push(parsed);
    }
    console.log(`[Extract] deep scan: ${matches.length} matches`);
    return matches;
  }

  // Standard traversal: typeMatches → seriesMatches → wrapper → matches
  for (const typeMatch of typeMatches) {
    const tm = typeMatch as Record<string, unknown>;
    const matchType = str(tm["matchType"]);
    const seriesMatches = tm["seriesMatches"];
    if (!Array.isArray(seriesMatches)) continue;

    console.log(`[Extract] matchType="${matchType}" seriesMatches=${seriesMatches.length}`);

    for (const sm of seriesMatches) {
      const smObj = sm as Record<string, unknown>;

      // Resolve wrapper — try all known key variants
      const wrapper = (
        smObj["seriesAdWrapper"] ??
        smObj["seriesWrapper"] ??
        smObj["series"] ??
        (smObj["seriesName"] != null && smObj["matches"] != null ? smObj : undefined)
      ) as Record<string, unknown> | undefined;

      if (!wrapper) {
        console.log("[Extract] no wrapper, sm keys:", Object.keys(smObj).join(", "));
        continue;
      }

      const seriesName = str(wrapper["seriesName"]);
      const rawMatches = wrapper["matches"];
      console.log(`[Extract] series="${seriesName}" matchCount=${Array.isArray(rawMatches) ? rawMatches.length : "none"}`);

      if (!Array.isArray(rawMatches)) continue;

      for (const rm of rawMatches) {
        const parsed = parseMatchNode(rm as Record<string, unknown>, seriesName, matches.length);
        if (parsed) matches.push(parsed);
      }
    }
  }

  // Deep scan if normal traversal got nothing but response had data
  if (matches.length === 0 && (typeMatches as unknown[]).length > 0) {
    console.log("[Extract] normal traversal returned 0 — deep scan fallback");
    const nodes = deepFindNodes(data);
    for (const m of nodes) {
      const info = m["matchInfo"] as Record<string, unknown> | undefined;
      const parsed = parseMatchNode(m, str(info?.["seriesName"]), matches.length);
      if (parsed) matches.push(parsed);
    }
    console.log(`[Extract] deep scan: ${matches.length} matches`);
  }

  console.log(`[Extract] total=${matches.length}`);
  return matches;
}
