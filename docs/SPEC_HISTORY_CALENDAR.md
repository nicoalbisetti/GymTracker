# Spec: Historial con vista de calendario mensual

## Contexto

`HistoryPage` actualmente muestra una lista plana de sesiones ordenadas por fecha
descendente. Se reemplaza esa vista por un calendario mensual que marca los días
con entrenamiento. Al tocar un día entrenado, se muestra la lista de sesiones de
ese día. Desde ahí se navega al `SessionDetailPage` existente (sin cambios).

Stack: Vite + React 19 + TypeScript strict + Tailwind + Dexie 4 + dexie-react-hooks.
No instalar ninguna librería de calendario — implementarlo con lógica de Date nativa.

---

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/pages/HistoryPage.tsx` | Reemplazar completamente |

## Archivos a crear

| Archivo | Descripción |
|---|---|
| `src/components/MonthCalendar.tsx` | Componente de cuadrícula mensual |

## Archivos que NO se tocan

- `src/pages/SessionDetailPage.tsx`
- `src/db/database.ts`
- `src/types/index.ts`
- `src/App.tsx` (las rutas existentes no cambian)

---

## Comportamiento esperado

### Vista principal — `HistoryPage`

1. Muestra un encabezado con el mes y año actual, con flechas para navegar
   al mes anterior y siguiente. No permitir navegar a meses futuros.

2. Debajo del encabezado, una cuadrícula de calendario (7 columnas: L M X J V S D)
   con todos los días del mes. Los días fuera del mes actual aparecen vacíos o
   con color muy atenuado (no clickeables).

3. Los días que tienen al menos una sesión completada (`finishedAt` no nulo)
   se marcan visualmente: fondo con color `primary`, texto blanco.

4. El día de hoy se distingue del resto con un borde o indicador sutil cuando
   no tiene entrenamiento. Si tiene entrenamiento, el estilo de "entrenado"
   tiene prioridad visual.

5. Al tocar un día con sesiones, se expande debajo del calendario (en la misma
   página, no navegar) una lista de las sesiones de ese día. Si se toca el mismo
   día de nuevo, se colapsa.

6. Cada sesión en esa lista muestra: nombre de rutina, hora de inicio y duración.
   Al tocarla navega a `/history/:sessionId` (el `SessionDetailPage` existente).

7. Si el mes no tiene ninguna sesión, mostrar un mensaje vacío debajo del
   calendario: "Sin entrenamientos este mes".

### Lógica de fechas

- El mes mostrado arranca en el mes actual al entrar a la página.
- La semana empieza el lunes (índice 0 = lunes, 6 = domingo).
- Para saber qué días tienen sesiones, filtrar `workoutSessions` por el rango
  `[primer día del mes 00:00:00, primer día del mes siguiente 00:00:00)`.
- Solo contar sesiones con `finishedAt` no nulo como "día entrenado".
  Las sesiones sin `finishedAt` (incompletas) no marcan el día, pero sí aparecen
  en la lista al expandir si son del mismo día.
- Usar fechas locales para todo (no UTC). La sesión tiene `startedAt` en ISO string;
  extraer la fecha local con `new Date(startedAt)` y comparar año/mes/día local.

---

## Implementación detallada

### `src/components/MonthCalendar.tsx`

Props:
```ts
interface MonthCalendarProps {
  year: number;
  month: number; // 0-based (0 = enero, 11 = diciembre)
  trainedDays: Set<number>; // días del mes (1-31) con al menos una sesión finalizada
  selectedDay: number | null;
  onSelectDay: (day: number) => void;
  today: { year: number; month: number; day: number };
}
```

Lógica interna del componente:

```ts
// Calcular el primer día del mes y cuántos días tiene
const firstDayOfMonth = new Date(year, month, 1);
const daysInMonth = new Date(year, month + 1, 0).getDate();

// Día de la semana del primer día, ajustado a lunes=0
// getDay() devuelve 0=domingo, convertir a lunes=0
const rawDay = firstDayOfMonth.getDay(); // 0=dom, 1=lun, ...
const startOffset = rawDay === 0 ? 6 : rawDay - 1; // lunes=0, domingo=6

