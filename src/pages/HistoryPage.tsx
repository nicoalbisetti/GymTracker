import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

export default function HistoryPage() {
  const navigate = useNavigate();
  const sessions = useLiveQuery(() =>
    db.workoutSessions.orderBy('startedAt').reverse().toArray()
  );

  async function deleteSession(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('¿Eliminar esta sesión?')) return;
    await db.workoutSetRecords.where('sessionId').equals(id).delete();
    await db.workoutSessions.delete(id);
  }

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
            <div
              key={session.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <button
                onClick={() => navigate(`/history/${session.id}`)}
                className="w-full p-4 text-left active:bg-gray-50 flex items-center justify-between"
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
              <div className="border-t border-gray-50 px-4 py-2 flex justify-end">
                <button
                  onClick={(e) => deleteSession(session.id!, e)}
                  className="text-gray-400 active:text-red-500 p-1"
                  title="Eliminar sesión"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
