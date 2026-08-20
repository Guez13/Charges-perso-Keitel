import { describe, it, expect } from 'vitest';
import { parseConditionnement, prixUniteBase } from './conditionnement';

// Table de tests dérivée directement de la section 7 du brief.
// Elle est le contrat du parser : elle doit rester verte avant tout le reste.
const cas: Array<{
  input: string;
  unite_base: 'kg' | 'L' | 'pce' | null;
  quantite_base: number | null;
  poids_variable: boolean;
  incertain: boolean;
}> = [
  { input: '6X1L', unite_base: 'L', quantite_base: 6, poids_variable: false, incertain: false },
  { input: 'CS 12X75CL', unite_base: 'L', quantite_base: 9, poids_variable: false, incertain: false },
  { input: 'CT 5KG', unite_base: 'kg', quantite_base: 5, poids_variable: false, incertain: false },
  { input: 'SAC 25KG', unite_base: 'kg', quantite_base: 25, poids_variable: false, incertain: false },
  { input: 'BQ 500G', unite_base: 'kg', quantite_base: 0.5, poids_variable: false, incertain: false },
  { input: 'POCHE 1KG', unite_base: 'kg', quantite_base: 1, poids_variable: false, incertain: false },
  { input: 'SEAU 10KG', unite_base: 'kg', quantite_base: 10, poids_variable: false, incertain: false },
  { input: 'BARQ 2KG', unite_base: 'kg', quantite_base: 2, poids_variable: false, incertain: false },
  { input: 'CAGEOT 5KG', unite_base: 'kg', quantite_base: 5, poids_variable: false, incertain: false },
  { input: 'PLQ 250G', unite_base: 'kg', quantite_base: 0.25, poids_variable: false, incertain: false },
  { input: 'FILET 3KG', unite_base: 'kg', quantite_base: 3, poids_variable: false, incertain: false },
  { input: 'PCE', unite_base: 'pce', quantite_base: 1, poids_variable: false, incertain: false },
  { input: 'AU KG', unite_base: 'kg', quantite_base: 1, poids_variable: false, incertain: false },
  // Poids variable : on n'affiche AUCUN prix/kg sans poids réellement facturé.
  { input: '~2,5KG', unite_base: 'kg', quantite_base: null, poids_variable: true, incertain: false },
  { input: 'PV', unite_base: null, quantite_base: null, poids_variable: true, incertain: false },
  { input: 'POIDS VARIABLE', unite_base: null, quantite_base: null, poids_variable: true, incertain: false },
  // Incertain → confirmation manuelle (choix Julien : saisie par le restaurateur).
  { input: 'BTE 4/4', unite_base: null, quantite_base: null, poids_variable: false, incertain: true },
  { input: 'BQ', unite_base: null, quantite_base: null, poids_variable: false, incertain: true },
  { input: '', unite_base: null, quantite_base: null, poids_variable: false, incertain: true },
];

describe('parseConditionnement', () => {
  for (const c of cas) {
    it(`parse "${c.input || '(vide)'}"`, () => {
      const r = parseConditionnement(c.input);
      expect(r.unite_base).toBe(c.unite_base);
      expect(r.quantite_base).toBe(c.quantite_base);
      expect(r.poids_variable).toBe(c.poids_variable);
      expect(r.incertain).toBe(c.incertain);
    });
  }

  it('tolère les espaces et la casse (6 x 1 l)', () => {
    expect(parseConditionnement('6 x 1 l')).toEqual({
      unite_base: 'L',
      quantite_base: 6,
      poids_variable: false,
      incertain: false,
    });
  });
});

describe('prixUniteBase', () => {
  it('divise le prix par la quantité de base', () => {
    const cond = parseConditionnement('CT 5KG'); // 5 kg
    expect(prixUniteBase(50, cond)).toBe(10); // 50€ / 5kg = 10€/kg
  });

  it('ne renvoie AUCUN prix sur conditionnement incertain', () => {
    const cond = parseConditionnement('BTE 4/4');
    expect(prixUniteBase(12, cond)).toBeNull();
  });

  it('ne renvoie AUCUN prix sur poids variable non résolu', () => {
    const cond = parseConditionnement('~2,5KG');
    expect(prixUniteBase(20, cond)).toBeNull();
  });
});
