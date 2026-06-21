import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { supabase } from '@/lib/supabase';

export interface ToplistPlayer {
  playerId:  string;
  name:      string;
  imageUrl:  string | null;
  teamShort: string;
  teamName:  string;
  teamLogo:  string | null;
  runs:      number | null;
  wickets:   number | null;
  sixes:     number | null;
  matches:   number | null;
}

export interface SeasonStats {
  orangeCap:  ToplistPlayer[];
  purpleCap:  ToplistPlayer[];
  sixHitters: ToplistPlayer[];
}

export interface RankingPlayer {
  id:       string;
  rank:     number;
  name:     string;
  country:  string;
  rating:   number;
  trend:    string;
  imageUrl: string | null;
}

export interface RankingTeam {
  id:      string;
  rank:    number;
  name:    string;
  code:    string;
  image:   string;
  rating:  number;
  matches: number;
  points:  number;
}

export interface AllRankings {
  t20i_men:   RankingTeam[];
  odi_men:    RankingTeam[];
  test_men:   RankingTeam[];
  t20i_women: RankingTeam[];
  odi_women:  RankingTeam[];
}

export interface HomeRankings {
  batsmen:  RankingPlayer[];
  bowlers:  RankingPlayer[];
  teams:    RankingTeam[];
  rankings: AllRankings;
}

export interface NewsItem {
  id:          number;
  title:       string;
  description: string;
  context:     string;
  storyType:   string;
  imageId:     string | null;
  image:       string | null;   // relative path e.g. "/api/img/news/12345"
  pubTime:     number | null;
  source:      string;
}

export function useHomeRankings() {
  return useQuery<HomeRankings>({
    queryKey:             ['home:rankings'],
    queryFn:              () => api.get<HomeRankings>('/home/rankings'),
    staleTime:            6 * 60 * 60_000,
    refetchOnMount:       false,
    refetchOnWindowFocus: false,
    retry:                1,
    placeholderData:      (prev) => prev ?? {
      batsmen: [], bowlers: [], teams: [],
      rankings: { t20i_men: [], odi_men: [], test_men: [], t20i_women: [], odi_women: [] },
    },
  });
}

export interface NewsArticle {
  id:          number;
  headline:    string;
  context:     string;
  publishTime: number | null;
  coverImage:  { id: string; caption: string; source: string } | null;
  paragraphs:  string[];
}

export function useNewsDetail(id: string | number) {
  return useQuery<NewsArticle>({
    queryKey:             ['news:detail', String(id)],
    queryFn:              () => api.get<NewsArticle>(`/home/news/${id}`),
    staleTime:            24 * 60 * 60_000,
    refetchOnMount:       false,
    refetchOnWindowFocus: false,
    enabled:              !!id,
  });
}

export function useSeasonStats(enabled = true) {
  return useQuery<SeasonStats>({
    queryKey:             ['home:season-stats'],
    queryFn:              () => api.get<SeasonStats>('/home/season-stats'),
    staleTime:            0,
    refetchOnMount:       true,
    refetchOnWindowFocus: false,
    retry:                1,
    enabled,
    placeholderData:      (prev) =>
      prev && (prev.orangeCap.length > 0 || prev.purpleCap.length > 0)
        ? prev
        : { orangeCap: [], purpleCap: [], sixHitters: [] },
  });
}

export function useHomeNews() {
  return useQuery<NewsItem[]>({
    queryKey:             ['home:news'],
    queryFn:              () => api.get<NewsItem[]>('/home/news'),
    staleTime:            15 * 60_000,
    refetchOnMount:       false,
    refetchOnWindowFocus: false,
    retry:                1,
    placeholderData:      (prev) => prev ?? [],
  });
}

export interface HomeFact {
  id:    string;
  sport: 'cricket' | 'football';
  icon:  string;
  text:  string;
  color: string;
}

export function useHomeFacts(sport: 'cricket' | 'football') {
  return useQuery<HomeFact[]>({
    queryKey:             ['home:facts', sport],
    queryFn:              () => api.get<HomeFact[]>(`/home/facts?sport=${sport}`),
    staleTime:            60 * 60_000,
    refetchOnMount:       false,
    refetchOnWindowFocus: false,
    retry:                1,
    placeholderData:      (prev) => prev ?? [],
  });
}

export interface HomeSection {
  key:           string;
  label:         string;
  enabled:       boolean;
  display_order: number;
}

export function useHomeSections() {
  return useQuery<HomeSection[]>({
    queryKey:             ['home:sections'],
    queryFn:              () => api.get<HomeSection[]>('/home/sections'),
    staleTime:            15 * 60_000,
    refetchOnMount:       false,
    refetchOnWindowFocus: false,
    retry:                1,
    placeholderData:      (prev) => prev ?? [],
  });
}

export interface Accuracy {
  percentage:         number;
  sampleSize:         number;
  isOverridden:       boolean;
  computedPercentage: number;
}

export function useAccuracy(scope?: string) {
  const queryClient = useQueryClient();

  // Admin overrides should reach the app instantly, not on the next 60s poll —
  // mirrors the expert-predictions Realtime pattern (see matches screen).
  useEffect(() => {
    const channel = supabase
      .channel(`accuracy_overrides_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accuracy_overrides' }, () => {
        queryClient.invalidateQueries({ queryKey: ['home:accuracy'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return useQuery<Accuracy>({
    queryKey:             ['home:accuracy', scope ?? 'global'],
    queryFn:              () => api.get<Accuracy>(scope ? `/home/accuracy/${scope}` : '/home/accuracy'),
    // Short staleTime (unlike facts/sections) — an admin override should be
    // visible again within moments of saving it, not up to 30 minutes later.
    staleTime:            60_000,
    refetchOnMount:       true,
    refetchOnWindowFocus: false,
    // Polling fallback in case the Realtime subscription above ever misses
    // an event (dropped connection, etc.) — caps staleness at 1 minute
    // regardless of whether Realtime actually fired.
    refetchInterval:      60_000,
    retry:                1,
    placeholderData:      (prev) => prev,
  });
}

export interface ExpertPrediction {
  id:               string;
  match_id:         string | null;
  match_label:      string | null;
  predicted_winner: string;
  confidence:       'HIGH' | 'MEDIUM' | 'LOW';
  analysis:         string;
  league_id:        string | null;
  created_at:       string;
  updated_at:       string;
}

export function useExpertPredictions(leagueId: string) {
  return useQuery<ExpertPrediction[]>({
    queryKey:             ['expert-predictions', leagueId],
    queryFn:              async () => {
      const res = await api.get<{ predictions: ExpertPrediction[] }>(`/expert-predictions?league=${leagueId}`);
      return res.predictions ?? [];
    },
    staleTime:            5 * 60_000,
    refetchOnMount:       true,
    refetchOnWindowFocus: false,
    retry:                1,
    enabled:              !!leagueId,
    placeholderData:      (prev) => prev ?? [],
  });
}
