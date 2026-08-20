import { z } from 'zod';

// Statuts métier centralisés (miroir des enums SQL de la migration 0001).
export const statutFactureSchema = z.enum([
  'en_traitement',
  'a_verifier',
  'validee',
  'litige',
]);
export type StatutFacture = z.infer<typeof statutFactureSchema>;

export const statutAnomalieSchema = z.enum([
  'a_verifier',
  'confirmee',
  'ignoree',
  'reclamee',
  'avoir_recu',
]);
export type StatutAnomalie = z.infer<typeof statutAnomalieSchema>;

export const statutReclamationSchema = z.enum([
  'brouillon',
  'envoyee',
  'acceptee',
  'refusee',
  'partielle',
]);
export type StatutReclamation = z.infer<typeof statutReclamationSchema>;
