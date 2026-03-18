export interface Exercise {
  id?: number;
  name: string;
  muscleGroup: string;
}

export interface Routine {
  id?: number;
  name: string;
  createdAt: string;
}

export interface RoutineExercise {
  id?: number;
  routineId: number;
  exerciseId: number;
  orderIndex: number;
  restSeconds: number;
}

export interface ExerciseSet {
  id?: number;
  routineExerciseId: number;
  setNumber: number;
  reps: number;
  weight: number;
}

export interface WorkoutSession {
  id?: number;
  routineId: number;
  routineName: string;
  startedAt: string;
  finishedAt?: string;
}

export interface WorkoutSetRecord {
  id?: number;
  sessionId: number;
  exerciseId: number;
  exerciseName: string;
  muscleGroup: string;
  setNumber: number;
  reps: number;
  weight: number;
  completedAt: string;
}
