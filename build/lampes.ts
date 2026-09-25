/**
 * Page « Lampes » : la sélection Amazon.fr, groupée par format, générée depuis src/data/lampes.json.
 */
import { LAMPES, LAMPES_VERIFIEES_LE, lienAmazon, MENTION_AFFILIATION, type Lampe } from '../src/lampes.ts';
import { echapper } from './fiches.ts';

const nb = (n: number) => String(n).replace('.', ',');
const m2 = (v: number) => nb(Math.round(v * 100) / 100);

function carte(l: Lampe): string {
  const lumiere = l.ppf === null ? 'PPF non publié' : `${nb(l.ppf)} µmol/s${l.ppf_estime ? ' (estimé)' : ''}`;
  const surface = l.couverture_m2 ? ` · ${m2(l.couverture_m2.croissance)} m² en croissance, ${m2(l.couverture_m2.floraison)} m² en floraison` : '';
  return `<li class="lampe">
  <h3>${echapper(l.nom)}</h3>
  <p class="lampe__note">${nb(l.note)} ★ <span>(${l.avis.toLocaleString('fr-FR').replace(/ /g, ' ')} avis)</span></p>
  <p>${echapper(l.dimensions)} · ${l.puissance_w} W · ${lumiere}${surface} · ${l.variateur ? 'avec variateur' : 'sans variateur'}</p>
  <a class="bouton" href="${lienAmazon(l)}" target="_blank" rel="sponsored noopener">Voir sur Amazon</a>
</li>`;
}

const GROUPES: { titre: string; id: string; filtre: (l: Lampe) => boolean }[] = [
  { titre: 'Barres pour étagères', id: 'barres', filtre: (l) => l.type === 'barre' && l.ppf !== null },
  { titre: "Lampes d'appoint (semis, aromatiques)", id: 'appoint', filtre: (l) => l.type === 'appoint' },
  { titre: 'Petits panneaux (environ 60 × 60 cm)', id: 'petits', filtre: (l) => l.type === 'panneau' && l.ppf !== null && l.puissance_w <= 100 },
  { titre: 'Panneaux moyens (environ 70 × 70 à 90 × 120 cm)', id: 'moyens', filtre: (l) => l.type === 'panneau' && l.ppf !== null && l.puissance_w > 100 && l.puissance_w <= 300 },
  { titre: 'Grands panneaux (environ 120 × 120 cm)', id: 'grands', filtre: (l) => l.type === 'panneau' && l.ppf !== null && l.puissance_w > 300 },
  { titre: 'Autres modèles populaires (chiffres incomplets)', id: 'autres', filtre: (l) => l.ppf === null },
];

export function dateVerification(): string {
  const [a, m, j] = LAMPES_VERIFIEES_LE.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, j)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function rendreLampes(): string {
  const sections = GROUPES.map((g) => {
    const liste = LAMPES.filter(g.filtre);
    if (liste.length === 0) return '';
    const note = g.id === 'autres' ? "<p>Très vendus et bien notés, mais le fabricant ne publie pas assez de chiffres (PPF ou efficacité) pour que le calculateur les propose : il faut alors se fier aux mesures de PPFD de l'annonce.</p>" : '';
    return `<h2 id="${g.id}">${g.titre}</h2>\n${note}<ul class="lampes">${liste.map(carte).join('\n')}</ul>`;
  }).join('\n');
  return `${sections}
<p class="aide">Notes relevées sur Amazon.fr le ${dateVerification()}. ${MENTION_AFFILIATION}</p>`;
}
