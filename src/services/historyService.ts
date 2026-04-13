import { supabase } from '@/lib/supabase';
import type { WorkoutSession, WorkoutSetRecord } from '@/types';
import { mapWorkoutSession, mapWorkoutSetRecord } from '@/lib/mappers';

export async function getAllSessions(userId: string): Promise<WorkoutSession[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapWorkoutSession);
}

export async function getSessionById(id: string): Promise<WorkoutSession | undefined> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return undefined;
  return mapWorkoutSession(data);
}

export async function getSessionRecords(sessionId: string): Promise<WorkoutSetRecord[]> {
  const { data, error } = await supabase
    .from('workout_set_records')
    .select('*')
    .eq('session_id', sessionId)
    .order('completed_at');
  if (error) throw error;
  return (data ?? []).map(mapWorkoutSetRecord);
}

export async function deleteSession(sessionId: string): Promise<void> {
  // CASCADE elimina workout_set_records automáticamente
  const { error } = await supabase
    .from('workout_sessions')
    .delete()
    .eq('id', sessionId);
  if (error) throw error;
}
