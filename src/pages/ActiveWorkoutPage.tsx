import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { playBeep } from '@/utils/audio';
import type { Exercise, ExerciseSet, RoutineExercise } from '@/types';
import { Check, Plus, SkipForward } from 'lucide-react';
import { getWorkoutSession, finishWorkoutSession, recordCompletedSet, addSetDuringWorkout } from '@/services/workoutService';
import { getRoutineExercises, getSetsForRoutineExercises } from '@/services/routineService';
import { getExercisesMap } from '@/services/exerciseService';

type SetEdits = Record<number, { reps: number; weight: number }>;

export default function ActiveWorkoutPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const sid = Number(sessionId);
  const navigate = useNavigate();

  const [completedKeys, setCompletedKeys] = useState<Set<number>>(new Set());
  const [setEdits, setSetEdits] = useState<SetEdits>({});
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showGo, setShowGo] = useState(false);
  const endTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const session = useLiveQuery(() => getWorkoutSession(sid), [sid]);

  const routineExercises = useLiveQuery(
    async () => {
      if (!session) return [];
      return getRoutineExercises(session.routineId);
    },
    [session]
  );

  const allSets = useLiveQuery(
    async () => {
      if (!routineExercises?.length) return [];
      return getSetsForRoutineExercises(routineExercises.map(re => re.id!));
    },
    [routineExercises]
  );

  const exercises = useLiveQuery(
    async () => {
      if (!routineExercises?.length) return {} as Record<number, Exercise>;
      return getExercisesMap(routineExercises.map(re => re.exerciseId));
    },
    [routineExercises]
  );

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function getVal(set: ExerciseSet, field: 'reps' | 'weight'): number {
    return setEdits[set.id!]?.[field] ?? set[field];
  }

  function updateEdit(setId: number, field: 'reps' | 'weight', value: string) {
    const num = parseFloat(value) || 0;
    setSetEdits(prev => ({ ...prev, [setId]: { ...prev[setId], [field]: num } }));
  }

  function startCountdown(seconds: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    endTimeRef.current = Date.now() + seconds * 1000;
    setCountdown(seconds);
    setShowGo(false);
    timerRef.current = setInterval(() => {
      const remaining = Math.ceil((endTimeRef.current! - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        setCountdown(null);
        playBeep();
        setShowGo(true);
        setTimeout(() => setShowGo(false), 2500);
      } else {
        setCountdown(remaining);
      }
    }, 250);
  }

  function skipCountdown() {
    if (timerRef.current) clearInterval(timerRef.current);
    setCountdown(null);
    setShowGo(false);
  }

  async function handleAddSet(re: RoutineExercise) {
    const existing = (allSets ?? [])
      .filter(s => s.routineExerciseId === re.id)
      .sort((a, b) => a.setNumber - b.setNumber);
    const last = existing[existing.length - 1];
    try {
      await addSetDuringWorkout(
        re,
        existing,
        last ? getVal(last, 'reps') : 10,
        last ? getVal(last, 'weight') : 0
      );
    } catch (err) {
      console.error(err);
      alert('Error al guardar. Verificá el almacenamiento del dispositivo.');
    }
  }

  async function handleCompleteSet(re: RoutineExercise, set: ExerciseSet, exercise: Exercise) {
    if (completedKeys.has(set.id!)) return;
    const reps = getVal(set, 'reps');
    const weight = getVal(set, 'weight');
    try {
      await recordCompletedSet(sid, set, exercise, reps, weight);
      setCompletedKeys(prev => new Set([...prev, set.id!]));
      if (re.restSeconds > 0) startCountdown(re.restSeconds);
    } catch (err) {
      console.error(err);
      alert('Error al guardar. Verificá el almacenamiento del dispositivo.');
    }
  }

  async function handleFinish() {
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      await finishWorkoutSession(sid);
      navigate('/history');
    } catch (err) {
      console.error(err);
      alert('Error al guardar. Verificá el almacenamiento del dispositivo.');
    }
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
  }

  if (!session || !routineExercises || !allSets || !exercises) return null;

  const totalSets = allSets.length;
  const doneSets = completedKeys.size;
  const progress = totalSets > 0 ? (doneSets / totalSets) * 100 : 0;

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 pt-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-bold text-lg text-white tracking-tight">{session.routineName}</h1>
          <button
            onClick={handleFinish}
            className="bg-primary-500 text-white text-sm font-semibold px-4 py-1.5 rounded-full active:bg-primary-600"
          >
            Terminar
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary-500 rounded-full h-2 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-slate-400 text-xs font-medium tabular-nums">{doneSets}/{totalSets}</span>
        </div>
      </div>

      {/* Exercises */}
      <div className="flex-1 px-4 py-4 flex flex-col gap-4 pb-36">
        {routineExercises.map(re => {
          const exercise = exercises[re.exerciseId];
          const sets = (allSets ?? [])
            .filter(s => s.routineExerciseId === re.id)
            .sort((a, b) => a.setNumber - b.setNumber);
          const doneCount = sets.filter(s => completedKeys.has(s.id!)).length;
          const allDone = sets.length > 0 && doneCount === sets.length;

          return (
            <div key={re.id} className={`bg-slate-800 rounded-2xl border overflow-hidden ${allDone ? 'border-green-500/30' : 'border-slate-700/50'}`}>
              {/* Exercise header */}
              <div className={`flex items-center justify-between px-4 py-3 ${allDone ? 'bg-green-500/10' : 'bg-slate-900/80'}`}>
                <div>
                  <p className="font-semibold text-white">{exercise?.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{exercise?.muscleGroup}</p>
                </div>
                {allDone
                  ? <Check size={20} className="text-green-400" />
                  : <span className="text-xs text-slate-400">{doneCount}/{sets.length}</span>
                }
              </div>

              {/* Sets */}
              <div className="px-4 pt-2.5 pb-3 flex flex-col gap-2">
                {sets.length > 0 && (
                  <div className="flex items-center gap-2 px-1">
                    <span className="w-7 text-xs text-slate-500 text-center">#</span>
                    <span className="flex-1 text-xs text-slate-500 text-center">Kg</span>
                    <span className="flex-1 text-xs text-slate-500 text-center">Reps</span>
                    <span className="w-16" />
                  </div>
                )}

                {sets.map(set => {
                  const done = completedKeys.has(set.id!);
                  return (
                    <div key={set.id} className={`flex items-center gap-2 transition-opacity ${done ? 'opacity-40' : ''}`}>
                      <span className="w-7 text-sm text-slate-500 text-center font-medium">{set.setNumber}</span>

                      <input
                        type="number"
                        inputMode="decimal"
                        value={getVal(set, 'weight') || ''}
                        placeholder="0"
                        disabled={done}
                        onChange={e => updateEdit(set.id!, 'weight', e.target.value)}
                        className="flex-1 bg-slate-700/60 border border-slate-600/50 text-white placeholder:text-slate-500 rounded-xl px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-default"
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        value={getVal(set, 'reps') || ''}
                        placeholder="0"
                        disabled={done}
                        onChange={e => updateEdit(set.id!, 'reps', e.target.value)}
                        className="flex-1 bg-slate-700/60 border border-slate-600/50 text-white placeholder:text-slate-500 rounded-xl px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-default"
                      />

                      <button
                        onClick={() => exercise && handleCompleteSet(re, set, exercise)}
                        disabled={done}
                        className={`w-16 rounded-xl py-2 text-sm font-semibold transition-colors flex items-center justify-center ${
                          done
                            ? 'bg-green-500/20 text-green-400 cursor-default'
                            : 'bg-primary-500 text-white active:bg-primary-600'
                        }`}
                      >
                        {done ? <Check size={16} /> : 'Listo'}
                      </button>
                    </div>
                  );
                })}

                <button
                  onClick={() => handleAddSet(re)}
                  className="mt-1 w-full text-sm text-primary-400 py-2 rounded-xl border border-dashed border-slate-600 active:bg-slate-700/50 flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} />
                  Agregar serie
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* GO! overlay */}
      {showGo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-primary-500 text-white text-6xl font-black px-12 py-8 rounded-3xl shadow-2xl shadow-primary-500/40 animate-bounce">
            GO!
          </div>
        </div>
      )}

      {/* Countdown bar */}
      {countdown !== null && (
        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-slate-900/95 backdrop-blur border-t border-slate-800 text-white px-6 py-4 flex items-center justify-between z-40">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-widest font-medium">Descansando</p>
            <p className="text-3xl font-bold tabular-nums text-white mt-0.5">{formatTime(countdown)}</p>
          </div>
          <button
            onClick={skipCountdown}
            className="bg-primary-500 text-white px-5 py-2.5 rounded-xl font-semibold active:bg-primary-600 flex items-center gap-2"
          >
            Saltar
            <SkipForward size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
