import { getIPLTeamLogoUrl, getIPLTeamColor as _getIPLTeamColor } from "@/constants/iplTeams";

export const colors = {
  background: "#07080F",
  card: "#0D1421",
  border: "#1A2B3D",
  accent: "#F59E0B",
  textPrimary: "#F8FAFC",
  textSecondary: "#94A3B8",
  success: "#10B981",
  danger: "#EF4444",
} as const;

export type ColorKey = keyof typeof colors;

export const iplTeamColors: Record<string, string> = {
  RCB: "#EC1C24",
  CSK: "#F9CD05",
  MI: "#004BA0",
  KKR: "#3A225D",
  SRH: "#F26522",
  DC: "#17479E",
  RR: "#EA1A85",
  PBKS: "#ED1B24",
  GT: "#1C1C1C",
  LSG: "#00AEEF",
};

export function getTeamColor(shortName: string): string {
  return _getIPLTeamColor(shortName) !== "#94A3B8"
    ? _getIPLTeamColor(shortName)
    : (iplTeamColors[shortName] ?? colors.textSecondary);
}

/**
 * Returns the best available logo URL for a team.
 * Priority: 1) Official IPL CDN  2) Cricbuzz CDN via imageId  3) "" (caller shows fallback)
 */
export function getTeamLogo(imageId: string, shortName?: string): string {
  return getIPLTeamLogoUrl(shortName ?? "", imageId);
}

