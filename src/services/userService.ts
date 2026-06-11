import api from './api';

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

export async function getProfile(): Promise<UserProfile | null> {
  try {
    return await api.get<UserProfile>('/user/profile');
  } catch (e) {
    console.error('[userService] getProfile error:', (e as Error).message);
    return null;
  }
}

export async function updateProfile(updates: ProfileUpdates): Promise<{ error: string | null }> {
  try {
    await api.patch('/user/profile', updates);
    return { error: null };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function getFavorites(): Promise<string[]> {
  try {
    const data = await api.get<{ favorites: string[] }>('/user/favorites');
    return Array.isArray(data.favorites) ? data.favorites : [];
  } catch {
    return [];
  }
}

export async function toggleFavorite(teamId: string): Promise<{ favorites: string[]; error: string | null }> {
  try {
    const data = await api.post<{ favorites: string[] }>('/user/favorites', { teamId });
    return { favorites: data.favorites ?? [], error: null };
  } catch (e) {
    return { favorites: [], error: (e as Error).message };
  }
}
