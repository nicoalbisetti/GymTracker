import { db } from '@/db/database';
import type { WorkoutSession, WorkoutSetRecord } from '@/types';

export async function getAllSessions(): Promise<WorkoutSession[]> {
  return db.workoutSessions.orderBy('startedAt').reverse().toArray();
}

export async function getSessionById(id: number): Promise<WorkoutSession | undefined> {
  return db.workoutSessions.get(id);
}

export async function getSessionRecords(sessionId: number): Promise<WorkoutSetRecord[]> {
  return db.workoutSetRecords
    .where('sessionId').equals(sessionId)
    .sortBy('completedAt');
}

export async function deleteSession(sessionId: number): Promise<void> {
  await db.workoutSetRecords.where('sessionId').equals(sessionId).delete();
  await db.workoutSessions.delete(sessionId);
}
