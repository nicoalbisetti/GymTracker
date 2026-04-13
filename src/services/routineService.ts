import { db } from '@/db/database';
import type { Routine, RoutineExercise, ExerciseSet, Exercise } from '@/types';

// ─── Rutinas ──────────────────────────────────────────────────────────────────

export async function getRoutines(): Promise<Routine[]> {
  return db.routines.orderBy('createdAt').reverse().toArray();
}

export async function getRoutineById(id: number): Promise<Routine | undefined> {
  return db.routines.get(id);
}

export async function createRoutine(): Promise<number> {
  return db.routines.add({
    name: 'Nueva rutina',
    createdAt: new Date().toISOString(),
  }) as Promise<number>;
}

export async function renameRoutine(id: number, name: string): Promise<void> {
  if (name.trim()) await db.routines.update(id, { name: name.trim() });
}

export async function deleteRoutine(routine: Routine): Promise<void> {
  const routineExercises = await db.routineExercises
    .where('routineId').equals(routine.id!).toArray();
  for (const re of routineExercises) {
    await db.sets.where('routineExerciseId').equals(re.id!).delete();
  }
  await db.routineExercises.where('routineId').equals(routine.id!).delete();
  await db.routines.delete(routine.id!);
}

export async function duplicateRoutine(routine: Routine): Promise<void> {
  const newRoutineId = await db.routines.add({
    name: `Copia de ${routine.name}`,
    createdAt: new Date().toISOString(),
  }) as number;
  const routineExercises = await db.routineExercises
    .where('routineId').equals(routine.id!).toArray();
  for (const re of routineExercises) {
    const newReId = await db.routineExercises.add({
      routineId: newRoutineId,
      exerciseId: re.exerciseId,
      orderIndex: re.orderIndex,
      restSeconds: re.restSeconds,
    }) as number;
    const sets = await db.sets.where('routineExerciseId').equals(re.id!).toArray();
    for (const set of sets) {
      await db.sets.add({
        routineExerciseId: newReId,
        setNumber: set.setNumber,
        reps: set.reps,
        weight: set.weight,
      });
    }
  }
}

// ─── RoutineExercises ─────────────────────────────────────────────────────────

export async function getRoutineExercises(routineId: number): Promise<RoutineExercise[]> {
  return db.routineExercises.where('routineId').equals(routineId).sortBy('orderIndex');
}

export async function addExercisesToRoutine(
  routineId: number,
  exercises: Exercise[],
  baseOrder: number
): Promise<void> {
  for (let i = 0; i < exercises.length; i++) {
    const routineExerciseId = await db.routineExercises.add({
      routineId,
      exerciseId: exercises[i].id!,
      orderIndex: baseOrder + i,
      restSeconds: 60,
    }) as number;
    await db.sets.add({
      routineExerciseId,
      setNumber: 1,
      reps: 10,
      weight: 0,
    });
  }
}

export async function removeExerciseFromRoutine(routineExerciseId: number): Promise<void> {
  await db.sets.where('routineExerciseId').equals(routineExerciseId).delete();
  await db.routineExercises.delete(routineExerciseId);
}

export async function reorderRoutineExercises(reordered: RoutineExercise[]): Promise<void> {
  await Promise.all(
    reordered.map((re, i) => db.routineExercises.update(re.id!, { orderIndex: i }))
  );
}

export async function updateRestSeconds(
  routineExerciseId: number,
  restSeconds: number
): Promise<void> {
  await db.routineExercises.update(routineExerciseId, { restSeconds });
}

// ─── Sets ─────────────────────────────────────────────────────────────────────

export async function getSetsForRoutineExercises(
  routineExerciseIds: number[]
): Promise<ExerciseSet[]> {
  if (routineExerciseIds.length === 0) return [];
  return db.sets.where('routineExerciseId').anyOf(routineExerciseIds).toArray();
}

export async function addSet(
  routineExerciseId: number,
  setNumber: number,
  reps: number,
  weight: number
): Promise<void> {
  await db.sets.add({ routineExerciseId, setNumber, reps, weight });
}

export async function updateSet(
  setId: number,
  field: 'reps' | 'weight',
  value: number
): Promise<void> {
  await db.sets.update(setId, { [field]: value });
}

export async function deleteSet(
  setId: number,
  routineExerciseId: number,
  allSets: ExerciseSet[]
): Promise<void> {
  await db.sets.delete(setId);
  const remaining = allSets
    .filter(s => s.routineExerciseId === routineExerciseId && s.id !== setId)
    .sort((a, b) => a.setNumber - b.setNumber);
  for (let i = 0; i < remaining.length; i++) {
    await db.sets.update(remaining[i].id!, { setNumber: i + 1 });
  }
}
