/** Icônes SVG en ligne (trait 2 px, couleur héritée du texte), dessinées sur une grille 24 × 24. */
const TRACES = {
  ampoule: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  pousse: '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
  feuille: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z"/><path d="M2 21c0-3 1.9-5.4 5.1-6"/>',
  goutte: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  thermometre: '<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>',
  insecte: '<rect x="8" y="6" width="8" height="14" rx="4"/><path d="M12 20v-9M8 13H4M20 13h-4M8 9 5 6M16 9l3-3M8 17l-3 3M16 17l3 3M10 6a2 2 0 0 1 4 0"/>',
  livre: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  calcul: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M8 6h8M16 14v4M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01"/>',
  couches: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
  jauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  coche: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  depart: '<circle cx="12" cy="12" r="10"/><path d="m10 8 6 4-6 4z"/>',
  horloge: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  fleche: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  fruit: '<circle cx="12" cy="14" r="7"/><path d="M12 7c0-2 1-4 3-5M12 7c-1.5-1.5-4-2-6-1 1 2 3.5 2.5 6 1Z"/>',
  herbe: '<path d="M12 22V8"/><path d="M12 14c-3 0-6-2-7-6 3 0 6 2 7 6ZM12 11c3 0 6-2 7-6-3 0-6 2-7 6Z"/>',
  graines: '<circle cx="7" cy="16" r="2.5"/><circle cx="16" cy="17" r="2.5"/><circle cx="12" cy="9" r="2.5"/><path d="M12 6.5V3M7 13.5V11M16 14.5V12"/>',
} as const;

export type NomIcone = keyof typeof TRACES;

export function icone(nom: NomIcone, classe = 'icone'): string {
  return `<svg class="${classe}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TRACES[nom]}</svg>`;
}

/** Logo : une barre LED qui éclaire une pousse. `suffixe` rend ses identifiants uniques dans la page (en-tête et pied). */
export function logo(suffixe = ''): string {
  return `<svg class="logo-marque" viewBox="0 0 40 40" aria-hidden="true">
  <defs>
    <linearGradient id="logo-lum${suffixe}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7b0" stop-opacity=".9"/><stop offset="1" stop-color="#ff5fa2" stop-opacity="0"/></linearGradient>
    <linearGradient id="logo-barre${suffixe}" x1="0" x2="1"><stop offset="0" stop-color="#5b7cff"/><stop offset=".5" stop-color="#c26bff"/><stop offset="1" stop-color="#ff4d6d"/></linearGradient>
  </defs>
  <rect width="40" height="40" rx="10" fill="#0f1f16"/>
  <path d="M9 11h22l6 24H3z" fill="url(#logo-lum${suffixe})" opacity=".55"/>
  <rect x="7" y="7" width="26" height="5" rx="2.5" fill="url(#logo-barre${suffixe})"/>
  <path d="M20 34V24" stroke="#7ee2a0" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M20 26c-4.5 0-7-2.5-7.5-6.5 4.5 0 7 2.5 7.5 6.5ZM20 24c4.5 0 7-2.5 7.5-6.5-4.5 0-7 2.5-7.5 6.5Z" fill="#7ee2a0"/>
</svg>`;
}
