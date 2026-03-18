import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';

export default function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const sid = Number(sessionId);
  const navigate = useNavigate();

  const session = useLiveQuery(() => db.workoutSessions.get(sid), [sid]);
  const records = useLiveQuery(
    () => db.workoutSetRecords.where('sessionId').equals(sid).sortBy('completedAt'),
    [sid]
  );

  if (!session || !records) return null;

  // Group records by exercise
  const byExercise = records.reduce<Record<string, typeof records>>((acc, r) => {
    const key = `${r.muscleGroup}__${r.exerciseName}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  // Sort groups by muscle group then exercise name
  const groups = Object.entries(byExercise).sort(([a], [b]) => a.localeCompare(b));

  // Group by muscleGroup for section headers
  const byMuscle = groups.reduce<Record<string, [string, typeof records][]>>((acc, entry) => {
    const muscle = entry[0].split('__')[0];
    if (!acc[muscle]) acc[muscle] = [];
    acc[muscle].push(entry);
    return acc;
  }, {});

  function formatDuration(startedAt: string, finishedAt?: string) {
    if (!finishedAt) return null;
    const mins = Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 60000);
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}min`;
  }

  const duration = formatDuration(session.startedAt, session.finishedAt);
  const date = new Date(session.startedAt);

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate('/history')} className="text-gray-400 text-2xl p-1">←</button>
          <h1 className="text-lg font-bold text-gray-900">{session.routineName}</h1>
        </div>
        <div className="flex gap-3 flex-wrap">
          <span className="text-sm text-gray-500">
            📅 {date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <span className="text-sm text-gray-500">
            🕐 {date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {duration && <span className="text-sm text-gray-500">⏱ {duration}</span>}
          {!session.finishedAt && (
            <span className="text-sm text-yellow-600 bg-yellow-50 px-2 rounded-full">Incompleta</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4 flex flex-col gap-4">
        {records.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📋</p>
            <p>No se completó ninguna serie</p>
          </div>
        )}

        {Object.entries(byMuscle).sort(([a], [b]) => a.localeCompare(b)).map(([muscle, exerciseGroups]) => (
          <div key={muscle}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">{muscle}</p>
            <div className="flex flex-col gap-3">
              {exerciseGroups.map(([key, sets]) => {
                const exerciseName = key.split('__')[1];
                return (
                  <div key={key} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50">
                      <p className="font-semibold text-gray-900">{exerciseName}</p>
                    </div>
                    <div className="px-4 py-3 flex flex-col gap-2">
                      <div className="flex gap-2 px-1">
                        <span className="w-8 text-xs text-gray-400 text-center">#</span>
                        <span className="flex-1 text-xs text-gray-400 text-center">Kg</span>
                        <span className="flex-1 text-xs text-gray-400 text-center">Reps</span>
                      </div>
                      {sets.map((r) => (
                        <div key={r.id} className="flex items-center gap-2">
                          <span className="w-8 text-sm text-gray-400 text-center">{r.setNumber}</span>
                          <div className="flex-1 bg-gray-100 rounded-xl px-3 py-2 text-sm text-center text-gray-700">
                            {r.weight > 0 ? `${r.weight} kg` : '—'}
                          </div>
                          <div className="flex-1 bg-gray-100 rounded-xl px-3 py-2 text-sm text-center text-gray-700">
                            {r.reps} reps
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
