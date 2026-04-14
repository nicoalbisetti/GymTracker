# Spec: Iteración 3 — Capa de servicios

## Objetivo

Crear `src/services/` con funciones tipadas que encapsulen todas las operaciones
sobre Dexie. Las páginas dejan de importar `db` directamente y usan estos servicios.

La implementación interna sigue usando Dexie — el comportamiento visible no cambia.
El beneficio es que en la Iteración 4 solo se reemplaza el interior de los servicios
(Dexie → Supabase) sin tocar ninguna página.

**Regla principal:** fidelidad al comportamiento actual por encima de todo.
Si algo funciona hoy, tiene que seguir funcionando exactamente igual después.

---

## Contexto del proyecto

- `exercises` — tabla global sin `user_id`. Se gestiona desde Supabase en producción.
  Los usuarios NO pueden agregar/editar ejercicios (feature futuro).
- `routines`, `routineExercises`, `sets`, `workoutSessions`, `workoutSetRecords` —
  datos del usuario. En Iteración 4 se agrega `user_id` y se migra a Supabase.
- `src/context/AuthContext.tsx` existe y exporta `useAuth()` con `{ user }`.
- `(window as any).db = db` está en `App.tsx` — no tocarlo, es para debugging.

---

## Estructura de archivos a crear

```
src/services/
  routineService.ts       — CRUD de rutinas, routineExercises y sets
  exerciseService.ts      — lectura del catálogo de ejercicios (solo lectura)
  workoutService.ts       — sesiones activas y workoutSetRecords
  historyService.ts       — lectura de historial de sesiones completadas
  progressService.ts      — lectura de workoutSetRecords para gráficos
```

## Archivos a modificar

```
src/pages/HomePage.tsx
src/pages/RoutineDetailPage.tsx
src/pages/ActiveWorkoutPage.tsx
src/pages/ExercisesPage.tsx
src/pages/HistoryPage.tsx
src/pages/SessionDetailPage.tsx
src/pages/ProgressPage.tsx
src/components/ExercisePicker.tsx
src/components/ExportImportDB.tsx   — solo si importa db directamente
```

## Archivos que NO se tocan bajo ninguna circunstancia

```
src/db/database.ts
src/db/seed.ts
src/types/index.ts
src/context/AuthContext.tsx
src/lib/supabase.ts
src/App.tsx               — excepto si hay imports de db que no sean (window as any).db
```

---

## Tarea 1 — `src/services/exerciseService.ts`

Operaciones de lectura del catálogo. Solo lectura — no hay create/update/delete
para usuarios en esta iteración.

```ts
import { db } from '@/db/database';
import type { Exercise } from '@/types';

/** Todos los ejercicios ordenados por nombre */
export async function getAllExercises(): Promise<Exercise[]> {
  return db.exercises.orderBy('name').toArray();
}

/** Ejercicios filtrados por IDs */
export async function getExercisesByIds(ids: number[]): Promise<Exercise[]> {
  if (ids.length === 0) return [];
  return db.exercises.where('id').anyOf(ids).toArray();
}

/** Ejercicios como mapa id→Exercise (para lookup rápido en páginas) */
export async function getExercisesMap(ids: number[]): Promise<Record<number, Exercise>> {
  const exercises = await getExercisesByIds(ids);
  return Object.fromEntries(exercises.map(e => [e.id!, e]));
}
```

---

## Tarea 2 — `src/services/routineService.ts`

Todo el CRUD de rutinas. Mapear exactamente las operaciones que hoy están en
`HomePage.tsx` y `RoutineDetailPage.tsx`.

