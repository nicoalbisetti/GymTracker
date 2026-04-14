# Spec: Ajustes UI — Sacar Settings y fixes iOS

## Cambios a realizar

### 1. `src/components/BottomNav.tsx`

Eliminar el tab de Settings del array `tabs`:

```ts
// ELIMINAR esta entrada del array tabs:
{ to: '/settings', label: 'Config', Icon: Settings },
```

Actualizar el import de lucide-react eliminando `Settings` si queda sin usar:

```ts
// ANTES
import { Dumbbell, ListChecks, CalendarDays, TrendingUp, Settings } from 'lucide-react';

// DESPUÉS
import { Dumbbell, ListChecks, CalendarDays, TrendingUp } from 'lucide-react';
```

Agregar `safe-area-left` y `safe-area-right` al nav:

```tsx
// ANTES
<nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 flex justify-around items-center h-16 z-40 max-w-lg mx-auto safe-area-bottom">

// DESPUÉS
<nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 flex justify-around items-center h-16 z-40 max-w-lg mx-auto safe-area-bottom safe-area-left safe-area-right">
```

---

### 2. `src/index.css`

Agregar las utilities de safe area que faltan al bloque `@layer utilities` existente:

```css
@layer utilities {
  .safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }
  .safe-area-top {
    padding-top: env(safe-area-inset-top);
  }
  /* Agregar estas dos: */
  .safe-area-left {
    padding-left: env(safe-area-inset-left);
  }
  .safe-area-right {
    padding-right: env(safe-area-inset-right);
  }
}
```

---

### 3. `src/App.tsx`

Agregar `safe-area-top`, `safe-area-left` y `safe-area-right` al `<main>`:

```tsx
// ANTES
<main className={`flex-1 overflow-y-auto ${fullscreen ? '' : 'pb-16'}`}>

// DESPUÉS
<main className={`flex-1 overflow-y-auto safe-area-top safe-area-left safe-area-right ${fullscreen ? '' : 'pb-16'}`}>
```

---

## Archivos que NO se tocan

- `src/pages/SettingsPage.tsx` — dejarla, solo se saca del nav
- `src/App.tsx` — solo el cambio al `<main>` descrito arriba, nada más
- Cualquier otro archivo

## Verificación

```bash
npm run build
```

Debe terminar sin errores. No hay cambios de lógica — solo CSS y un array.