// Total de celdas = offset inicial + días del mes, redondeado a múltiplo de 7
const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
```

Render: array de `totalCells` celdas. Las primeras `startOffset` están vacías.
Las celdas con día válido muestran el número y aplican estilos según estado.

Estilos de celda (Tailwind, no modificar la lógica de negocio):
- Base: `w-full aspect-square flex items-center justify-center rounded-xl text-sm font-medium`
- Día vacío (offset): sin contenido, no clickeable
- Día normal: `text-slate-400`
- Día de hoy (sin entrenamiento): `text-white ring-1 ring-slate-600`
- Día entrenado: `bg-primary-500 text-white`
- Día entrenado + seleccionado: `bg-primary-400 text-white ring-2 ring-primary-300`
- Día seleccionado sin entrenamiento: `bg-slate-700 text-white`

### `src/pages/HistoryPage.tsx`

Estructura del componente:

```ts
export default function HistoryPage() {
  const navigate = useNavigate();

  // Mes actualmente visible
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

  // Día seleccionado (null = ninguno expandido)
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Traer TODAS las sesiones de una vez — son pocos registros (datos personales)
  const sessions = useLiveQuery(() =>
    db.workoutSessions.orderBy('startedAt').reverse().toArray()
  );

  // Derivar sesiones del mes visible
  const sessionsInMonth = useMemo(() => { ... }, [sessions, viewYear, viewMonth]);

  // Set de días entrenados (solo finishedAt no nulo)
  const trainedDays = useMemo(() => { ... }, [sessionsInMonth]);

  // Sesiones del día seleccionado
  const sessionsOnSelectedDay = useMemo(() => { ... }, [sessionsInMonth, selectedDay]);

  const today = { year: new Date().getFullYear(), month: new Date().getMonth(), day: new Date().getDate() };
  const isCurrentMonth = viewYear === today.year && viewMonth === today.month;

  function goToPrevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelectedDay(null);
  }

  function goToNextMonth() {
    if (isCurrentMonth) return; // no navegar a futuro
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelectedDay(null);
  }

  function handleSelectDay(day: number) {
    // Toggle: si ya estaba seleccionado, deseleccionar
    setSelectedDay(prev => prev === day ? null : day);
  }
  ...
}
```

`sessionsInMonth`: filtrar `sessions` donde el año y mes local de `startedAt`
coincidan con `viewYear` y `viewMonth`.

`trainedDays`: de `sessionsInMonth`, tomar solo las que tienen `finishedAt`,
extraer el día local de `startedAt`, construir `new Set<number>`.

`sessionsOnSelectedDay`: de `sessionsInMonth`, filtrar las que cuyo día local
de `startedAt` sea igual a `selectedDay`. Ordenar por `startedAt` ascendente.

### Función helper `formatDuration`

Copiar la misma función que existe actualmente en `HistoryPage`:
```ts
function formatDuration(startedAt: string, finishedAt?: string): string | null {
  if (!finishedAt) return null;
  const mins = Math.round(
    (new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 60000
  );
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}min`;
}
```

---

## Layout completo de `HistoryPage`

```
┌─────────────────────────────────┐
│  Historial                      │  ← h1 existente
├─────────────────────────────────┤
│  ← Enero 2025  →                │  ← navegación mes (flecha → gris si mes actual)
├─────────────────────────────────┤
│  L  M  X  J  V  S  D           │
│        1  2  3  4  5            │
│  6  7  8  9  10 11 12           │  ← MonthCalendar
│  13 14 ●  16 17 18 19           │  ← ● = día entrenado (bg primary)
│  20 21 22 23 24 25 26           │
│  27 28 29 30 31                 │
├─────────────────────────────────┤
│  ▼ Miércoles 15                 │  ← aparece al tocar un día entrenado
│  ┌───────────────────────────┐  │
│  │ Pecho + Tríceps  18:30    │  │  ← card de sesión, toca → SessionDetail
│  │ 45 min                    │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Sección expandida (sesiones del día seleccionado)

Solo visible cuando `selectedDay !== null`. Estructura:

```tsx
{selectedDay !== null && (
  <div className="flex flex-col gap-2 mt-2">
    <p className="text-sm font-semibold text-slate-400 px-1">
      {/* nombre del día y número, ej: "Miércoles 15" */}
    </p>
    {sessionsOnSelectedDay.length === 0 ? (
      <p className="text-sm text-slate-500 px-1">
        Sin sesiones finalizadas este día
      </p>
    ) : (
      sessionsOnSelectedDay.map(session => (
        <button
          key={session.id}
          onClick={() => navigate(`/history/${session.id}`)}
          className="w-full bg-slate-800 border border-slate-700/50 rounded-2xl p-4 text-left active:bg-slate-700/50"
        >
          <p className="font-semibold text-white">{session.routineName}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-400">
              {new Date(session.startedAt).toLocaleTimeString('es-AR', {
                hour: '2-digit', minute: '2-digit'
              })}
            </span>
            {formatDuration(session.startedAt, session.finishedAt) && (
              <span className="text-xs text-slate-500">
                · {formatDuration(session.startedAt, session.finishedAt)}
              </span>
            )}
            {!session.finishedAt && (
              <span className="text-xs text-yellow-400 bg-yellow-500/20 px-2 rounded-full">
                Incompleta
              </span>
            )}
          </div>
        </button>
      ))
    )}
  </div>
)}
```

### Estado vacío del mes

Si `sessionsInMonth.length === 0` (sin importar si hay día seleccionado):

```tsx
<div className="text-center py-8">
  <p className="text-sm text-slate-500">Sin entrenamientos este mes</p>
</div>
```

---

## Verificación

```bash
npx tsc --noEmit
```

Debe pasar sin errores. No introducir `any`. Prestar atención a:
- `sessions` puede ser `undefined` mientras Dexie carga → guardar con `?? []`
- `selectedDay` es `number | null`, no asumir que es un día válido del mes

No hay tests que correr. El build de producción es suficiente:
```bash
npm run build
```
