# Spec: Fixes layout iOS — safe area y sets

## Problemas identificados

1. **RoutineDetailPage y ActiveWorkoutPage** son páginas "fullscreen" (sin BottomNav)
   pero no tienen padding top para la status bar de iOS. El header queda tapado.

2. **Botón eliminar serie (X) cortado** en RoutineDetailPage — la fila de sets
   tiene `w-8` fijo para el botón de borrar que no alcanza en pantallas pequeñas.
   El problema es que `px-4` del contenedor + `w-8` del número + `flex-1` x2 inputs
   + `w-8` del botón X llena el ancho justo, y en iOS el safe-area-inset-right
   lo empuja fuera.

3. **Números de serie muestran "1" en todos** — bug de datos del SQL de migración
   (los sets se insertaron sin `set_number` correcto). Este spec NO lo resuelve —
   es un problema de datos en Supabase que se corrige con SQL directo.

---

## Tarea 1 — `src/index.css`

Reemplazar el bloque `@layer utilities` completo:

```css
@layer utilities {
  .safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }
  .safe-area-top {
    padding-top: env(safe-area-inset-top);
  }
  .safe-area-left {
    padding-left: env(safe-area-inset-left);
  }
  .safe-area-right {
    padding-right: env(safe-area-inset-right);
  }
}
```

---

## Tarea 2 — `src/App.tsx`

Agregar `safe-area-top safe-area-left safe-area-right` al `<main>`:

```tsx
// ANTES
<main className={`flex-1 overflow-y-auto ${fullscreen ? '' : 'pb-16'}`}>

// DESPUÉS
<main className={`flex-1 overflow-y-auto safe-area-left safe-area-right ${fullscreen ? 'safe-area-top' : 'pb-16'}`}>
```

Nota: `safe-area-top` solo se aplica en modo fullscreen (rutina y workout) porque
en las páginas normales el BottomNav ya está posicionado abajo y el contenido
empieza desde arriba del viewport normalmente. En fullscreen no hay nav y el
header queda bajo la status bar.

---

## Tarea 3 — `src/components/BottomNav.tsx`

Agregar safe area laterales al nav:

```tsx
// ANTES
<nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 flex justify-around items-center h-16 z-40 max-w-lg mx-auto safe-area-bottom">

// DESPUÉS
<nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 flex justify-around items-center h-16 z-40 max-w-lg mx-auto safe-area-bottom safe-area-left safe-area-right">
```

---

## Tarea 4 — `src/pages/RoutineDetailPage.tsx` — layout de sets

El problema: en la fila de sets, el botón X (`w-8` = 32px) queda cortado porque
el contenedor tiene `px-4` en cada lado y en iOS el safe-area-inset-right agrega
más espacio. Solución: reducir padding del contenedor de sets y usar `shrink-0`
en los elementos fijos.

En `SortableExerciseCard`, en la sección de sets:

```tsx
{/* Header de columnas */}
{/* ANTES */}
<div className="flex items-center gap-2 px-1">
  <span className="w-8 text-xs text-slate-500 text-center">Serie</span>
  <span className="flex-1 text-xs text-slate-500 text-center">Kg</span>
  <span className="flex-1 text-xs text-slate-500 text-center">Reps</span>
  <span className="w-8" />
</div>

{/* DESPUÉS */}
<div className="flex items-center gap-1.5 px-1">
  <span className="w-7 shrink-0 text-xs text-slate-500 text-center">Serie</span>
  <span className="flex-1 text-xs text-slate-500 text-center">Kg</span>
  <span className="flex-1 text-xs text-slate-500 text-center">Reps</span>
  <span className="w-7 shrink-0" />
</div>
```

