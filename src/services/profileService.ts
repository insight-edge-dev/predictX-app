import api from './api';
import type { UserProfile } from '@/types/prediction';

export async function getProfile(_userId: string): Promise<UserProfile | null> {
  try {
    return await api.get<UserProfile>('/user/profile');
  } catch {
    return null;
  }
}

export async function updateProfile(
  _userId: string,
  updates: { displayName?: string; avatarUrl?: string },
): Promise<{ error: string | null }> {
  try {
    await api.patch('/user/profile', updates);
    return { error: null };
  } catch (e: any) {
    return { error: e.message ?? 'Failed to update profile' };
  }
}

export async function updateFavouriteTeams(
  _userId: string,
  teams: string[],
): Promise<{ error: string | null }> {
  try {
    await api.patch('/user/profile', { favouriteTeams: teams });
    return { error: null };
  } catch (e: any) {
    return { error: e.message ?? 'Failed to update teams' };
  }
}
