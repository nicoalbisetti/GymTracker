export type UserPlan = 'free' | 'pro';
export type UserGoal = 'hypertrophy' | 'strength' | 'endurance' | 'weight_loss';
export type UserExperience = 'beginner' | 'intermediate' | 'advanced';
export type PreferredUnits = 'kg' | 'lb';

export interface UserProfile {
  id: string;
  plan: UserPlan;
  goal: UserGoal | null;
  experience: UserExperience | null;
  birthYear: number | null;
  weightKg: number | null;
  preferredUnits: PreferredUnits;
  aiQueriesUsed: number;
  aiQueriesResetAt: string | null;
  createdAt: string;
}

export const AI_QUERY_LIMIT: Record<UserPlan, number> = {
  free: 0,
  pro: 20,
};
