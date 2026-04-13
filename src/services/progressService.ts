import { supabase } from '@/lib/supabase';
import type { WorkoutSetRecord } from '@/types';
import { mapWorkoutSetRecord } from '@/lib/mappers';

export async function getAllSetRecords(userId: string): Promise<WorkoutSetRecord[]> {
  const { data, error } = await supabase
    .from('workout_set_records')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map(mapWorkoutSetRecord);
}
