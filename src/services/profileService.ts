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

export async function uploadAvatarImage(
  uri: string,
  mimeType: string = 'image/jpeg',
): Promise<{ avatarUrl: string | null; error: string | null }> {
  try {
    const formData = new FormData();
    const filename = uri.split('/').pop() ?? 'avatar.jpg';
    formData.append('avatar', { uri, name: filename, type: mimeType } as any);
    const res = await api.postForm<{ avatarUrl: string }>('/user/avatar', formData);
    return { avatarUrl: res.avatarUrl, error: null };
  } catch (e: any) {
    return { avatarUrl: null, error: e.message ?? 'Failed to upload photo' };
  }
}
