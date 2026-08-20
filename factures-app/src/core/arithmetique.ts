// ---------------------------------------------------------------------------
// Contrôle arithmétique — le garde-fou le moins cher et le plus efficace.
// Fonction PURE. Si une facture ne "boucle" pas, l'extraction est fausse :
// aucune réclamation ne doit être générée dessus (section 6.3 du brief).
// ---------------------------------------------------------------------------

export interface LigneArith {
  quantite: number;
  prix_unitaire_ht: number;
  montant_ht: number;
}

export interface ControleArithResult {
  /** Vrai si toutes les lignes bouclent ET la somme colle au total. */
  ok: boolean;
  /** Σ des montants HT des lignes. */
  somme_lignes: number;
  /** |Σ montants − total_ht|, ou null si total_ht absent. */
  ecart_total: number | null;
  /** Indices des lignes où quantité × prix ≠ montant. */
  lignes_incoherentes: number[];
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * @param lignes    lignes extraites
 * @param total_ht  total HT annoncé sur la facture (null si non extrait)
 * @param tolerance écart absolu toléré en euros (défaut 0,02 €)
 */
export function controleArithmetique(
  lignes: LigneArith[],
  total_ht: number | null,
  tolerance = 0.02,
): ControleArithResult {
  const lignes_incoherentes: number[] = [];
  let somme = 0;

  lignes.forEach((l, i) => {
    somme += l.montant_ht;
    const attendu = l.quantite * l.prix_unitaire_ht;
    if (Math.abs(attendu - l.montant_ht) > tolerance) {
      lignes_incoherentes.push(i);
    }
  });

  somme = round2(somme);
  const ecart_total = total_ht == null ? null : round2(Math.abs(somme - total_ht));

  const totalOk = ecart_total == null ? false : ecart_total <= tolerance;
  const lignesOk = lignes_incoherentes.length === 0;

  return {
    ok: totalOk && lignesOk && lignes.length > 0,
    somme_lignes: somme,
    ecart_total,
    lignes_incoherentes,
  };
}
