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
    this.version(4).stores({
      exercises:         '++id, name, muscleGroup',
      routines:          '++id, createdAt',
      routineExercises:  '++id, routineId, exerciseId',
      sets:              '++id, routineExerciseId',
      workoutSessions:   '++id, routineId, startedAt',
      workoutSetRecords: '++id, sessionId, exerciseId',
    }).upgrade(async (tx) => {
      const muscleGroupMap: Record<string, string> = {
        'Bíceps': 'Brazos',
        'Tríceps': 'Brazos',
        'Cuádriceps': 'Piernas',
        'Isquiotibiales': 'Piernas',
        'Pantorrillas': 'Piernas',
      };
      await tx.table('exercises').toCollection().modify((ex) => {
        if (muscleGroupMap[ex.muscleGroup]) ex.muscleGroup = muscleGroupMap[ex.muscleGroup];
      });
      await tx.table('workoutSetRecords').toCollection().modify((r) => {
        if (muscleGroupMap[r.muscleGroup]) r.muscleGroup = muscleGroupMap[r.muscleGroup];
      });
    });
    this.version(5).stores({
      exercises:         '++id, name, muscleGroup',
      routines:          '++id, createdAt',
      routineExercises:  '++id, routineId, exerciseId',
      sets:              '++id, routineExerciseId',
      workoutSessions:   '++id, routineId, startedAt',
      workoutSetRecords: '++id, sessionId, exerciseId',
    }).upgrade(async (tx) => {
      await tx.table('exercises').where('name').equals('Face Pull').modify({ muscleGroup: 'Espalda' });
      await tx.table('workoutSetRecords').toCollection().modify((r) => {
        if (r.exerciseName === 'Face Pull') r.muscleGroup = 'Espalda';
      });
    });
  }
}

export const db = new GymTrackerDB();
