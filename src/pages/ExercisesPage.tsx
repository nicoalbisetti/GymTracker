import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { getAllExercises } from '@/services/exerciseService';

export default function ExercisesPage() {
  const [search, setSearch] = useState('');
  const [exercises, setExercises] = useState<{ id?: number; name: string; muscleGroup: string }[]>([]);

  useEffect(() => {
    getAllExercises().then(setExercises).catch(console.error);
  }, []);

  const grouped = useMemo(() => {
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
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-white tracking-tight">Ejercicios</h1>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {groups.map((group) => (
        <div key={group}>
          <div className="px-4 py-2 bg-slate-800/60 sticky top-0 border-b border-slate-700/30">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{group}</p>
          </div>
          {grouped[group].map((ex) => (
            <div key={ex.id} className="px-4 py-3 border-b border-slate-800 flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
              <span className="text-slate-200 text-sm flex-1">{ex.name}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
