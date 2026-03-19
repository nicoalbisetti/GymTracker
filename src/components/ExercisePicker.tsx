import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import type { Exercise } from '@/types';
import { ArrowLeft, Search, ChevronDown, Check } from 'lucide-react';

interface Props {
  onConfirm: (exercises: Exercise[]) => void;
  onClose: () => void;
  excludeIds?: number[];
}

export default function ExercisePicker({ onConfirm, onClose, excludeIds = [] }: Props) {
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Map<number, Exercise>>(new Map());

  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray());

  const { grouped, groups } = useMemo(() => {
    if (!exercises) return { grouped: {} as Record<string, Exercise[]>, groups: [] };
    const q = search.trim().toLowerCase();
    const filtered = exercises.filter(ex =>
      !excludeIds.includes(ex.id!) &&
      (!q || ex.name.toLowerCase().includes(q) || ex.muscleGroup.toLowerCase().includes(q))
    );
    const grouped = filtered.reduce<Record<string, Exercise[]>>((acc, ex) => {
      if (!acc[ex.muscleGroup]) acc[ex.muscleGroup] = [];
      acc[ex.muscleGroup].push(ex);
      return acc;
    }, {});
    return { grouped, groups: Object.keys(grouped).sort() };
  }, [exercises, search, excludeIds]);

  const isSearching = search.trim().length > 0;

  function toggleGroup(group: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  }

  function toggleExercise(ex: Exercise) {
    setSelected(prev => {
      const next = new Map(prev);
      next.has(ex.id!) ? next.delete(ex.id!) : next.set(ex.id!, ex);
      return next;
    });
  }

  const isExpanded = (group: string) => isSearching || expandedGroups.has(group);
  const selectedList = Array.from(selected.values());

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-800">
        <button onClick={onClose} className="text-slate-400 p-1.5 rounded-xl active:bg-slate-800">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-semibold text-white flex-1 tracking-tight">Agregar ejercicios</h2>
        {selected.size > 0 && (
          <span className="bg-primary-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
            {selected.size}
          </span>
        )}
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-slate-800">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            autoFocus
            type="search"
            placeholder="Buscar por ejercicio o músculo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {groups.length === 0 && (
          <p className="text-center text-slate-500 py-16 text-sm">Sin resultados</p>
        )}
        {groups.map(group => (
          <div key={group}>
            <button
              onClick={() => toggleGroup(group)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/60 border-b border-slate-800 active:bg-slate-800"
            >
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{group}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">{grouped[group].length} ejercicios</span>
                <ChevronDown
                  size={15}
                  className={`text-slate-500 transition-transform ${isExpanded(group) ? 'rotate-180' : ''}`}
                />
              </div>
            </button>
            {isExpanded(group) && grouped[group].map(ex => {
              const isSelected = selected.has(ex.id!);
              return (
                <button
                  key={ex.id}
                  onClick={() => toggleExercise(ex)}
                  className={`w-full text-left px-4 py-3.5 border-b border-slate-800/60 flex items-center justify-between transition-colors ${isSelected ? 'bg-primary-500/10' : 'active:bg-slate-800'}`}
                >
                  <span className={`text-sm ${isSelected ? 'text-primary-400 font-medium' : 'text-slate-200'}`}>{ex.name}</span>
                  <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${isSelected ? 'bg-primary-500 border-primary-500' : 'border-slate-600'}`}>
                    {isSelected && <Check size={13} className="text-white" strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Confirm button */}
      <div className="px-4 py-4 border-t border-slate-800 bg-slate-950">
        <button
          onClick={() => selectedList.length > 0 && onConfirm(selectedList)}
          disabled={selectedList.length === 0}
          className={`w-full py-3.5 rounded-2xl font-semibold text-base transition-colors ${
            selectedList.length > 0
              ? 'bg-primary-500 text-white active:bg-primary-600'
              : 'bg-slate-800 text-slate-500 cursor-default'
          }`}
        >
          {selectedList.length === 0
            ? 'Seleccioná ejercicios'
            : `Agregar ${selectedList.length} ejercicio${selectedList.length > 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}
