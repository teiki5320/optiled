// Découpe une planche d'images (grille régulière) en miniatures carrées WebP.
// Usage : node scripts/decouper-planche.mjs <planche.png> <colonnes> <lignes> <id1> <id2> …
// Les identifiants sont lus de gauche à droite puis de haut en bas ; « - » saute une case.
// Sortie : public/images/legumes/<id>.webp (192 × 192 px).
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const [planche, colonnes, lignes, ...ids] = process.argv.slice(2);
if (!planche || !colonnes || !lignes || ids.length === 0) {
  console.error('Usage : node scripts/decouper-planche.mjs <planche.png> <colonnes> <lignes> <id1> <id2> …');
  process.exit(1);
}
const sortie = resolve('public/images/legumes');
mkdirSync(sortie, { recursive: true });

const { width, height } = await sharp(planche).metadata();
const lc = width / Number(colonnes);
const hc = height / Number(lignes);
const cote = Math.floor(Math.min(lc, hc) * 0.96); // légère marge pour éviter les bords de case

for (const [i, id] of ids.entries()) {
  if (id === '-') continue;
  const col = i % Number(colonnes);
  const lig = Math.floor(i / Number(colonnes));
  const left = Math.round(col * lc + (lc - cote) / 2);
  const top = Math.round(lig * hc + (hc - cote) / 2);
  const info = await sharp(planche)
    .extract({ left, top, width: cote, height: cote })
    .resize(192, 192)
    .webp({ quality: 80 })
    .toFile(resolve(sortie, `${id}.webp`));
  console.log(`${id}.webp : ${Math.round(info.size / 1024)} Ko`);
}
