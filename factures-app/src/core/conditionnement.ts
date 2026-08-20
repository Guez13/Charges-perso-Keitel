import type { UniteBase } from './schemas';

// ---------------------------------------------------------------------------
// Parser de conditionnements — fonction PURE.
//
// Règle d'or (section 7 du brief) : mieux vaut ne RIEN renvoyer qu'un prix au
// kg faux. Au moindre doute → `incertain: true`, aucune quantité de base, et
// c'est le restaurateur qui confirmera le colis une seule fois via l'UI.
// ---------------------------------------------------------------------------

export interface ParsedConditionnement {
  /** Unité de base normalisée, ou null si indéterminable. */
  unite_base: UniteBase | null;
  /** Contenu réel d'un colis dans l'unité de base, ou null. */
  quantite_base: number | null;
  /** Produit vendu au poids réel (facturé au poids). Pas de prix/kg calculé
   *  tant que la facture ne porte pas le poids réellement facturé. */
  poids_variable: boolean;
  /** Parsing incertain → carte de confirmation à l'utilisateur, une seule fois. */
  incertain: boolean;
}

const INCERTAIN: ParsedConditionnement = {
  unite_base: null,
  quantite_base: null,
  poids_variable: false,
  incertain: true,
};

const round6 = (n: number): number => Math.round(n * 1e6) / 1e6;

/** Convertit une valeur + unité brute vers l'unité de base. */
function toBase(value: number, unit: string): { u: UniteBase; q: number } | null {
  switch (unit) {
    case 'KG':
      return { u: 'kg', q: value };
    case 'G':
      return { u: 'kg', q: value / 1000 };
    case 'L':
      return { u: 'L', q: value };
    case 'CL':
      return { u: 'L', q: value / 100 };
    case 'ML':
      return { u: 'L', q: value / 1000 };
    default:
      return null;
  }
}

// Poids variable : ~ , ENV , PV , POIDS VARIABLE.
const RE_VARIABLE = /(~|\bENV\b|\bPV\b|POIDS\s*VARIABLE)/;
// Multipack : 6X1L, 12X75CL, 6 X 1 L ...
const RE_MULTI = /(\d+(?:\.\d+)?)\s*[X*]\s*(\d+(?:\.\d+)?)\s*(KG|G|CL|ML|L)\b/;
// Quantité simple : 5KG, 500G, 75CL, 1L ...
const RE_SINGLE = /(\d+(?:\.\d+)?)\s*(KG|G|CL|ML|L)\b/;
// Vente au kg / au litre sans quantité de colis.
const RE_AU_UNITE = /\bAU\s*(KG|L)\b/;
// Pièce / unité.
const RE_PCE = /\b(PCE|PIECE|PIÈCE|PC|UNITE|UNITÉ|U)\b/;

/**
 * Parse un libellé de conditionnement brut vers une structure normalisée.
 * Entrée = texte, sortie = structure. Aucun effet de bord, aucune I/O.
 */
export function parseConditionnement(input: string | null | undefined): ParsedConditionnement {
  if (!input || !input.trim()) return { ...INCERTAIN };

  // Normalisation : majuscules, virgule décimale → point, espaces compactés.
  const s = input.toUpperCase().replace(/,/g, '.').replace(/\s+/g, ' ').trim();
  const variable = RE_VARIABLE.test(s);

  // 1. Multipack (N × M unité)
  const multi = s.match(RE_MULTI);
  if (multi) {
    const count = parseFloat(multi[1]);
    const per = toBase(parseFloat(multi[2]), multi[3]);
    if (per) {
      return {
        unite_base: per.u,
        quantite_base: variable ? null : round6(count * per.q),
        poids_variable: variable,
        incertain: false,
      };
    }
  }

  // 2. Quantité simple (M unité)
  const single = s.match(RE_SINGLE);
  if (single) {
    const c = toBase(parseFloat(single[1]), single[2]);
    if (c) {
      return {
        unite_base: c.u,
        quantite_base: variable ? null : round6(c.q),
        poids_variable: variable,
        incertain: false,
      };
    }
  }

  // 3. Vente au kg / au litre (prix déjà exprimé à l'unité de base)
  const auUnite = s.match(RE_AU_UNITE);
  if (auUnite) {
    return {
      unite_base: auUnite[1] === 'L' ? 'L' : 'kg',
      quantite_base: 1,
      poids_variable: false,
      incertain: false,
    };
  }

  // 4. Poids variable pur, sans unité exploitable
  if (variable) {
    return { unite_base: null, quantite_base: null, poids_variable: true, incertain: false };
  }

  // 5. Pièce / unité
  if (RE_PCE.test(s)) {
    return { unite_base: 'pce', quantite_base: 1, poids_variable: false, incertain: false };
  }

  // 6. Tout le reste (4/4, préfixe seul, illisible) → confirmation manuelle
  return { ...INCERTAIN };
}

/**
 * Prix ramené à l'unité de base. Renvoie null dès qu'on ne peut pas garantir
 * la justesse (conditionnement incertain, poids variable non résolu).
 */
export function prixUniteBase(
  prixUnitaireHt: number,
  cond: ParsedConditionnement,
): number | null {
  if (cond.incertain) return null;
  if (cond.poids_variable && cond.quantite_base == null) return null;
  if (cond.quantite_base == null || cond.quantite_base <= 0) return null;
  return round6(prixUnitaireHt / cond.quantite_base);
}
