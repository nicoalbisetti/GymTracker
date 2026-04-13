import { supabase } from '@/lib/supabase';
import type { WorkoutSession, ExerciseSet, Exercise, RoutineExercise } from '@/types';
import { mapWorkoutSession } from '@/lib/mappers';

export async function getWorkoutSession(id: string): Promise<WorkoutSession | undefined> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return undefined;
  return mapWorkoutSession(data);
}

export async function createWorkoutSession(
  routineId: string,
  routineName: string,
  userId: string
): Promise<string> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({
      user_id: userId,
      routine_id: routineId,
      routine_name: routineName,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function finishWorkoutSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('workout_sessions')
    .update({ finished_at: new Date().toISOString() })
    .eq('id', sessionId);
  if (error) throw error;
}

export async function recordCompletedSet(
  sessionId: string,
  set: ExerciseSet,
  exercise: Exercise,
  reps: number,
  weight: number,
  userId: string
): Promise<void> {
  const { error: e1 } = await supabase
    .from('sets')
    .update({ reps, weight })
    .eq('id', set.id!);
  if (e1) throw e1;

  const { error: e2 } = await supabase
    .from('workout_set_records')
    .insert({
      user_id: userId,
      session_id: sessionId,
      exercise_id: exercise.id!,
      exercise_name: exercise.name,
      muscle_group: exercise.muscleGroup,
      set_number: set.setNumber,
      reps,
      weight,
      completed_at: new Date().toISOString(),
    });
  if (e2) throw e2;
}

export async function addSetDuringWorkout(
  re: RoutineExercise,
  existingSets: ExerciseSet[],
  reps: number,
  weight: number,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('sets')
    .insert({
      user_id: userId,
      routine_exercise_id: re.id!,
      set_number: existingSets.length + 1,
      reps,
      weight,
    });
  if (error) throw error;
}
