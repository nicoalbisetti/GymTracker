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
