/**
 * useLiveScores.ts — WebSocket hook for real-time IPL live scores.
 *
 * Connects to ws://<host>/ws and listens for { type: "ipl:live", matches: [...] }.
 *
 * Each match in the payload has a `matchKey` = sorted team shorts joined by ":"
 * (e.g. "CSK:RCB"). Use getLiveScore(t1Short, t2Short) to look up scores for
 * a match card.
 *
 * Auto-reconnects every 5 s on disconnect. Cleans up on unmount.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { WS_BASE_URL } from '@/config/api';

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
}

// Map keyed by matchKey ("CSK:RCB") → LiveScore
type ScoreMap = Map<string, LiveScore>;

function makeKey(t1: string, t2: string) {
  return [t1, t2].sort().join(':');
}

export function useLiveScores() {
  const [scores, setScores]       = useState<ScoreMap>(new Map());
  const [connected, setConnected] = useState(false);

  const wsRef         = useRef<WebSocket | null>(null);
  const retryTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef  = useRef(false);

  const connect = useCallback(() => {
    if (unmountedRef.current) return;

    try {
      const ws = new WebSocket(WS_BASE_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (unmountedRef.current) { ws.close(); return; }
        console.log('[LiveScores] WebSocket connected');
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);
          // ipl:hello is a keep-alive ack — no action needed
          if (msg.type === 'ipl:hello') return;
          if (msg.type !== 'ipl:live' || !Array.isArray(msg.matches)) return;

          const next: ScoreMap = new Map();
          for (const m of msg.matches) {
            const key = makeKey(m.team1Short, m.team2Short);
            next.set(key, m as LiveScore);
          }
          setScores(next);
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (unmountedRef.current) return;
        console.log('[LiveScores] WebSocket disconnected — retrying in 5 s');
        setConnected(false);
        setScores(new Map()); // clear stale scores so we don't show old live data
        retryTimer.current = setTimeout(connect, 5_000);
      };

      ws.onerror = () => {
        ws.close(); // triggers onclose which handles retry
      };
    } catch {
      // WebSocket constructor threw (bad URL etc.) — retry
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
        wsRef.current.onclose = null; // prevent retry on intentional close
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Lookup helper: pass both team shorts in any order
  const getLiveScore = useCallback(
    (t1Short: string, t2Short: string): LiveScore | null => {
      return scores.get(makeKey(t1Short, t2Short)) ?? null;
    },
    [scores],
  );

  return { getLiveScore, scores, connected, scoreCount: scores.size };
}
