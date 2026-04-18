import { useEffect, useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { getAllSetRecords } from '@/services/progressService';
import { useAuth } from '@/context/AuthContext';
import type { WorkoutSetRecord } from '@/types';

const COLORS = [
  '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981',
  '#f43f5e', '#3b82f6', '#a78bfa', '#fbbf24',
];

type MetricMode = 'e1rm' | 'volume';
type ViewMode = 'recent' | 'annual';

function calcE1RM(weight: number, reps: number): number {
  if (weight === 0) return reps;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

function calcVolume(weight: number, reps: number): number {
  return weight * reps;
}

export default function ProgressPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<WorkoutSetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [metricMode, setMetricMode] = useState<MetricMode>('e1rm');
  const [viewMode, setViewMode] = useState<ViewMode>('recent');

  useEffect(() => {
    if (!user) return;
    getAllSetRecords(user.id)
      .then(setRecords)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const muscleGroups = useMemo(() => {
    return [...new Set(records.map((r) => r.muscleGroup))].sort();
  }, [records]);

  const activeMuscle = selectedMuscle ?? muscleGroups[0] ?? null;

  const chartData = useMemo(() => {
    if (!activeMuscle) return { exercises: [], points: [], label: '' };

    const filtered = records.filter((r) => r.muscleGroup === activeMuscle);
    const isCore = activeMuscle === 'Core';

    if (viewMode === 'recent') {
      // Group records by exercise → by sessionId, then take last 20 sessions per exercise
      const byExercise = new Map<string, Map<string, { date: string; value: number }>>();

      for (const r of filtered) {
        if (!byExercise.has(r.exerciseName)) byExercise.set(r.exerciseName, new Map());
        const sessionMap = byExercise.get(r.exerciseName)!;
        const sessionKey = r.sessionId ?? r.completedAt.slice(0, 10);

        if (!sessionMap.has(sessionKey)) {
          sessionMap.set(sessionKey, { date: r.completedAt.slice(0, 10), value: 0 });
        }
        const entry = sessionMap.get(sessionKey)!;

        let value: number;
        if (isCore) {
          value = r.reps;
          entry.value = Math.max(entry.value, value);
        } else if (metricMode === 'e1rm') {
          value = calcE1RM(r.weight, r.reps);
          entry.value = Math.max(entry.value, value);
        } else {
          entry.value += calcVolume(r.weight, r.reps);
        }
      }

      // Keep last 20 sessions per exercise (sort by date asc, take last 20)
      const exercisePoints = new Map<string, Map<string, number>>();
      for (const [name, sessionMap] of byExercise) {
        const sorted = [...sessionMap.values()].sort((a, b) => a.date.localeCompare(b.date));
        const last20 = sorted.slice(-20);
        const dateMap = new Map<string, number>();
        for (const s of last20) dateMap.set(s.date, s.value);
        exercisePoints.set(name, dateMap);
      }

      const exercises = [...exercisePoints.keys()].filter((n) => exercisePoints.get(n)!.size >= 1);
      if (exercises.length === 0) return { exercises: [], points: [], label: '' };

      const allDates = [...new Set(
        exercises.flatMap((n) => [...exercisePoints.get(n)!.keys()])
      )].sort();

      const points = allDates.map((date) => {
        const label = new Date(date + 'T12:00:00').toLocaleDateString('es-AR', {
          day: 'numeric', month: 'short',
        });
        const entry: Record<string, string | number> = { date: label };
        for (const name of exercises) {
          const raw = exercisePoints.get(name)!.get(date);
          if (raw !== undefined) {
            entry[name] = isCore ? raw : Math.round(raw * 10) / 10;
          }
        }
        return entry;
      });

      const label = isCore
        ? 'Reps máximas — últimas 20 sesiones'
        : metricMode === 'e1rm'
          ? '1RM estimado — últimas 20 sesiones (kg)'
          : 'Volumen por sesión — últimas 20 sesiones (kg·reps)';

      return { exercises, points, label };
    } else {
      // Annual: best value per month, last 12 calendar months
      const today = new Date();
      const months: string[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }

      // Group by exercise → by month → by sessionId (for volume: best session of month)
      const byExercise = new Map<string, Map<string, number>>();

      for (const r of filtered) {
        const month = r.completedAt.slice(0, 7);
        if (!months.includes(month)) continue;
        if (!byExercise.has(r.exerciseName)) byExercise.set(r.exerciseName, new Map());
        const monthMap = byExercise.get(r.exerciseName)!;

        if (isCore) {
          monthMap.set(month, Math.max(monthMap.get(month) ?? 0, r.reps));
        } else if (metricMode === 'e1rm') {
          const v = calcE1RM(r.weight, r.reps);
          monthMap.set(month, Math.max(monthMap.get(month) ?? 0, v));
        } else {
          // volume: handled in second pass below
        }
      }

      // For volume mode: accumulate per session, then take max session per month
      if (!isCore && metricMode === 'volume') {
        // Reset and recompute using session accumulation
        byExercise.clear();
        const sessionAccum = new Map<string, Map<string, number>>(); // exercise → (month|session → value)
        for (const r of filtered) {
          const month = r.completedAt.slice(0, 7);
          if (!months.includes(month)) continue;
          if (!sessionAccum.has(r.exerciseName)) sessionAccum.set(r.exerciseName, new Map());
          const sm = sessionAccum.get(r.exerciseName)!;
          const sessionKey = r.sessionId ?? r.completedAt.slice(0, 10);
          const key = `${month}|${sessionKey}`;
          sm.set(key, (sm.get(key) ?? 0) + calcVolume(r.weight, r.reps));
        }
        for (const [name, sm] of sessionAccum) {
          const monthMap = new Map<string, number>();
          for (const [key, val] of sm) {
            const month = key.split('|')[0];
            monthMap.set(month, Math.max(monthMap.get(month) ?? 0, val));
          }
          byExercise.set(name, monthMap);
        }
      }

      const exercises = [...byExercise.keys()].filter((n) => byExercise.get(n)!.size >= 1);
      if (exercises.length === 0) return { exercises: [], points: [], label: '' };

      const points = months.map((month) => {
        const d = new Date(month + '-01T12:00:00');
        const label = d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
        const entry: Record<string, string | number> = { date: label };
        for (const name of exercises) {
          const raw = byExercise.get(name)!.get(month);
          if (raw !== undefined) {
            entry[name] = isCore ? raw : Math.round(raw * 10) / 10;
          }
        }
        return entry;
      });

      const label = isCore
        ? 'Mejor marca mensual (reps)'
        : metricMode === 'e1rm'
          ? 'Mejor 1RM estimado por mes (kg)'
          : 'Mejor volumen por sesión del mes (kg·reps)';

      return { exercises, points, label };
    }
  }, [records, activeMuscle, metricMode, viewMode]);

  if (loading) return null;

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold text-white tracking-tight pt-2">Progresión</h1>

      {records.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-700">
            <TrendingUp size={32} className="text-primary-400" strokeWidth={1.5} />
          </div>
          <p className="font-semibold text-slate-300">Sin datos todavía</p>
          <p className="text-sm mt-1 text-slate-500">Completá algunos entrenamientos para ver tu progresión</p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
            {muscleGroups.map((mg) => (
              <button
                key={mg}
                onClick={() => setSelectedMuscle(mg)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  mg === activeMuscle
                    ? 'bg-primary-500 text-white'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 active:bg-slate-700'
                }`}
              >
                {mg}
              </button>
            ))}
          </div>

          {chartData.exercises.length === 0 ? (
            <p className="text-center text-slate-500 py-10">Sin datos para este grupo muscular</p>
          ) : (
            <div className="bg-slate-800 rounded-2xl border border-slate-700/50 p-4">
              <div className="flex gap-1 mb-4">
                <button
                  onClick={() => setViewMode('recent')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    viewMode === 'recent'
                      ? 'bg-primary-500 text-white'
                      : 'bg-slate-700 text-slate-400 active:bg-slate-600'
                  }`}
                >
                  Últimas 20 sesiones
                </button>
                <button
                  onClick={() => setViewMode('annual')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    viewMode === 'annual'
                      ? 'bg-primary-500 text-white'
                      : 'bg-slate-700 text-slate-400 active:bg-slate-600'
                  }`}
                >
                  Resumen anual
                </button>
              </div>

              {activeMuscle !== 'Core' && (
                <div className="flex gap-1 mb-4">
                  <button
                    onClick={() => setMetricMode('e1rm')}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      metricMode === 'e1rm'
                        ? 'bg-primary-500 text-white'
                        : 'bg-slate-700 text-slate-400 active:bg-slate-600'
                    }`}
                  >
                    1RM estimado
                  </button>
                  <button
                    onClick={() => setMetricMode('volume')}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      metricMode === 'volume'
                        ? 'bg-primary-500 text-white'
                        : 'bg-slate-700 text-slate-400 active:bg-slate-600'
                    }`}
                  >
                    Volumen
                  </button>
                </div>
              )}

              <p className="text-xs text-slate-500 mb-4">
                {chartData.label}
              </p>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData.points} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip
                    formatter={(value, name) => {
                      const unit = activeMuscle === 'Core'
                        ? ' reps'
                        : metricMode === 'e1rm'
                          ? ' kg'
                          : ' kg·reps';
                      return [`${value}${unit}`, name];
                    }}
                    labelStyle={{ fontSize: 12, color: '#f1f5f9' }}
                    contentStyle={{ fontSize: 12, borderRadius: 10, backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f1f5f9' }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 12 }}
                  />
                  {chartData.exercises.map((name, i) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={COLORS[i % COLORS.length]}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: COLORS[i % COLORS.length], strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