```ts
import { db } from '@/db/database';
import type { Routine, RoutineExercise, ExerciseSet, Exercise } from '@/types';

// ─── Rutinas ──────────────────────────────────────────────────────────────────

export async function getRoutines(): Promise<Routine[]> {
  return db.routines.orderBy('createdAt').reverse().toArray();
}

export async function getRoutineById(id: number): Promise<Routine | undefined> {
  return db.routines.get(id);
}

export async function createRoutine(): Promise<number> {
  return db.routines.add({
    name: 'Nueva rutina',
    createdAt: new Date().toISOString(),
  }) as Promise<number>;
}

export async function renameRoutine(id: number, name: string): Promise<void> {
  if (name.trim()) await db.routines.update(id, { name: name.trim() });
}

export async function deleteRoutine(routine: Routine): Promise<void> {
  const routineExercises = await db.routineExercises
    .where('routineId').equals(routine.id!).toArray();
  for (const re of routineExercises) {
    await db.sets.where('routineExerciseId').equals(re.id!).delete();
  }
  await db.routineExercises.where('routineId').equals(routine.id!).delete();
  await db.routines.delete(routine.id!);
}

export async function duplicateRoutine(routine: Routine): Promise<void> {
  const newRoutineId = await db.routines.add({
    name: `Copia de ${routine.name}`,
    createdAt: new Date().toISOString(),
  }) as number;
  const routineExercises = await db.routineExercises
    .where('routineId').equals(routine.id!).toArray();
  for (const re of routineExercises) {
    const newReId = await db.routineExercises.add({
      routineId: newRoutineId,
      exerciseId: re.exerciseId,
      orderIndex: re.orderIndex,
      restSeconds: re.restSeconds,
    }) as number;
    const sets = await db.sets.where('routineExerciseId').equals(re.id!).toArray();
    for (const set of sets) {
      await db.sets.add({
        routineExerciseId: newReId,
        setNumber: set.setNumber,
        reps: set.reps,
        weight: set.weight,
      });
    }
  }
}

// ─── RoutineExercises ─────────────────────────────────────────────────────────

export async function getRoutineExercises(routineId: number): Promise<RoutineExercise[]> {
  return db.routineExercises.where('routineId').equals(routineId).sortBy('orderIndex');
}

export async function addExercisesToRoutine(
  routineId: number,
  exercises: Exercise[],
  baseOrder: number
): Promise<void> {
  for (let i = 0; i < exercises.length; i++) {
    const routineExerciseId = await db.routineExercises.add({
      routineId,
      exerciseId: exercises[i].id!,
      orderIndex: baseOrder + i,
      restSeconds: 60,
    }) as number;
    await db.sets.add({
      routineExerciseId,
      setNumber: 1,
      reps: 10,
      weight: 0,
    });
  }
}

export async function removeExerciseFromRoutine(routineExerciseId: number): Promise<void> {
  await db.sets.where('routineExerciseId').equals(routineExerciseId).delete();
  await db.routineExercises.delete(routineExerciseId);
}

export async function reorderRoutineExercises(
  reordered: RoutineExercise[]
): Promise<void> {
  await Promise.all(
    reordered.map((re, i) => db.routineExercises.update(re.id!, { orderIndex: i }))
  );
}

export async function updateRestSeconds(
  routineExerciseId: number,
  restSeconds: number
): Promise<void> {
  await db.routineExercises.update(routineExerciseId, { restSeconds });
}

// ─── Sets ─────────────────────────────────────────────────────────────────────

export async function getSetsForRoutineExercises(
  routineExerciseIds: number[]
): Promise<ExerciseSet[]> {
  if (routineExerciseIds.length === 0) return [];
  return db.sets.where('routineExerciseId').anyOf(routineExerciseIds).toArray();
}

export async function addSet(
  routineExerciseId: number,
  setNumber: number,
  reps: number,
  weight: number
): Promise<void> {
  await db.sets.add({ routineExerciseId, setNumber, reps, weight });
}

export async function updateSet(
  setId: number,
  field: 'reps' | 'weight',
  value: number
): Promise<void> {
  await db.sets.update(setId, { [field]: value });
}

export async function deleteSet(
  setId: number,
  routineExerciseId: number,
  allSets: ExerciseSet[]
): Promise<void> {
  await db.sets.delete(setId);
  // Renumerar series restantes
  const remaining = allSets
    .filter(s => s.routineExerciseId === routineExerciseId && s.id !== setId)
    .sort((a, b) => a.setNumber - b.setNumber);
  for (let i = 0; i < remaining.length; i++) {
    await db.sets.update(remaining[i].id!, { setNumber: i + 1 });
  }
}
```

---

## Tarea 3 — `src/services/workoutService.ts`

Operaciones de la sesión activa de entrenamiento.

