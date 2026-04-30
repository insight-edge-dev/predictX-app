import { supabase } from "@/lib/supabase";
import type { Match } from "@/types/match";
import type { MatchPrediction, PredictionFactor, UserPrediction } from "@/types/prediction";

/**
 * Prediction Service — generates predictions and stores user picks.
 *
 * Prediction logic factors:
 * - Team rating (historical IPL strength)
 * - Recent form (seeded from team name, deterministic)
 * - Venue advantage (home ground)
 */

// ── Team data ────────────────────────────────────────────────

const TEAM_RATINGS: Record<string, number> = {
  CSK: 88,
  MI: 86,
  RCB: 82,
  KKR: 84,
  SRH: 78,
  DC: 76,
  RR: 80,
  PBKS: 72,
  GT: 83,
  LSG: 77,
};

const VENUE_ADVANTAGE: Record<string, string> = {
  Chennai: "CSK",
  Mumbai: "MI",
  Bengaluru: "RCB",
  Kolkata: "KKR",
  Hyderabad: "SRH",
  Delhi: "DC",
  Jaipur: "RR",
  Mohali: "PBKS",
  Ahmedabad: "GT",
  Lucknow: "LSG",
};

function getFormWins(shortName: string): number {
  // Deterministic form based on team name characters
  const s = shortName.charCodeAt(0) + shortName.charCodeAt(shortName.length - 1);
  const form = [
    s % 3 !== 0,
    s % 5 !== 0,
    s % 2 === 0,
    s % 7 !== 0,
    s % 4 !== 0,
  ];
  return form.filter(Boolean).length;
}

export function getTeamForm(shortName: string): ("W" | "L")[] {
  const s = shortName.charCodeAt(0) + shortName.charCodeAt(shortName.length - 1);
  return [
    s % 3 !== 0 ? "W" : "L",
    s % 5 !== 0 ? "W" : "L",
    s % 2 === 0 ? "W" : "L",
    s % 7 !== 0 ? "W" : "L",
    s % 4 !== 0 ? "W" : "L",
  ];
}

// ── Prediction generation ────────────────────────────────────

export function predictMatch(match: Match): MatchPrediction {
  const t1 = match.team1.shortName;
  const t2 = match.team2.shortName;

  const rating1 = TEAM_RATINGS[t1] ?? 75;
  const rating2 = TEAM_RATINGS[t2] ?? 75;

  const form1 = getFormWins(t1);
  const form2 = getFormWins(t2);

  const venueTeam = VENUE_ADVANTAGE[match.venue] ?? "";
  const venueBonus1 = venueTeam === t1 ? 5 : 0;
  const venueBonus2 = venueTeam === t2 ? 5 : 0;

  // Deterministic seed instead of Math.random() for consistency
  const seed = (t1.charCodeAt(0) * 7 + t2.charCodeAt(0) * 3 + match.id.length) % 8;
  const score1 = rating1 * 0.5 + form1 * 6 + venueBonus1 + seed * 0.5;
  const score2 = rating2 * 0.5 + form2 * 6 + venueBonus2 + (8 - seed) * 0.5;

  const total = score1 + score2;
  const team1Pct = Math.round((score1 / total) * 100);
  const team2Pct = 100 - team1Pct;

  const winnerIsTeam1 = team1Pct >= team2Pct;
  const confidence = winnerIsTeam1 ? team1Pct : team2Pct;

  const confidenceLabel: MatchPrediction["confidenceLabel"] =
    confidence > 70 ? "HIGH" : confidence >= 55 ? "MEDIUM" : "LOW";

  const factors: PredictionFactor[] = [
    {
      label: "Recent Form",
      icon: "trending-up",
      team1Value: `${form1}/5 W`,
      team2Value: `${form2}/5 W`,
      advantage: form1 > form2 ? "team1" : form2 > form1 ? "team2" : "neutral",
    },
    {
      label: "Team Rating",
      icon: "star",
      team1Value: `${rating1}`,
      team2Value: `${rating2}`,
      advantage: rating1 > rating2 ? "team1" : rating2 > rating1 ? "team2" : "neutral",
    },
    {
      label: "Venue Advantage",
      icon: "location",
      team1Value: venueTeam === t1 ? "Home" : "Away",
      team2Value: venueTeam === t2 ? "Home" : "Away",
      advantage: venueTeam === t1 ? "team1" : venueTeam === t2 ? "team2" : "neutral",
    },
  ];

  return {
    winner: winnerIsTeam1 ? match.team1.name : match.team2.name,
    winnerShortName: winnerIsTeam1 ? t1 : t2,
    loserShortName: winnerIsTeam1 ? t2 : t1,
    confidence,
    confidenceLabel,
    team1Pct,
    team2Pct,
    factors,
  };
}

// ── User prediction storage (Supabase) ───────────────────────

export async function savePrediction(
  userId: string,
  matchId: string,
  predictedTeam: string,
  confidence: number,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("user_predictions").upsert(
    {
      user_id: userId,
      match_id: matchId,
      predicted_team: predictedTeam,
      confidence,
    },
    { onConflict: "user_id,match_id" },
  );

  return { error: error?.message ?? null };
}

export async function getUserPredictions(
  userId: string,
): Promise<UserPrediction[]> {
  const { data, error } = await supabase
    .from("user_predictions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    matchId: row.match_id,
    predictedTeam: row.predicted_team,
    confidence: row.confidence,
    createdAt: row.created_at,
  }));
}
