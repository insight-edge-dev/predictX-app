export interface MatchPrediction {
  winner: string;
  winnerShortName: string;
  loserShortName: string;
  confidence: number;
  confidenceLabel: "HIGH" | "MEDIUM" | "LOW";
  team1Pct: number;
  team2Pct: number;
  factors: PredictionFactor[];
}

export interface PredictionFactor {
  label: string;
  icon: string;
  team1Value: string;
  team2Value: string;
  advantage: "team1" | "team2" | "neutral";
}

export interface UserPrediction {
  id: string;
  userId: string;
  matchId: string;
  predictedTeam: string;
  confidence: number;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  favoriteTeams: string[];
  predictionsCount: number;
  matchesTracked: number;
  createdAt: string;
}
