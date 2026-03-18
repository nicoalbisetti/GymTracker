import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';

export default function ExercisesPage() {
  const [search, setSearch] = useState('');
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray());

  const grouped = useMemo(() => {
    if (!exercises) return {};
    const filtered = exercises.filter((ex) =>
      ex.name.toLowerCase().includes(search.toLowerCase())
    );
    return filtered.reduce<Record<string, typeof filtered>>((acc, ex) => {
      if (!acc[ex.muscleGroup]) acc[ex.muscleGroup] = [];
      acc[ex.muscleGroup].push(ex);
      return acc;
    }, {});
  }, [exercises, search]);

  const groups = Object.keys(grouped).sort();

  return (
    <div className="flex flex-col gap-0">
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Ejercicios</h1>
        <input
          type="search"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {groups.map((group) => (
        <div key={group}>
          <div className="px-4 py-2 bg-gray-50 sticky top-0">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{group}</p>
          </div>
          {grouped[group].map((ex) => (
            <div key={ex.id} className="px-4 py-3 border-b border-gray-50 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
              <span className="text-gray-800 text-sm">{ex.name}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
