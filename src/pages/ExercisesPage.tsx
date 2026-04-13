import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Plus, Trash2 } from 'lucide-react';
import type { Exercise } from '@/types';
import { getAllExercises, addExercise, deleteExercise } from '@/services/exerciseService';

export default function ExercisesPage() {
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [customGroup, setCustomGroup] = useState('');

  const exercises = useLiveQuery(() => getAllExercises());

  const muscleGroups = useMemo(() => {
    if (!exercises) return [];
    return Array.from(new Set(exercises.map((ex) => ex.muscleGroup))).sort();
  }, [exercises]);

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

  function resetForm() {
    setNewName('');
    setNewGroup('');
    setCustomGroup('');
    setShowAddForm(false);
  }

  async function handleAddExercise() {
    const name = newName.trim();
    const group = newGroup === 'Otro' ? customGroup.trim() : newGroup.trim();
    if (!name || !group) return;
    try {
      await addExercise(name, group);
      resetForm();
    } catch (err) {
      console.error(err);
      alert('Error al guardar. Verificá el almacenamiento del dispositivo.');
    }
  }

  async function handleDeleteExercise(ex: Exercise) {
    if (ex.id !== undefined && ex.id <= 78) {
      alert('No se puede eliminar un ejercicio predefinido.');
      return;
    }
    if (!confirm(`¿Eliminar "${ex.name}"?`)) return;
    try {
      await deleteExercise(ex);
    } catch (err) {
      if (err instanceof Error && err.message === 'in-use') {
        alert('Este ejercicio está en uso en una o más rutinas y no puede eliminarse.');
      } else {
        console.error(err);
        alert('Error al guardar. Verificá el almacenamiento del dispositivo.');
      }
    }
  }

  return (
    <div className="flex flex-col gap-0">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-white tracking-tight">Ejercicios</h1>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="bg-primary-500 text-white rounded-full w-10 h-10 flex items-center justify-center active:bg-primary-600 shadow-lg shadow-primary-500/30"
          >
            <Plus size={22} strokeWidth={2.5} />
          </button>
        </div>

        {showAddForm && (
          <div className="bg-slate-800 rounded-2xl border border-slate-700/50 p-4 flex flex-col gap-3 mb-3">
            <input
              type="text"
              placeholder="Nombre del ejercicio"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-slate-700/60 border border-slate-600/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <select
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value)}
              className="w-full bg-slate-700/60 border border-slate-600/50 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Grupo muscular...</option>
              {muscleGroups.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
              <option value="Otro">Otro</option>
            </select>
            {newGroup === 'Otro' && (
              <input
                type="text"
                placeholder="Nombre del grupo muscular"
                value={customGroup}
                onChange={(e) => setCustomGroup(e.target.value)}
                className="w-full bg-slate-700/60 border border-slate-600/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            )}
            <div className="flex gap-2">
              <button
                onClick={resetForm}
                className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-400 text-sm active:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddExercise}
                className="flex-1 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold active:bg-primary-600"
              >
                Agregar
              </button>
            </div>
          </div>
        )}

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
              <button
                onClick={() => handleDeleteExercise(ex)}
                className="text-slate-600 active:text-red-400 p-1.5 rounded-lg"
                title="Eliminar ejercicio"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
