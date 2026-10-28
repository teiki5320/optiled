import { describe, expect, it } from 'vitest';
import { rendreLampes } from './lampes.ts';

describe('page « Lampes »', () => {
  it("n'affiche ni note ni nombre d'avis Amazon", () => {
    const html = rendreLampes();
    expect(html).toContain('<li class="lampe">');
    expect(html).not.toContain('★');
    expect(html).not.toMatch(/\d\s*avis\b/);
    expect(html).not.toContain('lampe__note');
  });
});

describe('produits indisponibles', () => {
  it("une lampe indisponible n'apparaît pas : jamais de produit sans bouton d'achat utilisable", async () => {
    const { LAMPES } = await import('../src/lampes.ts');
    const html = rendreLampes();
    for (const l of LAMPES.filter((x) => x.disponible === false)) expect(html, l.id).not.toContain(l.asin);
    for (const l of LAMPES.filter((x) => x.disponible !== false)) expect(html, l.id).toContain(`/dp/${l.asin}?`);
    const cartes = html.match(/<li class="lampe">/g)?.length ?? 0;
    expect(html.match(/>Voir sur Amazon</g)?.length).toBe(cartes);
  });
});
