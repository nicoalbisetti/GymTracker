import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { playBeep } from '@/utils/audio';
import type { Exercise, ExerciseSet, RoutineExercise } from '@/types';

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

  const session = useLiveQuery(() => db.workoutSessions.get(sid), [sid]);

  const routineExercises = useLiveQuery(
    async () => {
      if (!session) return [];
      return db.routineExercises.where('routineId').equals(session.routineId).sortBy('orderIndex');
    },
    [session]
  );

  const allSets = useLiveQuery(
    async () => {
      if (!routineExercises?.length) return [];
      return db.sets.where('routineExerciseId').anyOf(routineExercises.map(re => re.id!)).toArray();
    },
    [routineExercises]
  );

  const exercises = useLiveQuery(
    async () => {
      if (!routineExercises?.length) return {} as Record<number, Exercise>;
      const exs = await db.exercises.where('id').anyOf(routineExercises.map(re => re.exerciseId)).toArray();
      return Object.fromEntries(exs.map(e => [e.id!, e])) as Record<number, Exercise>;
    },
    [routineExercises]
  );

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // ── helpers ──────────────────────────────────────────────────────────────

  function getVal(set: ExerciseSet, field: 'reps' | 'weight'): number {
    return setEdits[set.id!]?.[field] ?? set[field];
  }

  function updateEdit(setId: number, field: 'reps' | 'weight', value: string) {
    const num = parseFloat(value) || 0;
    setSetEdits(prev => ({ ...prev, [setId]: { ...prev[setId], [field]: num } }));
  }

  function saveToDb(set: ExerciseSet, field: 'reps' | 'weight', value: string) {
    const num = parseFloat(value) || 0;
    db.sets.update(set.id!, { [field]: num });
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
    await db.sets.add({
      routineExerciseId: re.id!,
      setNumber: existing.length + 1,
      reps: last ? getVal(last, 'reps') : 10,
      weight: last ? getVal(last, 'weight') : 0,
    });
  }

  async function handleCompleteSet(re: RoutineExercise, set: ExerciseSet, exercise: Exercise) {
    if (completedKeys.has(set.id!)) return;
    const reps = getVal(set, 'reps');
    const weight = getVal(set, 'weight');

    // Persist edited values to the plan
    await db.sets.update(set.id!, { reps, weight });

    setCompletedKeys(prev => new Set([...prev, set.id!]));

    await db.workoutSetRecords.add({
      sessionId: sid,
      exerciseId: exercise.id!,
      exerciseName: exercise.name,
      muscleGroup: exercise.muscleGroup,
      setNumber: set.setNumber,
      reps,
      weight,
      completedAt: new Date().toISOString(),
    });

    if (re.restSeconds > 0) startCountdown(re.restSeconds);
  }

  async function handleFinish() {
    if (timerRef.current) clearInterval(timerRef.current);
    await db.workoutSessions.update(sid, { finishedAt: new Date().toISOString() });
    navigate('/history');
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
  }

  if (!session || !routineExercises || !allSets || !exercises) return null;

  const totalSets = allSets.length;
  const doneSets = completedKeys.size;

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-primary-500 text-white px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-bold text-lg">{session.routineName}</h1>
          <button
            onClick={handleFinish}
            className="bg-white text-primary-500 text-sm font-semibold px-4 py-1.5 rounded-full active:bg-primary-50"
          >
            Terminar
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-primary-400 rounded-full h-2">
            <div
              className="bg-white rounded-full h-2 transition-all"
              style={{ width: totalSets > 0 ? `${(doneSets / totalSets) * 100}%` : '0%' }}
            />
          </div>
          <span className="text-primary-100 text-xs">{doneSets}/{totalSets} series</span>
        </div>
      </div>

      {/* Exercises */}
      <div className="flex-1 px-4 py-4 flex flex-col gap-4 pb-32">
        {routineExercises.map(re => {
          const exercise = exercises[re.exerciseId];
          const sets = (allSets ?? [])
            .filter(s => s.routineExerciseId === re.id)
            .sort((a, b) => a.setNumber - b.setNumber);
          const doneCount = sets.filter(s => completedKeys.has(s.id!)).length;
          const allDone = sets.length > 0 && doneCount === sets.length;

          return (
            <div key={re.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${allDone ? 'border-green-200' : 'border-gray-100'}`}>
              {/* Exercise header */}
              <div className={`flex items-center justify-between px-4 py-3 ${allDone ? 'bg-green-50' : 'bg-gray-50'}`}>
                <div>
                  <p className="font-semibold text-gray-900">{exercise?.name}</p>
                  <p className="text-xs text-gray-400">{exercise?.muscleGroup}</p>
                </div>
                {allDone
                  ? <span className="text-green-500 text-xl">✓</span>
                  : <span className="text-xs text-gray-400">{doneCount}/{sets.length}</span>
                }
              </div>

              {/* Sets */}
              <div className="px-4 pt-2 pb-3 flex flex-col gap-2">
                {sets.length > 0 && (
                  <div className="flex items-center gap-2 px-1">
                    <span className="w-7 text-xs text-gray-400 text-center">#</span>
                    <span className="flex-1 text-xs text-gray-400 text-center">Kg</span>
                    <span className="flex-1 text-xs text-gray-400 text-center">Reps</span>
                    <span className="w-16" />
                  </div>
                )}

                {sets.map(set => {
                  const done = completedKeys.has(set.id!);
                  return (
                    <div key={set.id} className={`flex items-center gap-2 ${done ? 'opacity-40' : ''}`}>
                      <span className="w-7 text-sm text-gray-400 text-center">{set.setNumber}</span>

                      <input
                        type="number"
                        inputMode="decimal"
                        value={getVal(set, 'weight') || ''}
                        placeholder="0"
                        disabled={done}
                        onChange={e => updateEdit(set.id!, 'weight', e.target.value)}
                        onBlur={e => saveToDb(set, 'weight', e.target.value)}
                        className="flex-1 bg-gray-100 rounded-xl px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-default"
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        value={getVal(set, 'reps') || ''}
                        placeholder="0"
                        disabled={done}
                        onChange={e => updateEdit(set.id!, 'reps', e.target.value)}
                        onBlur={e => saveToDb(set, 'reps', e.target.value)}
                        className="flex-1 bg-gray-100 rounded-xl px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-default"
                      />

                      <button
                        onClick={() => exercise && handleCompleteSet(re, set, exercise)}
                        disabled={done}
                        className={`w-16 rounded-xl py-2 text-sm font-semibold transition-colors ${
                          done
                            ? 'bg-green-100 text-green-600 cursor-default'
                            : 'bg-primary-500 text-white active:bg-primary-600'
                        }`}
                      >
                        {done ? '✓' : 'Listo'}
                      </button>
                    </div>
                  );
                })}

                <button
                  onClick={() => handleAddSet(re)}
                  className="mt-1 w-full text-sm text-primary-500 py-1.5 rounded-xl border border-dashed border-primary-300 active:bg-primary-50"
                >
                  + Agregar serie
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* GO! overlay */}
      {showGo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-primary-500 text-white text-6xl font-black px-12 py-8 rounded-3xl shadow-2xl animate-bounce">
            GO!
          </div>
        </div>
      )}

      {/* Countdown bar */}
      {countdown !== null && (
        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-gray-900 text-white px-6 py-4 flex items-center justify-between z-40">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Descansando</p>
            <p className="text-3xl font-bold tabular-nums">{formatTime(countdown)}</p>
          </div>
          <button
            onClick={skipCountdown}
            className="bg-primary-500 text-white px-5 py-2.5 rounded-xl font-semibold active:bg-primary-600"
          >
            Saltar →
          </button>
        </div>
      )}
    </div>
  );
}
