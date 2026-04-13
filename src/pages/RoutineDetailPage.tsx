import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Exercise, ExerciseSet, RoutineExercise } from '@/types';
import ExercisePicker from '@/components/ExercisePicker';
import { ArrowLeft, GripVertical, X, Trash2, Plus, Timer, Pencil, Dumbbell } from 'lucide-react';
import {
  getRoutineById,
  getRoutineExercises,
  getSetsForRoutineExercises,
  addExercisesToRoutine,
  removeExerciseFromRoutine,
  reorderRoutineExercises,
  addSet,
  updateSet,
  deleteSet,
  updateRestSeconds,
  renameRoutine,
} from '@/services/routineService';
import { getExercisesMap } from '@/services/exerciseService';

// ─── Sortable exercise card ───────────────────────────────────────────────────

interface CardProps {
  re: RoutineExercise;
  exercise: Exercise | undefined;
  sets: ExerciseSet[];
  onAddSet: (reId: number) => void;
  onUpdateSet: (set: ExerciseSet, field: 'reps' | 'weight', value: string) => void;
  onDeleteSet: (setId: number, reId: number) => void;
  onRemove: (reId: number) => void;
  onUpdateRest: (reId: number, seconds: number) => void;
}

function SortableExerciseCard({ re, exercise, sets, onAddSet, onUpdateSet, onDeleteSet, onRemove, onUpdateRest }: CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: re.id! });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-slate-800 rounded-2xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 bg-slate-700/40">
        <button
          className="touch-none cursor-grab text-slate-600 p-1 select-none active:text-slate-400"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate">{exercise?.name}</p>
          <p className="text-xs text-slate-500">{exercise?.muscleGroup}</p>
        </div>
        <button
          onClick={() => onRemove(re.id!)}
          className="text-slate-600 active:text-red-400 p-1.5 rounded-lg"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Rest time */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-700/40">
        <Timer size={14} className="text-slate-500" />
        <span className="text-sm text-slate-400">Descanso</span>
        <div className="ml-auto flex items-center gap-1.5">
          <input
            type="number"
            inputMode="numeric"
            defaultValue={re.restSeconds ?? 60}
            onBlur={(e) => onUpdateRest(re.id!, Math.max(0, parseInt(e.target.value) || 0))}
            className="w-16 bg-slate-700/60 border border-slate-600/50 rounded-lg px-2 py-1.5 text-sm text-center text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <span className="text-sm text-slate-500">seg</span>
        </div>
      </div>

      {/* Sets */}
      <div className="px-4 pt-2.5 pb-3 flex flex-col gap-2">
        {sets.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <span className="w-8 text-xs text-slate-500 text-center">Serie</span>
            <span className="flex-1 text-xs text-slate-500 text-center">Kg</span>
            <span className="flex-1 text-xs text-slate-500 text-center">Reps</span>
            <span className="w-8" />
          </div>
        )}
        {sets.map((set) => (
          <div key={set.id} className="flex items-center gap-2">
            <span className="w-8 text-sm text-slate-500 text-center font-medium">{set.setNumber}</span>
            <input
              type="number"
              inputMode="decimal"
              defaultValue={set.weight || ''}
              placeholder="0"
              onBlur={(e) => onUpdateSet(set, 'weight', e.target.value)}
              className="flex-1 bg-slate-700/60 border border-slate-600/50 rounded-xl px-3 py-2 text-sm text-center text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <input
              type="number"
              inputMode="numeric"
              defaultValue={set.reps || ''}
              placeholder="0"
              onBlur={(e) => onUpdateSet(set, 'reps', e.target.value)}
              className="flex-1 bg-slate-700/60 border border-slate-600/50 rounded-xl px-3 py-2 text-sm text-center text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={() => onDeleteSet(set.id!, re.id!)}
              className="w-8 text-slate-600 active:text-red-400 flex items-center justify-center"
            >
              <X size={16} />
            </button>
          </div>
        ))}
        <button
          onClick={() => onAddSet(re.id!)}
          className="mt-1 w-full text-sm text-primary-400 py-2 rounded-xl border border-dashed border-slate-600 active:bg-slate-700/50 flex items-center justify-center gap-1.5"
        >
          <Plus size={14} />
          Agregar serie
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RoutineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const routineId = Number(id);
  const navigate = useNavigate();
  const [showPicker, setShowPicker] = useState(false);
  const [editingName, setEditingName] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const routine = useLiveQuery(() => getRoutineById(routineId), [routineId]);

  const routineExercises = useLiveQuery(
    () => getRoutineExercises(routineId),
    [routineId]
  );

  const allSets = useLiveQuery(
    async () => {
      if (!routineExercises?.length) return [];
      return getSetsForRoutineExercises(routineExercises.map(re => re.id!));
    },
    [routineExercises]
  );

  const exercises = useLiveQuery(
    async () => {
      if (!routineExercises?.length) return {} as Record<number, Exercise>;
      return getExercisesMap(routineExercises.map(re => re.exerciseId));
    },
    [routineExercises]
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !routineExercises) return;
    const oldIndex = routineExercises.findIndex(re => re.id === active.id);
    const newIndex = routineExercises.findIndex(re => re.id === over.id);
    const reordered = arrayMove(routineExercises, oldIndex, newIndex);
    try {
      await reorderRoutineExercises(reordered);
    } catch (err) {
      console.error(err);
      alert('Error al guardar. Verificá el almacenamiento del dispositivo.');
    }
  }

  async function handleAddExercises(exercises: Exercise[]) {
    const baseOrder = routineExercises?.length ?? 0;
    try {
      await addExercisesToRoutine(routineId, exercises, baseOrder);
      setShowPicker(false);
    } catch (err) {
      console.error(err);
      alert('Error al guardar. Verificá el almacenamiento del dispositivo.');
    }
  }

  async function handleAddSet(routineExerciseId: number) {
    const existing = (allSets ?? [])
      .filter(s => s.routineExerciseId === routineExerciseId)
      .sort((a, b) => a.setNumber - b.setNumber);
    const last = existing[existing.length - 1];
    try {
      await addSet(routineExerciseId, existing.length + 1, last?.reps ?? 10, last?.weight ?? 0);
    } catch (err) {
      console.error(err);
      alert('Error al guardar. Verificá el almacenamiento del dispositivo.');
    }
  }

  async function handleUpdateSet(set: ExerciseSet, field: 'reps' | 'weight', value: string) {
    try {
      await updateSet(set.id!, field, parseFloat(value) || 0);
    } catch (err) {
      console.error(err);
      alert('Error al guardar. Verificá el almacenamiento del dispositivo.');
    }
  }

  async function handleDeleteSet(setId: number, routineExerciseId: number) {
    try {
      await deleteSet(setId, routineExerciseId, allSets ?? []);
    } catch (err) {
      console.error(err);
      alert('Error al guardar. Verificá el almacenamiento del dispositivo.');
    }
  }

  async function handleRemoveExercise(routineExerciseId: number) {
    try {
      await removeExerciseFromRoutine(routineExerciseId);
    } catch (err) {
      console.error(err);
      alert('Error al guardar. Verificá el almacenamiento del dispositivo.');
    }
  }

  async function handleUpdateRest(routineExerciseId: number, restSeconds: number) {
    await updateRestSeconds(routineExerciseId, restSeconds);
  }

  async function handleRenameRoutine(newName: string) {
    try {
      await renameRoutine(routineId, newName);
      setEditingName(false);
    } catch (err) {
      console.error(err);
      alert('Error al guardar. Verificá el almacenamiento del dispositivo.');
    }
  }

  if (!routine) return null;

  const excludedIds = routineExercises?.map(re => re.exerciseId) ?? [];

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex items-center gap-3 px-4 py-4 bg-slate-900 border-b border-slate-800">
        <button onClick={() => navigate('/')} className="text-slate-400 p-1.5 rounded-xl active:bg-slate-800">
          <ArrowLeft size={20} />
        </button>
        {editingName ? (
          <input
            autoFocus
            defaultValue={routine.name}
            onBlur={(e) => handleRenameRoutine(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRenameRoutine((e.target as HTMLInputElement).value)}
            className="flex-1 text-lg font-semibold text-white bg-transparent focus:outline-none border-b-2 border-primary-500 pb-0.5"
          />
        ) : (
          <h1 className="flex-1 text-lg font-semibold text-white cursor-pointer" onClick={() => setEditingName(true)}>
            {routine.name}
          </h1>
        )}
        {!editingName && (
          <button onClick={() => setEditingName(true)} className="text-slate-500 p-1.5 rounded-xl active:bg-slate-800">
            <Pencil size={14} />
          </button>
        )}
      </div>

      <div className="flex-1 px-4 py-4 flex flex-col gap-4">
        {(!routineExercises || routineExercises.length === 0) && (
          <div className="text-center py-12">
            <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-700">
              <Dumbbell size={28} className="text-primary-400" strokeWidth={1.5} />
            </div>
            <p className="font-semibold text-slate-300">Sin ejercicios todavía</p>
            <p className="text-sm text-slate-500 mt-1">Tocá el botón para agregar</p>
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={(routineExercises ?? []).map(re => re.id!)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-4">
              {(routineExercises ?? []).map(re => {
                const sets = (allSets ?? [])
                  .filter(s => s.routineExerciseId === re.id)
                  .sort((a, b) => a.setNumber - b.setNumber);
                return (
                  <SortableExerciseCard
                    key={re.id}
                    re={re}
                    exercise={exercises?.[re.exerciseId]}
                    sets={sets}
                    onAddSet={handleAddSet}
                    onUpdateSet={handleUpdateSet}
                    onDeleteSet={handleDeleteSet}
                    onRemove={handleRemoveExercise}
                    onUpdateRest={handleUpdateRest}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

        <button
          onClick={() => setShowPicker(true)}
          className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-700 text-slate-500 active:border-primary-500/50 active:text-primary-400 flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          <span className="font-medium">Agregar ejercicio</span>
        </button>
      </div>

      {showPicker && (
        <ExercisePicker excludeIds={excludedIds} onConfirm={handleAddExercises} onClose={() => setShowPicker(false)} />
      )}
    </div>
  );
}
