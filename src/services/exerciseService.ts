import { supabase } from '@/lib/supabase';
import type { Exercise } from '@/types';
import { mapExercise } from '@/lib/mappers';

export async function getAllExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('name');
  if (error) throw error;
  return (data ?? []).map(mapExercise);
}

export async function getExercisesByIds(ids: number[]): Promise<Exercise[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .in('id', ids);
  if (error) throw error;
  return (data ?? []).map(mapExercise);
}

export async function getExercisesMap(ids: number[]): Promise<Record<number, Exercise>> {
  const exercises = await getExercisesByIds(ids);
  return Object.fromEntries(exercises.map(e => [e.id!, e]));
}
