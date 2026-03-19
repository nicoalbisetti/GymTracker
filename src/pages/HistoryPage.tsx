import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { Trash2, ChevronRight, CalendarDays, Clock, Timer } from 'lucide-react';

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
      <h1 className="text-2xl font-bold text-white tracking-tight pt-2">Historial</h1>

      {sessions?.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-700">
            <CalendarDays size={32} className="text-primary-400" strokeWidth={1.5} />
          </div>
          <p className="font-semibold text-slate-300">Sin sesiones todavía</p>
          <p className="text-sm mt-1 text-slate-500">Ejecutá una rutina para verla acá</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {sessions?.map((session) => {
          const duration = formatDuration(session.startedAt, session.finishedAt);
          const date = new Date(session.startedAt);
          return (
            <div
              key={session.id}
              className="bg-slate-800 rounded-2xl border border-slate-700/50 overflow-hidden"
            >
              <button
                onClick={() => navigate(`/history/${session.id}`)}
                className="w-full p-4 text-left active:bg-slate-700/50 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">{session.routineName}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock size={12} className="text-slate-500 flex-shrink-0" />
                    <p className="text-sm text-slate-400 truncate">
                      {date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      {' · '}{date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  {duration && (
                    <span className="inline-flex items-center gap-1 text-xs bg-primary-500/15 text-primary-400 font-medium rounded-full px-2.5 py-1">
                      <Timer size={11} />
                      {duration}
                    </span>
                  )}
                  {!session.finishedAt && (
                    <span className="text-xs bg-amber-500/15 text-amber-400 font-medium rounded-full px-2.5 py-1">Incompleta</span>
                  )}
                  <ChevronRight size={16} className="text-slate-600" />
                </div>
              </button>
              <div className="border-t border-slate-700/50 px-4 py-2 flex justify-end">
                <button
                  onClick={(e) => deleteSession(session.id!, e)}
                  className="text-slate-600 active:text-red-400 p-2 rounded-xl"
                  title="Eliminar sesión"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
