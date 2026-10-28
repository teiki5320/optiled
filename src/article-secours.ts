/**
 * Page de secours des articles d'actus (actus/article/?id=<id>, noindex, hors sitemap) : affiche,
 * dans le navigateur, l'article d'une actu publiée après la dernière construction du site.
 * Si l'article a déjà sa page construite, on y renvoie. Identifiant inconnu ou fichier
 * injoignable : message simple et lien vers la page Actus. Le texte est toujours inséré avec
 * textContent (jamais innerHTML).
 */
import { articleValide, autresSources, BASE_VEILLE, cheminArticle, dateArticle, fichesLiees, idDepuisRecherche, minutesLecture, nomDomaine, type ArticleVeille, type FicheLiee } from './article.ts';
import { typographier } from './typo.ts';
import { carteActu, chargerFichier, racineSite, SLUGS_CONSTRUITS, texteCredit } from './veille.ts';

const DELAI_MS = 8000;

function el<K extends keyof HTMLElementTagNameMap>(balise: K, classe?: string, texte?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(balise);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = typographier(texte);
  return e;
}

function lienExterne(href: string, texte: string): HTMLAnchorElement {
  const a = el('a', undefined, `${texte}\u00a0↗`);
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener nofollow';
  return a;
}

export async function chargerArticle(id: string, base = BASE_VEILLE): Promise<ArticleVeille | null> {
  try {
    const rep = await fetch(new URL(cheminArticle(id), base), { signal: AbortSignal.timeout(DELAI_MS), cache: 'no-cache' });
    if (!rep.ok) return null;
    const brut: unknown = await rep.json();
    return articleValide(brut, id) ? brut : null;
  } catch {
    return null;
  }
}

function fichesDuSite(): Record<string, FicheLiee> {
  try {
    return JSON.parse(document.getElementById('fiches-du-site')?.textContent ?? '{}') as Record<string, FicheLiee>;
  } catch {
    return {};
  }
}

function introuvable(conteneur: HTMLElement, racine: string): void {
  const titre = document.querySelector<HTMLElement>('[data-a-titre]');
  if (titre) titre.textContent = 'Article introuvable';
  document.title = 'Article introuvable — Actus Kultiled';
  const p = el('p', undefined, 'Cet article n’existe pas ou n’est plus disponible. Les autres actus vous attendent.');
  const lien = el('a', 'bouton bouton--plein', 'Voir toutes les actus');
  lien.href = `${racine}actus.html`;
  const p2 = el('p');
  p2.append(lien);
  conteneur.replaceChildren(p, p2);
}

