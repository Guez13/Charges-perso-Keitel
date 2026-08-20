import { describe, it, expect } from 'vitest';
import { buildMailReclamation, formatEuro, type ContexteReclamation } from './reclamation';

const ctx: ContexteReclamation = {
  numero: 'FA-4871',
  date: '15/08/2026',
  prenom_commercial: 'Karim',
  nom_signataire: 'Julien',
  etablissement: "Le Comptoir d'Aix",
  lignes: [
    {
      reference: 'BEU250',
      libelle: 'Beurre doux plaquette',
      prix_negocie: 6.8,
      prix_facture: 7.45,
      quantite: 50,
      ecart: 32.5,
    },
    {
      reference: 'HUI1L',
      libelle: 'Huile olive vierge',
      prix_negocie: 8.2,
      prix_facture: 9.1,
      quantite: 24,
      ecart: 21.6,
    },
  ],
};

describe('formatEuro', () => {
  it('formate à la française avec séparateur de milliers', () => {
    // Espace de milliers normalisé pour ne pas dépendre du type d'espace.
    expect(formatEuro(1234.5).replace(/\s/g, '_')).toBe('1_234,50');
    expect(formatEuro(32.5)).toBe('32,50');
  });
});

describe('buildMailReclamation', () => {
  const mail = buildMailReclamation(ctx);

  it('produit un objet conforme au modèle', () => {
    expect(mail.objet).toBe('Facture n°FA-4871 du 15/08/2026 — écarts de tarif constatés');
  });

  it('somme correctement les écarts', () => {
    expect(mail.montant_total).toBe(54.1);
  });

  it('personnalise le corps et inclut le total', () => {
    expect(mail.corps).toContain('Bonjour Karim,');
    expect(mail.corps).toContain('Écart total constaté : 54,10 € HT.');
    expect(mail.corps).toContain("Julien — Le Comptoir d'Aix");
  });

  it('inclut chaque ligne en écart dans le tableau', () => {
    expect(mail.corps).toContain('Beurre doux plaquette');
    expect(mail.corps).toContain('Huile olive vierge');
  });
});
