// Génère les images du logo Kultiled pour le site, à partir des originaux de docs/marque/ :
// public/marque/kultiled-logo.webp (en-tête et pied), public/marque/kultiled-logo-512.png (données structurées),
// public/favicon.ico, public/icones/favicon-96.png, apple-touch-icon.png, icone-192.png, icone-512.png, icone-masquable-512.png.
// Usage : node scripts/icones-marque.mjs
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';

const SANS_FOND = 'docs/marque/kultiled-logo-sans-fond.png';
const FOND = '#1b1322'; // couleur de fond du site (manifest)

// Le logo sans fond, centré dans un carré (marge en % du côté), sur fond transparent ou coloré.
async function carre(cote, marge, fond = { r: 0, g: 0, b: 0, alpha: 0 }) {
  const interieur = Math.round(cote * (1 - 2 * marge));
  const logo = await sharp(SANS_FOND).resize(interieur, interieur, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  return sharp({ create: { width: cote, height: cote, channels: 4, background: fond } }).composite([{ input: logo, gravity: 'center' }]);
}

await sharp(SANS_FOND).resize({ height: 160 }).webp({ quality: 90 }).toFile('public/marque/kultiled-logo.webp');
await (await carre(512, 0.04)).png({ palette: true, compressionLevel: 9 }).toFile('public/marque/kultiled-logo-512.png');
await (await carre(96, 0.02)).png().toFile('public/icones/favicon-96.png');
await (await carre(180, 0.1, FOND)).png().toFile('public/icones/apple-touch-icon.png');
await (await carre(192, 0.08, FOND)).png().toFile('public/icones/icone-192.png');
await (await carre(512, 0.08, FOND)).png({ palette: true, compressionLevel: 9 }).toFile('public/icones/icone-512.png');
await (await carre(512, 0.2, FOND)).png({ palette: true, compressionLevel: 9 }).toFile('public/icones/icone-masquable-512.png');

// favicon.ico : PNG 48 px dans un conteneur ICO (en-tête 6 octets + une entrée de 16 octets).
const png = await (await carre(48, 0.02)).png().toBuffer();
const entete = Buffer.alloc(22);
entete.writeUInt16LE(0, 0);
entete.writeUInt16LE(1, 2);
entete.writeUInt16LE(1, 4);
entete.writeUInt8(48, 6);
entete.writeUInt8(48, 7);
entete.writeUInt16LE(1, 10);
entete.writeUInt16LE(32, 12);
entete.writeUInt32LE(png.length, 14);
entete.writeUInt32LE(22, 18);
writeFileSync('public/favicon.ico', Buffer.concat([entete, png]));
console.log('Logo Kultiled : marque/, favicon.ico et icones/ générés');
