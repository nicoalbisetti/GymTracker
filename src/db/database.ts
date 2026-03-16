import Dexie, { type Table } from 'dexie';
import type { Exercise, Workout, WorkoutExercise, WorkoutSet } from '@/types';

class GymTrackerDB extends Dexie {
  exercises!: Table<Exercise>;
  workouts!: Table<Workout>;
  workoutExercises!: Table<WorkoutExercise>;
  workoutSets!: Table<WorkoutSet>;

  constructor() {
    super('GymTrackerDB');
    this.version(1).stores({
      exercises: '++id, name, category, muscleGroup',
      workouts: '++id, date',
      workoutExercises: '++id, workoutId, exerciseId',
      workoutSets: '++id, workoutExerciseId',
    });
  }
}

export const db = new GymTrackerDB();
