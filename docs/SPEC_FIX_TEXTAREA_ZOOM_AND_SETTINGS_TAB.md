# Spec: Fix zoom iOS en textarea + tab Settings en BottomNav

## Contexto

Dos fixes de UX independientes y quirúrgicos.

1. **Zoom en iOS al enfocar el textarea del chat IA** — iOS hace zoom automático
   en cualquier campo editable con `font-size < 16px`. El fix existente en
   `index.css` cubre `input[type="number/text/email/password"]` pero no `textarea`.
   El chat de IA usa un `<textarea>` y sufre el mismo problema.
   La solución correcta es cubrir `textarea` en la misma regla global, para que
   aplique a todos los textareas presentes y futuros en la app.

2. **No hay acceso a Settings desde la UI** — el tab fue removido del `BottomNav`
   en una iteración anterior. Simplemente se restituye.

**No se modifica ninguna lógica de negocio ni componentes de páginas.**

---

## Fix 1 — `src/index.css`

### Cambio

Agregar `textarea` a la regla existente que previene el auto-zoom de iOS.

```css
/* ANTES */
input[type="number"],
input[type="text"],
input[type="email"],
input[type="password"] {
  font-size: 16px;
}

/* DESPUÉS */
input[type="number"],
input[type="text"],
input[type="email"],
input[type="password"],
textarea {
  font-size: 16px;
}
```

Esto aplica globalmente a todos los `textarea` de la app, incluyendo el de
`AiChatPage` y cualquier otro que se agregue en el futuro.

No modificar nada más del archivo.

---

## Fix 2 — `src/components/BottomNav.tsx`

### Cambio

Agregar `Settings` al import de lucide-react y restituir el tab al array
`baseTabs`. El tab va al final, después de "Progresión".

**Import:**
```ts
// ANTES
import { Dumbbell, ListChecks, CalendarDays, TrendingUp, Sparkles } from 'lucide-react';

// DESPUÉS
import { Dumbbell, ListChecks, CalendarDays, TrendingUp, Sparkles, Settings } from 'lucide-react';
```

**Array `baseTabs`:**
```ts
// ANTES
const baseTabs = [
  { to: '/',          label: 'Rutinas',    Icon: Dumbbell },
  { to: '/exercises', label: 'Ejercicios', Icon: ListChecks },
  { to: '/history',   label: 'Historial',  Icon: CalendarDays },
  { to: '/progress',  label: 'Progresión', Icon: TrendingUp },
];

// DESPUÉS
const baseTabs = [
  { to: '/',          label: 'Rutinas',    Icon: Dumbbell },
  { to: '/exercises', label: 'Ejercicios', Icon: ListChecks },
  { to: '/history',   label: 'Historial',  Icon: CalendarDays },
  { to: '/progress',  label: 'Progresión', Icon: TrendingUp },
  { to: '/settings',  label: 'Ajustes',    Icon: Settings },
];
```

Con esto el orden final de tabs queda:
- **Todos los usuarios:** Rutinas → Ejercicios → Historial → Progresión → Ajustes
- **Pro:** Rutinas → Ejercicios → Historial → Progresión → IA → Ajustes

No modificar nada más del archivo.

---

## Verificación

```bash
npx tsc --noEmit
npm run build
```

Sin errores. Los dos cambios son CSS y un array — no hay lógica nueva.

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/index.css` | Agregar `textarea` a la regla de font-size 16px |
| `src/components/BottomNav.tsx` | Agregar import `Settings` + tab `/settings` en `baseTabs` |

## Archivos que NO se tocan

- `src/pages/AiChatPage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/App.tsx`
- Cualquier otro archivo

---

## Workflow ClickUp obligatorio

1. Crear tarea en ClickUp lista `901711957073` con título:
   `fix: zoom iOS en textarea + tab Settings en BottomNav`
2. Implementar los dos fixes en orden
3. Commitear con mensaje que incluya `CU-<task_id>` al final
4. Marcar tarea como completada en ClickUp
5. Crear `/tmp/claude_ready_for_testing.txt` con resumen de cambios realizados
