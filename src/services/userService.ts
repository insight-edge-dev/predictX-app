/**
 * userService.ts — user profile and favorites via backend.
 *
 * Backend endpoints:
 *   GET   /api/user/profile    → fetch profile
 *   PATCH /api/user/profile    → update name / avatar
 *   GET   /api/user/favorites  → favorite teams
 *   POST  /api/user/favorites  → add/remove favorite team
 */

import api from './api';

// ── Types ─────────────────────────────────────────────────────

export interface UserProfile {
  id:          string;
  email:       string;
  displayName: string;
  avatarUrl:   string;
  favoriteTeams: string[];
  createdAt:   string;
}

export interface ProfileUpdates {
  displayName?: string;
  avatarUrl?:   string;
}

// ── getProfile ────────────────────────────────────────────────

export async function getProfile(token: string): Promise<UserProfile | null> {
  try {
    return await api.get<UserProfile>('/user/profile', token);
  } catch (e) {
    console.error('[userService] getProfile error:', (e as Error).message);
    return null;
  }
}

// ── updateProfile ─────────────────────────────────────────────

export async function updateProfile(
  updates: ProfileUpdates,
  token: string,
): Promise<{ error: string | null }> {
  try {
    await api.patch('/user/profile', updates, token);
    return { error: null };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ── getFavorites ──────────────────────────────────────────────

export async function getFavorites(token: string): Promise<string[]> {
  try {
    const data = await api.get<{ favorites: string[] }>('/user/favorites', token);
    return Array.isArray(data.favorites) ? data.favorites : [];
  } catch (e) {
    console.error('[userService] getFavorites error:', (e as Error).message);
    return [];
  }
}

// ── toggleFavorite ────────────────────────────────────────────

export async function toggleFavorite(
  teamId: string,
  token: string,
): Promise<{ favorites: string[]; error: string | null }> {
  try {
    const data = await api.post<{ favorites: string[] }>(
      '/user/favorites',
      { teamId },
      token,
    );
    return { favorites: data.favorites ?? [], error: null };
  } catch (e) {
    return { favorites: [], error: (e as Error).message };
  }
}