```tsx
{/* Fila de cada set */}
{/* ANTES */}
<div key={set.id} className="flex items-center gap-2">
  <span className="w-8 text-sm text-slate-500 text-center font-medium">{set.setNumber}</span>
  <input ... className="flex-1 bg-slate-700/60 border border-slate-600/50 rounded-xl px-3 py-2 text-sm text-center text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500" />
  <input ... className="flex-1 bg-slate-700/60 border border-slate-600/50 rounded-xl px-3 py-2 text-sm text-center text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500" />
  <button onClick={() => onDeleteSet(set.id!, re.id!)} className="w-8 text-slate-600 active:text-red-400 flex items-center justify-center">
    <X size={16} />
  </button>
</div>

{/* DESPUÉS */}
<div key={set.id} className="flex items-center gap-1.5">
  <span className="w-7 shrink-0 text-sm text-slate-500 text-center font-medium">{set.setNumber}</span>
  <input ... className="flex-1 min-w-0 bg-slate-700/60 border border-slate-600/50 rounded-xl px-2 py-2 text-sm text-center text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500" />
  <input ... className="flex-1 min-w-0 bg-slate-700/60 border border-slate-600/50 rounded-xl px-2 py-2 text-sm text-center text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500" />
  <button onClick={() => onDeleteSet(set.id!, re.id!)} className="w-7 shrink-0 text-slate-600 active:text-red-400 flex items-center justify-center">
    <X size={16} />
  </button>
</div>
```

Cambios clave:
- `gap-2` → `gap-1.5` (ahorra 2px por gap)
- `w-8` → `w-7` en número de serie y botón X (ahorra 4px total)
- `shrink-0` en número y botón para que no se compriman
- `min-w-0` en inputs para que el flex funcione correctamente
- `px-3` → `px-2` en inputs (ahorra 4px por input = 8px total)

También reducir el padding del contenedor de sets de `px-4` a `px-3`:

```tsx
{/* ANTES */}
<div className="px-4 pt-2.5 pb-3 flex flex-col gap-2">

{/* DESPUÉS */}
<div className="px-3 pt-2.5 pb-3 flex flex-col gap-2">
```

---

## Tarea 5 — `src/pages/ActiveWorkoutPage.tsx` — layout de sets

Mismo ajuste de layout para las filas de sets durante el entrenamiento activo.
El botón "Listo" (`w-16`) es más ancho que el X, pero igualmente puede quedar
cortado en iPhone.

```tsx
{/* ANTES */}
<div key={set.id} className={`flex items-center gap-2 transition-opacity ${done ? 'opacity-40' : ''}`}>
  <span className="w-7 text-sm text-slate-500 text-center font-medium">{set.setNumber}</span>
  <input ... className="flex-1 bg-slate-700/60 ..." />
  <input ... className="flex-1 bg-slate-700/60 ..." />
  <button ... className={`w-16 rounded-xl py-2 text-sm font-semibold ...`}>

{/* DESPUÉS */}
<div key={set.id} className={`flex items-center gap-1.5 transition-opacity ${done ? 'opacity-40' : ''}`}>
  <span className="w-7 shrink-0 text-sm text-slate-500 text-center font-medium">{set.setNumber}</span>
  <input ... className="flex-1 min-w-0 bg-slate-700/60 ..." />
  <input ... className="flex-1 min-w-0 bg-slate-700/60 ..." />
  <button ... className={`w-14 shrink-0 rounded-xl py-2 text-sm font-semibold ...`}>
```

Cambios:
- `gap-2` → `gap-1.5`
- `shrink-0` en número de serie y botón
- `min-w-0` en inputs
- `w-16` → `w-14` en botón "Listo" (ahorra 8px)

---

## Tarea 6 — Invertir orden Reps / Kg

En ambas páginas, el orden de los inputs pasa a ser **Reps primero, Kg segundo**.

### `src/pages/RoutineDetailPage.tsx` — `SortableExerciseCard`

Header de columnas:
```tsx
{/* ANTES */}
<span className="flex-1 text-xs text-slate-500 text-center">Kg</span>
<span className="flex-1 text-xs text-slate-500 text-center">Reps</span>

{/* DESPUÉS */}
<span className="flex-1 text-xs text-slate-500 text-center">Reps</span>
<span className="flex-1 text-xs text-slate-500 text-center">Kg</span>
```

