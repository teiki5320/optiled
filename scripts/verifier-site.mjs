// Contrôles du site construit (dist/), lancés par « npm run test:e2e » après le build
// et par les tests (build/site-construit.test.ts) sur les pages rendues.
// 1. Jamais de sujet interdit (plante interdite, drogue) nulle part, même dans le JavaScript.
// 2. Jamais de montant en euros dans un bloc produit Amazon, jamais de « prix relevés sur Amazon ».
// 3. Chaque lien Amazon porte un code de suivi connu.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

/** Mots refusés (écrits avec des crochets pour ne pas se trouver eux-mêmes). */
export const MOTS_INTERDITS = /\b(c[a]nnabis|ch[a]nvre|c[b]d|t[h]c|marij[u]ana|marih[u]ana)\b/i;

/** Fichiers texte du site construit. */
const TEXTES = new Set(['.html', '.xml', '.json', '.txt', '.js', '.css', '.webmanifest', '.svg']);

/** Problèmes d'une page ou d'un fichier texte : liste vide si tout va bien. */
export function problemesTexte(texte, nom, tagsConnus) {
  const problemes = [];
  const mot = texte.match(MOTS_INTERDITS);
  if (mot) problemes.push(`${nom} : mot interdit « ${mot[0]} »`);
  if (/relev[ée]s? sur Amazon|fourchettes? de prix/i.test(texte)) problemes.push(`${nom} : prix relevés sur Amazon`);
  if (extname(nom) === '.html' || !extname(nom)) {
    // Bloc produit : de l'ouverture du bouton « Voir sur Amazon » aux 600 caractères qui le précèdent.
    for (const m of texte.matchAll(/href="https:\/\/www\.amazon\.fr\/[^"]*"/g)) {
      const avant = texte.slice(Math.max(0, m.index - 600), m.index).replace(/<[^>]+>/g, ' ');
      if (/\d\s*(€|euros?\b)/.test(avant)) problemes.push(`${nom} : montant en euros près d'un lien Amazon`);
      const tag = m[0].match(/[?&]tag=([\w-]+)/)?.[1];
      if (!tag || (tagsConnus && !tagsConnus.includes(tag))) problemes.push(`${nom} : lien Amazon sans code de suivi connu (${m[0]})`);
    }
  }
  return problemes;
}

function* fichiers(dossier) {
  for (const n of readdirSync(dossier)) {
    const c = join(dossier, n);
    if (statSync(c).isDirectory()) yield* fichiers(c);
    else yield c;
  }
}

/** Codes de suivi connus : ceux de la table unique src/suivi-amazon.ts. */
export function tagsConnus(racine) {
  const source = readFileSync(join(racine, 'src/suivi-amazon.ts'), 'utf8');
  return [...new Set([...source.matchAll(/'([a-z0-9]+-21)'/g)].map((m) => m[1]))];
}

/** Contrôle tout un dossier construit (dist). */
export function verifierDossier(dossier, tagsConnus) {
  const problemes = [];
  for (const f of fichiers(dossier)) {
    if (!TEXTES.has(extname(f))) continue;
    problemes.push(...problemesTexte(readFileSync(f, 'utf8'), relative(dossier, f), tagsConnus));
  }
  return problemes;
}
