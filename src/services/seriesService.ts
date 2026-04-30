/**
 * seriesService.ts — series / tournament data layer.
 *
 * Backend endpoints:
 *   GET /api/series              → list of series
 *   GET /api/series/:id          → series detail
 *   GET /api/series/:id/matches  → matches in series
 *   GET /api/series/:id/table    → points table
 */

import api from './api';
import { cacheGet, cacheSet } from '@/utils/cache';
import type { Match } from '@/types/match';

// ── Types ─────────────────────────────────────────────────────

export interface SeriesSummary {
  id:        string;
  name:      string;
  startDate: string;
  endDate:   string;
  odi:       number;
  t20:       number;
  test:      number;
  squads:    number;
  matches:   number;
}

export interface SeriesDetail extends SeriesSummary {
  info?: string;
}

export interface StandingsRow {
  team:       string;
  shortName:  string;
  logo:       string;
  played:     number;
  won:        number;
  lost:       number;
  tied:       number;
  noResult:   number;
  points:     number;
  netRunRate: number;
}

// ── TTL ───────────────────────────────────────────────────────

const TTL = 10 * 60_000; // 10 min

// ── getSeries ─────────────────────────────────────────────────

export async function getSeries(): Promise<SeriesSummary[]> {
  const key = 'series:list';
  const cached = cacheGet<SeriesSummary[]>(key);
  if (cached) return cached;

  try {
    const data = await api.get<{ series: SeriesSummary[] }>('/series');
    const list = Array.isArray(data.series) ? data.series : [];
    cacheSet(key, list, TTL);
    return list;
  } catch (e) {
    console.error('[seriesService] getSeries error:', (e as Error).message);
    return [];
  }
}

// ── getSeriesDetail ───────────────────────────────────────────

export async function getSeriesDetail(id: string): Promise<SeriesDetail | null> {
  const key = `series:${id}`;
  const cached = cacheGet<SeriesDetail>(key);
  if (cached) return cached;

  try {
    const data = await api.get<SeriesDetail>(`/series/${id}`);
    cacheSet(key, data, TTL);
    return data;
  } catch (e) {
    console.error(`[seriesService] getSeriesDetail(${id}) error:`, (e as Error).message);
    return null;
  }
}

// ── getSeriesMatches ──────────────────────────────────────────

export async function getSeriesMatches(id: string): Promise<Match[]> {
  const key = `series:${id}:matches`;
  const cached = cacheGet<Match[]>(key);
  if (cached) return cached;

  try {
    const data = await api.get<{ matches: Match[] }>(`/series/${id}/matches`);
    const matches = Array.isArray(data.matches) ? data.matches : [];
    cacheSet(key, matches, TTL);
    return matches;
  } catch (e) {
    console.error(`[seriesService] getSeriesMatches(${id}) error:`, (e as Error).message);
    return [];
  }
}

// ── getPointsTable ────────────────────────────────────────────

export async function getPointsTable(id: string): Promise<StandingsRow[]> {
  const key = `series:${id}:table`;
  const cached = cacheGet<StandingsRow[]>(key);
  if (cached) return cached;

  try {
    const res  = await api.get<{ table: StandingsRow[] }>(`/series/${id}/table`);
    const rows = Array.isArray(res.table) ? res.table : [];
    cacheSet(key, rows, TTL);
    return rows;
  } catch (e) {
    console.error(`[seriesService] getPointsTable(${id}) error:`, (e as Error).message);
    return [];
  }
}
