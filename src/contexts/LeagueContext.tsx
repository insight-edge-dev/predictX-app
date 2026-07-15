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
  /** Backend-computed: 'active' = fixtures in -10d/+45d window; 'completed' = season ended. */
  status?:   'active' | 'completed';
  /** Admin-set "featured/pinned" override — higher sorts first. 0 = no override. */
  priority?: number;
}

export const FALLBACK_LEAGUES: League[] = [
  // Cricket — active
  { id: 'ipl',       name: 'Indian Premier League',       short: 'IPL',        flag: '🏏', season: '2026',    country: 'India',              format: 'T20',   sport: 'cricket',  status: 'active' },
  { id: 'gsl',       name: 'Global Super League',         short: 'GSL',        flag: '🌐', season: '2026',    country: 'West Indies',        format: 'T20',   sport: 'cricket',  status: 'active' },
  { id: 't20wc',     name: "ICC Men's T20 World Cup",     short: 'T20 WC',     flag: '🌍', season: '2026',    country: 'International',      format: 'T20',   sport: 'cricket',  status: 'active' },
  { id: 't20blast',  name: 'T20 Blast',                   short: 'T20 Blast',  flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', season: '2026',  country: 'England',            format: 'T20',   sport: 'cricket',  status: 'active' },
  { id: 't20blastw', name: "T20 Blast Women's",           short: 'T20 Blast W',flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', season: '2026',  country: 'England',            format: 'T20',   sport: 'cricket',  status: 'active' },
  { id: 't20mumbai', name: 'T20 Mumbai',                  short: 'T20 Mum',    flag: '🏙', season: '2026',    country: 'India',              format: 'T20',   sport: 'cricket',  status: 'active' },
  { id: 'supersmash',name: 'Super Smash',                 short: 'SS',         flag: '🥝', season: '2025/26', country: 'New Zealand',        format: 'T20',   sport: 'cricket',  status: 'active' },
  { id: 'ashes',     name: 'Ashes Series',                short: 'Ashes',      flag: '🏺', season: '2025/26', country: 'England / Australia',format: 'Test',  sport: 'cricket',  status: 'active' },
  // Cricket — completed
  { id: 'psl',       name: 'Pakistan Super League',       short: 'PSL',        flag: '🟢', season: '2026',    country: 'Pakistan',           format: 'T20',   sport: 'cricket',  status: 'completed' },
  { id: 'bbl',       name: 'Big Bash League',             short: 'BBL',        flag: '🦘', season: '2025/26', country: 'Australia',          format: 'T20',   sport: 'cricket',  status: 'completed' },
  { id: 'bpl',       name: 'Bangladesh Premier League',   short: 'BPL',        flag: '🟥', season: '2025/26', country: 'Bangladesh',         format: 'T20',   sport: 'cricket',  status: 'completed' },
  { id: 'csa_t20',   name: 'CSA T20 Challenge',           short: 'CSA T20',    flag: '🦁', season: '2025',    country: 'South Africa',       format: 'T20',   sport: 'cricket',  status: 'completed' },
  { id: 'iml',       name: 'International Masters League',short: 'IML',        flag: '🌍', season: '2025',    country: 'International',      format: 'T20',   sport: 'cricket',  status: 'completed' },
  { id: 'wwct20',    name: "ICC Women's T20 World Cup",   short: 'WWCT20',     flag: '🏏', season: '2026',    country: 'World',              format: 'T20',   sport: 'cricket',  status: 'completed' },
  // Football
  { id: 'wc2026',    name: 'FIFA World Cup 2026',         short: 'WC',         flag: '🏆', season: '2026',    country: 'USA/CAN/MEX',        format: '90min', sport: 'football', status: 'active' },
];

export type LeagueId = string;

interface LeagueContextValue {
  league:             League;
  leagues:            League[];
  setLeagueId:        (id: LeagueId) => void;
  /** True once the user has explicitly picked a league (vs. just the default). */
  hasSelectedLeague:  boolean;
  /** Drops back to the cross-league "All" scope (Discovery, All Matches, All PredictX). */
  clearLeagueSelection: () => void;
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

  function clearLeagueSelection() {
    setHasSelectedLeague(false);
  }

  // Fetch full league list from backend as soon as the app starts.
  // Runs inside the provider so it fires before any screen mounts.
  useEffect(() => {
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
          status:   (l.status === 'completed' ? 'completed' : 'active') as 'active' | 'completed',
          priority: l.priority ?? 0,
        }));
        // Deduplicate by id in case backend sends collisions
        const seen = new Set<string>();
        const unique = list.filter(l => {
          if (seen.has(l.id)) return false;
          seen.add(l.id);
          return true;
        });
        // Backend already filters to only active leagues (fixture window -10d/+45d)
        // so we trust it directly — no client-side whitelist needed.
        if (unique.length > 0) setLeagues(unique);
      })
      .catch(e => {
        // AbortError is expected on fast-refresh / unmount — fallback leagues stay active
        if (e?.name === 'AbortError') return;
        console.error('[LeagueContext] fetch failed:', e);
      });
  }, []);

  const league = leagues.find(l => l.id === leagueId) ?? leagues[0];

  return (
    <LeagueContext.Provider value={{ league, leagues, setLeagueId, hasSelectedLeague, clearLeagueSelection }}>
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
