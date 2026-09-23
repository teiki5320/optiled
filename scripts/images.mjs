// Convertit des photos sources (PNG/JPG) en WebP optimisés pour le site.
// Usage : node scripts/images.mjs <dossier-source>
// Chaque fichier <nom>.png donne public/images/guides/<nom>-1600.webp et <nom>-800.webp.
import { readdirSync, mkdirSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import sharp from 'sharp';

const source = process.argv[2];
if (!source) {
  console.error('Usage : node scripts/images.mjs <dossier-source>');
  process.exit(1);
}
const sortie = resolve('public/images/guides');
mkdirSync(sortie, { recursive: true });

for (const f of readdirSync(source).filter((f) => /\.(png|jpe?g)$/i.test(f))) {
  const nom = basename(f, extname(f));
  for (const largeur of [1600, 800]) {
    const dest = join(sortie, `${nom}-${largeur}.webp`);
    const info = await sharp(join(source, f))
      .resize({ width: largeur, height: Math.round((largeur * 9) / 16), fit: 'cover' })
      .webp({ quality: largeur > 1000 ? 74 : 72 })
      .toFile(dest);
    console.log(`${dest.replace(process.cwd() + '/', '')} : ${Math.round(info.size / 1024)} Ko`);
  }
}
