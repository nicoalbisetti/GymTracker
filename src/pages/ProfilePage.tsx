import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';

export default function ProfilePage() {
  const workoutCount = useLiveQuery(() => db.workouts.count());
  const exerciseCount = useLiveQuery(() => db.exercises.count());

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">Perfil</h1>

      <div className="bg-gray-50 rounded-2xl p-5 flex items-center gap-4">
        <div className="bg-primary-500 rounded-full w-14 h-14 flex items-center justify-center text-2xl text-white">
          👤
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-lg">Mi perfil</p>
          <p className="text-sm text-gray-400">GymTracker</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-3xl font-bold text-primary-500">{workoutCount ?? 0}</p>
          <p className="text-sm text-gray-400 mt-1">Entrenos</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-3xl font-bold text-primary-500">{exerciseCount ?? 0}</p>
          <p className="text-sm text-gray-400 mt-1">Ejercicios</p>
        </div>
      </div>
    </div>
  );
}
