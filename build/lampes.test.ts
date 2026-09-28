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
