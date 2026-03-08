// Generate PWA icons from favicon.svg
// Usage: npm install sharp --save-dev && node scripts/generate-icons.js

import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = join(__dirname, '..', 'public', 'favicon.svg');
const outDir = join(__dirname, '..', 'public', 'icons');

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const svg = readFileSync(svgPath);
const sizes = [192, 512];

for (const size of sizes) {
  await sharp(svg, { density: 300 })
    .resize(size, size)
    .png()
    .toFile(join(outDir, `icon-${size}.png`));
  console.log(`✓ icon-${size}.png`);
}

console.log('Done — icons in public/icons/');
