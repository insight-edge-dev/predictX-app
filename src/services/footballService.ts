import api from './api';
import type {
  FootballMatch,
  FootballMatchWithTip,
  FootballPrediction,
  FootballGroupStanding,
  WCHistoryStats,
} from '@/types/football';

interface MatchesResponse {
  live:      FootballMatch[];
  upcoming:  FootballMatch[];
  completed: FootballMatch[];
}

export async function getFootballMatches(): Promise<MatchesResponse> {
  return api.get<MatchesResponse>('/football/matches');
}

export async function getFootballLive(): Promise<{ live: FootballMatch[] }> {
  return api.get('/football/matches/live');
}

export async function getFootballMatchById(id: string): Promise<{ match: FootballMatch }> {
  return api.get(`/football/matches/${id}`);
}

export async function getFootballTipsList(): Promise<{ matches: FootballMatchWithTip[] }> {
  return api.get('/football/tips');
}

export async function getFootballMatchTip(matchId: string): Promise<{ match: FootballMatch; tip: FootballPrediction }> {
  return api.get(`/football/tips/${matchId}`);
}

export async function getFootballGroups(): Promise<{ groups: Record<string, FootballGroupStanding[]> }> {
  return api.get('/football/groups');
}

export async function getFootballGroup(letter: string): Promise<{ group: FootballGroupStanding[] }> {
  return api.get(`/football/groups/${letter}`);
}

export async function getWCHistoryStats(): Promise<WCHistoryStats> {
  return api.get('/football/wc-history');
}
