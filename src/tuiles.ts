/**
 * Tuiles des légumes du calculateur. Module pur, partagé entre le build (tuiles écrites
 * dans la page : rien ne bouge à l'affichage) et le navigateur.
 */
import { legumesParFamille } from './data';

function echapper(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** « Légumes feuilles » → « legumes-feuilles » (même convention que les fiches). */
export function slug(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function htmlTuiles(): string {
  const html: string[] = [];
  for (const [famille, liste] of legumesParFamille()) {
    for (const l of liste) {
      html.push(
        `<button type="button" class="tuile-legume tuile-legume--${slug(famille)}" data-legume="${l.id}" aria-pressed="false">` +
          `<span class="tuile-legume__pastille" aria-hidden="true"><img src="images/legumes/${l.id}.webp" alt="" width="96" height="96" loading="lazy" decoding="async" onerror="this.remove()" /></span>${echapper(l.nom.replace(/\s*\(.*\)$/, ''))}</button>`,
      );
    }
  }
  return html.join('');
}
