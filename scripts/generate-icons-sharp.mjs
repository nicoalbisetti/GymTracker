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
