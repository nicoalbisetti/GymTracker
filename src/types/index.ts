export interface Exercise {
  id?: number;          // serial integer — sin cambios
  name: string;
  muscleGroup: string;  // camelCase en la app, snake_case en Supabase
}

export interface Routine {
  id?: string;          // uuid
  name: string;
  createdAt: string;
}

export interface RoutineExercise {
  id?: string;          // uuid
  routineId: string;    // uuid
  exerciseId: number;   // integer (FK a exercises)
  orderIndex: number;
  restSeconds: number;
}

export interface ExerciseSet {
  id?: string;          // uuid
  routineExerciseId: string;  // uuid
  setNumber: number;
  reps: number;
  weight: number;
}

export interface WorkoutSession {
  id?: string;          // uuid
  routineId: string;    // uuid
  routineName: string;
  startedAt: string;
  finishedAt?: string;
}

export interface WorkoutSetRecord {
  id?: string;          // uuid
  sessionId: string;    // uuid
  exerciseId: number;   // integer
  exerciseName: string;
  muscleGroup: string;
  setNumber: number;
  reps: number;
  weight: number;
  completedAt: string;
}
