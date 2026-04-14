import { supabase } from '@/lib/supabase';
import type { UserProfile, UserGoal, UserExperience, PreferredUnits } from '@/types/profile';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProfile(row: any): UserProfile {
  return {
    id: row.id,
    plan: row.plan,
    goal: row.goal ?? null,
    experience: row.experience ?? null,
    birthYear: row.birth_year ?? null,
    weightKg: row.weight_kg ? Number(row.weight_kg) : null,
    preferredUnits: row.preferred_units,
    aiQueriesUsed: row.ai_queries_used,
    aiQueriesResetAt: row.ai_queries_reset_at ?? null,
    createdAt: row.created_at,
  };
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return mapProfile(data);
}

export async function upsertProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'goal' | 'experience' | 'birthYear' | 'weightKg' | 'preferredUnits'>>
): Promise<void> {
  const payload: Record<string, unknown> = { id: userId };
  if (updates.goal !== undefined) payload.goal = updates.goal;
  if (updates.experience !== undefined) payload.experience = updates.experience;
  if (updates.birthYear !== undefined) payload.birth_year = updates.birthYear;
  if (updates.weightKg !== undefined) payload.weight_kg = updates.weightKg;
  if (updates.preferredUnits !== undefined) payload.preferred_units = updates.preferredUnits;

  const { error } = await supabase
    .from('user_profiles')
    .upsert(payload, { onConflict: 'id' });
  if (error) throw error;
}

export async function incrementAiQueries(userId: string): Promise<void> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7); // 'YYYY-MM'

  const { data } = await supabase
    .from('user_profiles')
    .select('ai_queries_used, ai_queries_reset_at')
    .eq('id', userId)
    .single();

  if (!data) throw new Error('Profile not found');

  const resetAt = data.ai_queries_reset_at as string | null;
  const shouldReset = !resetAt || resetAt.slice(0, 7) < thisMonth;

  const { error } = await supabase
    .from('user_profiles')
    .update({
      ai_queries_used: shouldReset ? 1 : data.ai_queries_used + 1,
      ai_queries_reset_at: shouldReset ? today : resetAt,
    })
    .eq('id', userId);

  if (error) throw error;
}

// Re-export types used by consumers so they don't need to import from two places
export type { UserGoal, UserExperience, PreferredUnits };
