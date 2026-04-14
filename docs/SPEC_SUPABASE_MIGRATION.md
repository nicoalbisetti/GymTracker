# Spec: Iteración 4 — Migración de Dexie a Supabase

## Objetivo

Reemplazar Dexie/IndexedDB como fuente de datos por Supabase (PostgreSQL).
Los datos de cada usuario quedan aislados en la nube. Los ejercicios son globales.
La capa de servicios (`src/services/`) absorbe todo el cambio — las páginas no se tocan.

---

## Decisiones de diseño

- `exercises` → tabla global, sin `user_id`. Solo lectura desde la app.
  Se gestiona directamente desde el dashboard de Supabase.
- `routines`, `routine_exercises`, `sets`, `workout_sessions`, `workout_set_records`
  → tienen `user_id uuid` referenciando `auth.users`. RLS activo.
- Los IDs dejan de ser autoincrement integers y pasan a ser `uuid` generados por Supabase.
  Esto requiere actualizar los tipos TypeScript.
- `useLiveQuery` de Dexie se elimina. El estado reactivo pasa a ser `useState` +
  carga inicial en `useEffect`, con refetch manual después de mutaciones.
- `dexie` y `dexie-react-hooks` se pueden desinstalar al final si no quedan referencias.

---

## Parte 0 — Setup en Supabase (manual, no lo hace Claude Code)

Antes de ejecutar este spec, crear las tablas en Supabase con el SQL Editor:

```sql
-- Ejercicios (global, sin user_id)
create table exercises (
  id   serial primary key,
  name text not null,
  muscle_group text not null
);

-- Seed de ejercicios: correr supabase/seed_exercises.sql por separado

-- Rutinas
create table routines (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  name       text not null,
  created_at timestamptz not null default now()
);
alter table routines enable row level security;
create policy "users manage own routines"
  on routines for all using (auth.uid() = user_id);

-- Routine exercises
create table routine_exercises (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users not null,
  routine_id   uuid references routines on delete cascade not null,
  exercise_id  integer references exercises not null,
  order_index  integer not null default 0,
  rest_seconds integer not null default 60
);
alter table routine_exercises enable row level security;
create policy "users manage own routine_exercises"
  on routine_exercises for all using (auth.uid() = user_id);

-- Sets (template de la rutina)
create table sets (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users not null,
  routine_exercise_id uuid references routine_exercises on delete cascade not null,
  set_number          integer not null,
  reps                integer not null default 10,
  weight              numeric not null default 0
);
alter table sets enable row level security;
create policy "users manage own sets"
  on sets for all using (auth.uid() = user_id);

-- Workout sessions
create table workout_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users not null,
  routine_id   uuid references routines not null,
  routine_name text not null,
  started_at   timestamptz not null,
  finished_at  timestamptz
);
alter table workout_sessions enable row level security;
create policy "users manage own workout_sessions"
  on workout_sessions for all using (auth.uid() = user_id);

-- Workout set records
create table workout_set_records (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null,
  session_id    uuid references workout_sessions on delete cascade not null,
  exercise_id   integer references exercises not null,
  exercise_name text not null,
  muscle_group  text not null,
  set_number    integer not null,
  reps          integer not null,
  weight        numeric not null,
  completed_at  timestamptz not null
);
alter table workout_sets_records enable row level security;
create policy "users manage own workout_set_records"
  on workout_set_records for all using (auth.uid() = user_id);
```

Crear también `supabase/seed_exercises.sql` con los 78 ejercicios del seed actual.
Claude Code debe generarlo leyendo `src/db/seed.ts` y convirtiendo cada objeto a un
INSERT SQL. Formato:
```sql
insert into exercises (id, name, muscle_group) values
(1, 'Barbell Bench Press', 'Pecho'),
(2, 'Incline Bench Press', 'Pecho'),
...
;
-- Resetear la secuencia para que los nuevos ejercicios no colisionen con los seed
select setval('exercises_id_seq', (select max(id) from exercises));
```

---

## Parte 1 — Actualizar tipos TypeScript

### Archivo: `src/types/index.ts`

Los IDs de las tablas de usuario pasan de `number` a `string` (uuid).
`exercises` mantiene `id?: number` porque sigue siendo serial integer en Supabase.

