import { useEffect, useRef, useState, useCallback } from 'react';
import { WS_BASE_URL } from '@/config/api';
import { useLeague } from '@/contexts/LeagueContext';

export interface LiveBatsman {
  name: string; runs: number; balls: number;
  fours: number; sixes: number; sr: string; isStrike: boolean;
}
export interface LiveBowler {
  name: string; overs: number; wickets: number; runs: number; eco: string; active: boolean;
}

export interface LiveScore {
  cricbuzzId:  number;
  team1Short:  string;
  team2Short:  string;
  score1:      string | null;
  score2:      string | null;
  overs1:      string | null;
  overs2:      string | null;
  statusText:  string;
  status:      'live' | 'completed' | 'upcoming';
  batsmen?:    LiveBatsman[];
  bowlers?:    LiveBowler[];
}

type ScoreMap = Map<string, LiveScore>;

function makeKey(t1: string, t2: string) {
  return [t1, t2].sort().join(':');
}

function buildScoreMap(matches: LiveScore[]): ScoreMap {
  const map: ScoreMap = new Map();
  for (const m of matches) {
    map.set(makeKey(m.team1Short, m.team2Short), m);
  }
  return map;
}

export function useLiveScores() {
  const { league }    = useLeague();
  const leagueSlugRef = useRef(league.id);

  const [scores, setScores]                   = useState<ScoreMap>(new Map());
  const [connected, setConnected]             = useState(false);
  const [hasReceivedData, setHasReceivedData] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt]     = useState(0);

  const wsRef             = useRef<WebSocket | null>(null);
  const retryTimer        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef      = useRef(false);
  // Stores the last byLeague payload so we can re-filter when league changes
  const lastByLeagueRef   = useRef<Record<string, LiveScore[]>>({});

  // Keep slug ref in sync — message handler reads this ref, not closure
  useEffect(() => {
    const slug = league.id;
    leagueSlugRef.current = slug;

    // Re-apply last received payload for the newly selected league
    const matches = lastByLeagueRef.current[slug] ?? [];
    setScores(buildScoreMap(matches));
    // Only mark authoritative if we actually had data for this league
    if (Object.keys(lastByLeagueRef.current).length > 0) {
      setHasReceivedData(true);
    }
  }, [league.id]);

  const connect = useCallback(() => {
    if (unmountedRef.current) return;

    try {
      const ws = new WebSocket(WS_BASE_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (unmountedRef.current) { ws.close(); return; }
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);
          if (msg.type === 'ipl:hello') return;

          // ── New multi-league format ───────────────────
          if (msg.type === 'leagues:live' && msg.byLeague) {
            lastByLeagueRef.current = msg.byLeague as Record<string, LiveScore[]>;
            const matches = (msg.byLeague as Record<string, LiveScore[]>)[leagueSlugRef.current] ?? [];
            setScores(buildScoreMap(matches));
            setHasReceivedData(true);
            setLastUpdatedAt(Date.now());
            return;
          }

          // ── Backward compat: ipl:live ─────────────────
          if (msg.type === 'ipl:live' && leagueSlugRef.current === 'ipl' && Array.isArray(msg.matches)) {
            setScores(buildScoreMap(msg.matches as LiveScore[]));
            setHasReceivedData(true);
            setLastUpdatedAt(Date.now());
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (unmountedRef.current) return;
        setConnected(false);
        setHasReceivedData(false);
        setScores(new Map());
        lastByLeagueRef.current = {};
        retryTimer.current = setTimeout(connect, 5_000);
      };

      ws.onerror = () => { ws.close(); };
    } catch {
      retryTimer.current = setTimeout(connect, 5_000);
    }
  }, []);

  useEffect(() => {
    unmountedRef.current = false;
    connect();

    return () => {
      unmountedRef.current = true;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);

  const getLiveScore = useCallback(
    (t1Short: string, t2Short: string): LiveScore | null =>
      scores.get(makeKey(t1Short, t2Short)) ?? null,
    [scores],
  );

  return { getLiveScore, scores, connected, hasReceivedData, scoreCount: scores.size, lastUpdatedAt };
}
