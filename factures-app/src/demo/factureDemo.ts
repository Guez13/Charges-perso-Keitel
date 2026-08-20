// ---------------------------------------------------------------------------
// DONNÉES DE DÉMO — uniquement pour faire vivre l'UI tant que la Phase 2 n'a
// pas de vraies factures.
//
// ⚠️ NE JAMAIS utiliser ces données pour calibrer le prompt d'extraction, les
// seuils de confiance ou les règles de conditionnement. La calibration se fait
// EXCLUSIVEMENT sur de vraies factures (règle absolue du brief, section 14).
// Ici : uniquement du rendu d'écrans.
// ---------------------------------------------------------------------------

import {
  controleArithmetique,
  detectAnomalies,
  buildMailReclamation,
  computeCompteur,
  type LigneEnrichie,
  type AnomalieDetectee,
  type LigneEcart,
} from '../core';

export interface DemoLigne extends LigneEnrichie {
  libelle: string;
  conditionnement_brut: string;
  incertain?: boolean;
}

export interface DemoFacture {
  numero: string;
  fournisseur: string;
  prenom_commercial: string;
  date: string;
  total_ht: number;
  lignes: DemoLigne[];
}

// Prix négociés (à l'unité de base) connus pour ce fournisseur.
const PRIX_NEGOCIE: Record<string, number> = {
  BEU250: 6.8, // beurre, €/kg
  HUI1L: 8.2, // huile, €/L
  FAR25: 0.8, // farine, €/kg
};

export const factureDemo: DemoFacture = {
  numero: 'FA-4871',
  fournisseur: 'Transgourmet',
  prenom_commercial: 'Karim',
  date: '15/08/2026',
  total_ht: 895.1,
  lignes: [
    {
      id: 'l-beurre',
      code_article: 'BEU250',
      libelle: 'Beurre doux plaquette',
      conditionnement_brut: '25X250G',
      quantite: 8,
      prix_unitaire_ht: 46.5625,
      montant_ht: 372.5,
      prix_unite_base: 7.45, // > 6,80 négocié → écart
      quantite_base: 6.25,
      score_confiance: 0.97,
    },
    {
      id: 'l-huile',
      code_article: 'HUI1L',
      libelle: 'Huile olive vierge',
      conditionnement_brut: '6X1L',
      quantite: 4,
      prix_unitaire_ht: 54.6,
      montant_ht: 218.4,
      prix_unite_base: 9.1, // > 8,20 négocié → écart
      quantite_base: 6,
      score_confiance: 0.95,
    },
    {
      id: 'l-filet',
      code_article: 'BOF250',
      libelle: 'Filet de bœuf',
      conditionnement_brut: '~2,5KG',
      quantite: 4,
      prix_unitaire_ht: 61.25,
      montant_ht: 245,
      prix_unite_base: null, // poids variable → aucun prix/kg
      quantite_base: null,
      score_confiance: 0.9,
    },
    {
      id: 'l-tomate',
      code_article: 'TOM44',
      libelle: 'Tomates pelées',
      conditionnement_brut: 'BTE 4/4',
      quantite: 6,
      prix_unitaire_ht: 3.2,
      montant_ht: 19.2,
      prix_unite_base: null, // conditionnement incertain
      quantite_base: null,
      score_confiance: 0.88,
      incertain: true,
    },
    {
      id: 'l-farine',
      code_article: 'FAR25',
      libelle: 'Farine T55',
      conditionnement_brut: 'SAC 25KG',
      quantite: 2,
      prix_unitaire_ht: 20,
      montant_ht: 40,
      prix_unite_base: 0.8, // = négocié → OK
      quantite_base: 25,
      score_confiance: 0.98,
    },
  ],
};

export function prixNegocie(l: LigneEnrichie): number | null {
  return l.code_article ? (PRIX_NEGOCIE[l.code_article] ?? null) : null;
}

/** Contrôle arithmétique de la facture de démo. */
export const controleDemo = controleArithmetique(factureDemo.lignes, factureDemo.total_ht);

/** Anomalies détectées + la carte "conditionnement incertain" (issue de la
 *  normalisation, ajoutée ici pour l'affichage). */
export function anomaliesDemo(): AnomalieDetectee[] {
  const auto = detectAnomalies(factureDemo.lignes, prixNegocie);
  const incertaines: AnomalieDetectee[] = factureDemo.lignes
    .filter((l) => l.incertain)
    .map((l) => ({
      ligne_facture_id: l.id,
      type: 'conditionnement_incertain',
      montant_impact: 0,
      commentaire: 'Colis à confirmer — aucun prix/kg calculé',
    }));
  return [...auto, ...incertaines];
}

/** Lignes en écart de prix, prêtes pour le mail de réclamation. */
export function lignesEcartDemo(): LigneEcart[] {
  return factureDemo.lignes
    .filter((l) => {
      const pn = prixNegocie(l);
      return l.prix_unite_base != null && pn != null && l.prix_unite_base > pn;
    })
    .map((l) => {
      const pn = prixNegocie(l)!;
      const qteBase = (l.quantite_base ?? 1) * l.quantite;
      return {
        reference: l.code_article ?? '—',
        libelle: l.libelle,
        prix_negocie: pn,
        prix_facture: l.prix_unite_base!,
        quantite: l.quantite,
        ecart: Math.round((l.prix_unite_base! - pn) * qteBase * 100) / 100,
      };
    });
}

export function mailReclamationDemo() {
  return buildMailReclamation({
    numero: factureDemo.numero,
    date: factureDemo.date,
    prenom_commercial: factureDemo.prenom_commercial,
    nom_signataire: 'Julien',
    etablissement: "Le Comptoir d'Aix",
    lignes: lignesEcartDemo(),
  });
}

/** Compteur d'accueil, alimenté ici par des anomalies confirmées de démo. */
export function compteurDemo() {
  return computeCompteur(
    [
      { montant_impact: 32.5, statut: 'confirmee' },
      { montant_impact: 21.6, statut: 'reclamee' },
      { montant_impact: 18.4, statut: 'avoir_recu' },
    ],
    [
      { montant_reclame: 54.1, montant_obtenu: 0, statut: 'envoyee' },
      { montant_reclame: 18.4, montant_obtenu: 18.4, statut: 'acceptee' },
    ],
  );
}
