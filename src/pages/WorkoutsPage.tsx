import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';

export default function WorkoutsPage() {
  const workouts = useLiveQuery(() => db.workouts.orderBy('date').reverse().toArray());

  async function createWorkout() {
    await db.workouts.add({
      name: 'Entreno del día',
      date: new Date().toISOString(),
    });
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mis Entrenos</h1>
        <button
          onClick={createWorkout}
          className="bg-primary-500 text-white rounded-full w-10 h-10 flex items-center justify-center text-2xl active:bg-primary-600"
        >
          +
        </button>
      </div>

      {workouts?.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-3">💪</p>
          <p className="font-medium">Sin entrenos todavía</p>
          <p className="text-sm">Tocá + para crear el primero</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {workouts?.map((w) => (
          <div key={w.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <p className="font-semibold text-gray-900">{w.name}</p>
            <p className="text-sm text-gray-400">
              {new Date(w.date).toLocaleDateString('es-AR', {
                weekday: 'long', day: 'numeric', month: 'long',
              })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
