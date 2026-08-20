import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enums applicatifs — source unique de vérité, réutilisée front + Edge Function.
// ---------------------------------------------------------------------------
export const uniteBaseSchema = z.enum(['kg', 'L', 'pce']);
export type UniteBase = z.infer<typeof uniteBaseSchema>;

export const typeAnomalieSchema = z.enum([
  'ecart_prix',
  'ecart_quantite',
  'produit_non_livre',
  'doublon_facturation',
  'prix_negocie_inconnu',
  'conditionnement_incertain',
]);
export type TypeAnomalie = z.infer<typeof typeAnomalieSchema>;

// Flags normalisés portés par une ligne (pas de texte libre).
export const ligneFlagSchema = z.enum([
  'conditionnement_incertain',
  'poids_variable',
  'score_faible',
  'ligne_incoherente',
]);
export type LigneFlag = z.infer<typeof ligneFlagSchema>;

// ---------------------------------------------------------------------------
// Sortie STRICTE du modèle d'extraction (Claude vision). Validée par Zod
// avant tout traitement — rien ne rentre dans le pipeline sans passer par là.
// ---------------------------------------------------------------------------
export const ligneExtraiteSchema = z.object({
  code_article: z.string().nullable(),
  libelle_brut: z.string().min(1),
  conditionnement_brut: z.string().nullable(),
  quantite: z.number(),
  prix_unitaire_ht: z.number(),
  montant_ht: z.number(),
});
export type LigneExtraite = z.infer<typeof ligneExtraiteSchema>;

export const factureExtraiteSchema = z.object({
  fournisseur: z.string().nullable(),
  numero: z.string().nullable(),
  date_facture: z.string().nullable(), // ISO string, validée en aval
  total_ht: z.number().nullable(),
  total_tva: z.number().nullable(),
  total_ttc: z.number().nullable(),
  lignes: z.array(ligneExtraiteSchema),
});
export type FactureExtraite = z.infer<typeof factureExtraiteSchema>;

/** Seuil de confiance en dessous duquel une ligne ne peut jamais alimenter
 *  une réclamation automatique (section 6 du brief). */
export const SEUIL_CONFIANCE = 0.85;
