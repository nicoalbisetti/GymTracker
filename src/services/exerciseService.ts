import { db } from '@/db/database';
import type { Exercise } from '@/types';

/** Todos los ejercicios ordenados por nombre */
export async function getAllExercises(): Promise<Exercise[]> {
  return db.exercises.orderBy('name').toArray();
}

/** Ejercicios filtrados por IDs */
export async function getExercisesByIds(ids: number[]): Promise<Exercise[]> {
  if (ids.length === 0) return [];
  return db.exercises.where('id').anyOf(ids).toArray();
}

/** Ejercicios como mapa id→Exercise (para lookup rápido en páginas) */
export async function getExercisesMap(ids: number[]): Promise<Record<number, Exercise>> {
  const exercises = await getExercisesByIds(ids);
  return Object.fromEntries(exercises.map(e => [e.id!, e]));
}

export async function addExercise(name: string, muscleGroup: string): Promise<void> {
  await db.exercises.add({ name, muscleGroup });
}

export async function deleteExercise(ex: Exercise): Promise<void> {
  const refs = await db.routineExercises.where('exerciseId').equals(ex.id!).count();
  if (refs > 0) throw new Error('in-use');
  await db.exercises.delete(ex.id!);
}
