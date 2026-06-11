/**
 * internationalService.ts — bilateral international series data layer.
 *
 * Backend endpoints:
 *   GET /api/international/series             → list of series (grouped tours)
 *   GET /api/international/series/:stageId    → series detail + categorized matches
 *   GET /api/international/tips/:matchId      → full prediction for one match
 */

import api from './api';
import { cacheGet, cacheSet } from '@/utils/cache';
import type {
  InternationalSeries,
  InternationalSeriesDetail,
  InternationalMatchTip,
} from '@/types/international';

const TTL = 6 * 60 * 60_000; // 6h — mirrors backend TTL.INTL_SERIES

export async function getInternationalSeries(): Promise<InternationalSeries[]> {
  const key = 'intl:series:list';
  const cached = cacheGet<InternationalSeries[]>(key);
  if (cached) return cached;

  try {
    const data = await api.get<{ series: InternationalSeries[] }>('/international/series');
    const list = Array.isArray(data.series) ? data.series : [];
    cacheSet(key, list, TTL);
    return list;
  } catch (e) {
    console.error('[internationalService] getInternationalSeries error:', (e as Error).message);
    return [];
  }
}

export async function getInternationalSeriesDetail(stageId: string): Promise<InternationalSeriesDetail | null> {
  const key = `intl:series:detail:${stageId}`;
  const cached = cacheGet<InternationalSeriesDetail>(key);
  if (cached) return cached;

  try {
    const data = await api.get<InternationalSeriesDetail>(`/international/series/${stageId}`);
    cacheSet(key, data, TTL);
    return data;
  } catch (e) {
    console.error(`[internationalService] getInternationalSeriesDetail(${stageId}) error:`, (e as Error).message);
    return null;
  }
}

export async function getInternationalMatchTip(matchId: string): Promise<InternationalMatchTip> {
  return api.get<InternationalMatchTip>(`/international/tips/${matchId}`);
}
