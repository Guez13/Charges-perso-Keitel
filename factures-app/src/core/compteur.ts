// ---------------------------------------------------------------------------
// Compteur d'argent récupéré — fonction PURE (section 12).
// Métrique produit centrale : détecté / réclamé / récupéré.
// ---------------------------------------------------------------------------

import type { StatutAnomalie, StatutReclamation } from './statuts';

export interface AnomalieCompteur {
  montant_impact: number;
  statut: StatutAnomalie;
}

export interface ReclamationCompteur {
  montant_reclame: number;
  montant_obtenu: number;
  statut: StatutReclamation;
}

export interface Compteur {
  /** Somme des anomalies confirmées (et au-delà). */
  detecte: number;
  /** Somme des réclamations envoyées (et au-delà). */
  reclame: number;
  /** Somme des montants réellement obtenus (réclamations acceptées/partielles). */
  recupere: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

// Une anomalie compte comme "détectée" dès qu'elle est confirmée (elle ne
// revient jamais à a_verifier). On exclut a_verifier et ignoree.
const ANO_DETECTEES: StatutAnomalie[] = ['confirmee', 'reclamee', 'avoir_recu'];
// Une réclamation compte comme "réclamée" dès qu'elle est envoyée.
const RECLA_ENVOYEES: StatutReclamation[] = ['envoyee', 'acceptee', 'refusee', 'partielle'];
// Le "récupéré" ne compte que ce qui a effectivement été obtenu.
const RECLA_OBTENUES: StatutReclamation[] = ['acceptee', 'partielle'];

export function computeCompteur(
  anomalies: AnomalieCompteur[],
  reclamations: ReclamationCompteur[],
): Compteur {
  const detecte = anomalies
    .filter((a) => ANO_DETECTEES.includes(a.statut))
    .reduce((s, a) => s + a.montant_impact, 0);

  const reclame = reclamations
    .filter((r) => RECLA_ENVOYEES.includes(r.statut))
    .reduce((s, r) => s + r.montant_reclame, 0);

  const recupere = reclamations
    .filter((r) => RECLA_OBTENUES.includes(r.statut))
    .reduce((s, r) => s + r.montant_obtenu, 0);

  return { detecte: round2(detecte), reclame: round2(reclame), recupere: round2(recupere) };
}
