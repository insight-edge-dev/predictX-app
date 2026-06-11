import { useQuery } from '@tanstack/react-query';
import { getWCHistoryStats } from '@/services/footballService';
import type { WCHistoryStats } from '@/types/football';

export function useWCHistoryStats() {
  return useQuery<WCHistoryStats>({
    queryKey: ['football:wc-history'],
    queryFn:  getWCHistoryStats,
    staleTime: 24 * 60 * 60 * 1000,  // 24h — historical data never changes
    retry: 1,
  });
}
