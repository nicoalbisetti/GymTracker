# GymTracker

## Stack
- Vite + React 19 + TypeScript
- React Router DOM v7
- Dexie (IndexedDB), sin servidor
- dnd-kit para drag & drop
- Lucide React para iconos
- Tema oscuro con Tailwind (slate-950 base, violeta #8b5cf6 como acento)

## Comandos
- `npm run dev` — servidor de desarrollo
- `npm run build`
- `npm run lint:fix`

## Workflow obligatorio para cada tarea

1. **Crear tarea en ClickUp** en la lista `901711957073` (GymTracker, folder "Proyectos", workspace Aqua-lean)
2. **Implementar** los cambios
3. **Commitear** con el mensaje incluyendo `CU-<task_id>` al final
4. **Pushear** a `origin main` (`git push origin main`) para disparar el deploy en Vercel
5. **Marcar la tarea como completada** en ClickUp
5. **Crear el archivo** `/tmp/claude_ready_for_testing.txt` con un resumen de lo que se hizo (esto dispara la notificación a Slack)

## Estructura principal
- `src/App.tsx` — router + bottom nav
- `src/db/database.ts` — schema Dexie
- `src/types/index.ts` — tipos TypeScript
- `src/pages/` — HomePage, ExercisesPage, HistoryPage, ActiveWorkoutPage, RoutineDetailPage, SessionDetailPage, ProgressPage
- `src/components/` — BottomNav, ExercisePicker
