import { useQuery } from '@tanstack/react-query';
import {
  getInternationalSeries,
  getInternationalSeriesDetail,
  getInternationalMatchTip,
  getInternationalSchedule,
} from '@/services/internationalService';
import { adaptMatch, type AdaptedMatch } from '@/utils/matchAdapter';
import type {
  InternationalSeries,
  InternationalSeriesDetail,
  InternationalMatchTip,
} from '@/types/international';

// AdaptedMatch extended with stageId so the Discovery screen can route to
// the correct series detail page when a user taps an international fixture
// in the Today / Coming Up sections.
export interface IntlScheduledMatch extends AdaptedMatch {
  stageId: string;
}

function adaptIntl(raw: any): IntlScheduledMatch {
  return {
    ...adaptMatch(raw),
    leagueLabel: raw.leagueLabel ?? 'T20I',
    stageId:     String(raw.stageId ?? ''),
  };
}

export function useInternationalSeries(options?: { enabled?: boolean }) {
  return useQuery<InternationalSeries[]>({
    queryKey:             ['intl:series:list'],
    queryFn:              getInternationalSeries,
    staleTime:            10 * 60_000,
    refetchOnMount:       false,
    refetchOnWindowFocus: false,
    retry:                1,
    enabled:              options?.enabled ?? true,
    placeholderData:      (prev) => prev,
  });
}

export function useInternationalSeriesDetail(stageId: string | undefined) {
  return useQuery<InternationalSeriesDetail | null>({
    queryKey:             ['intl:series:detail', stageId],
    queryFn:              () => getInternationalSeriesDetail(stageId!),
    enabled:              !!stageId,
    staleTime:            30_000,
    refetchInterval:      (q) => (q.state.data?.matches?.live?.length ?? 0) > 0 ? 30_000 : false,
    refetchOnMount:       true,
    refetchOnWindowFocus: false,
    retry:                1,
  });
}

export function useInternationalMatchTip(matchId: string | undefined) {
  return useQuery<InternationalMatchTip>({
    queryKey:             ['intl:tips:match', matchId],
    queryFn:              () => getInternationalMatchTip(matchId!),
    enabled:              !!matchId,
    staleTime:            6 * 60 * 60_000,
    refetchOnMount:       false,
    refetchOnWindowFocus: false,
    retry:                1,
  });
}

export function useInternationalSchedule(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey:             ['intl:schedule'],
    queryFn:              getInternationalSchedule,
    select: (data) => ({
      live:      (data.live      ?? []).map(adaptIntl),
      today:     (data.today     ?? []).map(adaptIntl),
      upcoming:  (data.upcoming  ?? []).map(adaptIntl),
      completed: (data.completed ?? []).map(adaptIntl),
    }),
    staleTime:            2 * 60_000,
    refetchInterval:      (q) => (q.state.data?.live?.length ?? 0) > 0 ? 30_000 : false,
    refetchOnMount:       true,
    refetchOnWindowFocus: false,
    retry:                1,
    enabled:              options?.enabled ?? true,
    placeholderData:      (prev) => prev,
  });
}