```ts
export interface Exercise {
  id?: number;          // serial integer — sin cambios
  name: string;
  muscleGroup: string;  // camelCase en la app, snake_case en Supabase
}

export interface Routine {
  id?: string;          // uuid
  name: string;
  createdAt: string;
}

export interface RoutineExercise {
  id?: string;          // uuid
  routineId: string;    // uuid
  exerciseId: number;   // integer (FK a exercises)
  orderIndex: number;
  restSeconds: number;
}

export interface ExerciseSet {
  id?: string;          // uuid
  routineExerciseId: string;  // uuid
  setNumber: number;
  reps: number;
  weight: number;
}

export interface WorkoutSession {
  id?: string;          // uuid
  routineId: string;    // uuid
  routineName: string;
  startedAt: string;
  finishedAt?: string;
}

export interface WorkoutSetRecord {
  id?: string;          // uuid
  sessionId: string;    // uuid
  exerciseId: number;   // integer
  exerciseName: string;
  muscleGroup: string;
  setNumber: number;
  reps: number;
  weight: number;
  completedAt: string;
}
```

---

## Parte 2 — Helper de mapeo Supabase ↔ app

Supabase usa snake_case. La app usa camelCase. Crear un archivo de helpers
que convierta entre los dos formatos.

### Archivo: `src/lib/mappers.ts`

```ts
import type {
  Exercise, Routine, RoutineExercise, ExerciseSet,
  WorkoutSession, WorkoutSetRecord
} from '@/types';

export function mapExercise(row: any): Exercise {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscle_group,
  };
}

export function mapRoutine(row: any): Routine {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  };
}

export function mapRoutineExercise(row: any): RoutineExercise {
  return {
    id: row.id,
    routineId: row.routine_id,
    exerciseId: row.exercise_id,
    orderIndex: row.order_index,
    restSeconds: row.rest_seconds,
  };
}

export function mapSet(row: any): ExerciseSet {
  return {
    id: row.id,
    routineExerciseId: row.routine_exercise_id,
    setNumber: row.set_number,
    reps: row.reps,
    weight: Number(row.weight),
  };
}

export function mapWorkoutSession(row: any): WorkoutSession {
  return {
    id: row.id,
    routineId: row.routine_id,
    routineName: row.routine_name,
    startedAt: row.started_at,
    finishedAt: row.finished_at ?? undefined,
  };
}

export function mapWorkoutSetRecord(row: any): WorkoutSetRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    exerciseId: row.exercise_id,
    exerciseName: row.exercise_name,
    muscleGroup: row.muscle_group,
    setNumber: row.set_number,
    reps: row.reps,
    weight: Number(row.weight),
    completedAt: row.completed_at,
  };
}
```

---

## Parte 3 — Reescribir los servicios

Cada servicio importa `supabase` de `@/lib/supabase` y `useAuth` para obtener
el `user.id`. Como los servicios son funciones async (no hooks), reciben `userId`
como parámetro donde sea necesario.

### `src/services/exerciseService.ts`

```ts
import { supabase } from '@/lib/supabase';
import type { Exercise } from '@/types';
import { mapExercise } from '@/lib/mappers';

export async function getAllExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('name');
  if (error) throw error;
  return (data ?? []).map(mapExercise);
}

export async function getExercisesByIds(ids: number[]): Promise<Exercise[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .in('id', ids);
  if (error) throw error;
  return (data ?? []).map(mapExercise);
}

export async function getExercisesMap(ids: number[]): Promise<Record<number, Exercise>> {
  const exercises = await getExercisesByIds(ids);
  return Object.fromEntries(exercises.map(e => [e.id!, e]));
}
```

Eliminar `addExercise` y `deleteExercise` — ya no existen.

---

### `src/services/routineService.ts`

Todas las mutaciones reciben `userId: string` como primer parámetro.

