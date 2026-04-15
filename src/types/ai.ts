export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface UserContext {
  profile: {
    goal: string | null;
    experience: string | null;
    weightKg: number | null;
  };
  routines: Array<{
    name: string;
    exercises: Array<{ name: string; muscle: string }>;
  }>;
  last30days: {
    totalSessions: number;
    avgDurationMinutes: number;
    muscleFrequency: Record<string, number>; // { 'Pecho': 4, 'Espalda': 5, ... }
    topExercises: Array<{
      name: string;
      muscle: string;
      maxWeight: number;
      sessionCount: number;
    }>;
  };
  allTime: {
    totalSessions: number;
    firstSessionDate: string | null;
  };
}
