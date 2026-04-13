import type {
  Exercise, Routine, RoutineExercise, ExerciseSet,
  WorkoutSession, WorkoutSetRecord,
} from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapExercise(row: any): Exercise {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscle_group,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapRoutine(row: any): Routine {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapRoutineExercise(row: any): RoutineExercise {
  return {
    id: row.id,
    routineId: row.routine_id,
    exerciseId: row.exercise_id,
    orderIndex: row.order_index,
    restSeconds: row.rest_seconds,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapSet(row: any): ExerciseSet {
  return {
    id: row.id,
    routineExerciseId: row.routine_exercise_id,
    setNumber: row.set_number,
    reps: row.reps,
    weight: Number(row.weight),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapWorkoutSession(row: any): WorkoutSession {
  return {
    id: row.id,
    routineId: row.routine_id,
    routineName: row.routine_name,
    startedAt: row.started_at,
    finishedAt: row.finished_at ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapWorkoutSetRecord(row: any): WorkoutSetRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    exerciseId: row.exercise_id,
    exerciseName: row.exercise_name,
    muscleGroup: row.muscle_group,
    setNumber: row.set_number,
    reps: row.reps,
    weight: Number(row.weight),
    completedAt: row.completed_at,
  };
}
