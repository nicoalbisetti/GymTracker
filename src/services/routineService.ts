import { supabase } from '@/lib/supabase';
import type { Routine, RoutineExercise, ExerciseSet, Exercise } from '@/types';
import { mapRoutine, mapRoutineExercise, mapSet } from '@/lib/mappers';

// ─── Rutinas ──────────────────────────────────────────────────────────────────

export async function getRoutines(userId: string): Promise<Routine[]> {
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRoutine);
}

export async function getRoutineById(id: string): Promise<Routine | undefined> {
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return undefined;
  return mapRoutine(data);
}

export async function createRoutine(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('routines')
    .insert({ user_id: userId, name: 'Nueva rutina' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function renameRoutine(id: string, name: string): Promise<void> {
  if (!name.trim()) return;
  const { error } = await supabase
    .from('routines')
    .update({ name: name.trim() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteRoutine(routine: Routine): Promise<void> {
  // CASCADE en la DB elimina routine_exercises y sets automáticamente
  const { error } = await supabase
    .from('routines')
    .delete()
    .eq('id', routine.id!);
  if (error) throw error;
}

export async function duplicateRoutine(routine: Routine, userId: string): Promise<void> {
  const { data: newRoutine, error: e1 } = await supabase
    .from('routines')
    .insert({ user_id: userId, name: `Copia de ${routine.name}` })
    .select('id')
    .single();
  if (e1) throw e1;

  const { data: reList, error: e2 } = await supabase
    .from('routine_exercises')
    .select('*')
    .eq('routine_id', routine.id!);
  if (e2) throw e2;

  for (const re of reList ?? []) {
    const { data: newRe, error: e3 } = await supabase
      .from('routine_exercises')
      .insert({
        user_id: userId,
        routine_id: newRoutine.id,
        exercise_id: re.exercise_id,
        order_index: re.order_index,
        rest_seconds: re.rest_seconds,
      })
      .select('id')
      .single();
    if (e3) throw e3;

    const { data: setList, error: e4 } = await supabase
      .from('sets')
      .select('*')
      .eq('routine_exercise_id', re.id);
    if (e4) throw e4;

    if (setList?.length) {
      const { error: e5 } = await supabase.from('sets').insert(
        setList.map(s => ({
          user_id: userId,
          routine_exercise_id: newRe.id,
          set_number: s.set_number,
          reps: s.reps,
          weight: s.weight,
        }))
      );
      if (e5) throw e5;
    }
  }
}

// ─── RoutineExercises ─────────────────────────────────────────────────────────

export async function getRoutineExercises(routineId: string): Promise<RoutineExercise[]> {
  const { data, error } = await supabase
    .from('routine_exercises')
    .select('*')
    .eq('routine_id', routineId)
    .order('order_index');
  if (error) throw error;
  return (data ?? []).map(mapRoutineExercise);
}

export async function addExercisesToRoutine(
  routineId: string,
  exercises: Exercise[],
  baseOrder: number,
  userId: string
): Promise<void> {
  for (let i = 0; i < exercises.length; i++) {
    const { data: re, error: e1 } = await supabase
      .from('routine_exercises')
      .insert({
        user_id: userId,
        routine_id: routineId,
        exercise_id: exercises[i].id!,
        order_index: baseOrder + i,
        rest_seconds: 60,
      })
      .select('id')
      .single();
    if (e1) throw e1;

    const { error: e2 } = await supabase
      .from('sets')
      .insert({
        user_id: userId,
        routine_exercise_id: re.id,
        set_number: 1,
        reps: 10,
        weight: 0,
      });
    if (e2) throw e2;
  }
}

export async function removeExerciseFromRoutine(routineExerciseId: string): Promise<void> {
  // CASCADE elimina sets automáticamente
  const { error } = await supabase
    .from('routine_exercises')
    .delete()
    .eq('id', routineExerciseId);
  if (error) throw error;
}

export async function reorderRoutineExercises(reordered: RoutineExercise[]): Promise<void> {
  await Promise.all(
    reordered.map((re, i) =>
      supabase
        .from('routine_exercises')
        .update({ order_index: i })
        .eq('id', re.id!)
    )
  );
}

export async function updateRestSeconds(
  routineExerciseId: string,
  restSeconds: number
): Promise<void> {
  const { error } = await supabase
    .from('routine_exercises')
    .update({ rest_seconds: restSeconds })
    .eq('id', routineExerciseId);
  if (error) throw error;
}

// ─── Sets ─────────────────────────────────────────────────────────────────────

export async function getSetsForRoutineExercises(
  routineExerciseIds: string[]
): Promise<ExerciseSet[]> {
  if (routineExerciseIds.length === 0) return [];
  const { data, error } = await supabase
    .from('sets')
    .select('*')
    .in('routine_exercise_id', routineExerciseIds);
  if (error) throw error;
  return (data ?? []).map(mapSet);
}

export async function addSet(
  routineExerciseId: string,
  setNumber: number,
  reps: number,
  weight: number,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('sets')
    .insert({ user_id: userId, routine_exercise_id: routineExerciseId, set_number: setNumber, reps, weight });
  if (error) throw error;
}

export async function updateSet(
  setId: string,
  field: 'reps' | 'weight',
  value: number
): Promise<void> {
  const { error } = await supabase
    .from('sets')
    .update({ [field]: value })
    .eq('id', setId);
  if (error) throw error;
}

export async function deleteSet(
  setId: string,
  routineExerciseId: string,
  allSets: ExerciseSet[]
): Promise<void> {
  const { error } = await supabase.from('sets').delete().eq('id', setId);
  if (error) throw error;
  const remaining = allSets
    .filter(s => s.routineExerciseId === routineExerciseId && s.id !== setId)
    .sort((a, b) => a.setNumber - b.setNumber);
  await Promise.all(
    remaining.map((s, i) =>
      supabase.from('sets').update({ set_number: i + 1 }).eq('id', s.id!)
    )
  );
}
