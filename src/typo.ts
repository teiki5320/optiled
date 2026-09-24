/**
 * Typographie française, partagée entre le build (pages) et le navigateur (texte du calculateur).
 */
const UNITES = ['°C', '°', '%', 'kWh', 'kW', 'Wh', 'W', 'µmol', 'mol', 'kPa', 'mS', 'cm', 'mm', 'm²', 'm³', 'm', 'nm', 'h', 'j', 's', '€', 'L', 'l', 'lm', 'lx', 'ml', 'mL', 'kg', 'g', 'ppm', 'K'];
const FIN_UNITE = UNITES.map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

/**
 * Pages entières : espaces insécables devant « ; ? ! : », dans les guillemets,
 * entre un nombre et son unité et dans les milliers (3 600). Seul le texte est touché,
 * pas les balises ni le contenu de script, style, pre, code et textarea.
 */
export function insecables(html: string): string {
  let ignore = 0;
  return html
    .split(/(<[^>]*>)/)
    .map((morceau) => {
      if (morceau.startsWith('<')) {
        const m = /^<(\/?)(script|style|pre|code|textarea)\b/i.exec(morceau);
        if (m) ignore = Math.max(0, ignore + (m[1] ? -1 : 1));
        return morceau;
      }
      if (ignore || !morceau.trim()) return morceau;
      return typographier(morceau);
    })
    .join('');
}

/** Espaces insécables d'un texte brut (sans balises). */
export function typographier(texte: string): string {
  return texte
    .replace(/ ([;?!])/g, '\u202f$1')
    .replace(/ :(?=\s|$)/g, '\u00a0:')
    .replace(/« /g, '«\u00a0')
    .replace(/ »/g, '\u00a0»')
    .replace(/(\d) (?=\d{3}(?!\d))/g, '$1\u202f')
    .replace(new RegExp(`(\\d) (?=(?:${FIN_UNITE})(?![\\p{L}\\d]))`, 'gu'), '$1\u00a0');
}
