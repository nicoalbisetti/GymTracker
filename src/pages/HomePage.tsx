import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import type { Routine } from '@/types';

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

export default function HomePage() {
  const navigate = useNavigate();
  const routines = useLiveQuery(() => db.routines.orderBy('createdAt').reverse().toArray());

  async function createRoutine() {
    const id = await db.routines.add({
      name: 'Nueva rutina',
      createdAt: new Date().toISOString(),
    });
    navigate(`/routine/${id}`);
  }

  async function deleteRoutine(routine: Routine, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`¿Eliminar "${routine.name}"?`)) return;
    const routineExercises = await db.routineExercises.where('routineId').equals(routine.id!).toArray();
    for (const re of routineExercises) {
      await db.sets.where('routineExerciseId').equals(re.id!).delete();
    }
    await db.routineExercises.where('routineId').equals(routine.id!).delete();
    await db.routines.delete(routine.id!);
  }

  async function duplicateRoutine(routine: Routine, e: React.MouseEvent) {
    e.stopPropagation();
    const newRoutineId = await db.routines.add({
      name: `Copia de ${routine.name}`,
      createdAt: new Date().toISOString(),
    });
    const routineExercises = await db.routineExercises.where('routineId').equals(routine.id!).toArray();
    for (const re of routineExercises) {
      const newReId = await db.routineExercises.add({
        routineId: newRoutineId as number,
        exerciseId: re.exerciseId,
        orderIndex: re.orderIndex,
        restSeconds: re.restSeconds,
      });
      const sets = await db.sets.where('routineExerciseId').equals(re.id!).toArray();
      for (const set of sets) {
        await db.sets.add({
          routineExerciseId: newReId as number,
          setNumber: set.setNumber,
          reps: set.reps,
          weight: set.weight,
        });
      }
    }
  }

  async function startWorkout(routine: Routine) {
    const sessionId = await db.workoutSessions.add({
      routineId: routine.id!,
      routineName: routine.name,
      startedAt: new Date().toISOString(),
    });
    navigate(`/workout/${sessionId}`);
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-bold text-gray-900">Mis Rutinas</h1>
        <button
          onClick={createRoutine}
          className="bg-primary-500 text-white rounded-full w-10 h-10 flex items-center justify-center text-2xl active:bg-primary-600 shadow-md"
        >
          +
        </button>
      </div>

      {routines?.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-3">💪</p>
          <p className="font-medium text-gray-600">Sin rutinas todavía</p>
          <p className="text-sm mt-1">Tocá + para crear tu primera rutina</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {routines?.map((routine) => (
          <div
            key={routine.id}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <button
              onClick={() => navigate(`/routine/${routine.id}`)}
              className="w-full text-left px-4 py-4 active:bg-gray-50 flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-gray-900">{routine.name}</p>
                <p className="text-sm text-gray-400 mt-0.5">
                  {new Date(routine.createdAt).toLocaleDateString('es-AR', {
                    day: 'numeric', month: 'long',
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => deleteRoutine(routine, e)}
                  className="text-gray-400 active:text-red-500 p-1"
                  title="Eliminar rutina"
                >
                  <TrashIcon />
                </button>
                <button
                  onClick={(e) => duplicateRoutine(routine, e)}
                  className="text-gray-400 active:text-primary-500 p-1"
                  title="Copiar rutina"
                >
                  <CopyIcon />
                </button>
                <span className="text-gray-300 text-xl">›</span>
              </div>
            </button>
            <div className="border-t border-gray-50 px-4 py-2">
              <button
                onClick={() => startWorkout(routine)}
                className="w-full bg-primary-500 text-white rounded-xl py-2.5 font-semibold text-sm active:bg-primary-600"
              >
                ▶ Iniciar rutina
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
