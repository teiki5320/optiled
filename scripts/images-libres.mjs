// Photos libres de droits (src/data/photos-libres.json) : téléchargement et conversion en WebP 16:9
// dans public/images/guides/<page>-1600.webp et -800.webp. Une entrée « carte » (pas de
// téléchargement) donne une carte aux couleurs du site, signée « Illustration : Kultiled ».
// Usage : npm run images-libres [-- page1 page2]  (sans argument : seulement les images absentes)
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const RACINE = resolve(import.meta.dirname, '..');
const SORTIE = resolve(RACINE, 'public/images/guides');
const { photos } = JSON.parse(readFileSync(resolve(RACINE, 'src/data/photos-libres.json'), 'utf8'));
const UA = 'Kultiled/1.0 (https://www.kultiled.com/; kultiled@toakeur.com)';
const demandees = process.argv.slice(2);

/** Carte 1600 × 900 aux couleurs de la nuit du site, avec une plante sous une lampe. */
function carteSvg(libelle) {
  const t = String(libelle).toUpperCase().replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const bandes = Array.from({ length: 40 }, (_, i) => `<rect x="${i * 40 + 18}" y="0" width="4" height="900"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
<defs><linearGradient id="f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a2140"/><stop offset="1" stop-color="#1b1322"/></linearGradient></defs>
<rect width="1600" height="900" fill="url(#f)"/><g fill="#f7c07a" opacity="0.06">${bandes}</g>
<g transform="translate(630 140) scale(3.4)" fill="none" stroke="#f7c07a" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"><rect x="12" y="6" width="76" height="12" rx="3" fill="#f7c07a"/><path d="M28 26 L23 37 M50 26 V39 M72 26 L77 37" stroke-width="3"/><path d="M30 70 H70 L64 93 H36 Z"/><path d="M50 70 V46"/><path d="M50 60 C37 60 29 52 29 42 C42 42 50 49 50 60 Z M50 53 C63 53 71 45 71 35 C58 35 50 42 50 53 Z" fill="#f7c07a"/></g>
<text x="800" y="660" text-anchor="middle" fill="#f7c07a" font-family="Helvetica,Arial,sans-serif" font-weight="800" font-size="${t.length > 26 ? 64 : 84}" letter-spacing="3">${t}</text>
<text x="800" y="820" text-anchor="middle" fill="#f6ecf0" opacity="0.85" font-family="Helvetica,Arial,sans-serif" font-weight="600" font-size="40" letter-spacing="2">Kultiled</text></svg>`;
}

for (const [page, p] of Object.entries(photos)) {
  if (demandees.length ? !demandees.includes(page) : existsSync(resolve(SORTIE, `${page}-1600.webp`))) continue;
  let entree;
  if (p.source === 'carte') entree = Buffer.from(carteSvg(p.libelle ?? page));
  else {
    const rep = await fetch(p.telechargement, { headers: { 'User-Agent': UA } });
    if (!rep.ok) throw new Error(`${page} : HTTP ${rep.status}`);
    entree = Buffer.from(await rep.arrayBuffer());
  }
  for (const largeur of [1600, 800]) {
    const dest = resolve(SORTIE, `${page}-${largeur}.webp`);
    const info = await sharp(entree, { failOn: 'none' }).rotate()
      .resize({ width: largeur, height: Math.round((largeur * 9) / 16), fit: 'cover', position: p.position ?? 'attention' })
      .webp({ quality: largeur > 1000 ? 74 : 72 })
      .toFile(dest);
    console.log(`${dest.replace(`${RACINE}/`, '')} : ${Math.round(info.size / 1024)} Ko`);
  }
}