function afficher(a: ArticleVeille, conteneur: HTMLElement, racine: string): void {
  document.title = `${a.titre} — Actus Kultiled`;
  const titre = document.querySelector<HTMLElement>('[data-a-titre]');
  if (titre) titre.textContent = typographier(a.titre);
  const fil = document.querySelector<HTMLElement>('[data-a-fil]');
  if (fil) fil.textContent = typographier(a.titre);
  const chapo = document.querySelector<HTMLElement>('[data-a-chapo]');
  if (chapo) {
    chapo.textContent = typographier(a.chapo);
    chapo.hidden = false;
  }
  const date = document.querySelector<HTMLElement>('[data-a-date]');
  const texteDate = dateArticle(a.publie_le);
  if (date && texteDate) {
    const t = date.querySelector('time')!;
    t.dateTime = a.publie_le;
    t.textContent = texteDate;
    date.hidden = false;
  }
  const lecture = document.querySelector<HTMLElement>('[data-a-lecture]');
  if (lecture) {
    lecture.querySelector('span')!.textContent = String(minutesLecture(a));
    lecture.hidden = false;
  }

  const morceaux: HTMLElement[] = [];
  // Image 16:9 (image principale : pas de chargement différé) et son crédit, comme les cartes.
  const figure = el('figure', 'actu-article__figure');
  const cadre = el('div', 'actu-article__image');
  const img = el('img');
  img.src = a.image.url;
  img.alt = a.image.alt;
  img.width = a.image.largeur || 1600;
  img.height = a.image.hauteur || 900;
  img.decoding = 'async';
  cadre.append(img);
  const credit = el('figcaption', 'actu__credit');
  if (a.image.source !== 'carte' && a.image.page) {
    const l = el('a', undefined, texteCredit(a.image));
    l.href = a.image.page;
    l.target = '_blank';
    l.rel = 'noopener nofollow';
    credit.append(l);
  } else credit.textContent = texteCredit(a.image);
  figure.append(cadre, credit);
  morceaux.push(figure);

  for (const b of a.blocs) {
    if (b.intertitre) morceaux.push(el('h2', undefined, b.intertitre));
    for (const p of b.paragraphes) morceaux.push(el('p', undefined, p));
  }

  const sources = el('aside', 'actu-article__sources');
  sources.setAttribute('aria-label', 'Sources');
  const phrase = el('p', undefined, 'Article rédigé par Kultiled à partir de : ');
  const liens = [lienExterne(a.source_url, a.source_nom), ...autresSources(a).map((u) => lienExterne(u, nomDomaine(u)))];
  liens.forEach((l, i) => {
    if (i > 0) phrase.append(i === liens.length - 1 ? ' et ' : ', ');
    phrase.append(l);
  });
  phrase.append('.');
  sources.append(el('p', 'actu-article__sources-titre', 'Sources'), phrase);
  morceaux.push(sources);

  const liees = fichesLiees(a.tags, fichesDuSite());
  if (liees.length) {
    const ul = el('ul', 'actu-article__fiches');
    for (const f of liees) {
      const li = el('li');
      const l = el('a', undefined, `Lire la fiche culture : ${f.nom} →`);
      l.href = `${racine}${f.href}`;
      li.append(l);
      ul.append(li);
    }
    morceaux.push(ul);
  }
  conteneur.replaceChildren(...morceaux);
}

/** « Autres actus » : 3 vignettes, lues dans le fichier des actus (rien si injoignable). */
async function autresActus(id: string, racine: string): Promise<void> {
  const cible = document.querySelector<HTMLElement>('[data-a-autres]');
  if (!cible) return;
  const autres = ((await chargerFichier())?.actus ?? []).filter((a) => a.id !== id).slice(0, 3);
  if (autres.length === 0) return;
  const section = el('section', 'actus actus--autres');
  section.setAttribute('aria-labelledby', 'titre-autres-actus');
  const tete = el('div', 'section__tete');
  const h2 = el('h2', undefined, 'Autres actus');
  h2.id = 'titre-autres-actus';
  const bloc = el('div');
  bloc.append(h2);
  const toutes = el('a', 'actus__toutes', 'Toutes les actus →');
  toutes.href = `${racine}actus.html`;
  tete.append(bloc, toutes);
  const ul = el('ul', 'actus__vignettes');
  for (const a of autres) {
    const li = el('li');
    li.append(carteActu(a, false, 'h3', racine));
    ul.append(li);
  }
  section.append(tete, ul);
  cible.replaceChildren(section);
}

export async function demarrer(): Promise<void> {
  const conteneur = document.querySelector<HTMLElement>('[data-article-secours]');
  if (!conteneur) return;
  const racine = racineSite();
  const id = idDepuisRecherche(location.search);
  const article = id ? await chargerArticle(id) : null;
  if (!id || !article) {
    introuvable(conteneur, racine);
    return;
  }
  // Page construite entre-temps : on y va directement (adresse définitive de l'article).
  if (SLUGS_CONSTRUITS.has(article.slug)) {
    location.replace(`${racine}actus/${article.slug}/`);
    return;
  }
  afficher(article, conteneur, racine);
  await autresActus(id, racine);
}

void demarrer();