```ts
import { db } from '@/db/database';
import type { WorkoutSession, WorkoutSetRecord, ExerciseSet, Exercise, RoutineExercise } from '@/types';

export async function getWorkoutSession(id: number): Promise<WorkoutSession | undefined> {
  return db.workoutSessions.get(id);
}

export async function createWorkoutSession(
  routineId: number,
  routineName: string
): Promise<number> {
  return db.workoutSessions.add({
    routineId,
    routineName,
    startedAt: new Date().toISOString(),
  }) as Promise<number>;
}

export async function finishWorkoutSession(sessionId: number): Promise<void> {
  await db.workoutSessions.update(sessionId, {
    finishedAt: new Date().toISOString(),
  });
}

export async function recordCompletedSet(
  sessionId: number,
  set: ExerciseSet,
  exercise: Exercise,
  reps: number,
  weight: number
): Promise<void> {
  await db.sets.update(set.id!, { reps, weight });
  await db.workoutSetRecords.add({
    sessionId,
    exerciseId: exercise.id!,
    exerciseName: exercise.name,
    muscleGroup: exercise.muscleGroup,
    setNumber: set.setNumber,
    reps,
    weight,
    completedAt: new Date().toISOString(),
  });
}

export async function addSetDuringWorkout(
  re: RoutineExercise,
  existingSets: ExerciseSet[],
  reps: number,
  weight: number
): Promise<void> {
  await db.sets.add({
    routineExerciseId: re.id!,
    setNumber: existingSets.length + 1,
    reps,
    weight,
  });
}
```

---

## Tarea 4 — `src/services/historyService.ts`

Lectura del historial de sesiones y detalle de sesión.

```ts
import { db } from '@/db/database';
import type { WorkoutSession, WorkoutSetRecord } from '@/types';

export async function getAllSessions(): Promise<WorkoutSession[]> {
  return db.workoutSessions.orderBy('startedAt').reverse().toArray();
}

export async function getSessionById(id: number): Promise<WorkoutSession | undefined> {
  return db.workoutSessions.get(id);
}

export async function getSessionRecords(sessionId: number): Promise<WorkoutSetRecord[]> {
  return db.workoutSetRecords
    .where('sessionId').equals(sessionId)
    .sortBy('completedAt');
}

export async function deleteSession(sessionId: number): Promise<void> {
  await db.workoutSetRecords.where('sessionId').equals(sessionId).delete();
  await db.workoutSessions.delete(sessionId);
}
```

---

## Tarea 5 — `src/services/progressService.ts`

Lectura de registros para los gráficos de progresión.

```ts
import { db } from '@/db/database';
import type { WorkoutSetRecord } from '@/types';

export async function getAllSetRecords(): Promise<WorkoutSetRecord[]> {
  return db.workoutSetRecords.toArray();
}
```

---

## Tarea 6 — Migrar `src/pages/HomePage.tsx`

Reemplazar todos los imports y llamadas directas a `db` por los servicios.
La UI no cambia en absoluto.

Imports a reemplazar:
```ts
// ANTES
import { db } from '@/db/database';

// DESPUÉS
import {
  getRoutines,
  createRoutine,
  deleteRoutine,
  duplicateRoutine,
} from '@/services/routineService';
import { createWorkoutSession } from '@/services/workoutService';
```

El `useLiveQuery` de rutinas pasa a usar la función del servicio:
```ts
// ANTES
const routines = useLiveQuery(() => db.routines.orderBy('createdAt').reverse().toArray());

// DESPUÉS
const routines = useLiveQuery(() => getRoutines());
```

Funciones a migrar — reemplazar el cuerpo por llamadas al servicio:

`createRoutine()`:
```ts
async function handleCreateRoutine() {
  const id = await createRoutine();
  navigate(`/routine/${id}`);
}
```

`deleteRoutine()`:
```ts
async function handleDeleteRoutine(routine: Routine, e: React.MouseEvent) {
  e.stopPropagation();
  if (!confirm(`¿Eliminar "${routine.name}"?`)) return;
  await deleteRoutine(routine);
}
```

`duplicateRoutine()`:
```ts
async function handleDuplicateRoutine(routine: Routine, e: React.MouseEvent) {
  e.stopPropagation();
  await duplicateRoutine(routine);
}
```

`startWorkout()`:
```ts
async function startWorkout(routine: Routine) {
  const sessionId = await createWorkoutSession(routine.id!, routine.name);
  navigate(`/workout/${sessionId}`);
}
```

Mantener los try/catch existentes en cada función si los hay.

---

## Tarea 7 — Migrar `src/pages/RoutineDetailPage.tsx`

