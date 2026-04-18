# Spec: Modos de vista en gráficos de progresión

## Contexto

La `ProgressPage` actualmente muestra todos los registros históricos de un ejercicio agrupados por día. El problema es que con mucho historial el gráfico se vuelve ilegible, y no hay forma de ver tendencias a distintas escalas de tiempo.

## Objetivo

Agregar un toggle que permita cambiar entre dos vistas de datos en el gráfico:

| Vista | Label en UI | Descripción |
|-------|-------------|-------------|
| `recent` | Últimas 20 sesiones | Las últimas 20 sesiones donde apareció ese ejercicio |
| `annual` | Resumen anual | Máximo del mes, últimos 12 meses calendario |

La vista actual (todos los registros históricos por día) **se elimina**.

---

## Archivos a modificar

- `src/pages/ProgressPage.tsx` — único archivo a tocar, toda la lógica vive en el `useMemo` de `chartData`
- `src/services/progressService.ts` — **no requiere cambios**, ya trae todos los registros y procesamos client-side

---

## Nuevo estado

Agregar a `ProgressPage`:

```typescript
type ViewMode = 'recent' | 'annual';
const [viewMode, setViewMode] = useState<ViewMode>('recent');
```

---

## Lógica de cada vista

### Vista `recent` — Últimas 20 sesiones

**Input:** `records` (todos los `WorkoutSetRecord[]` ya cargados), filtrados por `activeMuscle`.

**Algoritmo:**

1. Para cada ejercicio del grupo muscular, agrupar los registros por `sessionId`.
2. Ordenar las sesiones por `completedAt` descendente y tomar las **últimas 20 sesiones** donde ese ejercicio aparece (puede ser menos si no tiene 20 todavía).
3. Para cada sesión, calcular el valor a mostrar:
   - **e1rm mode:** `Math.max` de todos los sets de ese ejercicio en esa sesión usando `calcE1RM(weight, reps)`
   - **volume mode:** suma de `calcVolume(weight, reps)` de todos los sets de ese ejercicio en esa sesión
   - **Core:** `Math.max` de `reps` de todos los sets en esa sesión
4. Eje X: fecha de la sesión formateada como `"d MMM"` en es-AR (igual al formato actual). Usar `completedAt.slice(0, 10)` para identificar fecha única de sesión.

> ⚠️ Importante: el límite de 20 sesiones es **por ejercicio**, no global. Cada línea del gráfico tiene sus propios últimos 20 puntos. El eje X une todas las fechas presentes en cualquier ejercicio del grupo (igual al comportamiento actual con `allDates`).

---

### Vista `annual` — Resumen anual

**Input:** `records` filtrados por `activeMuscle`.

**Algoritmo:**

1. Calcular los últimos 12 meses calendario desde hoy (inclusive el mes actual).
   - Ejemplo si hoy es 2026-04-17: los meses son `2025-05`, `2025-06`, ..., `2026-04`
2. Para cada ejercicio del grupo muscular, agrupar registros por mes (`completedAt.slice(0, 7)` → `"YYYY-MM"`).
3. Para cada mes donde haya datos de ese ejercicio, calcular:
   - **e1rm mode:** `Math.max` de `calcE1RM(weight, reps)` de todos los sets de ese mes
   - **volume mode:** `Math.max` del volumen **por sesión** en ese mes (no suma total del mes, sino la mejor sesión del mes)
   - **Core:** `Math.max` de `reps` de ese mes
4. Eje X: los 12 meses en orden, con label `"MMM YY"` en es-AR (ej: `"abr 25"`). Mostrar **todos los 12 meses** aunque no haya datos en algunos (aparecerán sin punto en la línea, `connectNulls={false}`).

---

## UI — Toggle de vista

Ubicar el toggle **debajo de los chips de grupo muscular**, y **encima del toggle de métrica (1RM / Volumen)** existente. Usar el mismo estilo visual de pill/rounded-full que ya existe en la página.

```
[ Últimas 20 sesiones ]  [ Resumen anual ]
```

Ejemplo de markup (seguir el estilo existente de metricMode):

```tsx
<div className="flex gap-1">
  <button
    onClick={() => setViewMode('recent')}
    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
      viewMode === 'recent'
        ? 'bg-primary-500 text-white'
        : 'bg-slate-700 text-slate-400 active:bg-slate-600'
    }`}
  >
    Últimas 20 sesiones
  </button>
  <button
    onClick={() => setViewMode('annual')}
    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
      viewMode === 'annual'
        ? 'bg-primary-500 text-white'
        : 'bg-slate-700 text-slate-400 active:bg-slate-600'
    }`}
  >
    Resumen anual
  </button>
</div>
```

---

## Label descriptivo del gráfico

Actualizar `chartData.label` según la combinación de `viewMode` + `metricMode`:

| viewMode | metricMode / caso | label |
|----------|-------------------|-------|
| `recent` | `e1rm` | `"1RM estimado — últimas 20 sesiones (kg)"` |
| `recent` | `volume` | `"Volumen por sesión — últimas 20 sesiones (kg·reps)"` |
| `recent` | Core | `"Reps máximas — últimas 20 sesiones"` |
| `annual` | `e1rm` | `"Mejor 1RM estimado por mes (kg)"` |
| `annual` | `volume` | `"Mejor volumen por sesión del mes (kg·reps)"` |
| `annual` | Core | `"Mejor marca mensual (reps)"` |

---

## Estructura del `useMemo` refactorizado

El `useMemo` de `chartData` debe ramificarse en dos ramas según `viewMode`:

```typescript
const chartData = useMemo(() => {
  if (!activeMuscle) return { exercises: [], points: [], label: '' };

  const filtered = records.filter((r) => r.muscleGroup === activeMuscle);
  const isCore = activeMuscle === 'Core';

  if (viewMode === 'recent') {
    // lógica de últimas 20 sesiones por ejercicio
    // ...
  } else {
    // lógica de resumen anual (últimos 12 meses)
    // ...
  }
}, [records, activeMuscle, metricMode, viewMode]);
```

> Agregar `viewMode` al array de dependencias del `useMemo`.

---

## Comportamiento del toggle al cambiar de grupo muscular

Al cambiar `selectedMuscle`, el `viewMode` **no se resetea** — se mantiene la vista seleccionada. El usuario elige la vista que quiere y explora los grupos musculares en esa vista.

---

## Edge cases

- Si un ejercicio tiene menos de 20 sesiones en vista `recent`, mostrar las que haya (no rellenar con nulls artificiales).
- Si un mes no tiene datos en vista `annual`, ese mes aparece en el eje X pero sin punto (ya manejado con `connectNulls={false}`).
- Si `records` está vacío o no hay ejercicios con datos para el grupo seleccionado, mantener el estado vacío actual (`exercises.length === 0`).
- El toggle de vista **no se muestra** cuando no hay datos (mismo comportamiento que el toggle de métrica hoy).

---

## Lo que NO cambia

- Los chips de selección de grupo muscular (`muscleGroups`) — sin cambios.
- El toggle de métrica `1RM estimado / Volumen` — sin cambios, sigue oculto para Core.
- Las funciones `calcE1RM` y `calcVolume` — sin cambios.
- El componente `LineChart` y su configuración visual (`COLORS`, dot styles, tooltip, legend) — sin cambios.
- `progressService.ts` — sin cambios.
