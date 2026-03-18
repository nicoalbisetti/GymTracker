# feat: GymTracker — Core Workout Flow

## Contexto

Este PR cubre la construcción completa del MVP de GymTracker: desde la migración de plataforma hasta el flujo funcional de entrenamiento.

---

## Cambios incluidos

### 1. Migración de plataforma — Expo → Vite + React (web)

El proyecto arrancó como una app Expo/React Native. Se decidió pivotar a una **web app** para simplificar el ciclo de desarrollo y evitar la fricción del toolchain nativo.

| Antes | Ahora |
|---|---|
| Expo SDK 55 + React Native | Vite + React 19 |
| React Navigation v7 | React Router DOM v7 |
| expo-sqlite | Dexie (IndexedDB) |
| `npm run ios/android` | `npm run dev` |

**Archivos eliminados:** `App.tsx` raíz, `app.json`, `assets/`, `index.ts`, `src/navigation/`, `src/screens/`, `.eslintrc.js`, `.prettierrc`

---

### 2. Base de datos — Dexie (IndexedDB)

`src/db/database.ts` — esquema versionado con migraciones:

| Tabla | Descripción |
|---|---|
| `exercises` | Catálogo de ejercicios con grupo muscular |
| `routines` | Rutinas creadas por el usuario |
| `routineExercises` | Ejercicios asignados a una rutina (sets, reps, peso, descanso) |
| `sets` | Configuración de series por ejercicio de rutina |
| `workoutSessions` | Instancias de rutinas ejecutadas |
| `workoutSetRecords` | Registro real de cada serie completada |

Incluye migraciones automáticas (v1 → v3) para campos añadidos (ej. `restSeconds`).

`src/db/seed.ts` — seed con ejercicios por grupo muscular y rutinas de ejemplo.

---

### 3. Páginas nuevas

#### `ActiveWorkoutPage` — Sesión de entrenamiento en vivo
- Muestra los ejercicios de la rutina con sus series configuradas
- Permite editar reps y peso en tiempo real antes de marcar cada serie
- Registro de cada serie completada en `workoutSetRecords`
- **Contador de descanso** regresivo con beep de audio al llegar a cero
- Botón "Finalizar" que guarda `finishedAt` en la sesión y navega al historial

#### `RoutineDetailPage` — Constructor de rutinas
- Nombre de rutina editable inline
- Lista de ejercicios con sets, reps, peso y tiempo de descanso configurables
- **Drag & drop** para reordenar ejercicios (dnd-kit, compatible con touch y mouse)
- Botón para agregar ejercicios vía `ExercisePicker`
- Botón para eliminar ejercicios de la rutina

#### `SessionDetailPage` — Detalle de sesión completada
- Muestra todas las series registradas agrupadas por ejercicio
- Duración total de la sesión
- Vista de solo lectura (historial)

---

### 4. Componentes nuevos

#### `ExercisePicker`
- Modal de búsqueda de ejercicios por nombre
- Agrupados por grupo muscular, colapsables
- Selección múltiple con confirmación
- Excluye ejercicios ya presentes en la rutina

#### `audio.ts`
- Beep sintético vía Web Audio API al finalizar el contador de descanso
- No requiere archivos de audio externos

---

### 5. Páginas actualizadas

- **`HomePage`** — Lista de rutinas del usuario. Botón para crear nueva rutina (navega directo al editor). Botón "Iniciar" por rutina que crea una `workoutSession` y navega al entrenamiento en vivo.
- **`HistoryPage`** — Lista de sesiones completadas ordenadas por fecha. Muestra duración, nombre de rutina y fecha. Navega al detalle de cada sesión.
- **`ExercisesPage`** — Catálogo de ejercicios agrupado por músculo. Permite agregar y eliminar ejercicios del catálogo.

---

## Flujo completo

```
Home → [+] Crear rutina
           ↓
       RoutineDetail → agregar ejercicios (ExercisePicker)
                     → configurar sets/reps/peso/descanso
                     → reordenar con drag & drop
           ↓
Home → [▶] Iniciar rutina
           ↓
       ActiveWorkout → completar series
                     → descanso con countdown + beep
                     → finalizar sesión
           ↓
History → SessionDetail (resumen de lo realizado)
```

---

## Stack final

```
Vite + React 19 + TypeScript
React Router DOM v7
Dexie 4 + dexie-react-hooks (useLiveQuery)
dnd-kit (drag & drop)
Tailwind CSS
Web Audio API
```

---

## Test plan

- [ ] Crear una rutina nueva desde Home
- [ ] Agregar ejercicios de distintos grupos musculares
- [ ] Reordenar ejercicios con drag & drop (desktop y touch)
- [ ] Iniciar sesión desde Home → navega a ActiveWorkoutPage
- [ ] Completar una serie → aparece tachada, contador de descanso arranca
- [ ] Esperar countdown → suena beep al llegar a 0
- [ ] Finalizar sesión → aparece en Historial
- [ ] Ver detalle de sesión → sets agrupados por ejercicio
- [ ] Verificar duración calculada correctamente en Historial
