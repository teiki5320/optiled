/**
 * Page « Les meilleures lampes LED de culture » : filtre par installation, tri, tri du tableau et
 * comparaison côte à côte (2 ou 3 lampes). La page est complète sans ce script : il ne fait
 * qu'afficher ces commandes (cachées par défaut) et réordonner ce qui est déjà là.
 */
import './site.ts';
import './meilleures-lampes.css';

type Cle = 'rang' | 'eff' | 'ppf' | 'w';
const MAX_COMPARAISON = 3;

const nombre = (el: HTMLElement, cle: Cle) => Number(el.dataset[cle] ?? 0);
/** Rang croissant ; les chiffres du plus grand au plus petit, sauf la puissance (la plus sobre d'abord). */
const ordre = (cle: Cle) => (a: HTMLElement, b: HTMLElement) => (cle === 'rang' || cle === 'w' ? nombre(a, cle) - nombre(b, cle) : nombre(b, cle) - nombre(a, cle));

function trier(parent: Element, selecteur: string, cle: Cle): void {
  const elements = [...parent.querySelectorAll<HTMLElement>(selecteur)];
  elements.sort(ordre(cle)).forEach((el) => parent.appendChild(el));
}

function listeEtFiltres(): void {
  const liste = document.querySelector<HTMLElement>('[data-liste]');
  if (!liste) return;
  const cartes = [...liste.querySelectorAll<HTMLElement>('.lampe-sel')];
  const compte = document.querySelector<HTMLElement>('[data-compte]');
  const puces = [...document.querySelectorAll<HTMLButtonElement>('[data-filtre]')];
  const tri = document.querySelector<HTMLSelectElement>('[data-tri-liste]');

  puces.forEach((puce) =>
    puce.addEventListener('click', () => {
      const filtre = puce.dataset.filtre ?? '';
      puces.forEach((p) => p.setAttribute('aria-pressed', String(p === puce)));
      let visibles = 0;
      for (const c of cartes) {
        c.hidden = Boolean(filtre) && c.dataset.besoin !== filtre;
        if (!c.hidden) visibles++;
      }
      if (compte) compte.textContent = filtre ? `${visibles} lampe${visibles > 1 ? 's' : ''} pour « ${puce.textContent} »` : `${visibles} lampes`;
    }),
  );
  tri?.addEventListener('change', () => trier(liste, '.lampe-sel', tri.value as Cle));

  document.querySelector<HTMLElement>('.selection__filtres')?.removeAttribute('hidden');
  document.querySelector<HTMLElement>('.selection__tri')?.removeAttribute('hidden');
}

function triTableau(): void {
  const corps = document.querySelector('.tableau--selection tbody');
  if (!corps) return;
  document.querySelectorAll<HTMLTableCellElement>('.tableau--selection th[data-tri]').forEach((th) => {
    const bouton = th.querySelector<HTMLButtonElement>('button.tri');
    if (!bouton) return;
    bouton.hidden = false;
    th.querySelector('.tri-texte')?.remove();
    bouton.addEventListener('click', () => {
      const actif = th.getAttribute('aria-sort') === 'descending';
      document.querySelectorAll('.tableau--selection th[aria-sort]').forEach((x) => x.removeAttribute('aria-sort'));
      if (actif) {
        trier(corps, 'tr', 'rang');
      } else {
        trier(corps, 'tr', th.dataset.tri as Cle);
        th.setAttribute('aria-sort', th.dataset.tri === 'w' ? 'ascending' : 'descending');
      }
    });
  });
}

function comparaison(): void {
  const barre = document.querySelector<HTMLElement>('[data-comparateur]');
  const dialogue = document.querySelector<HTMLDialogElement>('[data-comparaison]');
  const grille = document.querySelector<HTMLElement>('[data-comparaison-grille]');
  if (!barre || !dialogue || !grille || typeof dialogue.showModal !== 'function') return;
  const choisies: HTMLElement[] = [];
  const boutons = [...document.querySelectorAll<HTMLButtonElement>('.lampe-sel__comparer')];

  const majBarre = () => {
    barre.hidden = choisies.length === 0;
    barre.querySelector('[data-comparateur-compte]')!.textContent = `${choisies.length} sélectionnée${choisies.length > 1 ? 's' : ''}`;
    barre.querySelector('[data-comparateur-noms]')!.textContent = choisies.map((c) => c.dataset.nom).join(' · ');
    (barre.querySelector('[data-comparateur-ouvrir]') as HTMLButtonElement).disabled = choisies.length < 2;
    for (const b of boutons) {
      const carte = b.closest<HTMLElement>('.lampe-sel')!;
      const pris = choisies.includes(carte);
      b.setAttribute('aria-pressed', String(pris));
      b.textContent = pris ? '✓ À comparer' : '+ Comparer';
      b.disabled = !pris && choisies.length >= MAX_COMPARAISON;
    }
  };

  for (const b of boutons) {
    b.hidden = false;
    b.addEventListener('click', () => {
      const carte = b.closest<HTMLElement>('.lampe-sel')!;
      const i = choisies.indexOf(carte);
      if (i >= 0) choisies.splice(i, 1);
      else if (choisies.length < MAX_COMPARAISON) choisies.push(carte);
      majBarre();
    });
  }
  document.querySelector('.selection__astuce')?.removeAttribute('hidden');

  barre.querySelector('[data-comparateur-vider]')?.addEventListener('click', () => {
    choisies.length = 0;
    majBarre();
  });
  barre.querySelector('[data-comparateur-ouvrir]')?.addEventListener('click', () => {
    grille.replaceChildren(
      ...choisies.map((carte) => {
        const bloc = document.createElement('div');
        bloc.className = 'comparaison__lampe';
        const vignette = carte.querySelector('.selection__vignette')?.cloneNode(true);
        const titre = document.createElement('h3');
        titre.textContent = carte.dataset.nom ?? '';
        const chiffres = document.createElement('dl');
        for (const j of carte.querySelectorAll('.jauge p')) {
          const [nom, valeur] = j.querySelectorAll('span, strong');
          chiffres.insertAdjacentHTML('beforeend', '<div><dt></dt><dd></dd></div>');
          chiffres.lastElementChild!.querySelector('dt')!.textContent = nom.textContent;
          chiffres.lastElementChild!.querySelector('dd')!.textContent = valeur.textContent;
        }
        const ideal = carte.querySelector('.lampe-sel__ideal')?.cloneNode(true);
        const achat = carte.querySelector('.achat')?.cloneNode(true);
        bloc.append(...([vignette, titre, chiffres, ideal, achat].filter(Boolean) as Node[]));
        return bloc;
      }),
    );
    dialogue.showModal();
  });
  dialogue.querySelector('[data-comparaison-fermer]')?.addEventListener('click', () => dialogue.close());
  // Clic sur le fond sombre : ferme la fenêtre.
  dialogue.addEventListener('click', (e) => {
    if (e.target === dialogue) dialogue.close();
  });
}

listeEtFiltres();
triTableau();
comparaison();
