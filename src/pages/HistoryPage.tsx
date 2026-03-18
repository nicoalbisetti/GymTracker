import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';

export default function HistoryPage() {
  const navigate = useNavigate();
  const sessions = useLiveQuery(() =>
    db.workoutSessions.orderBy('startedAt').reverse().toArray()
  );

  function formatDuration(startedAt: string, finishedAt?: string) {
    if (!finishedAt) return null;
    const mins = Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 60000);
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}min`;
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold text-gray-900 pt-2">Historial</h1>

      {sessions?.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-3">📅</p>
          <p className="font-medium text-gray-600">Sin sesiones todavía</p>
          <p className="text-sm mt-1">Ejecutá una rutina para verla acá</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {sessions?.map((session) => {
          const duration = formatDuration(session.startedAt, session.finishedAt);
          const date = new Date(session.startedAt);
          return (
            <button
              key={session.id}
              onClick={() => navigate(`/history/${session.id}`)}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left active:bg-gray-50 flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-gray-900">{session.routineName}</p>
                <p className="text-sm text-gray-400 mt-0.5">
                  {date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  {' · '}{date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 ml-3">
                {duration && <span className="text-xs bg-primary-50 text-primary-500 rounded-full px-2 py-1">{duration}</span>}
                {!session.finishedAt && <span className="text-xs bg-yellow-50 text-yellow-600 rounded-full px-2 py-1">Incompleta</span>}
                <span className="text-gray-300 text-xl">›</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
