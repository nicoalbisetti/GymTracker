import { supabase } from '@/lib/supabase';
import type { WorkoutSetRecord } from '@/types';
import { mapWorkoutSetRecord } from '@/lib/mappers';

const PAGE_SIZE = 1000;

export async function getAllSetRecords(userId: string): Promise<WorkoutSetRecord[]> {
  const all: WorkoutSetRecord[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('workout_set_records')
      .select('*')
      .eq('user_id', userId)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;

    all.push(...(data ?? []).map(mapWorkoutSetRecord));
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}
