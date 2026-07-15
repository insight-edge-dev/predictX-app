import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';

export type PredictedWinner = 'teamA' | 'draw' | 'teamB';
export type PredictionResult = 'correct' | 'wrong' | 'void' | null;

export interface UserMatchPrediction {
  id: string;
  match_id: string;
  predicted_winner: PredictedWinner;
  team_a: string;
  team_b: string;
  has_changed: boolean;
  result: PredictionResult;
  created_at: string;
}

export interface PollData {
  total: number;
  teamA: string | null;  // team name from backend, not a count
  teamB: string | null;  // team name from backend, not a count
  teamAPercent: number;
  drawPercent: number;
  teamBPercent: number;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  correct: number;
  total: number;
  accuracy: number;
  score: number;
}

export interface UserPredictionStats {
  correct:  number;
  wrong:    number;
  pending:  number;
  total:    number;
  accuracy: number;
}

// ── useUserPrediction ─────────────────────────────────────────

export function useUserPrediction(matchId: string, authenticated: boolean) {
  const qc = useQueryClient();

  const query = useQuery<UserMatchPrediction | null>({
    queryKey:       ['user-prediction', matchId],
    queryFn:        () => api.get<{ prediction: UserMatchPrediction | null }>(`/user-predictions/${matchId}`)
                            .then(r => r.prediction),
    enabled:        !!matchId && authenticated,
    staleTime:      5 * 60_000,
    retry:          1,
  });

  const submit = useMutation({
    mutationFn: (vars: {
      predictedWinner: string; // actual team name or 'draw', resolved before calling
      teamA: string;
      teamB: string;
      sport: string;
      displayName: string;
    }) => api.post(`/user-predictions/${matchId}`, vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-prediction', matchId] }),
  });

  const change = useMutation({
    mutationFn: (vars: { predictedWinner: string }) =>
      api.put(`/user-predictions/${matchId}`, vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-prediction', matchId] }),
  });

  return { query, submit, change };
}

// ── usePredictionPoll ─────────────────────────────────────────

export function usePredictionPoll(matchId: string) {
  return useQuery<PollData>({
    queryKey:             ['prediction-poll', matchId],
    queryFn:              () => api.get<PollData>(`/predictions/poll/${matchId}`),
    enabled:              !!matchId,
    staleTime:            60_000,
    refetchInterval:      90_000,
    retry:                1,
  });
}

// ── useUpvote ─────────────────────────────────────────────────

export function useUpvote(matchId: string, authenticated: boolean) {
  const qc = useQueryClient();

  const query = useQuery<{ count: number; upvoted: boolean }>({
    queryKey:  ['upvote', matchId],
    queryFn:   () => api.get(`/upvotes/${matchId}`),
    enabled:   !!matchId && authenticated,
    staleTime: 60_000,
    retry:     1,
  });

  const toggle = useMutation({
    mutationFn: () => api.post<{ upvoted: boolean; count: number }>(`/upvotes/${matchId}`, {}),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['upvote', matchId] });
      const prev = qc.getQueryData<{ count: number; upvoted: boolean }>(['upvote', matchId]);
      if (prev) {
        qc.setQueryData(['upvote', matchId], {
          upvoted: !prev.upvoted,
          count:   prev.upvoted ? prev.count - 1 : prev.count + 1,
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['upvote', matchId], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['upvote', matchId] }),
  });

  return { query, toggle };
}

// ── useLeaderboard ────────────────────────────────────────────

export function useLeaderboard(limit = 20, period: 'week' | 'all' = 'all') {
  return useQuery<LeaderboardEntry[]>({
    queryKey:             ['leaderboard', limit, period],
    queryFn:              () => api.get<{ leaderboard: LeaderboardEntry[] }>(`/leaderboard?limit=${limit}&period=${period}`)
                                   .then(r => r.leaderboard),
    staleTime:            5 * 60_000,
    refetchOnWindowFocus: false,
    retry:                1,
  });
}

// ── useMyPredictionStats ──────────────────────────────────────

export function useMyPredictionStats(authenticated: boolean) {
  return useQuery<UserPredictionStats>({
    queryKey:       ['prediction-stats', 'me'],
    queryFn:        () => api.get<UserPredictionStats>('/user-predictions/stats/me'),
    enabled:        authenticated,
    staleTime:      60_000,
    refetchOnMount: 'always',
    retry:          1,
  });
}

// ── useMyPredictionHistory ────────────────────────────────────

export interface UserPredictionHistoryItem {
  id:               string;
  match_id:         string;
  sport:            'cricket' | 'football';
  team_a:           string;
  team_b:           string;
  predicted_winner: string;
  has_changed:      boolean;
  result:           PredictionResult;
  created_at:       string;
}

export function useMyPredictionHistory(authenticated: boolean) {
  return useQuery<UserPredictionHistoryItem[]>({
    queryKey:       ['prediction-history', 'me'],
    queryFn:        () => api.get<{ predictions: UserPredictionHistoryItem[] }>('/user-predictions/history/me')
                              .then(r => r.predictions),
    enabled:        authenticated,
    staleTime:      30_000,
    refetchOnMount: 'always',
    retry:          1,
  });
}
