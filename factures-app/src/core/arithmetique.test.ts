import { describe, it, expect } from 'vitest';
import { controleArithmetique } from './arithmetique';

describe('controleArithmetique', () => {
  it('valide une facture qui boucle exactement', () => {
    const r = controleArithmetique(
      [
        { quantite: 2, prix_unitaire_ht: 10, montant_ht: 20 },
        { quantite: 3, prix_unitaire_ht: 5, montant_ht: 15 },
      ],
      35,
    );
    expect(r.ok).toBe(true);
    expect(r.somme_lignes).toBe(35);
    expect(r.ecart_total).toBe(0);
    expect(r.lignes_incoherentes).toEqual([]);
  });

  it('tolère un écart d’arrondi de 0,02 €', () => {
    const r = controleArithmetique(
      [{ quantite: 1, prix_unitaire_ht: 10, montant_ht: 10 }],
      10.02,
    );
    expect(r.ok).toBe(true);
  });

  it('bloque quand la somme ne colle pas au total', () => {
    const r = controleArithmetique(
      [{ quantite: 1, prix_unitaire_ht: 10, montant_ht: 10 }],
      99,
    );
    expect(r.ok).toBe(false);
    expect(r.ecart_total).toBe(89);
  });

  it('repère une ligne incohérente (quantité × prix ≠ montant)', () => {
    const r = controleArithmetique(
      [
        { quantite: 2, prix_unitaire_ht: 10, montant_ht: 20 },
        { quantite: 2, prix_unitaire_ht: 10, montant_ht: 25 }, // faux
      ],
      45,
    );
    expect(r.ok).toBe(false);
    expect(r.lignes_incoherentes).toEqual([1]);
  });

  it('ne valide jamais sans total_ht', () => {
    const r = controleArithmetique(
      [{ quantite: 1, prix_unitaire_ht: 10, montant_ht: 10 }],
      null,
    );
    expect(r.ok).toBe(false);
    expect(r.ecart_total).toBeNull();
  });

  it('ne valide jamais une facture vide', () => {
    expect(controleArithmetique([], 0).ok).toBe(false);
  });
});
