# SPEC — Métricas de progresión en `ProgressPage`

## Objetivo

Reemplazar la métrica actual (máximo de peso O máximo de reps) por **1RM estimado (Epley)** como métrica principal, y agregar un **toggle `1RM / Volumen`** para que el usuario pueda alternar entre ambas vistas. Solo se modifica `src/pages/ProgressPage.tsx`. Ningún otro archivo cambia.

---

## Archivo a modificar

`src/pages/ProgressPage.tsx`

---

## Cambios requeridos

### 1. Nuevo estado — métrica seleccionada

Agregar un estado para la métrica activa. El tipo debe ser explícito:

```ts
type MetricMode = 'e1rm' | 'volume';
const [metricMode, setMetricMode] = useState<MetricMode>('e1rm');
```

---

### 2. Funciones de cálculo

Agregar antes del componente o como helpers internos del módulo:

```ts
/** Epley 1RM estimado. Para ejercicios con peso. */
function calcE1RM(weight: number, reps: number): number {
  if (weight === 0) return reps; // sin carga → usar reps directamente
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/** Volumen total: suma de peso × reps para todos los sets del día. */
function calcVolume(weight: number, reps: number): number {
  return weight * reps;
}
```

---

### 3. Lógica de `chartData` — reemplazar el `useMemo` completo

Reemplazar el `useMemo` de `chartData` con esta versión:

- **Core**: siempre usa máximo de reps (sin cambio respecto al comportamiento actual)
- **Resto de grupos**: aplica la función de métrica activa (`metricMode`) sobre cada set
  - `e1rm`: toma el **máximo** del 1RM estimado por fecha
  - `volume`: toma la **suma** de `peso × reps` por fecha

```ts
const chartData = useMemo(() => {
  if (!activeMuscle) return { exercises: [], points: [], label: '' };

  const filtered = records.filter((r) => r.muscleGroup === activeMuscle);
  const isCore = activeMuscle === 'Core';

  const byExercise = new Map<string, Map<string, number>>();

  for (const r of filtered) {
    if (!byExercise.has(r.exerciseName)) byExercise.set(r.exerciseName, new Map());
    const dateMap = byExercise.get(r.exerciseName)!;
    const date = r.completedAt.slice(0, 10);

    let value: number;
    if (isCore) {
      value = r.reps;
      dateMap.set(date, Math.max(dateMap.get(date) ?? 0, value));
    } else if (metricMode === 'e1rm') {
      value = calcE1RM(r.weight, r.reps);
      dateMap.set(date, Math.max(dateMap.get(date) ?? 0, value));
    } else {
      // volume: sumar todos los sets del día
      value = calcVolume(r.weight, r.reps);
      dateMap.set(date, (dateMap.get(date) ?? 0) + value);
    }
  }

  const exercises = [...byExercise.keys()].filter((name) => byExercise.get(name)!.size >= 1);
  if (exercises.length === 0) return { exercises: [], points: [], label: '' };

  const allDates = [...new Set(
    exercises.flatMap((name) => [...byExercise.get(name)!.keys()])
  )].sort();

  const points = allDates.map((date) => {
    const label = new Date(date + 'T12:00:00').toLocaleDateString('es-AR', {
      day: 'numeric', month: 'short',
    });
    const entry: Record<string, string | number> = { date: label };
    for (const name of exercises) {
      const raw = byExercise.get(name)!.get(date);
      if (raw !== undefined) {
        entry[name] = isCore ? raw : Math.round(raw * 10) / 10;
      }
    }
    return entry;
  });

  const label = isCore
    ? 'Repeticiones máximas por sesión'
    : metricMode === 'e1rm'
      ? '1RM estimado por sesión (kg)'
      : 'Volumen total por sesión (kg·reps)';

  return { exercises, points, label };
}, [records, activeMuscle, metricMode]);
```

> **Nota:** eliminar `useReps` del return del `useMemo` anterior — reemplazado por `label`.

---

### 4. Tooltip — unidad dinámica

Reemplazar el `formatter` del `<Tooltip>` existente:

```tsx
formatter={(value, name) => {
  const unit = activeMuscle === 'Core'
    ? ' reps'
    : metricMode === 'e1rm'
      ? ' kg'
      : ' kg·reps';
  return [`${value}${unit}`, name];
}}
```

---

### 5. UI — toggle de métrica

Agregar el toggle **solo cuando `activeMuscle !== 'Core'`**, ubicado entre los filtros de grupo muscular y el subtítulo del gráfico, dentro del card `bg-slate-800`:

```tsx
{activeMuscle !== 'Core' && (
  <div className="flex gap-1 mb-4">
    <button
      onClick={() => setMetricMode('e1rm')}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        metricMode === 'e1rm'
          ? 'bg-primary-500 text-white'
          : 'bg-slate-700 text-slate-400 active:bg-slate-600'
      }`}
    >
      1RM estimado
    </button>
    <button
      onClick={() => setMetricMode('volume')}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        metricMode === 'volume'
          ? 'bg-primary-500 text-white'
          : 'bg-slate-700 text-slate-400 active:bg-slate-600'
      }`}
    >
      Volumen
    </button>
  </div>
)}
```

---

### 6. Subtítulo del gráfico

Reemplazar la línea existente:

```tsx
{chartData.useReps ? 'Repeticiones máximas por sesión' : 'Peso máximo por sesión (kg)'}
```

Por:

```tsx
{chartData.label}
```

---

## Restricciones

- Modificar **únicamente** `src/pages/ProgressPage.tsx`
- No alterar ningún otro componente, servicio, tipo ni archivo de configuración
- No introducir cambios visuales fuera de los descriptos en este spec
- Verificar con `tsc --noEmit` sin errores antes de finalizar
- No eliminar el import de `WorkoutSetRecord` si sigue siendo utilizado en el archivo