Imports a reemplazar:
```ts
// ANTES
import { db } from '@/db/database';

// DESPUÉS
import {
  getRoutineById,
  getRoutineExercises,
  getSetsForRoutineExercises,
  getExercisesMapForRoutine,
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
```

Nota: `getExercisesMapForRoutine` no existe como función separada — usar
`getExercisesMap` de `exerciseService` pasando los IDs de `routineExercises`.

Cada `useLiveQuery` que llama a `db.*` directamente pasa a llamar al servicio
correspondiente. La firma de los `useLiveQuery` no cambia — solo el interior.

```ts
// ANTES
const routine = useLiveQuery(() => db.routines.get(routineId), [routineId]);

// DESPUÉS
const routine = useLiveQuery(() => getRoutineById(routineId), [routineId]);
```

```ts
// ANTES
const routineExercises = useLiveQuery(
  () => db.routineExercises.where('routineId').equals(routineId).sortBy('orderIndex'),
  [routineId]
);

// DESPUÉS
const routineExercises = useLiveQuery(
  () => getRoutineExercises(routineId),
  [routineId]
);
```

```ts
// ANTES
const allSets = useLiveQuery(
  async () => {
    if (!routineExercises?.length) return [];
    return db.sets.where('routineExerciseId').anyOf(routineExercises.map(re => re.id!)).toArray();
  },
  [routineExercises]
);

// DESPUÉS
const allSets = useLiveQuery(
  async () => {
    if (!routineExercises?.length) return [];
    return getSetsForRoutineExercises(routineExercises.map(re => re.id!));
  },
  [routineExercises]
);
```

```ts
// ANTES
const exercises = useLiveQuery(
  async () => {
    if (!routineExercises?.length) return {} as Record<number, Exercise>;
    const exs = await db.exercises.where('id').anyOf(...).toArray();
    return Object.fromEntries(exs.map(e => [e.id!, e]));
  },
  [routineExercises]
);

// DESPUÉS
const exercises = useLiveQuery(
  async () => {
    if (!routineExercises?.length) return {} as Record<number, Exercise>;
    return getExercisesMap(routineExercises.map(re => re.exerciseId));
  },
  [routineExercises]
);
```

Handlers:
```ts
// handleDragEnd — usar reorderRoutineExercises(reordered)
// handleAddExercises — usar addExercisesToRoutine(routineId, exercises, baseOrder)
// handleAddSet — usar addSet(routineExerciseId, setNumber, reps, weight)
// handleUpdateSet — usar updateSet(set.id!, field, parseFloat(value) || 0)
// handleDeleteSet — usar deleteSet(setId, routineExerciseId, allSets ?? [])
// handleRemoveExercise — usar removeExerciseFromRoutine(routineExerciseId)
// handleUpdateRest — usar updateRestSeconds(routineExerciseId, restSeconds)
// handleRenameRoutine — usar renameRoutine(routineId, newName)
```

---

## Tarea 8 — Migrar `src/pages/ActiveWorkoutPage.tsx`

Imports a reemplazar:
```ts
// ANTES
import { db } from '@/db/database';

// DESPUÉS
import { getWorkoutSession, finishWorkoutSession, recordCompletedSet, addSetDuringWorkout } from '@/services/workoutService';
import { getRoutineExercises, getSetsForRoutineExercises } from '@/services/routineService';
import { getExercisesMap } from '@/services/exerciseService';
```

`useLiveQuery` de session, routineExercises, allSets y exercises — mismo patrón
que en RoutineDetailPage, reemplazar el interior manteniendo la estructura.

```ts
const session = useLiveQuery(() => getWorkoutSession(sid), [sid]);

const routineExercises = useLiveQuery(
  async () => {
    if (!session) return [];
    return getRoutineExercises(session.routineId);
  },
  [session]
);
// allSets y exercises: mismo patrón que RoutineDetailPage
```

`handleCompleteSet`:
```ts
async function handleCompleteSet(re: RoutineExercise, set: ExerciseSet, exercise: Exercise) {
  if (completedKeys.has(set.id!)) return;
  const reps = getVal(set, 'reps');
  const weight = getVal(set, 'weight');
  try {
    await recordCompletedSet(sid, set, exercise, reps, weight);
    setCompletedKeys(prev => new Set([...prev, set.id!]));
    if (re.restSeconds > 0) startCountdown(re.restSeconds);
  } catch (err) {
    console.error(err);
    alert('Error al guardar. Verificá el almacenamiento del dispositivo.');
  }
}
```

