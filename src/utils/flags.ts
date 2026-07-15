/**
 * flags.ts — resolves a country/team code or name to a real flag IMAGE URL
 * (via flagcdn.com, ISO 3166-1 alpha-2) instead of relying on emoji glyphs,
 * which render inconsistently across devices/fonts.
 *
 * Covers common 3-letter codes (FIFA/cricket short codes) for essentially
 * every country that can show up across cricket and football fixtures,
 * plus full country names (used by some API fields, e.g. ICC rankings).
 *
 * Returns null when no mapping exists — callers should fall back to a
 * logo/initials badge in that case, not an emoji.
 */

// 3-letter short code → ISO 3166-1 alpha-2 (or flagcdn sub-national code)
const CODE_ISO2: Record<string, string> = {
  // Cricket nations
  IND: 'in', AUS: 'au', PAK: 'pk', SA: 'za', RSA: 'za', NZ: 'nz', SL: 'lk',
  BAN: 'bd', AFG: 'af', IRE: 'ie', ZIM: 'zw', NED: 'nl', NL: 'nl', NEP: 'np',
  UAE: 'ae', USA: 'us', CAN: 'ca', NAM: 'na', OMA: 'om', PNG: 'pg', KEN: 'ke',
  UGA: 'ug', QAT: 'qa', HKG: 'hk', SIN: 'sg', MAS: 'my', VAN: 'vu', BHU: 'bt',
  BHR: 'bh', KUW: 'kw', SAU: 'sa', MLT: 'mt',
  // West Indies — composite team, use TT as closest single-nation proxy
  WI: 'tt', WIN: 'tt', WES: 'tt',

  // UK home nations (flagcdn.com supports gb-eng / gb-sct / gb-wls / gb-nir)
  ENG: 'gb-eng', SCO: 'gb-sct', WAL: 'gb-wls', NIR: 'gb-nir',

  // Europe
  GER: 'de', ITA: 'it', FRA: 'fr', ESP: 'es', POR: 'pt', BEL: 'be', SUI: 'ch',
  CRO: 'hr', DEN: 'dk', SWE: 'se', NOR: 'no', FIN: 'fi', ISL: 'is', POL: 'pl',
  CZE: 'cz', SRB: 'rs', RUS: 'ru', UKR: 'ua', ROU: 'ro', BUL: 'bg', HUN: 'hu',
  SVK: 'sk', SVN: 'si', BIH: 'ba', MNE: 'me', MKD: 'mk', ALB: 'al', GEO: 'ge',
  ARM: 'am', AZE: 'az', CYP: 'cy', LUX: 'lu', LVA: 'lv', LTU: 'lt', EST: 'ee',
  BLR: 'by', MDA: 'md', AND: 'ad', SMR: 'sm', LIE: 'li', FRO: 'fo', GIB: 'gi',
  GRE: 'gr', AUT: 'at', TUR: 'tr', ISR: 'il', KOS: 'xk',

  // Americas
  BRA: 'br', ARG: 'ar', URY: 'uy', MEX: 'mx', CRC: 'cr', ECU: 'ec', COL: 'co',
  PAR: 'py', CHI: 'cl', VEN: 've', PER: 'pe', BOL: 'bo', JAM: 'jm', TRI: 'tt',
  TTO: 'tt', CUB: 'cu', DOM: 'do', PUR: 'pr', BAH: 'bs', BHS: 'bs', BRB: 'bb',
  GRN: 'gd', GUY: 'gy', SUR: 'sr', BLZ: 'bz', NCA: 'ni', NIC: 'ni', SLV: 'sv',
  GUA: 'gt', GTM: 'gt', HON: 'hn', HND: 'hn', PAN: 'pa', CUW: 'cw', HTI: 'ht',
  CAY: 'ky',

  // Africa
  SEN: 'sn', MAR: 'ma', CMR: 'cm', GHA: 'gh', NGA: 'ng', ALG: 'dz', TUN: 'tn',
  CIV: 'ci', EGY: 'eg', TAN: 'tz', ZAM: 'zm', ZMB: 'zm', ANG: 'ao', COD: 'cd',
  CGO: 'cg', RWA: 'rw', BDI: 'bi', GAB: 'ga', EQG: 'gq', STP: 'st', CPV: 'cv',
  GAM: 'gm', GMB: 'gm', MTN: 'mr', LBY: 'ly', MLI: 'ml', BFA: 'bf', GNB: 'gw',
  GUI: 'gn', SLE: 'sl', LBR: 'lr', TOG: 'tg', BEN: 'bj', NER: 'ne', MUS: 'mu',
  MOZ: 'mz', MWI: 'mw', BOT: 'bw', BWA: 'bw', SWZ: 'sz', LES: 'ls', LSO: 'ls',
  MAD: 'mg', MDG: 'mg', COM: 'km', DJI: 'dj', SOM: 'so', ERI: 'er', SUD: 'sd',
  SDN: 'sd', SSD: 'ss', ETH: 'et', CAF: 'cf', TCD: 'td', LBN: 'lb',

  // Asia / Middle East
  CHN: 'cn', TPE: 'tw', TWN: 'tw', MAC: 'mo', MNG: 'mn', KAZ: 'kz', UZB: 'uz',
  TJK: 'tj', TKM: 'tm', KGZ: 'kg', PRK: 'kp', IDN: 'id', THA: 'th', VIE: 'vn',
  VNM: 'vn', PHI: 'ph', PHL: 'ph', MYA: 'mm', MMR: 'mm', LAO: 'la', CAM: 'kh',
  KHM: 'kh', BRU: 'bn', BRN: 'bn', TLS: 'tl', MDV: 'mv', IRN: 'ir', IRQ: 'iq',
  JOR: 'jo', SYR: 'sy', PLE: 'ps',

  // Oceania
  FIJ: 'fj', FJI: 'fj', SOL: 'sb', NCL: 'nc', TAH: 'pf', PYF: 'pf', SAM: 'ws',
  WSM: 'ws', TGA: 'to', COK: 'ck', NZL: 'nz', GUM: 'gu',
};

