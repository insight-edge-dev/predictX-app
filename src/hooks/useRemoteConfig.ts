import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';

interface RemoteConfig {
  predictions_enabled:  boolean;
  news_enabled:         boolean;
  tips_enabled:         boolean;
  comments_enabled:     boolean;
  leaderboard_enabled:  boolean;
  maintenance_mode:     boolean;
  maintenance_message:  string;
}

const DEFAULTS: RemoteConfig = {
  predictions_enabled:  true,
  news_enabled:         true,
  tips_enabled:         true,
  comments_enabled:     true,
  leaderboard_enabled:  true,
  maintenance_mode:     false,
  maintenance_message:  '',
};

export function useRemoteConfig(): RemoteConfig {
  const { data } = useQuery<RemoteConfig>({
    queryKey:             ['remote-config'],
    queryFn:              () => api.get<RemoteConfig>('/config'),
    staleTime:            10 * 60 * 1000,  // re-fetch every 10 min
    gcTime:               60 * 60 * 1000,
    retry:                false,
    refetchOnWindowFocus: false,
  });

  return { ...DEFAULTS, ...data };
}
