export interface WC2026Team {
  name:      string;
  shortName: string;
  flag:      string;
  color:     string;
}

export const WC2026_TEAMS: Record<string, WC2026Team> = {
  ARG: { name: "Argentina",    shortName: "ARG", flag: "🇦🇷", color: "#74ACDF" },
  BRA: { name: "Brazil",       shortName: "BRA", flag: "🇧🇷", color: "#009C3B" },
  FRA: { name: "France",       shortName: "FRA", flag: "🇫🇷", color: "#002395" },
  ENG: { name: "England",      shortName: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", color: "#CF081F" },
  ESP: { name: "Spain",        shortName: "ESP", flag: "🇪🇸", color: "#AA151B" },
  GER: { name: "Germany",      shortName: "GER", flag: "🇩🇪", color: "#000000" },
  POR: { name: "Portugal",     shortName: "POR", flag: "🇵🇹", color: "#006600" },
  NED: { name: "Netherlands",  shortName: "NED", flag: "🇳🇱", color: "#FF6600" },
  ITA: { name: "Italy",        shortName: "ITA", flag: "🇮🇹", color: "#003399" },
  BEL: { name: "Belgium",      shortName: "BEL", flag: "🇧🇪", color: "#EF3340" },
  CRO: { name: "Croatia",      shortName: "CRO", flag: "🇭🇷", color: "#FF0000" },
  URU: { name: "Uruguay",      shortName: "URU", flag: "🇺🇾", color: "#5AAAA6" },
  MEX: { name: "Mexico",       shortName: "MEX", flag: "🇲🇽", color: "#006847" },
  USA: { name: "USA",          shortName: "USA", flag: "🇺🇸", color: "#002868" },
  COL: { name: "Colombia",     shortName: "COL", flag: "🇨🇴", color: "#FCD116" },
  MAR: { name: "Morocco",      shortName: "MAR", flag: "🇲🇦", color: "#C1272D" },
  SEN: { name: "Senegal",      shortName: "SEN", flag: "🇸🇳", color: "#00853F" },
  DEN: { name: "Denmark",      shortName: "DEN", flag: "🇩🇰", color: "#C60C30" },
  SUI: { name: "Switzerland",  shortName: "SUI", flag: "🇨🇭", color: "#FF0000" },
  JPN: { name: "Japan",        shortName: "JPN", flag: "🇯🇵", color: "#002868" },
  KOR: { name: "South Korea",  shortName: "KOR", flag: "🇰🇷", color: "#CD2E3A" },
  AUS: { name: "Australia",    shortName: "AUS", flag: "🇦🇺", color: "#FFCD00" },
  CAN: { name: "Canada",       shortName: "CAN", flag: "🇨🇦", color: "#FF0000" },
  ECU: { name: "Ecuador",      shortName: "ECU", flag: "🇪🇨", color: "#FFD100" },
  GHA: { name: "Ghana",        shortName: "GHA", flag: "🇬🇭", color: "#006B3F" },
  CMR: { name: "Cameroon",     shortName: "CMR", flag: "🇨🇲", color: "#007A5E" },
  TUN: { name: "Tunisia",      shortName: "TUN", flag: "🇹🇳", color: "#E70013" },
  NGA: { name: "Nigeria",      shortName: "NGA", flag: "🇳🇬", color: "#008751" },
  POL: { name: "Poland",       shortName: "POL", flag: "🇵🇱", color: "#DC143C" },
  SRB: { name: "Serbia",       shortName: "SRB", flag: "🇷🇸", color: "#C6363C" },
  CRC: { name: "Costa Rica",   shortName: "CRC", flag: "🇨🇷", color: "#002B7F" },
  IRN: { name: "Iran",         shortName: "IRN", flag: "🇮🇷", color: "#239F40" },
  SAU: { name: "Saudi Arabia", shortName: "SAU", flag: "🇸🇦", color: "#006C35" },
  QAT: { name: "Qatar",        shortName: "QAT", flag: "🇶🇦", color: "#8D1B3D" },
  PAN: { name: "Panama",       shortName: "PAN", flag: "🇵🇦", color: "#DA121A" },
  NZL: { name: "New Zealand",  shortName: "NZL", flag: "🇳🇿", color: "#000000" },
  EGY: { name: "Egypt",        shortName: "EGY", flag: "🇪🇬", color: "#CE1126" },
  RSA: { name: "South Africa", shortName: "RSA", flag: "🇿🇦", color: "#007A4D" },
  SLV: { name: "El Salvador",  shortName: "SLV", flag: "🇸🇻", color: "#0F47AF" },
  HND: { name: "Honduras",     shortName: "HND", flag: "🇭🇳", color: "#0073CF" },
  TRI: { name: "Trinidad",     shortName: "TRI", flag: "🇹🇹", color: "#CE1126" },
  CHI: { name: "Chile",        shortName: "CHI", flag: "🇨🇱", color: "#D52B1E" },
  VEN: { name: "Venezuela",    shortName: "VEN", flag: "🇻🇪", color: "#CF142B" },
  BOL: { name: "Bolivia",      shortName: "BOL", flag: "🇧🇴", color: "#D52B1E" },
  PER: { name: "Peru",         shortName: "PER", flag: "🇵🇪", color: "#D91023" },
  MAL: { name: "Malaysia",     shortName: "MAL", flag: "🇲🇾", color: "#CC0001" },
  CUB: { name: "Cuba",         shortName: "CUB", flag: "🇨🇺", color: "#002A8F" },
};

export function getWCTeam(shortName: string): WC2026Team | null {
  return WC2026_TEAMS[shortName?.toUpperCase()] ?? null;
}

export function getTeamColor(shortName: string): string {
  return WC2026_TEAMS[shortName?.toUpperCase()]?.color ?? '#6B7280';
}

export function getTeamFlag(shortName: string): string {
  return WC2026_TEAMS[shortName?.toUpperCase()]?.flag ?? '🏳';
}
