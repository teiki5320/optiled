import { describe, expect, it } from 'vitest';
import { depuisParams, versParams } from './etat.ts';

describe('état du calculateur dans l’adresse', () => {
  it('aller-retour sans perte', () => {
    const etat = { legume: 'tomate', stade: 'floraison', mode: 'rangs', 'nb-rangs': '3', 'longueur-rang': '2,4', 'prix-kwh': '0,2' };
    expect(depuisParams(versParams(etat))).toEqual(etat);
  });

  it('noms courts dans l’adresse', () => {
    expect(versParams({ legume: 'laitue', longueur: '1,2' })).toBe('l=laitue&L=1%2C2');
  });

  it('accepte l’ancien paramètre ?legume=', () => {
    expect(depuisParams('?legume=basilic')).toEqual({ legume: 'basilic' });
  });

  it('ignore les valeurs invalides ou dangereuses', () => {
    expect(depuisParams('l=<script>&s=autre&L=abc&W=0,6&h=1e9')).toEqual({ largeur: '0,6' });
    expect(versParams({ legume: 'Tomate!', longueur: '' })).toBe('');
  });
});

describe('nombres avec espaces', () => {
  it('« 1 700 » est gardé dans le lien', () => {
    expect(versParams({ 'lampe-ppf': '1 700' })).toBe('ppf=1700');
    expect(versParams({ 'lampe-ppf': '1 700' })).toBe('ppf=1700');
  });
});