`handleAddSet`:
```ts
async function handleAddSet(re: RoutineExercise) {
  const existing = (allSets ?? [])
    .filter(s => s.routineExerciseId === re.id)
    .sort((a, b) => a.setNumber - b.setNumber);
  const last = existing[existing.length - 1];
  try {
    await addSetDuringWorkout(
      re,
      existing,
      last ? getVal(last, 'reps') : 10,
      last ? getVal(last, 'weight') : 0
    );
  } catch (err) {
    console.error(err);
    alert('Error al guardar. Verificá el almacenamiento del dispositivo.');
  }
}
```

`handleFinish`:
```ts
async function handleFinish() {
  if (timerRef.current) clearInterval(timerRef.current);
  try {
    await finishWorkoutSession(sid);
    navigate('/history');
  } catch (err) {
    console.error(err);
    alert('Error al guardar. Verificá el almacenamiento del dispositivo.');
  }
}
```

---

## Tarea 9 — Migrar `src/pages/ExercisesPage.tsx`

```ts
// ANTES
import { db } from '@/db/database';
const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray());

// DESPUÉS
import { getAllExercises } from '@/services/exerciseService';
const exercises = useLiveQuery(() => getAllExercises());
```

La UI no cambia.

---

## Tarea 10 — Migrar `src/pages/HistoryPage.tsx`

```ts
// ANTES
import { db } from '@/db/database';

// DESPUÉS
import { getAllSessions, deleteSession } from '@/services/historyService';
```

```ts
const sessions = useLiveQuery(() => getAllSessions());
```

`deleteSession`:
```ts
async function handleDeleteSession(id: number, e: React.MouseEvent) {
  e.stopPropagation();
  if (!confirm('¿Eliminar esta sesión?')) return;
  await deleteSession(id);
}
```

---

## Tarea 11 — Migrar `src/pages/SessionDetailPage.tsx`

```ts
// ANTES
import { db } from '@/db/database';

// DESPUÉS
import { getSessionById, getSessionRecords } from '@/services/historyService';
```

```ts
const session = useLiveQuery(() => getSessionById(sid), [sid]);
const records = useLiveQuery(() => getSessionRecords(sid), [sid]);
```

---

## Tarea 12 — Migrar `src/pages/ProgressPage.tsx`

```ts
// ANTES
import { db } from '@/db/database';
const records = useLiveQuery(() => db.workoutSetRecords.toArray());

// DESPUÉS
import { getAllSetRecords } from '@/services/progressService';
const records = useLiveQuery(() => getAllSetRecords());
```

---

## Tarea 13 — Migrar `src/components/ExercisePicker.tsx`

```ts
// ANTES
import { db } from '@/db/database';
const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray());

// DESPUÉS
import { getAllExercises } from '@/services/exerciseService';
const exercises = useLiveQuery(() => getAllExercises());
```

---

## Tarea 14 — Migrar `src/components/ExportImportDB.tsx`

Este componente importa `db` directamente para el export/import de backup.
Es un caso especial — accede a todas las tablas en bulk para serializar/deserializar.

Mantener el import de `db` solo en este componente ya que la operación de
backup/restore es intrínsecamente acoplada al schema completo de Dexie y no
tiene sentido abstraerla en servicios individuales.

**No migrar este archivo** — es la única excepción permitida.
Agregar un comentario en la primera línea:
```ts
// Acceso directo a db permitido: operación de backup/restore requiere acceso
// completo al schema. No migrar a servicios individuales.
```

---

## Tarea 15 — Verificación final

```bash
npx tsc --noEmit
```

Debe pasar sin errores. Prestar atención a:
- Ninguna página (excepto `ExportImportDB.tsx`) debe importar `db` de `@/db/database`
- Los tipos de retorno de los servicios deben coincidir con lo que esperan los
  `useLiveQuery` existentes
- `(window as any).db = db` en `App.tsx` debe permanecer intacto

```bash
npm run build
```

Verificar que el build termina sin errores.

### Grep de verificación

Después del build, correr:
```bash
grep -r "from '@/db/database'" src/pages/ src/components/
```

El único resultado permitido es `ExportImportDB.tsx`. Si aparece cualquier otra
página o componente, hay una migración incompleta.
