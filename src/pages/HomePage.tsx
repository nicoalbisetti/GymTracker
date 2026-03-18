import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import type { Routine } from '@/types';

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
              <span className="text-gray-300 text-xl">›</span>
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
