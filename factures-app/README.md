# Contrôle de factures fournisseurs — V1

Application mobile-first (PWA) qui scanne les factures fournisseurs d'un
restaurateur, les compare aux prix négociés et sort les lignes en écart avec le
montant à réclamer.

> Projet **indépendant** de l'app « Charges Perso Keitel » (à la racine du dépôt).
> Il vit dans ce sous-dossier `factures-app/` et est conçu pour être extrait tel
> quel dans un dépôt dédié sans aucune modification.

## Stack

- **Front** : React + Vite + TypeScript + Tailwind, PWA installable
- **Back / DB / Auth / Storage** : Supabase (migrations dans `supabase/migrations`)
- **Extraction** : Claude vision via Edge Function (jamais depuis le client) — Phase 2
- **Mail** : Resend via Edge Function — Phase 4
- **Validation** : Zod sur toute sortie du modèle

## Structure

```
src/
  core/         Noyau métier PUR (zéro dépendance UI / réseau, 100 % testé)
    schemas.ts          Enums + schémas Zod (sortie modèle, seuils)
    conditionnement.ts  Parser de conditionnements → unité de base
    arithmetique.ts     Contrôle de bouclage des factures
    anomalies.ts        Règles de détection (section 8 du brief)
  lib/
    offline-queue.ts    File d'attente d'upload hors-ligne (IndexedDB)
    cost.ts             Instrumentation coût (tokens / pages)
    supabase.ts         Client Supabase (null tant que non branché)
  App.tsx / main.tsx    Squelette PWA (accueil, scan, nav pouce)
supabase/migrations/    Schéma + RLS (cloisonnement par établissement)
public/                 manifest.webmanifest, service worker, icône
```

## Développement

```bash
npm install
npm test        # suite unitaire du noyau (parser, arithmétique, anomalies)
npm run dev     # serveur de dev Vite
npm run build   # build de production
```

## Avancement (méthode du brief)

- [x] **Phase 1 — Socle** : schéma + RLS, parser conditionnements testé,
      contrôle arithmétique testé, règles d'anomalies testées, squelette PWA
      installable avec file d'attente hors-ligne, instrumentation coût.
- [ ] **Phase 2 — Pipeline d'extraction** : Edge Function + Claude vision.
      **Nécessite de vraies factures.** Rien n'est calibré sur du synthétique.
- [ ] **Phase 3 — Écrans** : scan → vérification facture → prix négociés.
- [ ] **Phase 4 — Boucle de valeur** : réclamations, compteur, envoi comptable.

## Règles d'or (non négociables)

- Aucune réclamation générée sur une facture qui ne boucle pas arithmétiquement.
- Aucun prix au kg affiché sur un produit à poids variable non confirmé.
- Aucune réclamation à partir d'une ligne dont le score de confiance < 0,85.
- Le prompt d'extraction et les seuils ne seront **jamais** calibrés sur des
  factures inventées — uniquement sur des documents réels.
