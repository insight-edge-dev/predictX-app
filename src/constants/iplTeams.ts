/**
 * IPL team registry — single source of truth for team metadata and logos.
 *
 * Logo priority in getIPLTeamLogoUrl():
 *   1. officialLogoUrl  — self-hosted Cloudinary CDN (permanent, no rate limits)
 *   2. cricbuzzImageId  — Cricbuzz 56x56 CDN (fallback for unknown teams)
 *   3. caller renders text fallback (short name initials)
 */

export interface IPLTeam {
  name: string;
  shortName: string;
  color: string;
  /** Self-hosted Cloudinary logo — permanent, no rate limits */
  officialLogoUrl: string;
  /** Cricbuzz CDN imageId — fallback if official URL fails */
  cricbuzzImageId: string;
}

export const IPL_TEAMS: Record<string, IPLTeam> = {
  CSK: {
    name: "Chennai Super Kings",
    shortName: "CSK",
    color: "#F9CD05",
    officialLogoUrl: "https://res.cloudinary.com/ddi8hisku/image/upload/v1774872219/nyssxzxvvu3ytk8jautr.png",
    cricbuzzImageId: "6",
  },
  MI: {
    name: "Mumbai Indians",
    shortName: "MI",
    color: "#004BA0",
    officialLogoUrl: "https://res.cloudinary.com/ddi8hisku/image/upload/v1774872387/gganxjkcxunvsjqtzqam.png",
    cricbuzzImageId: "16",
  },
  RCB: {
    name: "Royal Challengers Bengaluru",
    shortName: "RCB",
    color: "#EC1C24",
    officialLogoUrl: "https://res.cloudinary.com/ddi8hisku/image/upload/v1774872474/xUS54-BA0dFZPMtbCiHkzQ_96x96_vqd9to.png",
    cricbuzzImageId: "225",
  },
  KKR: {
    name: "Kolkata Knight Riders",
    shortName: "KKR",
    color: "#3A225D",
    officialLogoUrl: "https://res.cloudinary.com/ddi8hisku/image/upload/v1774872538/asquivocg8is3cxzzbrg.png",
    cricbuzzImageId: "2",
  },
  SRH: {
    name: "Sunrisers Hyderabad",
    shortName: "SRH",
    color: "#F26522",
    officialLogoUrl: "https://res.cloudinary.com/ddi8hisku/image/upload/v1774872701/W0OCBYc05c5MFMrctF62kg_96x96_s7f5fd.png",
    cricbuzzImageId: "255",
  },
  DC: {
    name: "Delhi Capitals",
    shortName: "DC",
    color: "#17479E",
    officialLogoUrl: "https://res.cloudinary.com/ddi8hisku/image/upload/v1774872758/HzUX6_c8j7pwBCetmct2FQ_96x96_jp47mi.png",
    cricbuzzImageId: "13",
  },
  RR: {
    name: "Rajasthan Royals",
    shortName: "RR",
    color: "#EA1A85",
    officialLogoUrl: "https://res.cloudinary.com/ddi8hisku/image/upload/v1774872898/GqIU6xhQAnCpy_Cbr2LZRA_96x96_woil2j.png",
    cricbuzzImageId: "17",
  },
  PBKS: {
    name: "Punjab Kings",
    shortName: "PBKS",
    color: "#ED1B24",
    officialLogoUrl: "https://res.cloudinary.com/ddi8hisku/image/upload/v1774873038/XUAb4iA3XozYbH_cXQCryQ_96x96_zgfxfr.png",
    cricbuzzImageId: "9",
  },
  GT: {
    name: "Gujarat Titans",
    shortName: "GT",
    color: "#1C1C1C",
    officialLogoUrl: "https://res.cloudinary.com/ddi8hisku/image/upload/v1774873011/aTE8G7q-OcAobWvDd6sizQ_96x96_wshgvl.png",
    cricbuzzImageId: "285",
  },
  LSG: {
    name: "Lucknow Super Giants",
    shortName: "LSG",
    color: "#00AEEF",
    officialLogoUrl: "https://res.cloudinary.com/ddi8hisku/image/upload/v1774873098/OqrL0ztLy13FBpvuF6GCBQ_96x96_sthfpb.png",
    cricbuzzImageId: "286",
  },
};

/**
 * Returns the Cloudinary logo URL for a known IPL team.
 * Returns empty string for unknown teams — caller renders text fallback.
 * Never uses API-provided image URLs.
 */
export function getIPLTeamLogoUrl(shortName: string, _apiImageId?: string): string {
  return IPL_TEAMS[shortName]?.officialLogoUrl ?? "";
}

/** Returns team brand color or grey if unknown. */
export function getIPLTeamColor(shortName: string): string {
  return IPL_TEAMS[shortName]?.color ?? "#94A3B8";
}
