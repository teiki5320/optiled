// Images de partage (Open Graph, 1200 × 630) des onglets du Top 10 : public/images/partage/top-10-<sujet>.jpg,
// composées avec le titre de l'onglet et les illustrations de ses 3 premiers produits, sans génération d'image.
// Usage : node scripts/partage-top10.mjs (à relancer quand le classement change).
import sharp from 'sharp';
import { fichierSujet, sujetsPublies } from '../build/top-10.ts';

const echapper = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
/** Nom court d'un produit : la marque et le modèle, avant la première virgule. */
const court = (nom) => {
  const n = nom.split(',')[0].trim();
  return n.length > 24 ? `${n.slice(0, 23).trim()}…` : n;
};
/** Titre coupé en lignes d'au plus `max` caractères. */
function lignes(texte, max) {
  const res = [''];
  for (const mot of texte.split(' ')) {
    const l = res[res.length - 1];
    if (l && (l + ' ' + mot).length > max) res.push(mot);
    else res[res.length - 1] = l ? `${l} ${mot}` : mot;
  }
  return res;
}

const L = 340, H = 255, X = [60, 430, 800], Y = 215;

for (const s of sujetsPublies()) {
  const trois = s.produits().slice(0, 3);
  const titre = lignes(s.titre.replace(/’/g, "'"), 34);
  const taille = titre.length > 2 ? 44 : 54;
  const textes = titre.map((t, i) => `<text x="60" y="${85 + i * (taille + 8)}" font-family="Helvetica, Arial, sans-serif" font-size="${taille}" font-weight="700" fill="#f5ecf8">${echapper(t)}</text>`).join('');
  const noms = trois
    .map((p, i) => `<text x="${X[i]}" y="${Y + H + 42}" font-family="Helvetica, Arial, sans-serif" font-size="26" font-weight="700" fill="#f5ecf8">${echapper(court(p.nom))}</text>`)
    .join('');
  const fond = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a1830"/><stop offset="1" stop-color="#140d1a"/></linearGradient>
    <linearGradient id="b" x1="0" x2="1"><stop offset="0" stop-color="#5b7cff"/><stop offset=".5" stop-color="#c26bff"/><stop offset="1" stop-color="#ff4d6d"/></linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#f)"/>
  <rect x="60" y="30" width="120" height="8" rx="4" fill="url(#b)"/>
  ${textes}
  ${noms}
  <text x="60" y="590" font-family="Helvetica, Arial, sans-serif" font-size="28" font-weight="700" fill="#f5ecf8">Kultiled</text>
  <text x="174" y="590" font-family="Helvetica, Arial, sans-serif" font-size="24" fill="#c9b8d4">· kultiled.com · notre sélection, illustrations</text>
</svg>`);
  const masque = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${H}"><rect width="${L}" height="${H}" rx="18"/></svg>`);
  const images = await Promise.all(
    trois.map(async (p, i) => {
      const src = `public/${p.image.match(/src="([^"]+)"/)[1].replace('-400.webp', '-800.webp')}`;
      const img = await sharp(src).resize(L, H, { fit: 'cover' }).composite([{ input: masque, blend: 'dest-in' }]).png().toBuffer();
      return { input: img, left: X[i], top: Y };
    }),
  );
  // Les numéros passent au-dessus des images.
  const numeros = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">${trois
    .map((p, i) => `<circle cx="${X[i] + 34}" cy="${Y + 34}" r="26" fill="#f39a5b"/><text x="${X[i] + 34}" y="${Y + 44}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="800" fill="#1b1322">${p.rang}</text>`)
    .join('')}</svg>`);
  const nom = fichierSujet(s).replace(/\.html$/, '');
  await sharp(fond)
    .composite([...images, { input: numeros, left: 0, top: 0 }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(`public/images/partage/${nom}.jpg`);
  console.log(`${nom}.jpg`);
}
