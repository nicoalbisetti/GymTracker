import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import type { Routine } from '@/types';
import { Plus, Trash2, Copy, ChevronRight, Dumbbell, Play } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const routines = useLiveQuery(() => db.routines.orderBy('createdAt').reverse().toArray());

  async function createRoutine() {
    try {
      const id = await db.routines.add({
        name: 'Nueva rutina',
        createdAt: new Date().toISOString(),
      });
      navigate(`/routine/${id}`);
    } catch (err) {
      console.error(err);
      alert('Error al guardar. Verificá el almacenamiento del dispositivo.');
    }
  }

  async function deleteRoutine(routine: Routine, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`¿Eliminar "${routine.name}"?`)) return;
    try {
      await db.transaction('rw', [db.routines, db.routineExercises, db.sets], async () => {
        const routineExercises = await db.routineExercises.where('routineId').equals(routine.id!).toArray();
        for (const re of routineExercises) {
          await db.sets.where('routineExerciseId').equals(re.id!).delete();
        }
        await db.routineExercises.where('routineId').equals(routine.id!).delete();
        await db.routines.delete(routine.id!);
      });
    } catch (err) {
      console.error(err);
      alert('Error al guardar. Verificá el almacenamiento del dispositivo.');
    }
  }

  async function duplicateRoutine(routine: Routine, e: React.MouseEvent) {
    e.stopPropagation();
    try {
    await db.transaction('rw', [db.routines, db.routineExercises, db.sets], async () => {
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
    });
    } catch (err) {
      console.error(err);
      alert('Error al guardar. Verificá el almacenamiento del dispositivo.');
    }
  }

  async function startWorkout(routine: Routine) {
    try {
      const sessionId = await db.workoutSessions.add({
        routineId: routine.id!,
        routineName: routine.name,
        startedAt: new Date().toISOString(),
      });
      navigate(`/workout/${sessionId}`);
    } catch (err) {
      console.error(err);
      alert('Error al guardar. Verificá el almacenamiento del dispositivo.');
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-bold text-white tracking-tight">Mis Rutinas</h1>
        <button
          onClick={createRoutine}
          className="bg-primary-500 text-white rounded-full w-10 h-10 flex items-center justify-center active:bg-primary-600 shadow-lg shadow-primary-500/30"
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      </div>

      {routines?.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-700">
            <Dumbbell size={32} className="text-primary-400" strokeWidth={1.5} />
          </div>
          <p className="font-semibold text-slate-300">Sin rutinas todavía</p>
          <p className="text-sm mt-1 text-slate-500">Tocá + para crear tu primera rutina</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {routines?.map((routine) => (
          <div
            key={routine.id}
            className="bg-slate-800 rounded-2xl border border-slate-700/50 overflow-hidden"
          >
            <button
              onClick={() => navigate(`/routine/${routine.id}`)}
              className="w-full text-left px-4 py-4 active:bg-slate-700/50 flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-white">{routine.name}</p>
                <p className="text-sm text-slate-400 mt-0.5">
                  {new Date(routine.createdAt).toLocaleDateString('es-AR', {
                    day: 'numeric', month: 'long',
                  })}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => deleteRoutine(routine, e)}
                  className="text-slate-600 active:text-red-400 p-2 rounded-xl"
                  title="Eliminar rutina"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={(e) => duplicateRoutine(routine, e)}
                  className="text-slate-600 active:text-primary-400 p-2 rounded-xl"
                  title="Copiar rutina"
                >
                  <Copy size={16} />
                </button>
                <ChevronRight size={18} className="text-slate-600 ml-1" />
              </div>
            </button>
            <div className="border-t border-slate-700/50 px-4 py-2.5">
              <button
                onClick={() => startWorkout(routine)}
                className="w-full bg-primary-500 text-white rounded-xl py-2.5 font-semibold text-sm active:bg-primary-600 flex items-center justify-center gap-2"
              >
                <Play size={14} strokeWidth={2.5} className="fill-white" />
                Iniciar rutina
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
