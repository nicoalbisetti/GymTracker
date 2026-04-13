# Spec: GymTracker PWA + Deploy en Vercel

## Contexto

GymTracker es una SPA con Vite 6 + React 19 + TypeScript + Tailwind. La base de datos es
Dexie/IndexedDB (100% client-side). El objetivo es convertirla en una PWA instalable sin
tocar ninguna lógica de negocio ni el schema de Dexie. Los datos del usuario no se tocan.

Stack actual relevante:
- `vite.config.ts` — solo tiene `@vitejs/plugin-react` y el alias `@/`
- `index.html` — ya tiene `theme-color`, `apple-mobile-web-app-capable` y `viewport-fit=cover`
- `src/App.tsx` — monta rutas y `BottomNav`
- `src/index.css` — ya tiene `.safe-area-bottom`
- `tailwind.config.js` — color primario definido como `primary`

---

## Tarea 1 — Instalar dependencias

```bash
npm install -D vite-plugin-pwa workbox-window
```

Verificar que el install terminó sin errores antes de continuar.

---

## Tarea 2 — Generar íconos PNG

No existen todavía. Crearlos programáticamente con sharp o canvas. Si ninguna de las dos
está disponible, generarlos con un script Node inline que use el módulo `canvas` de npm.

Crear la carpeta `public/icons/` y generar dos archivos:

### `public/icons/icon-192.png`
- Tamaño: 192×192 px
- Fondo: `#0f172a` (el dark background de la app)
- Contenido: las letras "GT" en blanco, fuente sans-serif bold, centradas
- El texto debe ocupar ~60% del ancho del ícono

### `public/icons/icon-512.png`
- Tamaño: 512×512 px
- Mismo diseño que el de 192, escalado
- Este ícono también se usa como maskable: el contenido visual debe estar dentro
  del círculo central (safe zone = 80% del tamaño total = 410px de diámetro)

Si no es posible generar PNGs programáticamente, crear SVGs equivalentes en
`public/icons/icon-192.svg` y `public/icons/icon-512.svg` y documentar en los
comentarios del `vite.config.ts` que el usuario debe convertirlos a PNG antes del deploy.

---

## Tarea 3 — Modificar `vite.config.ts`

Reemplazar el contenido actual por:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'GymTracker',
        short_name: 'GymTracker',
        description: 'Tu entrenador de gimnasio personal',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [],
      },
      devOptions: {
        // Desactivado en dev para no interferir con HMR
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
```

---

## Tarea 4 — Modificar `index.html`

El archivo ya tiene algunos meta tags de PWA. Verificar que queden exactamente estos,
sin duplicados, en el `<head>`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="theme-color" content="#0f172a" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="GymTracker" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

Cambios concretos respecto al archivo actual:
1. Agregar `mobile-web-app-capable` si no está
2. Cambiar `apple-mobile-web-app-status-bar-style` de `"default"` a `"black-translucent"`
3. Agregar el `<link rel="apple-touch-icon">` apuntando al ícono generado en Tarea 2

No tocar el resto del archivo (fonts de Google, script principal, etc).

---

## Tarea 5 — Agregar utilities en `src/index.css`

Al final del bloque `@layer utilities` existente (que ya tiene `.safe-area-bottom`),
agregar:

```css
.safe-area-top {
  padding-top: env(safe-area-inset-top);
}
```

Si el bloque `@layer utilities` no existe (solo existe `.safe-area-bottom` suelta),
crear el bloque correcto:

```css
@layer utilities {
  .safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }
  .safe-area-top {
    padding-top: env(safe-area-inset-top);
  }
}
```

---

## Tarea 6 — Crear `src/components/InstallPrompt.tsx`

Archivo nuevo. Componente que detecta la plataforma y muestra un banner de instalación
contextual. No aparece si la app ya está corriendo como PWA instalada (standalone mode).

```tsx
import { useState, useEffect } from 'react';
import { X, Share, PlusSquare } from 'lucide-react';

type Platform = 'ios' | 'android' | 'desktop' | 'installed' | 'unknown';

function detectPlatform(): Platform {
  if (window.matchMedia('(display-mode: standalone)').matches) return 'installed';
  if ((navigator as unknown as { standalone?: boolean }).standalone === true) return 'installed';

  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  if (/macintosh|windows|linux/i.test(ua)) return 'desktop';
  return 'unknown';
}

