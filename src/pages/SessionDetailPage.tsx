import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Timer, ClipboardList } from 'lucide-react';
import { getSessionById, getSessionRecords } from '@/services/historyService';
import type { WorkoutSession, WorkoutSetRecord } from '@/types';

export default function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<WorkoutSession | undefined>(undefined);
  const [records, setRecords] = useState<WorkoutSetRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    Promise.all([
      getSessionById(sessionId),
      getSessionRecords(sessionId),
    ]).then(([sess, recs]) => {
      setSession(sess);
      setRecords(recs);
    }).catch(console.error).finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return null;
  if (!session) return null;

  const byExercise = records.reduce<Record<string, typeof records>>((acc, r) => {
    const key = `${r.muscleGroup}__${r.exerciseName}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const groups = Object.entries(byExercise).sort(([a], [b]) => a.localeCompare(b));

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
      <div className="bg-slate-900/80 border-b border-slate-800 px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate('/history')} className="text-slate-400 p-1.5 rounded-xl active:bg-slate-800">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-white tracking-tight">{session.routineName}</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5 text-sm text-slate-400">
            <Calendar size={14} />
            {date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm text-slate-400">
            <Clock size={14} />
            {date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {duration && (
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-400">
              <Timer size={14} />
              {duration}
            </span>
          )}
          {!session.finishedAt && (
            <span className="text-sm text-yellow-400 bg-yellow-500/20 px-2 rounded-full">Incompleta</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4 flex flex-col gap-4">
        {records.length === 0 && (
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-700">
              <ClipboardList size={28} className="text-slate-500" strokeWidth={1.5} />
            </div>
            <p className="text-slate-400">No se completó ninguna serie</p>
          </div>
        )}

        {Object.entries(byMuscle).sort(([a], [b]) => a.localeCompare(b)).map(([muscle, exerciseGroups]) => (
          <div key={muscle}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2 px-1">{muscle}</p>
            <div className="flex flex-col gap-3">
              {exerciseGroups.map(([key, sets]) => {
                const exerciseName = key.split('__')[1];
                return (
                  <div key={key} className="bg-slate-800 rounded-2xl border border-slate-700/50 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-900/80">
                      <p className="font-semibold text-white">{exerciseName}</p>
                    </div>
                    <div className="px-4 py-3 flex flex-col gap-2">
                      <div className="flex gap-2 px-1">
                        <span className="w-8 text-xs text-slate-500 text-center">#</span>
                        <span className="flex-1 text-xs text-slate-500 text-center">Kg</span>
                        <span className="flex-1 text-xs text-slate-500 text-center">Reps</span>
                      </div>
                      {sets.map((r) => (
                        <div key={r.id} className="flex items-center gap-2">
                          <span className="w-8 text-sm text-slate-500 text-center font-medium">{r.setNumber}</span>
                          <div className="flex-1 bg-slate-700/50 rounded-xl px-3 py-2 text-sm text-center text-slate-200">
                            {r.weight > 0 ? `${r.weight} kg` : '—'}
                          </div>
                          <div className="flex-1 bg-slate-700/50 rounded-xl px-3 py-2 text-sm text-center text-slate-200">
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
