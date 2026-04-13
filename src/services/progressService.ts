import { db } from '@/db/database';
import type { WorkoutSetRecord } from '@/types';

export async function getAllSetRecords(): Promise<WorkoutSetRecord[]> {
  return db.workoutSetRecords.toArray();
}
