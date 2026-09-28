// Génère les icônes du site à partir du logo (build/icones.ts) :
// public/favicon.svg, public/favicon.ico (PNG 48 px dans un conteneur ICO) et public/icones/favicon-96.png.
// Usage : node scripts/favicon.mjs
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { logo } from '../build/icones.ts';

const svg = logo().replace('class="logo-marque" ', 'xmlns="http://www.w3.org/2000/svg" ').replace(' aria-hidden="true"', '');
writeFileSync('public/favicon.svg', svg);
await sharp(Buffer.from(svg)).resize(96, 96).png().toFile('public/icones/favicon-96.png');
const png = await sharp(Buffer.from(svg)).resize(48, 48).png().toBuffer();
// En-tête ICO (6 octets) + une entrée de répertoire (16 octets), puis l'image PNG.
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
console.log('favicon.svg, favicon.ico, icones/favicon-96.png');
