import Dexie, { type Table } from 'dexie';
import type { Exercise, Routine, RoutineExercise, ExerciseSet, WorkoutSession, WorkoutSetRecord } from '@/types';

class GymTrackerDB extends Dexie {
  exercises!: Table<Exercise>;
  routines!: Table<Routine>;
  routineExercises!: Table<RoutineExercise>;
  sets!: Table<ExerciseSet>;
  workoutSessions!: Table<WorkoutSession>;
  workoutSetRecords!: Table<WorkoutSetRecord>;

  constructor() {
    super('GymTrackerDB');
    this.version(1).stores({
      exercises:        '++id, name, muscleGroup',
      routines:         '++id, createdAt',
      routineExercises: '++id, routineId, exerciseId',
      sets:             '++id, routineExerciseId',
    });
    this.version(2).stores({
      exercises:        '++id, name, muscleGroup',
      routines:         '++id, createdAt',
      routineExercises: '++id, routineId, exerciseId',
      sets:             '++id, routineExerciseId',
    }).upgrade((tx) =>
      tx.table('routineExercises').toCollection().modify((re) => {
        if (re.restSeconds === undefined) re.restSeconds = 60;
      })
    );
    this.version(3).stores({
      exercises:         '++id, name, muscleGroup',
      routines:          '++id, createdAt',
      routineExercises:  '++id, routineId, exerciseId',
      sets:              '++id, routineExerciseId',
      workoutSessions:   '++id, routineId, startedAt',
      workoutSetRecords: '++id, sessionId, exerciseId',
    });
  }
}

export const db = new GymTrackerDB();
