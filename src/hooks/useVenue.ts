/**
 * useVenue.ts — venue profile data.
 * Cached indefinitely (venue data never changes).
 */

import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';

export interface VenueData {
  id:         string;
  name:       string;
  city:       string;
  country:    string;
  capacity:   number | null;
  floodlight: boolean;
  image:      string;
}

export function useVenue(venueId: string | null | undefined) {
  return useQuery<{ venue: VenueData }>({
    queryKey:    ['venue', venueId],
    queryFn:     () => api.get<{ venue: VenueData }>(`/venues/${venueId}`),
    enabled:     !!venueId,
    staleTime:   24 * 60 * 60_000,
    gcTime:      7 * 24 * 60 * 60_000,
    retry:       1,
  });
}
