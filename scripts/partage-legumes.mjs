// Images de partage (Open Graph, 1200 × 630) des fiches cultures : public/images/partage/legume-<id>.jpg,
// composées à partir de la miniature de chaque culture (public/images/legumes/<id>.webp), sans génération d'image.
// Usage : node scripts/partage-legumes.mjs
import { existsSync, readFileSync } from 'node:fs';
import sharp from 'sharp';

const donnees = JSON.parse(readFileSync('src/data/legumes.json', 'utf8'));
const legumes = Array.isArray(donnees) ? donnees : donnees.legumes;
const echapper = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const D = 420;

for (const l of legumes) {
  const miniature = `public/images/legumes/${l.id}.webp`;
  if (!existsSync(miniature)) continue;
  const nom = l.nom.replace(/\s*\(.*\)$/, '');
  const taille = nom.length > 12 ? 64 : 76;
  const fond = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a1830"/><stop offset="1" stop-color="#140d1a"/></linearGradient>
    <linearGradient id="b" x1="0" x2="1"><stop offset="0" stop-color="#5b7cff"/><stop offset=".5" stop-color="#c26bff"/><stop offset="1" stop-color="#ff4d6d"/></linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#f)"/>
  <rect x="80" y="100" width="${D + 20}" height="${D + 20}" rx="${(D + 20) / 2}" fill="#f39a5b" opacity=".35"/>
  <rect x="580" y="170" width="120" height="10" rx="5" fill="url(#b)"/>
  <text x="580" y="275" font-family="Helvetica, Arial, sans-serif" font-size="${taille}" font-weight="700" fill="#f5ecf8">${echapper(nom)}</text>
  <text x="580" y="345" font-family="Helvetica, Arial, sans-serif" font-size="36" fill="#f39a5b">en intérieur sous LED</text>
  <text x="580" y="410" font-family="Helvetica, Arial, sans-serif" font-size="28" fill="#c9b8d4">Lumière, climat et conseils de culture</text>
  <text x="580" y="520" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="700" fill="#f5ecf8">OptiLED</text>
  <text x="712" y="520" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="#c9b8d4">· optiled.fr</text>
</svg>`);
  const masque = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${D}" height="${D}"><circle cx="${D / 2}" cy="${D / 2}" r="${D / 2}"/></svg>`);
  const rond = await sharp(miniature).resize(D, D, { fit: 'cover' }).composite([{ input: masque, blend: 'dest-in' }]).png().toBuffer();
  await sharp(fond).composite([{ input: rond, left: 90, top: 110 }]).jpeg({ quality: 82, mozjpeg: true }).toFile(`public/images/partage/legume-${l.id}.jpg`);
  console.log(`legume-${l.id}.jpg`);
}