```ts
import { supabase } from '@/lib/supabase';
import type { Routine, RoutineExercise, ExerciseSet, Exercise } from '@/types';
import { mapRoutine, mapRoutineExercise, mapSet } from '@/lib/mappers';

// ─── Rutinas ──────────────────────────────────────────────────────────────────

export async function getRoutines(userId: string): Promise<Routine[]> {
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRoutine);
}

export async function getRoutineById(id: string): Promise<Routine | undefined> {
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return undefined;
  return mapRoutine(data);
}

export async function createRoutine(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('routines')
    .insert({ user_id: userId, name: 'Nueva rutina' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function renameRoutine(id: string, name: string): Promise<void> {
  if (!name.trim()) return;
  const { error } = await supabase
    .from('routines')
    .update({ name: name.trim() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteRoutine(routine: Routine): Promise<void> {
  // CASCADE en la DB elimina routine_exercises y sets automáticamente
  const { error } = await supabase
    .from('routines')
    .delete()
    .eq('id', routine.id!);
  if (error) throw error;
}

export async function duplicateRoutine(routine: Routine, userId: string): Promise<void> {
  // 1. Crear nueva rutina
  const { data: newRoutine, error: e1 } = await supabase
    .from('routines')
    .insert({ user_id: userId, name: `Copia de ${routine.name}` })
    .select('id')
    .single();
  if (e1) throw e1;

  // 2. Obtener routine_exercises originales
  const { data: reList, error: e2 } = await supabase
    .from('routine_exercises')
    .select('*')
    .eq('routine_id', routine.id!);
  if (e2) throw e2;

  for (const re of reList ?? []) {
    // 3. Insertar routine_exercise en nueva rutina
    const { data: newRe, error: e3 } = await supabase
      .from('routine_exercises')
      .insert({
        user_id: userId,
        routine_id: newRoutine.id,
        exercise_id: re.exercise_id,
        order_index: re.order_index,
        rest_seconds: re.rest_seconds,
      })
      .select('id')
      .single();
    if (e3) throw e3;

    // 4. Obtener sets originales y copiarlos
    const { data: setList, error: e4 } = await supabase
      .from('sets')
      .select('*')
      .eq('routine_exercise_id', re.id);
    if (e4) throw e4;

    if (setList?.length) {
      const { error: e5 } = await supabase.from('sets').insert(
        setList.map(s => ({
          user_id: userId,
          routine_exercise_id: newRe.id,
          set_number: s.set_number,
          reps: s.reps,
          weight: s.weight,
        }))
      );
      if (e5) throw e5;
    }
  }
}

// ─── RoutineExercises ─────────────────────────────────────────────────────────

export async function getRoutineExercises(routineId: string): Promise<RoutineExercise[]> {
  const { data, error } = await supabase
    .from('routine_exercises')
    .select('*')
    .eq('routine_id', routineId)
    .order('order_index');
  if (error) throw error;
  return (data ?? []).map(mapRoutineExercise);
}

export async function addExercisesToRoutine(
  routineId: string,
  exercises: Exercise[],
  baseOrder: number,
  userId: string
): Promise<void> {
  for (let i = 0; i < exercises.length; i++) {
    const { data: re, error: e1 } = await supabase
      .from('routine_exercises')
      .insert({
        user_id: userId,
        routine_id: routineId,
        exercise_id: exercises[i].id!,
        order_index: baseOrder + i,
        rest_seconds: 60,
      })
      .select('id')
      .single();
    if (e1) throw e1;

    const { error: e2 } = await supabase
      .from('sets')
      .insert({
        user_id: userId,
        routine_exercise_id: re.id,
        set_number: 1,
        reps: 10,
        weight: 0,
      });
    if (e2) throw e2;
  }
}

export async function removeExerciseFromRoutine(routineExerciseId: string): Promise<void> {
  // CASCADE elimina sets automáticamente
  const { error } = await supabase
    .from('routine_exercises')
    .delete()
    .eq('id', routineExerciseId);
  if (error) throw error;
}

export async function reorderRoutineExercises(reordered: RoutineExercise[]): Promise<void> {
  await Promise.all(
    reordered.map((re, i) =>
      supabase
        .from('routine_exercises')
        .update({ order_index: i })
        .eq('id', re.id!)
    )
  );
}

export async function updateRestSeconds(
  routineExerciseId: string,
  restSeconds: number
): Promise<void> {
  const { error } = await supabase
    .from('routine_exercises')
    .update({ rest_seconds: restSeconds })
    .eq('id', routineExerciseId);
  if (error) throw error;
}

// ─── Sets ─────────────────────────────────────────────────────────────────────

export async function getSetsForRoutineExercises(
  routineExerciseIds: string[]
): Promise<ExerciseSet[]> {
  if (routineExerciseIds.length === 0) return [];
  const { data, error } = await supabase
    .from('sets')
    .select('*')
    .in('routine_exercise_id', routineExerciseIds);
  if (error) throw error;
  return (data ?? []).map(mapSet);
}

export async function addSet(
  routineExerciseId: string,
  setNumber: number,
  reps: number,
  weight: number,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('sets')
    .insert({ user_id: userId, routine_exercise_id: routineExerciseId, set_number: setNumber, reps, weight });
  if (error) throw error;
}

export async function updateSet(
  setId: string,
  field: 'reps' | 'weight',
  value: number
): Promise<void> {
  const { error } = await supabase
    .from('sets')
    .update({ [field]: value })
    .eq('id', setId);
  if (error) throw error;
}

export async function deleteSet(
  setId: string,
  routineExerciseId: string,
  allSets: ExerciseSet[]
): Promise<void> {
  const { error } = await supabase.from('sets').delete().eq('id', setId);
  if (error) throw error;
  const remaining = allSets
    .filter(s => s.routineExerciseId === routineExerciseId && s.id !== setId)
    .sort((a, b) => a.setNumber - b.setNumber);
  await Promise.all(
    remaining.map((s, i) =>
      supabase.from('sets').update({ set_number: i + 1 }).eq('id', s.id!)
    )
  );
}
```

