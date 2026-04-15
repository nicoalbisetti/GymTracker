import { supabase } from '@/lib/supabase';
import type { UserContext } from '@/types/ai';
import type { UserProfile } from '@/types/profile';

export async function buildUserContext(
  userId: string,
  profile: UserProfile
): Promise<UserContext> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString();

  // 1. Sesiones totales y primera sesión (all time)
  const { data: allSessions } = await supabase
    .from('workout_sessions')
    .select('id, started_at, finished_at')
    .eq('user_id', userId)
    .not('finished_at', 'is', null);

  const totalSessions = allSessions?.length ?? 0;
  const firstSessionDate =
    allSessions && allSessions.length > 0
      ? allSessions.sort((a, b) => a.started_at.localeCompare(b.started_at))[0].started_at.slice(0, 10)
      : null;

  // 2. Sesiones últimos 30 días
  const recentSessions = (allSessions ?? []).filter((s) => s.started_at >= cutoff);
  const avgDurationMinutes =
    recentSessions.length === 0
      ? 0
      : Math.round(
          recentSessions
            .filter((s) => s.finished_at)
            .reduce((sum, s) => {
              const mins =
                (new Date(s.finished_at as string).getTime() - new Date(s.started_at).getTime()) /
                60000;
              return sum + mins;
            }, 0) / recentSessions.length
        );

  // 3. Rutinas definidas con sus ejercicios
  const { data: routinesRaw } = await supabase
    .from('routines')
    .select(`
      name,
      routine_exercises (
        order_index,
        exercises ( name, muscle_group )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const routines = (routinesRaw ?? []).map((r: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
    name: r.name as string,
    exercises: ((r.routine_exercises ?? []) as any[]) // eslint-disable-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => a.order_index - b.order_index) // eslint-disable-line @typescript-eslint/no-explicit-any
      .map((re: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        name: re.exercises?.name as string,
        muscle: re.exercises?.muscle_group as string,
      }))
      .filter((e: { name: string; muscle: string }) => e.name),
  }));

  // 4. Registros de series últimos 30 días
  const { data: recentRecords } = await supabase
    .from('workout_set_records')
    .select('exercise_name, muscle_group, weight, session_id, completed_at')
    .eq('user_id', userId)
    .gte('completed_at', cutoff);

  const records = recentRecords ?? [];

  // Frecuencia por grupo muscular (sesiones únicas)
  const muscleSessionMap: Record<string, Set<string>> = {};
  for (const r of records) {
    if (!muscleSessionMap[r.muscle_group]) muscleSessionMap[r.muscle_group] = new Set();
    muscleSessionMap[r.muscle_group].add(r.session_id);
  }
  const muscleFrequency: Record<string, number> = {};
  for (const [muscle, sessions] of Object.entries(muscleSessionMap)) {
    muscleFrequency[muscle] = sessions.size;
  }

  // Top ejercicios: peso máximo y cantidad de sesiones
  const exerciseMap: Record<string, { muscle: string; maxWeight: number; sessions: Set<string> }> =
    {};
  for (const r of records) {
    if (!exerciseMap[r.exercise_name]) {
      exerciseMap[r.exercise_name] = { muscle: r.muscle_group, maxWeight: 0, sessions: new Set() };
    }
    exerciseMap[r.exercise_name].maxWeight = Math.max(
      exerciseMap[r.exercise_name].maxWeight,
      Number(r.weight)
    );
    exerciseMap[r.exercise_name].sessions.add(r.session_id);
  }

  const topExercises = Object.entries(exerciseMap)
    .map(([name, data]) => ({
      name,
      muscle: data.muscle,
      maxWeight: data.maxWeight,
      sessionCount: data.sessions.size,
    }))
    .sort((a, b) => b.sessionCount - a.sessionCount)
    .slice(0, 30);

  return {
    profile: {
      goal: profile.goal,
      experience: profile.experience,
      weightKg: profile.weightKg,
    },
    routines,
    last30days: {
      totalSessions: recentSessions.length,
      avgDurationMinutes,
      muscleFrequency,
      topExercises,
    },
    allTime: {
      totalSessions,
      firstSessionDate,
    },
  };
}