Fila de cada set — invertir el orden de los dos inputs:
```tsx
{/* ANTES: primero weight, después reps */}
<input
  type="number"
  inputMode="decimal"
  defaultValue={set.weight || ''}
  placeholder="0"
  onBlur={(e) => onUpdateSet(set, 'weight', e.target.value)}
  className="flex-1 min-w-0 ..."
/>
<input
  type="number"
  inputMode="numeric"
  defaultValue={set.reps || ''}
  placeholder="0"
  onBlur={(e) => onUpdateSet(set, 'reps', e.target.value)}
  className="flex-1 min-w-0 ..."
/>

{/* DESPUÉS: primero reps, después weight */}
<input
  type="number"
  inputMode="numeric"
  defaultValue={set.reps || ''}
  placeholder="0"
  onBlur={(e) => onUpdateSet(set, 'reps', e.target.value)}
  className="flex-1 min-w-0 ..."
/>
<input
  type="number"
  inputMode="decimal"
  defaultValue={set.weight || ''}
  placeholder="0"
  onBlur={(e) => onUpdateSet(set, 'weight', e.target.value)}
  className="flex-1 min-w-0 ..."
/>
```

### `src/pages/ActiveWorkoutPage.tsx`

Header de columnas (buscar la fila con `#`, `Kg`, `Reps`):
```tsx
{/* ANTES */}
<span className="flex-1 text-xs text-slate-500 text-center">Kg</span>
<span className="flex-1 text-xs text-slate-500 text-center">Reps</span>

{/* DESPUÉS */}
<span className="flex-1 text-xs text-slate-500 text-center">Reps</span>
<span className="flex-1 text-xs text-slate-500 text-center">Kg</span>
```

Fila de cada set — invertir el orden de los dos inputs:
```tsx
{/* ANTES: primero weight, después reps */}
<input
  type="number"
  inputMode="decimal"
  value={getVal(set, 'weight') || ''}
  placeholder="0"
  disabled={done}
  onChange={e => updateEdit(set.id!, 'weight', e.target.value)}
  className="flex-1 min-w-0 ..."
/>
<input
  type="number"
  inputMode="numeric"
  value={getVal(set, 'reps') || ''}
  placeholder="0"
  disabled={done}
  onChange={e => updateEdit(set.id!, 'reps', e.target.value)}
  className="flex-1 min-w-0 ..."
/>

{/* DESPUÉS: primero reps, después weight */}
<input
  type="number"
  inputMode="numeric"
  value={getVal(set, 'reps') || ''}
  placeholder="0"
  disabled={done}
  onChange={e => updateEdit(set.id!, 'reps', e.target.value)}
  className="flex-1 min-w-0 ..."
/>
<input
  type="number"
  inputMode="decimal"
  value={getVal(set, 'weight') || ''}
  placeholder="0"
  disabled={done}
  onChange={e => updateEdit(set.id!, 'weight', e.target.value)}
  className="flex-1 min-w-0 ..."
/>
```

---

## Verificación

```bash
npm run build
```

Probar en iPhone:
- [ ] Header de RoutineDetailPage no tapado por status bar
- [ ] Header de ActiveWorkoutPage no tapado por status bar  
- [ ] Botón X de eliminar serie visible y tocable
- [ ] Botón "Listo" del workout visible y tocable
- [ ] Páginas normales (Home, History, etc.) sin espacio extra arriba

---

## Nota sobre el bug de setNumber = 1

Los sets en Supabase tienen `set_number = 1` en todos porque el SQL de migración
los insertó sin respetar la numeración original. Para corregirlo, ejecutar en
el SQL Editor de Supabase:

```sql
-- Ver el estado actual de los sets de una rutina para verificar
SELECT re.id, re.order_index, s.id, s.set_number, s.reps, s.weight
FROM routine_exercises re
JOIN sets s ON s.routine_exercise_id = re.id
ORDER BY re.order_index, s.set_number;
```

Si todos muestran `set_number = 1`, actualizar manualmente agrupando por
`routine_exercise_id` y asignando números correlativos. Claude Code no puede
hacer esto — requiere acceso a Supabase.
