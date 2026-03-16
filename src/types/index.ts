export interface Exercise {
  id?: number;
  name: string;
  category: string;
  muscleGroup: string;
  notes?: string;
}

export interface WorkoutSet {
  id?: number;
  workoutExerciseId: number;
  setNumber: number;
  reps?: number;
  weight?: number;
  completed: boolean;
}

export interface WorkoutExercise {
  id?: number;
  workoutId: number;
  exerciseId: number;
  orderIndex: number;
}

export interface Workout {
  id?: number;
  name: string;
  date: string;
  durationMinutes?: number;
  notes?: string;
}
