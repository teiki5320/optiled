import { describe, expect, it } from 'vitest';
import { alertes, type ContexteAlertes } from './alertes';

const base: ContexteAlertes = { legumeId: 'laitue', nom: 'Laitue', stade: 'croissance', photoperiodeH: 16, photoperiodeConseilleeH: 16, longueurBarreM: 1.2, longueurZoneM: 1.2 };

describe('alertes du calculateur', () => {
  it('aucune alerte pour un réglage conseillé', () => {
    expect(alertes(base)).toEqual([]);
  });
  it('tomate au-delà de 18 h', () => {
    expect(alertes({ ...base, legumeId: 'tomate', nom: 'Tomate', photoperiodeH: 20 })[0]).toContain('18 h');
    expect(alertes({ ...base, legumeId: 'tomate', nom: 'Tomate', photoperiodeH: 18 })).toEqual([]);
  });
  it('chanvre : floraison à 12 h, croissance en jours longs', () => {
    expect(alertes({ ...base, legumeId: 'chanvre-cbd', nom: 'Chanvre CBD', stade: 'floraison', photoperiodeH: 18 })[0]).toContain('ne fleurira pas');
    expect(alertes({ ...base, legumeId: 'chanvre-cbd', nom: 'Chanvre CBD', stade: 'floraison', photoperiodeH: 12 })).toEqual([]);
    expect(alertes({ ...base, legumeId: 'chanvre-cbd', nom: 'Chanvre CBD', photoperiodeH: 12 })[0]).toContain('floraison trop tôt');
  });
  it('montaison des cultures de jours longs', () => {
    expect(alertes({ ...base, legumeId: 'epinard', nom: 'Épinard', photoperiodeH: 16, photoperiodeConseilleeH: 12 })[0]).toContain('montée en graines');
  });
  it('photopériode très longue pour toute culture', () => {
    expect(alertes({ ...base, photoperiodeH: 22 })[0]).toContain('obscurité');
  });
  it('barres plus longues que l’installation', () => {
    expect(alertes({ ...base, longueurBarreM: 1.2, longueurZoneM: 0.6 })[0]).toContain('plus longues');
    expect(alertes({ ...base, longueurBarreM: 1.2, longueurZoneM: 1.2 })).toEqual([]);
  });
  it('rang plus étroit que l’espacement', () => {
    expect(alertes({ ...base, rangTropEtroit: { largeurCm: 40, espacementCm: 50 } })[0]).toContain('plus étroits');
  });
});
