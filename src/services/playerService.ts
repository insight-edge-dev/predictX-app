/**
 * playerService.ts — player data layer.
 *
 * Backend endpoints:
 *   GET /api/players           → paginated player list
 *   GET /api/players/search?q= → search by name
 *   GET /api/players/:id       → full player profile
 */

import api from './api';
import { cacheGet, cacheSet } from '@/utils/cache';

// ── Types ─────────────────────────────────────────────────────

export interface PlayerSummary {
  id:          string;
  name:        string;
  country:     string;
  role:        string;
  battingStyle: string;
  bowlingStyle: string;
}

export interface PlayerProfile extends PlayerSummary {
  dateOfBirth:   string;
  placeOfBirth:  string;
  description:   string;
  batting: {
    matches:    number;
    innings:    number;
    runs:       number;
    highest:    string;
    average:    number;
    strikeRate: number;
    hundreds:   number;
    fifties:    number;
    fours:      number;
    sixes:      number;
  } | null;
  bowling: {
    matches:   number;
    innings:   number;
    wickets:   number;
    economy:   number;
    average:   number;
    best:      string;
    fiveWickets: number;
  } | null;
}

// ── TTL ───────────────────────────────────────────────────────

const TTL = 10 * 60_000; // 10 min

// ── getPlayers ────────────────────────────────────────────────

export async function getPlayers(offset = 0): Promise<PlayerSummary[]> {
  const key = `players:list:${offset}`;
  const cached = cacheGet<PlayerSummary[]>(key);
  if (cached) return cached;

  try {
    const data = await api.get<{ players: PlayerSummary[] }>(
      `/players?offset=${offset}`,
    );
    const players = Array.isArray(data.players) ? data.players : [];
    cacheSet(key, players, TTL);
    return players;
  } catch (e) {
    console.error('[playerService] getPlayers error:', (e as Error).message);
    return [];
  }
}

// ── searchPlayers ─────────────────────────────────────────────

export async function searchPlayers(query: string): Promise<PlayerSummary[]> {
  const q = query.trim();
  if (!q) return [];

  const key = `players:search:${q.toLowerCase()}`;
  const cached = cacheGet<PlayerSummary[]>(key);
  if (cached) return cached;

  try {
    const data = await api.get<{ players: PlayerSummary[] }>(
      `/players/search?q=${encodeURIComponent(q)}`,
    );
    const players = Array.isArray(data.players) ? data.players : [];
    cacheSet(key, players, TTL);
    return players;
  } catch (e) {
    console.error('[playerService] searchPlayers error:', (e as Error).message);
    return [];
  }
}

// ── getPlayer ─────────────────────────────────────────────────

export async function getPlayer(id: string): Promise<PlayerProfile | null> {
  const key = `player:${id}`;
  const cached = cacheGet<PlayerProfile>(key);
  if (cached) return cached;

  try {
    const data = await api.get<PlayerProfile>(`/players/${id}`);
    cacheSet(key, data, TTL);
    return data;
  } catch (e) {
    console.error(`[playerService] getPlayer(${id}) error:`, (e as Error).message);
    return null;
  }
}
