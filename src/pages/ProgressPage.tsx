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

    const byExercise = new Map<string, Map<string, number>>();

    for (const r of filtered) {
      if (!byExercise.has(r.exerciseName)) byExercise.set(r.exerciseName, new Map());
      const dateMap = byExercise.get(r.exerciseName)!;
      const date = r.completedAt.slice(0, 10);

      let value: number;
      if (isCore) {
        value = r.reps;
        dateMap.set(date, Math.max(dateMap.get(date) ?? 0, value));
      } else if (metricMode === 'e1rm') {
        value = calcE1RM(r.weight, r.reps);
        dateMap.set(date, Math.max(dateMap.get(date) ?? 0, value));
      } else {
        value = calcVolume(r.weight, r.reps);
        dateMap.set(date, (dateMap.get(date) ?? 0) + value);
      }
    }

    const exercises = [...byExercise.keys()].filter((name) => byExercise.get(name)!.size >= 1);
    if (exercises.length === 0) return { exercises: [], points: [], label: '' };

    const allDates = [...new Set(
      exercises.flatMap((name) => [...byExercise.get(name)!.keys()])
    )].sort();

    const points = allDates.map((date) => {
      const label = new Date(date + 'T12:00:00').toLocaleDateString('es-AR', {
        day: 'numeric', month: 'short',
      });
      const entry: Record<string, string | number> = { date: label };
      for (const name of exercises) {
        const raw = byExercise.get(name)!.get(date);
        if (raw !== undefined) {
          entry[name] = isCore ? raw : Math.round(raw * 10) / 10;
        }
      }
      return entry;
    });

    const label = isCore
      ? 'Repeticiones máximas por sesión'
      : metricMode === 'e1rm'
        ? '1RM estimado por sesión (kg)'
        : 'Volumen total por sesión (kg·reps)';

    return { exercises, points, label };
  }, [records, activeMuscle, metricMode]);

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
