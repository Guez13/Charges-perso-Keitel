import { describe, it, expect } from 'vitest';
import { computeCompteur } from './compteur';

describe('computeCompteur', () => {
  it('détecté = anomalies confirmées et au-delà, hors a_verifier/ignoree', () => {
    const c = computeCompteur(
      [
        { montant_impact: 32.5, statut: 'confirmee' },
        { montant_impact: 21.6, statut: 'reclamee' },
        { montant_impact: 10, statut: 'avoir_recu' },
        { montant_impact: 99, statut: 'a_verifier' }, // exclu
        { montant_impact: 99, statut: 'ignoree' }, // exclu
      ],
      [],
    );
    expect(c.detecte).toBe(64.1);
  });

  it('réclamé = réclamations envoyées et au-delà', () => {
    const c = computeCompteur(
      [],
      [
        { montant_reclame: 54.1, montant_obtenu: 0, statut: 'envoyee' },
        { montant_reclame: 20, montant_obtenu: 20, statut: 'acceptee' },
        { montant_reclame: 999, montant_obtenu: 0, statut: 'brouillon' }, // exclu
      ],
    );
    expect(c.reclame).toBe(74.1);
  });

  it('récupéré = montants obtenus sur acceptées/partielles', () => {
    const c = computeCompteur(
      [],
      [
        { montant_reclame: 54.1, montant_obtenu: 54.1, statut: 'acceptee' },
        { montant_reclame: 30, montant_obtenu: 12, statut: 'partielle' },
        { montant_reclame: 40, montant_obtenu: 0, statut: 'refusee' }, // 0 obtenu
      ],
    );
    expect(c.recupere).toBe(66.1);
  });

  it('compteur vide = zéros', () => {
    expect(computeCompteur([], [])).toEqual({ detecte: 0, reclame: 0, recupere: 0 });
  });
});
