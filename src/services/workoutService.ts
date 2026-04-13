import { db } from '@/db/database';
import type { WorkoutSession, ExerciseSet, Exercise, RoutineExercise } from '@/types';

export async function getWorkoutSession(id: number): Promise<WorkoutSession | undefined> {
  return db.workoutSessions.get(id);
}

export async function createWorkoutSession(
  routineId: number,
  routineName: string
): Promise<number> {
  return db.workoutSessions.add({
    routineId,
    routineName,
    startedAt: new Date().toISOString(),
  }) as Promise<number>;
}

export async function finishWorkoutSession(sessionId: number): Promise<void> {
  await db.workoutSessions.update(sessionId, {
    finishedAt: new Date().toISOString(),
  });
}

export async function recordCompletedSet(
  sessionId: number,
  set: ExerciseSet,
  exercise: Exercise,
  reps: number,
  weight: number
): Promise<void> {
  await db.sets.update(set.id!, { reps, weight });
  await db.workoutSetRecords.add({
    sessionId,
    exerciseId: exercise.id!,
    exerciseName: exercise.name,
    muscleGroup: exercise.muscleGroup,
    setNumber: set.setNumber,
    reps,
    weight,
    completedAt: new Date().toISOString(),
  });
}

export async function addSetDuringWorkout(
  re: RoutineExercise,
  existingSets: ExerciseSet[],
  reps: number,
  weight: number
): Promise<void> {
  await db.sets.add({
    routineExerciseId: re.id!,
    setNumber: existingSets.length + 1,
    reps,
    weight,
  });
}
