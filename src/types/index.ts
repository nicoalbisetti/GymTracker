export interface Exercise {
  id: number;
  name: string;
  category: string;
  muscleGroup: string;
  notes?: string;
}

export interface WorkoutSet {
  id: number;
  workoutExerciseId: number;
  setNumber: number;
  reps?: number;
  weight?: number;
  duration?: number; // seconds, for timed exercises
  completed: boolean;
}

export interface WorkoutExercise {
  id: number;
  workoutId: number;
  exerciseId: number;
  exercise?: Exercise;
  sets: WorkoutSet[];
  orderIndex: number;
}

export interface Workout {
  id: number;
  name: string;
  date: string; // ISO string
  durationMinutes?: number;
  notes?: string;
  exercises: WorkoutExercise[];
}

export type RootTabParamList = {
  Home: undefined;
  Workouts: undefined;
  Exercises: undefined;
  History: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  WorkoutDetail: { workoutId: number };
  ActiveWorkout: { workoutId?: number };
  ExerciseDetail: { exerciseId: number };
  AddExercise: undefined;
};