---

### `src/services/workoutService.ts`

```ts
import { supabase } from '@/lib/supabase';
import type { WorkoutSession, ExerciseSet, Exercise, RoutineExercise } from '@/types';
import { mapWorkoutSession } from '@/lib/mappers';

export async function getWorkoutSession(id: string): Promise<WorkoutSession | undefined> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return undefined;
  return mapWorkoutSession(data);
}

export async function createWorkoutSession(
  routineId: string,
  routineName: string,
  userId: string
): Promise<string> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({
      user_id: userId,
      routine_id: routineId,
      routine_name: routineName,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function finishWorkoutSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('workout_sessions')
    .update({ finished_at: new Date().toISOString() })
    .eq('id', sessionId);
  if (error) throw error;
}

export async function recordCompletedSet(
  sessionId: string,
  set: ExerciseSet,
  exercise: Exercise,
  reps: number,
  weight: number,
  userId: string
): Promise<void> {
  const { error: e1 } = await supabase
    .from('sets')
    .update({ reps, weight })
    .eq('id', set.id!);
  if (e1) throw e1;

  const { error: e2 } = await supabase
    .from('workout_set_records')
    .insert({
      user_id: userId,
      session_id: sessionId,
      exercise_id: exercise.id!,
      exercise_name: exercise.name,
      muscle_group: exercise.muscleGroup,
      set_number: set.setNumber,
      reps,
      weight,
      completed_at: new Date().toISOString(),
    });
  if (e2) throw e2;
}

export async function addSetDuringWorkout(
  re: RoutineExercise,
  existingSets: ExerciseSet[],
  reps: number,
  weight: number,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('sets')
    .insert({
      user_id: userId,
      routine_exercise_id: re.id!,
      set_number: existingSets.length + 1,
      reps,
      weight,
    });
  if (error) throw error;
}
```

---

### `src/services/historyService.ts`

```ts
import { supabase } from '@/lib/supabase';
import type { WorkoutSession, WorkoutSetRecord } from '@/types';
import { mapWorkoutSession, mapWorkoutSetRecord } from '@/lib/mappers';

export async function getAllSessions(userId: string): Promise<WorkoutSession[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapWorkoutSession);
}

export async function getSessionById(id: string): Promise<WorkoutSession | undefined> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return undefined;
  return mapWorkoutSession(data);
}

export async function getSessionRecords(sessionId: string): Promise<WorkoutSetRecord[]> {
  const { data, error } = await supabase
    .from('workout_set_records')
    .select('*')
    .eq('session_id', sessionId)
    .order('completed_at');
  if (error) throw error;
  return (data ?? []).map(mapWorkoutSetRecord);
}

export async function deleteSession(sessionId: string): Promise<void> {
  // CASCADE elimina workout_set_records automáticamente
  const { error } = await supabase
    .from('workout_sessions')
    .delete()
    .eq('id', sessionId);
  if (error) throw error;
}
```

---

### `src/services/progressService.ts`

```ts
import { supabase } from '@/lib/supabase';
import type { WorkoutSetRecord } from '@/types';
import { mapWorkoutSetRecord } from '@/lib/mappers';

export async function getAllSetRecords(userId: string): Promise<WorkoutSetRecord[]> {
  const { data, error } = await supabase
    .from('workout_set_records')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map(mapWorkoutSetRecord);
}
```

---

## Parte 4 — Actualizar las páginas

Las páginas ya no usan `useLiveQuery`. Pasan a `useState` + carga en `useEffect`.
El patrón estándar para todas:

```ts
const { user } = useAuth();
const [data, setData] = useState<T[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  if (!user) return;
  servicio(user.id).then(setData).finally(() => setLoading(false));
}, [user]);
```

Después de cada mutación, llamar al fetch de nuevo para refrescar.

### Páginas a actualizar y qué cambia en cada una

**`HomePage.tsx`**
- Reemplazar `useLiveQuery(() => getRoutines())` por `useState` + `useEffect`
- `handleCreateRoutine` → pasar `user.id` a `createRoutine(user.id)`
- `startWorkout` → pasar `user.id` a `createWorkoutSession(routineId, name, user.id)`
- `handleDuplicateRoutine` → pasar `user.id` a `duplicateRoutine(routine, user.id)`
- Después de create/delete/duplicate: llamar `getRoutines(user.id).then(setRoutines)`

