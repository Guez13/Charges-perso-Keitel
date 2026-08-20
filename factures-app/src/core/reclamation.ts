// ---------------------------------------------------------------------------
// Générateur de mail de réclamation — fonction PURE (modèle section 11).
// Ton : ferme, factuel, courtois. Aucune accusation : le resto garde son
// commercial. Le corps est éditable ensuite par l'utilisateur.
// ---------------------------------------------------------------------------

export interface LigneEcart {
  reference: string; // code article ou libellé court
  libelle: string;
  prix_negocie: number;
  prix_facture: number;
  quantite: number;
  ecart: number; // montant d'impact en €
}

export interface ContexteReclamation {
  numero: string;
  date: string; // déjà formatée (ex. "15/08/2026")
  prenom_commercial: string;
  nom_signataire: string;
  etablissement: string;
  lignes: LigneEcart[];
}

export interface MailReclamation {
  objet: string;
  corps: string;
  montant_total: number;
}

/** Formate un nombre en euros à la française : "1 234,56". */
export function formatEuro(n: number): string {
  return n
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Construit un tableau texte aligné des lignes en écart. */
function tableauLignes(lignes: LigneEcart[]): string {
  const head = ['Référence', 'Libellé', 'Négocié', 'Facturé', 'Qté', 'Écart'];
  const rows = lignes.map((l) => [
    l.reference,
    l.libelle,
    `${formatEuro(l.prix_negocie)} €`,
    `${formatEuro(l.prix_facture)} €`,
    String(l.quantite),
    `${formatEuro(l.ecart)} €`,
  ]);
  const all = [head, ...rows];
  const widths = head.map((_, c) => Math.max(...all.map((r) => r[c].length)));
  const fmt = (r: string[]) => r.map((cell, c) => cell.padEnd(widths[c])).join('  ').trimEnd();
  const sep = widths.map((w) => '-'.repeat(w)).join('  ');
  return [fmt(head), sep, ...rows.map(fmt)].join('\n');
}

export function buildMailReclamation(ctx: ContexteReclamation): MailReclamation {
  const montant_total = ctx.lignes.reduce((s, l) => s + l.ecart, 0);
  const objet = `Facture n°${ctx.numero} du ${ctx.date} — écarts de tarif constatés`;
  const corps = [
    `Bonjour ${ctx.prenom_commercial},`,
    '',
    `En contrôlant la facture n°${ctx.numero} du ${ctx.date}, je constate des écarts`,
    'entre les prix facturés et nos tarifs négociés :',
    '',
    tableauLignes(ctx.lignes),
    '',
    `Écart total constaté : ${formatEuro(montant_total)} € HT.`,
    '',
    'Pouvez-vous me confirmer la régularisation par avoir et vérifier',
    'que ces tarifs sont bien réactivés sur nos prochaines commandes ?',
    '',
    'Bien à vous,',
    `${ctx.nom_signataire} — ${ctx.etablissement}`,
  ].join('\n');

  return { objet, corps, montant_total: Math.round(montant_total * 100) / 100 };
}
