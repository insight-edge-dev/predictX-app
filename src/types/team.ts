export interface Team {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  primaryColor: string;
}

export type PlayerRole = "batsman" | "bowler" | "allrounder" | "wicketkeeper";

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  teamId: string;
  teamShortName: string;
  isCaptain: boolean;
  isKeeper: boolean;
  imageId: string;
  battingStyle?: string;
  bowlingStyle?: string;
}

export interface Squad {
  matchId: string;
  team1Players: Player[];
  team2Players: Player[];
}