export default function InstallPrompt() {
  const [platform, setPlatform] = useState<Platform>('unknown');
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const p = detectPlatform();
    setPlatform(p);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (p === 'android') setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    if (p === 'ios' && !localStorage.getItem('pwa-install-dismissed')) {
      setVisible(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    const prompt = deferredPrompt as unknown as {
      prompt: () => void;
      userChoice: Promise<{ outcome: string }>;
    };
    prompt.prompt();
    await prompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  }

  function handleDismiss() {
    setVisible(false);
    localStorage.setItem('pwa-install-dismissed', '1');
  }

  if (!visible || platform === 'installed' || platform === 'desktop') return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-lg mx-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            {platform === 'android' && (
              <>
                <p className="font-semibold text-white text-sm">Instalá GymTracker</p>
                <p className="text-slate-400 text-xs mt-1">
                  Agregala a tu pantalla de inicio para acceso rápido.
                </p>
              </>
            )}
            {platform === 'ios' && (
              <>
                <p className="font-semibold text-white text-sm">Instalá GymTracker</p>
                <p className="text-slate-400 text-xs mt-1.5 flex items-center gap-1 flex-wrap">
                  Tocá
                  <Share size={13} className="inline text-slate-300 shrink-0" />
                  y luego
                  <span className="inline-flex items-center gap-1">
                    <PlusSquare size={13} className="text-slate-300 shrink-0" />
                    "Añadir a pantalla de inicio"
                  </span>
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {platform === 'android' && (
              <button
                onClick={handleInstall}
                className="px-3 py-1.5 bg-primary-500 text-white text-sm font-medium rounded-xl"
              >
                Instalar
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="text-slate-500 p-1 rounded-lg active:text-slate-300"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Tarea 7 — Modificar `src/App.tsx`

Agregar el import de `InstallPrompt` y montarlo como último hijo del `<div>` raíz,
después de `<BottomNav />`. No modificar nada más del archivo.

Diff conceptual:
```tsx
// Agregar al bloque de imports existente:
import InstallPrompt from '@/components/InstallPrompt';

// Dentro del return, después de <BottomNav />:
<InstallPrompt />
```

---

## Tarea 8 — Verificar TypeScript

```bash
npx tsc --noEmit
```

Resolver cualquier error de tipos antes de continuar. No introducir `any` salvo
donde ya se usa en el código existente o donde el tipo externo genuinamente no
tiene definición (ej: `BeforeInstallPromptEvent` no está en el DOM estándar de TS).

---

## Tarea 9 — Build de producción

```bash
npm run build
```

El build debe:
1. Terminar sin errores
2. Generar `dist/sw.js` o `dist/registerSW.js` (confirmar que el SW fue generado)
3. Generar `dist/manifest.webmanifest`
4. Incluir los íconos en `dist/icons/`

Si alguno de estos archivos falta, revisar la configuración de `VitePWA` en `vite.config.ts`.

---

## Tarea 10 — Smoke test local

```bash
npm run preview
```

Abrir `http://localhost:4173` en Chrome. Verificar en DevTools:
- **Application → Manifest**: debe mostrar nombre, íconos y `display: standalone`
- **Application → Service Workers**: debe mostrar el SW activo
- **Application → Storage → IndexedDB**: la base de datos `GymTrackerDB` debe seguir
  intacta (confirmar que los datos no se perdieron)

Si el SW no aparece, puede ser que el build no lo generó. Verificar el output de
`npm run build` buscando mensajes de `vite-plugin-pwa`.

---

## Tarea 11 — Crear `vercel.json`

Crear en la raíz del proyecto:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Esto es necesario para que React Router funcione correctamente en Vercel cuando el
usuario navega directo a una ruta como `/history` o recarga la página.

---

## Tarea 12 — Verificar `.gitignore`

Confirmar que `dist/` está en `.gitignore`. Si no existe el `.gitignore`, crearlo con:

```
node_modules/
dist/
.env
.env.local
```

---

## Checklist de archivos modificados/creados

Al terminar todas las tareas, la lista de cambios debe ser exactamente:

| Archivo | Estado |
|---|---|
| `package.json` | modificado — nuevas devDependencies |
| `package-lock.json` | modificado — lockfile actualizado |
| `vite.config.ts` | modificado — agrega VitePWA |
| `index.html` | modificado — meta tags iOS |
| `src/index.css` | modificado — agrega `.safe-area-top` |
| `src/App.tsx` | modificado — monta InstallPrompt |
| `src/components/InstallPrompt.tsx` | creado |
| `public/icons/icon-192.png` | creado |
| `public/icons/icon-512.png` | creado |
| `vercel.json` | creado |

Archivos que NO deben modificarse bajo ninguna circunstancia:
- `src/db/database.ts`
- `src/db/seed.ts`
- `src/types/index.ts`
- Cualquier archivo en `src/pages/`
- Cualquier archivo en `src/components/` excepto el nuevo `InstallPrompt.tsx`

---

## Notas para Claude Code

- El color `primary-500` que usa el botón de Android en `InstallPrompt` debe
  existir en `tailwind.config.js`. Si no existe la clave `primary` en la config
  de Tailwind, usar `bg-blue-500` como fallback.

- `vite-plugin-pwa` con Vite 6 es compatible desde la versión `^0.21.0`. Si npm
  instala una versión anterior y hay errores de peer deps, forzar con
  `npm install -D vite-plugin-pwa@latest`.

- El `BeforeInstallPromptEvent` no tiene tipos oficiales en TypeScript. El cast
  `as unknown as { prompt: ...; userChoice: ... }` en `handleInstall` es
  intencional y correcto.

- No agregar `"serviceWorker"` al `tsconfig.json` lib array. El SW lo genera
  Workbox automáticamente, no hay código TypeScript de SW que compilar.
