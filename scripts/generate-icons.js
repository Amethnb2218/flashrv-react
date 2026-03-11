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

const publicDir = join(__dirname, '..', 'public');
const svg = readFileSync(svgPath);

// PWA icons
const pwaSizes = [192, 512];
for (const size of pwaSizes) {
  await sharp(svg, { density: 300 })
    .resize(size, size)
    .png()
    .toFile(join(outDir, `icon-${size}.png`));
  console.log(`✓ icons/icon-${size}.png`);
}

// Favicons (for browsers + Google Search)
const faviconSizes = [16, 32, 48, 180];
const faviconNames = { 16: 'favicon-16x16.png', 32: 'favicon-32x32.png', 48: 'favicon-48x48.png', 180: 'apple-touch-icon.png' };
for (const size of faviconSizes) {
  await sharp(svg, { density: 300 })
    .resize(size, size)
    .png()
    .toFile(join(publicDir, faviconNames[size]));
  console.log(`✓ ${faviconNames[size]}`);
}

console.log('Done — all icons regenerated');
