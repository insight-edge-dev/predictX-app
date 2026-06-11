import { useQuery } from '@tanstack/react-query';
import {
  getInternationalSeries,
  getInternationalSeriesDetail,
  getInternationalMatchTip,
} from '@/services/internationalService';
import type {
  InternationalSeries,
  InternationalSeriesDetail,
  InternationalMatchTip,
} from '@/types/international';

export function useInternationalSeries() {
  return useQuery<InternationalSeries[]>({
    queryKey:             ['intl:series:list'],
    queryFn:              getInternationalSeries,
    staleTime:            10 * 60_000,
    refetchOnMount:       false,
    refetchOnWindowFocus: false,
    retry:                1,
    placeholderData:      (prev) => prev,
  });
}

export function useInternationalSeriesDetail(stageId: string | undefined) {
  return useQuery<InternationalSeriesDetail | null>({
    queryKey:             ['intl:series:detail', stageId],
    queryFn:              () => getInternationalSeriesDetail(stageId!),
    enabled:              !!stageId,
    staleTime:            5 * 60_000,
    refetchOnMount:       false,
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
