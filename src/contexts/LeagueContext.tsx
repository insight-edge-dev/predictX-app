import { createContext, useContext, useState, useEffect } from 'react';
import api from '@/services/api';

export interface League {
  id:        string;
  leagueId?: number;
  seasonId?: number;
  name:      string;
  short:     string;
  flag:      string;
  season:    string;
  country:   string;
  format:    string;
  image?:    string;
  sport:     'cricket' | 'football';
}

export const FALLBACK_LEAGUES: League[] = [
  // Cricket
  { id: 'ipl',      name: 'Indian Premier League',     short: 'IPL',      flag: '🏏', season: '2026',    country: 'India',         format: 'T20',   sport: 'cricket' },
  { id: 'psl',      name: 'Pakistan Super League',     short: 'PSL',      flag: '🟢', season: '2026',    country: 'Pakistan',      format: 'T20',   sport: 'cricket' },
  { id: 'gsl',      name: 'Global Super League',       short: 'GSL',      flag: '🌐', season: '2026',    country: 'West Indies',   format: 'T20',   sport: 'cricket' },
  { id: 't20wc',    name: "ICC Men's T20 World Cup",   short: 'T20 WC',   flag: '🌍', season: '2026',    country: 'International', format: 'T20',   sport: 'cricket' },
  { id: 't20blast', name: 'T20 Blast',                 short: 'T20 Blast',flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', season: '2026',   country: 'England',       format: 'T20',   sport: 'cricket' },
  { id: 'bbl',      name: 'Big Bash League',           short: 'BBL',      flag: '🦘', season: '2025/26', country: 'Australia',     format: 'T20',   sport: 'cricket' },
  { id: 'bpl',      name: 'Bangladesh Premier League', short: 'BPL',      flag: '🟥', season: '2025/26', country: 'Bangladesh',    format: 'T20',   sport: 'cricket' },
  { id: 'csa_t20',  name: 'CSA T20 Challenge',         short: 'CSA T20',  flag: '🦁', season: '2025',    country: 'South Africa',  format: 'T20',   sport: 'cricket' },
  // Football
  { id: 'wc2026',   name: 'FIFA World Cup 2026',       short: 'WC 2026',  flag: '🏆', season: '2026',    country: 'USA/CAN/MEX',   format: '90min', sport: 'football' },
];

export type LeagueId = string;

interface LeagueContextValue {
  league:             League;
  leagues:            League[];
  setLeagueId:        (id: LeagueId) => void;
  /** True once the user has explicitly picked a league (vs. just the default). */
  hasSelectedLeague:  boolean;
}

const LeagueContext = createContext<LeagueContextValue | null>(null);

export function LeagueProvider({ children }: { children: React.ReactNode }) {
  const [leagueId, setLeagueIdRaw] = useState<LeagueId>('ipl');
  const [leagues,  setLeagues]     = useState<League[]>(FALLBACK_LEAGUES);
  const [hasSelectedLeague, setHasSelectedLeague] = useState(false);

  function setLeagueId(id: LeagueId) {
    setLeagueIdRaw(id);
    setHasSelectedLeague(true);
  }

  // Fetch full league list from backend as soon as the app starts.
  // Runs inside the provider so it fires before any screen mounts.
  useEffect(() => {
    console.log('[LeagueContext] fetching leagues...');
    api.get<{ leagues: any[] }>('/leagues')
      .then(data => {
        const list: League[] = (data.leagues ?? []).map(l => ({
          id:       String(l.slug   ?? l.id),
          leagueId: l.leagueId,
          seasonId: l.seasonId,
          name:     l.name    ?? '',
          short:    l.short   ?? '',
          season:   l.season  ?? '',
          flag:     l.flag    ?? '🏏',
          country:  l.country ?? '',
          format:   l.format  ?? 'T20',
          image:    l.image,
          sport:    (l.sport === 'football' ? 'football' : 'cricket') as 'cricket' | 'football',
        }));
        // Deduplicate by id in case backend sends collisions
        const seen = new Set<string>();
        const unique = list.filter(l => {
          if (seen.has(l.id)) return false;
          seen.add(l.id);
          return true;
        });
        console.log(`[LeagueContext] loaded ${unique.length} leagues`);
        if (unique.length > 0) setLeagues(unique);
      })
      .catch(e => console.error('[LeagueContext] fetch failed:', e));
  }, []);

  const league = leagues.find(l => l.id === leagueId) ?? leagues[0];

  return (
    <LeagueContext.Provider value={{ league, leagues, setLeagueId, hasSelectedLeague }}>
      {children}
    </LeagueContext.Provider>
  );
}

export function useLeague(): LeagueContextValue {
  const ctx = useContext(LeagueContext);
  if (!ctx) throw new Error('useLeague must be used within LeagueProvider');
  return ctx;
}

export function useIsFootball(): boolean {
  const { league } = useLeague();
  return league.sport === 'football';
}
