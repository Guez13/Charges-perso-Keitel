import type { TypeAnomalie } from '../core';

// Métadonnées d'affichage par type d'anomalie (code couleur du brief section 10).
type Couleur = 'red' | 'orange' | 'grey';

export interface AnomalieUi {
  label: string;
  couleur: Couleur;
}

export const ANOMALIE_UI: Record<TypeAnomalie, AnomalieUi> = {
  ecart_prix: { label: 'Écart prix', couleur: 'red' },
  ecart_quantite: { label: 'Quantité', couleur: 'orange' },
  produit_non_livre: { label: 'Non livré', couleur: 'orange' },
  doublon_facturation: { label: 'Doublon', couleur: 'red' },
  prix_negocie_inconnu: { label: 'Prix à saisir', couleur: 'grey' },
  conditionnement_incertain: { label: 'À confirmer', couleur: 'grey' },
};

// Bundles de classes Tailwind par couleur (carte à liseré, badge, montant).
export const CLASSES: Record<
  Couleur,
  { carte: string; badge: string; montant: string }
> = {
  red: {
    carte: 'border-l-4 border-red-400 bg-red-400/10',
    badge: 'bg-red-400 text-red-950',
    montant: 'text-red-400',
  },
  orange: {
    carte: 'border-l-4 border-amber-400 bg-amber-400/10',
    badge: 'bg-amber-400 text-amber-950',
    montant: 'text-amber-400',
  },
  grey: {
    carte: 'border-l-4 border-slate-400 bg-slate-400/10',
    badge: 'bg-slate-400 text-slate-900',
    montant: 'text-slate-400',
  },
};
