// Épingles Pinterest (1000 × 1500) composées à partir des photos et schémas du site, sans génération d'image :
// public/images/pinterest/<nom>.jpg, plus docs/pinterest.csv (import groupé Pinterest : titre, image, lien, description).
// Usage : node scripts/epingles.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const SITE = 'https://www.optiled.fr/';
const TABLEAU = 'Culture indoor sous LED';
// [nom, titre, image source, adresse, description, schéma (true = image entière, sans recadrage)]
const EPINGLES = [
  ['heures-de-lumiere', "Combien d'heures de lumière pour vos plantes d'intérieur ?", 'guides/conseil-heures-de-lumiere-par-jour', 'conseil-heures-de-lumiere-par-jour.html', "Salades, aromatiques, tomates : la bonne durée d'éclairage sous LED, et pourquoi ne jamais éclairer 24 h sur 24.", false],
  ['hauteur-lampe', 'À quelle hauteur placer sa lampe LED ?', 'guides/conseil-hauteur-lampe-led', 'conseil-hauteur-lampe-led.html', 'Distance conseillée entre la lampe et les plantes selon le type de lampe, et comment la régler en observant les feuilles.', false],
  ['blanche-ou-rose', 'LED blanche ou LED rose : laquelle choisir ?', 'guides/conseil-lumiere-blanche-ou-rose', 'conseil-lumiere-blanche-ou-rose.html', 'Plein spectre blanc ou rouge et bleu : ce que chacune apporte aux plantes et pourquoi le blanc est le choix le plus simple.', false],
  ['legumes-faciles', 'Les légumes les plus faciles à cultiver en intérieur', 'guides/conseil-legumes-faciles-debutant', 'conseil-legumes-faciles-debutant.html', 'Micro-pousses, salades, roquette, basilic, ciboulette : par quoi commencer sous LED, avec les délais de récolte.', false],
  ['tomates-appartement', "Des tomates en appartement toute l'année ?", 'guides/conseil-tomates-en-appartement', 'conseil-tomates-en-appartement.html', 'Variétés, lumière, température et pollinisation : ce qu’il faut pour récolter des tomates en intérieur sous LED.', false],
  ['hydroponie-ou-terreau', 'Hydroponie ou terreau : que choisir pour débuter ?', 'guides/conseil-hydroponie-ou-terreau', 'conseil-hydroponie-ou-terreau.html', 'Avantages et contraintes de chaque méthode pour une première culture en intérieur, et la méthode Kratky pour essayer.', false],
  ['moucherons', 'Moucherons dans les pots : les solutions sans insecticide', 'guides/conseil-moucherons-dans-les-pots', 'conseil-moucherons-dans-les-pots.html', 'Reconnaître les sciarides et s’en débarrasser : arrosage, pièges jaunes, sable et auxiliaires.', false],
  ['potager-connecte', "Potager d'intérieur connecté : lequel choisir ?", 'guides/conseil-potager-interieur-connecte', 'conseil-potager-interieur-connecte.html', 'Ce que vaut vraiment la lampe des potagers connectés, pour quelles cultures, et quand une réglette LED fait mieux.', false],
  ['debuter', 'Débuter : salades et aromatiques sous LED', 'culture/demarrer-installation', 'debuter.html', 'Une étagère, une réglette LED et quelques pots : quoi semer, quoi acheter et que faire semaine après semaine.', true],
  ['temperatures', 'Quelle température pour cultiver en intérieur ?', 'culture/climat-temperatures', 'culture-climat.html#temperature', 'Légumes feuilles 15 à 22 °C, légumes fruits 20 à 29 °C : les bonnes plages de température, jour et nuit.', true],
  ['semis-repiquage', 'Du semis au repiquage, étape par étape', 'culture/semis-etapes', 'culture-semis.html#repiquage', 'Semis, levée, premières vraies feuilles, repiquage : le bon moment pour chaque étape sous LED.', true],
  ['feuilles-malades', 'Feuilles jaunes ou brûlées : que se passe-t-il ?', 'culture/problemes-feuilles', 'culture-problemes.html#symptomes', 'Manque d’azote, pH trop élevé, trop de lumière, solution trop concentrée : lire les symptômes sur les feuilles.', true],
];

const echapper = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/'/g, '&#39;');
function lignes(texte, max) {
  const mots = texte.split(' ');
  const res = [''];
  for (const m of mots) {
    const l = res[res.length - 1];
    if ((l + ' ' + m).trim().length > max) res.push(m);
    else res[res.length - 1] = (l + ' ' + m).trim();
  }
  return res;
}

mkdirSync('public/images/pinterest', { recursive: true });
const csv = ['Title,Media URL,Pinterest board,Description,Link'];
for (const [nom, titre, source, lien, description, schema] of EPINGLES) {
  const HAUT = 900;
  const image = schema
    ? await sharp(`public/images/${source}-1600.webp`).resize(1000, 563).toBuffer()
    : await sharp(`public/images/${source}-1600.webp`).resize(1000, HAUT, { fit: 'cover' }).toBuffer();
  const yImage = schema ? 280 : 0;
  const tl = lignes(titre, 22);
  const yTitre = 1010;
  const texte = tl.map((l, i) => `<text x="70" y="${yTitre + i * 78}" font-family="Helvetica, Arial, sans-serif" font-size="66" font-weight="700" fill="#f5ecf8">${echapper(l)}</text>`).join('');
  const fond = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1500">
    <defs><linearGradient id="b" x1="0" x2="1"><stop offset="0" stop-color="#5b7cff"/><stop offset=".5" stop-color="#c26bff"/><stop offset="1" stop-color="#ff4d6d"/></linearGradient></defs>
    <rect width="1000" height="1500" fill="#1f1428"/>
    ${schema ? `<text x="70" y="200" font-family="Helvetica, Arial, sans-serif" font-size="40" font-weight="700" fill="#f39a5b">Schéma</text>` : ''}
    <rect x="70" y="${yTitre - 95}" width="130" height="10" rx="5" fill="url(#b)"/>
    ${texte}
    <text x="70" y="1400" font-family="Helvetica, Arial, sans-serif" font-size="36" font-weight="700" fill="#f5ecf8">OptiLED</text>
    <text x="235" y="1400" font-family="Helvetica, Arial, sans-serif" font-size="32" fill="#f39a5b">· guide gratuit sur optiled.fr</text>
  </svg>`);
  await sharp(fond).composite([{ input: image, left: 0, top: yImage }]).jpeg({ quality: 84, mozjpeg: true }).toFile(`public/images/pinterest/${nom}.jpg`);
  const c = (s) => `"${s.replace(/"/g, '""')}"`;
  csv.push([c(titre), c(`${SITE}images/pinterest/${nom}.jpg`), c(TABLEAU), c(description), c(`${SITE}${lien}`)].join(','));
}
writeFileSync('docs/pinterest.csv', csv.join('\n') + '\n');
console.log(`${EPINGLES.length} épingles`);
