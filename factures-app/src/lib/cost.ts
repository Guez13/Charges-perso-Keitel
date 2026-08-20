// ---------------------------------------------------------------------------
// Instrumentation du coût d'extraction (tokens, pages) — section 14 du brief.
// Prête à logger dès la Phase 2. Fonctions pures, tarifs centralisés ici pour
// être ajustés d'un seul endroit.
// ---------------------------------------------------------------------------

export interface CoutExtraction {
  input_tokens: number;
  output_tokens: number;
  pages: number;
  cout_usd: number;
}

// Tarifs indicatifs par million de tokens (à confirmer/ajuster selon le modèle
// vision retenu en Phase 2). Volontairement isolés pour ne pas être dispersés.
export interface TarifsModele {
  input_usd_par_mtok: number;
  output_usd_par_mtok: number;
}

export const TARIFS_DEFAUT: TarifsModele = {
  input_usd_par_mtok: 3,
  output_usd_par_mtok: 15,
};

export function estimerCout(
  input_tokens: number,
  output_tokens: number,
  pages: number,
  tarifs: TarifsModele = TARIFS_DEFAUT,
): CoutExtraction {
  const cout_usd =
    (input_tokens / 1_000_000) * tarifs.input_usd_par_mtok +
    (output_tokens / 1_000_000) * tarifs.output_usd_par_mtok;
  return {
    input_tokens,
    output_tokens,
    pages,
    cout_usd: Math.round(cout_usd * 1e6) / 1e6,
  };
}
