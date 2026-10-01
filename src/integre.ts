/**
 * Mode « intégré » du calculateur (index.html?integre=1), affiché dans un cadre (iframe) sur
 * un autre site : sans en-tête ni pied de page, sans liens sponsorisés (l'affiliation Amazon
 * n'est permise que sur le site déclaré), et les liens s'ouvrent dans un nouvel onglet.
 * Code à copier : page integrer.html.
 */

export const PARAMETRE_INTEGRE = 'integre';

export function estIntegre(recherche: string): boolean {
  return new URLSearchParams(recherche).has(PARAMETRE_INTEGRE);
}

/** Ajoute le paramètre du mode intégré à une chaîne de paramètres (sans « ? »). */
export function avecIntegre(params: string): string {
  return params ? `${params}&${PARAMETRE_INTEGRE}=1` : `${PARAMETRE_INTEGRE}=1`;
}

/** Adresse sans le paramètre du mode intégré (lien « ouvrir en grand », partage). */
export function sansIntegre(adresse: string): string {
  const url = new URL(adresse);
  url.searchParams.delete(PARAMETRE_INTEGRE);
  return url.href;
}

/** Met la page en mode intégré : classe sur <html>, bandeau vers le site, liens en nouvel onglet. */
export function activerModeIntegre(): void {
  document.documentElement.classList.add('integre');
  const bandeau = document.createElement('p');
  bandeau.className = 'integre__bandeau';
  bandeau.innerHTML = `<strong>Calculateur LED OptiLED</strong><span>gratuit, sans compte</span><a href="${sansIntegre(location.href)}" target="_blank" rel="noopener">Ouvrir sur optiled.fr ↗</a>`;
  document.getElementById('calculateur')?.prepend(bandeau);
  // Les liens internes (guides, fiches) ne doivent pas naviguer à l'intérieur du cadre.
  document.addEventListener('click', (e) => {
    const lien = (e.target as Element).closest?.('a');
    const href = lien?.getAttribute('href');
    if (lien && href && !href.startsWith('#')) {
      lien.target = '_blank';
      lien.rel = 'noopener';
      if (lien.href.includes(`${PARAMETRE_INTEGRE}=`)) lien.href = sansIntegre(lien.href);
    }
  });
}