const NAME_ISO2: Record<string, string> = {
  INDIA: 'in', AUSTRALIA: 'au', PAKISTAN: 'pk', 'SOUTH AFRICA': 'za',
  'NEW ZEALAND': 'nz', 'SRI LANKA': 'lk', BANGLADESH: 'bd', AFGHANISTAN: 'af',
  IRELAND: 'ie', ZIMBABWE: 'zw', NETHERLANDS: 'nl', NEPAL: 'np',
  'WEST INDIES': 'tt', // composite team — TT as closest proxy
  'UNITED ARAB EMIRATES': 'ae', 'UNITED STATES': 'us', CANADA: 'ca',
  NAMIBIA: 'na', OMAN: 'om', 'PAPUA NEW GUINEA': 'pg', KENYA: 'ke',
  ENGLAND: 'gb-eng', SCOTLAND: 'gb-sct', WALES: 'gb-wls', 'NORTHERN IRELAND': 'gb-nir',
  BRAZIL: 'br', GERMANY: 'de', ITALY: 'it', ARGENTINA: 'ar', FRANCE: 'fr',
  URUGUAY: 'uy', SPAIN: 'es', PORTUGAL: 'pt', BELGIUM: 'be', SWITZERLAND: 'ch',
  CROATIA: 'hr', MEXICO: 'mx', SENEGAL: 'sn', MOROCCO: 'ma', JAPAN: 'jp',
  DENMARK: 'dk', SWEDEN: 'se', POLAND: 'pl', SERBIA: 'rs', RUSSIA: 'ru',
  CAMEROON: 'cm', GHANA: 'gh', NIGERIA: 'ng', ECUADOR: 'ec', COLOMBIA: 'co',
  PARAGUAY: 'py', CHILE: 'cl', ALGERIA: 'dz', TUNISIA: 'tn', TURKEY: 'tr',
  HAITI: 'ht', 'IVORY COAST': 'ci', "COTE D'IVOIRE": 'ci', EGYPT: 'eg',
  COSTARICA: 'cr', 'COSTA RICA': 'cr', VENEZUELA: 've', PERU: 'pe',
  BOLIVIA: 'bo', JAMAICA: 'jm', 'TRINIDAD AND TOBAGO': 'tt', CUBA: 'cu',
  PANAMA: 'pa', HONDURAS: 'hn', GUATEMALA: 'gt',
};

/** Strips women's/age-group suffixes ("AUS-W", "IND U19") before lookup. */
function normalize(input: string): string {
  return input
    .toUpperCase()
    .replace(/-W$|-A$/, '')
    .replace(/\s+(WOMEN|U19|U23)$/, '')
    .trim();
}

/**
 * Tries each candidate (short code, full name, etc.) in order and returns
 * the first resolvable flag image URL, or null if none match.
 */
export function countryFlagUrl(...candidates: (string | null | undefined)[]): string | null {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const key = normalize(candidate);
    const iso2 = CODE_ISO2[key] ?? NAME_ISO2[key];
    if (iso2) return `https://flagcdn.com/h80/${iso2}.png`;
  }
  return null;
}
