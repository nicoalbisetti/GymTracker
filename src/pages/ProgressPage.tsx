import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { db } from '@/db/database';

export default function ProgressPage() {
  const records = useLiveQuery(() => db.workoutSetRecords.toArray());
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  const muscleGroups = useMemo(() => {
    if (!records) return [];
    return [...new Set(records.map((r) => r.muscleGroup))].sort();
  }, [records]);

  const activeMuscle = selectedMuscle ?? muscleGroups[0] ?? null;

  const exerciseCharts = useMemo(() => {
    if (!records || !activeMuscle) return [];
    const filtered = records.filter((r) => r.muscleGroup === activeMuscle);

    const byExercise = new Map<number, { name: string; data: Map<string, number> }>();
    for (const r of filtered) {
      if (!byExercise.has(r.exerciseId)) {
        byExercise.set(r.exerciseId, { name: r.exerciseName, data: new Map() });
      }
      const date = r.completedAt.slice(0, 10);
      const ex = byExercise.get(r.exerciseId)!;
      ex.data.set(date, Math.max(ex.data.get(date) ?? 0, r.weight));
    }

    return [...byExercise.values()]
      .map(({ name, data }) => ({
        name,
        points: [...data.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, peso]) => ({
            date: new Date(date + 'T12:00:00').toLocaleDateString('es-AR', {
              day: 'numeric', month: 'short',
            }),
            peso,
          })),
      }))
      .filter((ex) => ex.points.length >= 1);
  }, [records, activeMuscle]);

  if (!records) return null;

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold text-gray-900 pt-2">Progresión</h1>

      {records.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-3">📈</p>
          <p className="font-medium text-gray-600">Sin datos todavía</p>
          <p className="text-sm mt-1">Completá algunos entrenamientos para ver tu progresión</p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
            {muscleGroups.map((mg) => (
              <button
                key={mg}
                onClick={() => setSelectedMuscle(mg)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  mg === activeMuscle
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                }`}
              >
                {mg}
              </button>
            ))}
          </div>

          {exerciseCharts.length === 0 ? (
            <p className="text-center text-gray-400 py-10">Sin datos para este grupo muscular</p>
          ) : (
            <div className="flex flex-col gap-5">
              {exerciseCharts.map((ex) => (
                <div key={ex.name} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <p className="font-semibold text-gray-900 mb-1">{ex.name}</p>
                  <p className="text-xs text-gray-400 mb-3">Peso máximo por sesión (kg)</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={ex.points} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(value) => [`${value} kg`, 'Peso máx.']}
                        labelStyle={{ fontSize: 12 }}
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="peso"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={{ r: 4, fill: '#8b5cf6' }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
