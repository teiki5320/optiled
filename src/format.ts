const cache = new Map<number, Intl.NumberFormat>();

/** Formate un nombre à la française (espace des milliers, virgule décimale). */
export function nombre(v: number, decimales = 0): string {
  let f = cache.get(decimales);
  if (!f) {
    f = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
    cache.set(decimales, f);
  }
  // Remplace les espaces insécables fines par des espaces insécables classiques (copie/impression).
  return f.format(v).replace(/ /g, ' ');
}

export function euros(v: number): string {
  return `${nombre(v, 2)} €`;
}
