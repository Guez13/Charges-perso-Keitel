import { describe, it, expect } from 'vitest';
import {
  detectEcartPrix,
  detectEcartQuantite,
  detectNonLivre,
  detectPrixNegocieInconnu,
  detectDoublons,
  detectAnomalies,
  eligibleReclamation,
  type LigneEnrichie,
} from './anomalies';

function ligne(over: Partial<LigneEnrichie> = {}): LigneEnrichie {
  return {
    id: 'l1',
    code_article: 'A1',
    quantite: 2,
    prix_unitaire_ht: 10,
    montant_ht: 20,
    prix_unite_base: 10, // 1 colis = 1 kg pour simplifier
    quantite_base: 1,
    score_confiance: 0.95,
    ...over,
  };
}

describe('detectEcartPrix', () => {
  it('détecte un écart de prix > 1 %', () => {
    const a = detectEcartPrix(ligne({ prix_unite_base: 11, quantite_base: 1 }), 10);
    expect(a?.type).toBe('ecart_prix');
    expect(a?.montant_impact).toBe(2); // (11-10) × (2 × 1)
  });

  it('ignore un écart sous les seuils (0,5 % et < 0,50 €)', () => {
    expect(detectEcartPrix(ligne({ prix_unite_base: 10.02 }), 10)).toBeNull();
  });

  it('déclenche sur écart absolu > 0,50 € même si < 1 %', () => {
    const a = detectEcartPrix(ligne({ prix_unite_base: 100.6, quantite_base: 1 }), 100);
    expect(a?.type).toBe('ecart_prix');
  });

  it('ne réclame RIEN si le prix à l’unité de base est indisponible', () => {
    expect(detectEcartPrix(ligne({ prix_unite_base: null }), 10)).toBeNull();
  });

  it('ignore quand le prix facturé est ≤ négocié', () => {
    expect(detectEcartPrix(ligne({ prix_unite_base: 9 }), 10)).toBeNull();
  });
});

describe('detectEcartQuantite', () => {
  it('chiffre le delta quantité', () => {
    const a = detectEcartQuantite(ligne({ quantite: 5, quantite_recue: 3 }));
    expect(a?.montant_impact).toBe(20); // (5-3) × 10
  });
  it('rien si la quantité reçue n’est pas renseignée', () => {
    expect(detectEcartQuantite(ligne())).toBeNull();
  });
});

describe('detectNonLivre', () => {
  it('impact = montant HT de la ligne', () => {
    const a = detectNonLivre(ligne({ non_recue: true }));
    expect(a?.montant_impact).toBe(20);
  });
});

describe('detectPrixNegocieInconnu', () => {
  it('impact 0, invitation à saisir', () => {
    const a = detectPrixNegocieInconnu(ligne(), null);
    expect(a?.type).toBe('prix_negocie_inconnu');
    expect(a?.montant_impact).toBe(0);
  });
});

describe('detectDoublons', () => {
  it('flague les occurrences en trop', () => {
    const dups = detectDoublons([
      ligne({ id: 'a' }),
      ligne({ id: 'b' }), // même code/quantité/prix → doublon
      ligne({ id: 'c', code_article: 'A2' }),
    ]);
    expect(dups).toHaveLength(1);
    expect(dups[0].ligne_facture_id).toBe('b');
  });
});

describe('detectAnomalies (orchestrateur)', () => {
  it('agrège les types sur un lot', () => {
    const lignes = [
      ligne({ id: 'a', prix_unite_base: 12, quantite_base: 1 }), // ecart_prix
      ligne({ id: 'b', code_article: 'B', non_recue: true }), // non livré
    ];
    const anos = detectAnomalies(lignes, (l) => (l.code_article === 'A1' ? 10 : null));
    const types = anos.map((a) => a.type).sort();
    expect(types).toContain('ecart_prix');
    expect(types).toContain('produit_non_livre');
    expect(types).toContain('prix_negocie_inconnu'); // ligne B sans prix négocié
  });
});

describe('eligibleReclamation', () => {
  it('refuse un score < 0,85', () => {
    expect(eligibleReclamation({ score_confiance: 0.8 }, true)).toBe(false);
  });
  it('refuse si la facture ne boucle pas', () => {
    expect(eligibleReclamation({ score_confiance: 0.99 }, false)).toBe(false);
  });
  it('accepte score ≥ 0,85 et facture qui boucle', () => {
    expect(eligibleReclamation({ score_confiance: 0.85 }, true)).toBe(true);
  });
});