**`RoutineDetailPage.tsx`**
- Reemplazar los tres `useLiveQuery` (routine, routineExercises, allSets, exercises)
  por `useState` + `useEffect` encadenados
- Todas las funciones que mutaban: agregar `user.id` como parámetro
- Después de cada mutación: refetch del dato correspondiente

**`ActiveWorkoutPage.tsx`**
- El session ID viene de la URL (string uuid ahora)
- Mismo patrón de carga
- `recordCompletedSet` y `addSetDuringWorkout` reciben `user.id`

**`ExercisesPage.tsx`**
- Eliminar completamente el formulario de add/delete ejercicios
- Eliminar imports de `addExercise`, `deleteExercise`
- Mantener solo la lista de ejercicios con búsqueda
- `useLiveQuery` → `useState` + `useEffect`

**`HistoryPage.tsx`**
- `useLiveQuery` → `useState` + `useEffect`
- `deleteSession` no necesita `user.id` (RLS lo maneja)

**`SessionDetailPage.tsx`**
- El `sessionId` de la URL es ahora un string uuid
- Mismo patrón de carga

**`ProgressPage.tsx`**
- `getAllSetRecords(user.id)` en vez de `getAllSetRecords()`

---

## Parte 5 — Limpiar archivos de desarrollo

Eliminar o vaciar los archivos de seed de datos que solo sirven para desarrollo
local y que acceden a `db` directamente:

- `src/db/seedRoutineWithData.ts` — eliminar
- `src/db/seedFullRoutine.ts` — eliminar
- `src/db/importFromExcel.ts` — evaluar si sigue siendo útil; si accede a `db`
  directamente, marcarlo con `// TODO: migrar a Supabase` y dejarlo sin exportar

En `src/App.tsx`:
- Eliminar `(window as any).db = db`
- Eliminar `import { db } from '@/db/database'`
- Eliminar el `useEffect` con los console.log de seed que quedaron vacíos

---

## Parte 6 — Desinstalar Dexie (opcional pero recomendado)

Solo ejecutar esto si ningún archivo en `src/` importa de `@/db/database` ni de
`dexie` después de todos los cambios anteriores.

```bash
# Verificar primero
grep -r "dexie\|@/db/database" src/ --include="*.ts" --include="*.tsx"

# Si el resultado solo muestra src/db/ y src/components/ExportImportDB.tsx, continuar
# ExportImportDB es la excepción permitida (backup/restore local)
```

`ExportImportDB.tsx` puede mantener Dexie para el backup local — es una feature
independiente que no necesita Supabase. Documentarlo con un comentario.

---

## Parte 7 — Verificación final

```bash
npx tsc --noEmit
npm run build
```

### Checklist funcional a verificar manualmente después del build:

- [ ] Login con Google redirige correctamente
- [ ] Home muestra rutinas del usuario logueado (no las de otro usuario)
- [ ] Crear rutina → aparece en la lista
- [ ] Abrir rutina → muestra ejercicios y sets
- [ ] Drag & drop de ejercicios → orden persiste al recargar
- [ ] Iniciar entrenamiento → navega a ActiveWorkout
- [ ] Completar un set → se guarda en workout_set_records
- [ ] Finalizar sesión → aparece en Historial
- [ ] Historial → calendario muestra días entrenados
- [ ] Progresión → gráficos muestran datos reales
- [ ] ExercisesPage → lista sin formulario de agregar/eliminar
- [ ] Settings → export/import sigue funcionando (Dexie local)

---

## Notas para Claude Code

- El `sessionId` en `useParams` pasa de ser un número (`Number(sessionId)`) a
  un string uuid. Eliminar todos los `Number(sessionId)` y `Number(id)` en las
  páginas que usen IDs de tablas con uuid.

- `useLiveQuery` se elimina de todas las páginas excepto `ExportImportDB.tsx`.
  Eliminar los imports de `dexie-react-hooks` en cada página migrada.

- RLS en Supabase garantiza que las queries solo devuelvan datos del usuario
  autenticado. No es necesario filtrar por `user_id` en el cliente para lectura,
  pero sí para inserts (Supabase no lo infiere automáticamente).

- El `workout_set_records` tiene un typo en el SQL de la tabla (`workout_sets_records`).
  Corregirlo en el SQL antes de ejecutar: la tabla se llama `workout_set_records`
  (sin la `s` extra en `sets`).
