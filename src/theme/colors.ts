import { getIPLTeamLogoUrl, getIPLTeamColor as _getIPLTeamColor } from "@/constants/iplTeams";

export const colors = {
  background:    "#F8F9FB",
  card:          "#FFFFFF",
  border:        "#E5E7EB",
  accent:        "#2563EB",
  textPrimary:   "#111827",
  textSecondary: "#6B7280",
  success:       "#16A34A",
  danger:        "#DC2626",
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

/**
 * Distinct, theme-friendly palette for teams with no known brand color
 * (non-IPL leagues — PSL, BBL, BPL, T20 WC, etc). Picked deterministically
 * per team so the same team always gets the same color.
 */
const FALLBACK_PALETTE = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
  "#06B6D4", "#A855F7",
];

function fallbackColorFor(shortName: string): string {
  if (!shortName) return colors.textSecondary;
  let hash = 0;
  for (let i = 0; i < shortName.length; i++) {
    hash = (hash << 5) - hash + shortName.charCodeAt(i);
    hash |= 0;
  }
  return FALLBACK_PALETTE[Math.abs(hash) % FALLBACK_PALETTE.length];
}

export function getTeamColor(shortName: string): string {
  if (_getIPLTeamColor(shortName) !== "#94A3B8") return _getIPLTeamColor(shortName);
  if (iplTeamColors[shortName]) return iplTeamColors[shortName];
  return fallbackColorFor(shortName);
}

/**
 * Returns the best available logo URL for a team.
 * Priority: 1) Official IPL CDN  2) Cricbuzz CDN via imageId  3) "" (caller shows fallback)
 */
export function getTeamLogo(imageId: string, shortName?: string): string {
  return getIPLTeamLogoUrl(shortName ?? "", imageId);
}

