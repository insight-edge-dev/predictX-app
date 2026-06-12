import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';

export interface BannerLinkMeta {
  league?: string;
  sport?:  'cricket' | 'football';
  label?:  string;
}

export interface Banner {
  id:            string;
  title:         string;
  image_url:     string;
  link_type:     'none' | 'external' | 'match' | 'tip' | 'league_home' | 'app_section';
  link_value:    string | null;
  link_meta:     BannerLinkMeta | null;
  display_order: number;
}

/** Active banners for a placement — 'discovery' or a league slug (e.g. 'ipl'). */
export function useBanners(placement: string) {
  return useQuery<Banner[]>({
    queryKey:             ['banners', placement],
    queryFn:              async () => {
      const res = await api.get<{ banners: Banner[] }>(`/banners?placement=${placement}`);
      return res.banners ?? [];
    },
    staleTime:            10 * 60_000,
    refetchOnMount:       false,
    refetchOnWindowFocus: false,
    retry:                1,
    placeholderData:      (prev) => prev ?? [],
  });
}
