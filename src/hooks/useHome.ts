import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';

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
  rating:  number;
  matches: number;
  points:  number;
}

export interface HomeRankings {
  batsmen: RankingPlayer[];
  bowlers: RankingPlayer[];
  teams:   RankingTeam[];
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
    placeholderData:      (prev) => prev ?? { batsmen: [], bowlers: [], teams: [] },
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
