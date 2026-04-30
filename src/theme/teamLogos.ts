/**
 * IPL team logo mapping — shortName → Cricbuzz CDN imageId.
 *
 * Used as a reliable fallback when the API response does not carry an imageId.
 * These IDs are stable across Cricbuzz's CDN.
 */

export const TEAM_IMAGE_IDS: Record<string, string> = {
  CSK: "6",
  MI: "16",
  KKR: "2",
  RR: "17",
  PBKS: "9",
  DC: "13",
  RCB: "225",
  SRH: "255",
  GT: "285",
  LSG: "286",
};

/**
 * Returns a Cricbuzz CDN logo URL for any IPL team short name.
 * Falls back to imageId from API if the shortName is unknown.
 */
export function getTeamLogoUrl(shortName: string, apiImageId?: string): string {
  const id = TEAM_IMAGE_IDS[shortName] ?? apiImageId ?? "";
  if (!id || id === "0") return "";
  return `https://www.cricbuzz.com/a/img/v1/56x56/i1/${id}.png`;
}
