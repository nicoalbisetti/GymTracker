import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';

export default function HistoryPage() {
  const workouts = useLiveQuery(() => db.workouts.orderBy('date').reverse().toArray());

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold text-gray-900">Historial</h1>

      {workouts?.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-3">📅</p>
          <p className="font-medium">Sin historial todavía</p>
          <p className="text-sm">Tus entrenos completados aparecerán acá</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {workouts?.map((w) => (
          <div key={w.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-900">{w.name}</p>
              {w.durationMinutes && (
                <span className="text-xs bg-primary-50 text-primary-500 rounded-full px-2 py-1">
                  {w.durationMinutes} min
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-1">
              {new Date(w.date).toLocaleDateString('es-AR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
