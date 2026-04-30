import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/types/prediction";

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    email: "",
    displayName: data.full_name ?? data.username ?? "",
    favoriteTeams: data.favourite_teams ?? [],
    predictionsCount: data.predictions_count ?? 0,
    matchesTracked: data.matches_tracked ?? 0,
    createdAt: data.created_at ?? "",
  };
}

export async function updateProfile(
  userId: string,
  updates: { displayName?: string; avatarUrl?: string },
): Promise<{ error: string | null }> {
  const payload: Record<string, unknown> = {};
  if (updates.displayName !== undefined) payload.full_name = updates.displayName;
  if (updates.avatarUrl !== undefined)   payload.avatar_url = updates.avatarUrl;

  const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
  return { error: error?.message ?? null };
}

export async function updateFavouriteTeams(
  userId: string,
  teams: string[],
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("profiles")
    .update({ favourite_teams: teams })
    .eq("id", userId);
  return { error: error?.message ?? null };
}
