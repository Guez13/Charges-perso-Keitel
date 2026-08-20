import type { TypeAnomalie } from './schemas';
import { SEUIL_CONFIANCE } from './schemas';

// ---------------------------------------------------------------------------
// Détection d'anomalies — fonctions PURES (section 8 du brief).
// Une anomalie détectée ne part jamais seule : elle attend la validation du
// restaurateur. Ici on ne fait que détecter et chiffrer l'impact.
// ---------------------------------------------------------------------------

export interface LigneEnrichie {
  id: string;
  code_article: string | null;
  quantite: number;
  prix_unitaire_ht: number;
  montant_ht: number;
  /** Prix ramené à l'unité de base, ou null si non calculable (garde-fou). */
  prix_unite_base: number | null;
  /** Contenu d'un colis dans l'unité de base, ou null. */
  quantite_base: number | null;
  score_confiance: number;
  /** Renseigné par le resto : quantité réellement reçue (optionnel). */
  quantite_recue?: number | null;
  /** Renseigné par le resto : ligne marquée non reçue. */
  non_recue?: boolean;
}

export interface AnomalieDetectee {
  ligne_facture_id: string;
  type: TypeAnomalie;
  montant_impact: number;
  commentaire?: string;
}

export interface SeuilsAnomalies {
  /** Écart de prix relatif déclencheur (défaut 1 %). */
  seuilPct: number;
  /** Écart de prix absolu déclencheur, à l'unité de base (défaut 0,50 €). */
  seuilAbs: number;
}

const SEUILS_DEFAUT: SeuilsAnomalies = { seuilPct: 0.01, seuilAbs: 0.5 };
const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Quantité totale exprimée dans l'unité de base (colis × contenu). */
function quantiteTotaleBase(l: LigneEnrichie): number | null {
  if (l.quantite_base == null) return null;
  return l.quantite * l.quantite_base;
}

/** ecart_prix : prix facturé > prix négocié actif, au-delà des seuils. */
export function detectEcartPrix(
  l: LigneEnrichie,
  prixNegocie: number | null,
  seuils: SeuilsAnomalies = SEUILS_DEFAUT,
): AnomalieDetectee | null {
  if (prixNegocie == null || prixNegocie <= 0) return null;
  // Garde-fou : pas de prix/unité fiable → on ne réclame rien.
  if (l.prix_unite_base == null) return null;

  const diff = l.prix_unite_base - prixNegocie;
  if (diff <= 0) return null;

  const pct = diff / prixNegocie;
  if (pct <= seuils.seuilPct && diff <= seuils.seuilAbs) return null;

  const qteBase = quantiteTotaleBase(l);
  if (qteBase == null) return null;

  return {
    ligne_facture_id: l.id,
    type: 'ecart_prix',
    montant_impact: round2(diff * qteBase),
    commentaire: `Prix facturé ${l.prix_unite_base} > négocié ${prixNegocie} (unité de base)`,
  };
}

/** ecart_quantite : quantité facturée ≠ quantité reçue saisie par le resto. */
export function detectEcartQuantite(l: LigneEnrichie): AnomalieDetectee | null {
  if (l.quantite_recue == null) return null;
  if (l.quantite_recue === l.quantite) return null;
  const delta = l.quantite - l.quantite_recue;
  return {
    ligne_facture_id: l.id,
    type: 'ecart_quantite',
    montant_impact: round2(delta * l.prix_unitaire_ht),
    commentaire: `Facturé ${l.quantite}, reçu ${l.quantite_recue}`,
  };
}

/** produit_non_livre : ligne marquée non reçue par l'utilisateur. */
export function detectNonLivre(l: LigneEnrichie): AnomalieDetectee | null {
  if (!l.non_recue) return null;
  return {
    ligne_facture_id: l.id,
    type: 'produit_non_livre',
    montant_impact: round2(l.montant_ht),
    commentaire: 'Ligne marquée non reçue',
  };
}

/** prix_negocie_inconnu : aucun prix négocié → impact 0, invitation à saisir. */
export function detectPrixNegocieInconnu(
  l: LigneEnrichie,
  prixNegocie: number | null,
): AnomalieDetectee | null {
  if (prixNegocie != null) return null;
  return {
    ligne_facture_id: l.id,
    type: 'prix_negocie_inconnu',
    montant_impact: 0,
    commentaire: 'Aucun prix négocié enregistré pour cette référence',
  };
}

/**
 * doublon_facturation : même code article, même quantité, même prix, plusieurs
 * fois sur le lot de lignes fourni (même facture, ou 2 factures du même jour).
 * On flague les occurrences en trop (toutes sauf la première).
 */
export function detectDoublons(lignes: LigneEnrichie[]): AnomalieDetectee[] {
  const vus = new Map<string, number>();
  const out: AnomalieDetectee[] = [];
  for (const l of lignes) {
    if (!l.code_article) continue;
    const cle = `${l.code_article}|${l.quantite}|${l.prix_unitaire_ht}`;
    const n = vus.get(cle) ?? 0;
    if (n >= 1) {
      out.push({
        ligne_facture_id: l.id,
        type: 'doublon_facturation',
        montant_impact: round2(l.montant_ht),
        commentaire: `Doublon : ${l.code_article} ×${l.quantite} @ ${l.prix_unitaire_ht}`,
      });
    }
    vus.set(cle, n + 1);
  }
  return out;
}

/**
 * Orchestrateur : détecte toutes les anomalies d'un lot de lignes.
 * @param getPrixNegocie renvoie le prix négocié actif (unité de base) d'une ligne, ou null.
 */
export function detectAnomalies(
  lignes: LigneEnrichie[],
  getPrixNegocie: (l: LigneEnrichie) => number | null,
  seuils: SeuilsAnomalies = SEUILS_DEFAUT,
): AnomalieDetectee[] {
  const out: AnomalieDetectee[] = [];
  for (const l of lignes) {
    const prixNego = getPrixNegocie(l);
    const dets = [
      detectEcartPrix(l, prixNego, seuils),
      detectEcartQuantite(l),
      detectNonLivre(l),
      detectPrixNegocieInconnu(l, prixNego),
    ];
    for (const d of dets) if (d) out.push(d);
  }
  out.push(...detectDoublons(lignes));
  return out;
}

/**
 * Une anomalie ne peut alimenter une réclamation AUTOMATIQUE que si la ligne
 * est fiable (score ≥ 0,85) et la facture boucle arithmétiquement.
 * (Sections 6 & 8 du brief.)
 */
export function eligibleReclamation(
  l: Pick<LigneEnrichie, 'score_confiance'>,
  controleArithmetiqueOk: boolean,
): boolean {
  return controleArithmetiqueOk && l.score_confiance >= SEUIL_CONFIANCE;
}
