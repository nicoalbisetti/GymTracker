import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';

const CATEGORIES = ['Fuerza', 'Cardio', 'Flexibilidad', 'Otro'];
const MUSCLE_GROUPS = ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Piernas', 'Core', 'Otro'];

export default function ExercisesPage() {
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray());
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Fuerza');
  const [muscleGroup, setMuscleGroup] = useState('Pecho');

  async function handleAdd() {
    if (!name.trim()) return;
    await db.exercises.add({ name: name.trim(), category, muscleGroup });
    setName('');
    setShowForm(false);
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Ejercicios</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary-500 text-white rounded-full w-10 h-10 flex items-center justify-center text-2xl active:bg-primary-600"
        >
          {showForm ? '×' : '+'}
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-3">
          <input
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm w-full focus:outline-none focus:border-primary-500"
            placeholder="Nombre del ejercicio"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm w-full bg-white focus:outline-none"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm w-full bg-white focus:outline-none"
            value={muscleGroup}
            onChange={(e) => setMuscleGroup(e.target.value)}
          >
            {MUSCLE_GROUPS.map((m) => <option key={m}>{m}</option>)}
          </select>
          <button
            onClick={handleAdd}
            className="bg-primary-500 text-white rounded-xl py-3 font-semibold active:bg-primary-600"
          >
            Agregar
          </button>
        </div>
      )}

      {exercises?.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-3">📋</p>
          <p className="font-medium">Sin ejercicios todavía</p>
          <p className="text-sm">Tocá + para agregar el primero</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {exercises?.map((ex) => (
          <div key={ex.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="bg-primary-50 rounded-xl w-10 h-10 flex items-center justify-center text-lg">
              {ex.category === 'Cardio' ? '🏃' : ex.category === 'Flexibilidad' ? '🧘' : '🏋️'}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{ex.name}</p>
              <p className="text-xs text-gray-400">{ex.muscleGroup} · {ex.category}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
