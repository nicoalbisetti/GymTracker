# Spec: Ícono PWA — GymTracker

## Contexto

GymTracker ya es una PWA configurada con `vite-plugin-pwa`.
El manifest en `vite.config.ts` referencia:
- `public/icons/icon-192.png` (192×192)
- `public/icons/icon-512.png` (512×512, también usado como maskable)

Los íconos actuales son texto "GT" sobre fondo oscuro, generados programáticamente.
Este spec los reemplaza por un ícono diseñado con identidad visual propia.

---

## Diseño del ícono

Paleta y estilo alineados con la app:
- Fondo: `#0f172a` (slate-950 — el fondo base de la app)
- Acento: `#8b5cf6` (violet-500 — el color primario de la app)
- Forma: fondo cuadrado con esquinas redondeadas (para Android adaptive icons)
- Elemento central: una barra de pesas (dumbbell) estilizada en SVG

### Descripción visual del ícono

Un dumbbell (mancuerna/barra) dibujado con líneas limpias y grosor generoso,
centrado en el canvas. Color del ícono: `#8b5cf6` (violeta). El trazo debe tener
esquinas redondeadas (`stroke-linecap: round`, `stroke-linejoin: round`).
Fondo: `#0f172a`.

La barra tiene la siguiente estructura SVG (coordenadas para 512×512, centrado):
- Barra central: línea horizontal de (140, 256) a (372, 256), grosor 28px
- Disco izquierdo superior: rectángulo redondeado de x=96 y=190, w=52 h=132, rx=16
- Disco derecho superior: rectángulo redondeado de x=364 y=190, w=52 h=132, rx=16
- Collarín izquierdo: rectángulo de x=148 y=224, w=28 h=64, rx=8
- Collarín derecho: rectángulo de x=336 y=224, w=28 h=64, rx=8

Todos los elementos rellenos con `#8b5cf6`. Sin stroke (fill only).

---

## Paso 1 — Generar los íconos con script Node

### Script a crear y ejecutar: `scripts/generate-icons.mjs`

```js
import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size / 512; // factor de escala

  // Fondo
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#8b5cf6';

  // Helper: rectángulo redondeado
  function roundRect(x, y, w, h, r) {
    x *= s; y *= s; w *= s; h *= s; r *= s;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
    ctx.fill();
  }

  // Disco izquierdo
  roundRect(96, 190, 52, 132, 16);
  // Disco derecho
  roundRect(364, 190, 52, 132, 16);
  // Collarín izquierdo
  roundRect(148, 224, 28, 64, 8);
  // Collarín derecho
  roundRect(336, 224, 28, 64, 8);
  // Barra central
  roundRect(140, 242, 232, 28, 8);

  return canvas.toBuffer('image/png');
}

const outDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

writeFileSync(join(outDir, 'icon-192.png'), drawIcon(192));
writeFileSync(join(outDir, 'icon-512.png'), drawIcon(512));

console.log('✅ Íconos generados en public/icons/');
```

### Ejecutar:

```bash
npm install --save-dev canvas
node scripts/generate-icons.mjs
```

Si `canvas` no se puede instalar (requiere librerías nativas), usar el fallback
del Paso 2.

---

## Paso 2 — Fallback si canvas no está disponible

Si la instalación de `canvas` falla, generar los íconos como SVG y convertirlos
con `sharp`:

```bash
npm install --save-dev sharp
```

### Script alternativo: `scripts/generate-icons-sharp.mjs`

```js
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function buildSvg(size) {
  const s = size / 512;
  const scale = (n) => Math.round(n * s);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0f172a"/>
  <rect x="${scale(96)}" y="${scale(190)}" width="${scale(52)}" height="${scale(132)}" rx="${scale(16)}" fill="#8b5cf6"/>
  <rect x="${scale(364)}" y="${scale(190)}" width="${scale(52)}" height="${scale(132)}" rx="${scale(16)}" fill="#8b5cf6"/>
  <rect x="${scale(148)}" y="${scale(224)}" width="${scale(28)}" height="${scale(64)}" rx="${scale(8)}" fill="#8b5cf6"/>
  <rect x="${scale(336)}" y="${scale(224)}" width="${scale(28)}" height="${scale(64)}" rx="${scale(8)}" fill="#8b5cf6"/>
  <rect x="${scale(140)}" y="${scale(242)}" width="${scale(232)}" height="${scale(28)}" rx="${scale(8)}" fill="#8b5cf6"/>
</svg>`;
}

const outDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

for (const size of [192, 512]) {
  const svg = Buffer.from(buildSvg(size));
  await sharp(svg).png().toFile(join(outDir, `icon-${size}.png`));
  console.log(`✅ icon-${size}.png generado`);
}
```

```bash
node scripts/generate-icons-sharp.mjs
```

---

## Paso 3 — Apple touch icon adicional

El `index.html` ya referencia `/icons/icon-192.png` como apple-touch-icon.
No se necesita cambio — el mismo archivo generado lo cubre.

Verificar que la línea exista en `index.html`:
```html
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

Si no existe, agregarla dentro del `<head>`.

---

## Paso 4 — Verificación

```bash
npm run build
npm run preview
```

Verificar en Chrome DevTools → Application → Manifest:
- Los íconos deben aparecer con preview visual
- Debe mostrar el dumbbell violeta sobre fondo oscuro

En iOS Safari (o simulador): agregar a pantalla de inicio y confirmar que el ícono
se ve correctamente sin fondo blanco ni recorte.

---

## Limpieza

Los scripts de generación en `scripts/` pueden quedar en el repo como utilidad.
Las dependencias `canvas` y/o `sharp` son `devDependencies` — no afectan el bundle.

---

## Archivos creados/modificados

| Archivo | Estado |
|---|---|
| `scripts/generate-icons.mjs` | creado |
| `scripts/generate-icons-sharp.mjs` | creado (fallback) |
| `public/icons/icon-192.png` | reemplazado |
| `public/icons/icon-512.png` | reemplazado |

### No se tocan

- `vite.config.ts` — el manifest ya referencia los paths correctos
- `index.html` — solo verificar el apple-touch-icon
- Cualquier archivo en `src/`

---

## Workflow ClickUp obligatorio

1. Crear tarea en ClickUp lista `901711957073` con título:
   `feat: ícono PWA dumbbell`
2. Ejecutar scripts y verificar íconos generados
3. Commitear con mensaje que incluya `CU-<task_id>` al final
4. Marcar tarea como completada en ClickUp
5. Crear `/tmp/claude_ready_for_testing.txt` con resumen
