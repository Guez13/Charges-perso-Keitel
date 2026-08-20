-- =====================================================================
-- V1 · Contrôle de factures fournisseurs — schéma initial
-- Multi-établissement dès maintenant, cloisonnement par etablissement_id.
-- =====================================================================

create extension if not exists pg_trgm;

-- ---------- Établissements & accès -----------------------------------
create table etablissements (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  siret text,
  created_at timestamptz default now()
);

create type role_membre as enum ('gerant', 'chef', 'comptable');

create table memberships (
  user_id uuid not null references auth.users(id) on delete cascade,
  etablissement_id uuid not null references etablissements(id) on delete cascade,
  role role_membre not null default 'gerant',
  primary key (user_id, etablissement_id)
);

-- Helper : établissements accessibles à l'utilisateur courant.
create or replace function mes_etablissements()
returns setof uuid
language sql
security invoker
stable
as $$
  select etablissement_id from memberships where user_id = auth.uid()
$$;

-- ---------- Fournisseurs ---------------------------------------------
create table fournisseurs (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null references etablissements(id) on delete cascade,
  nom text not null,
  email_commercial text,
  prenom_commercial text,
  telephone text,
  created_at timestamptz default now()
);

-- ---------- Produits --------------------------------------------------
create type unite_base_t as enum ('kg', 'L', 'pce');

-- Socle des phases 2 à 4, non exploité en V1.
create table produits_canoniques (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  unite_base unite_base_t not null
);

create table produits_fournisseur (
  id uuid primary key default gen_random_uuid(),
  fournisseur_id uuid not null references fournisseurs(id) on delete cascade,
  code_article text,
  libelle_brut text not null,
  libelle_normalise text,
  conditionnement_brut text,
  unite_base unite_base_t,
  quantite_base numeric,
  poids_variable boolean not null default false,
  conditionnement_confirme boolean not null default false,
  famille text,
  produit_canonique_id uuid references produits_canoniques(id),
  created_at timestamptz default now(),
  unique (fournisseur_id, code_article)
);
create index idx_pf_libelle_trgm
  on produits_fournisseur using gin (libelle_normalise gin_trgm_ops);

-- ---------- Prix négociés --------------------------------------------
create type prix_source_t as enum ('saisie_manuelle', 'reference_1ere_facture');

create table prix_negocies (
  id uuid primary key default gen_random_uuid(),
  produit_fournisseur_id uuid not null references produits_fournisseur(id) on delete cascade,
  prix_ht numeric not null,          -- ramené à l'unité de base
  unite unite_base_t not null,
  date_debut date not null default current_date,
  date_fin date,
  source prix_source_t not null,
  actif boolean not null default true
);
create index idx_pn_actif on prix_negocies (produit_fournisseur_id) where actif;

-- ---------- Factures --------------------------------------------------
create type statut_facture_t as enum ('en_traitement', 'a_verifier', 'validee', 'litige');

create table factures (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null references etablissements(id) on delete cascade,
  fournisseur_id uuid references fournisseurs(id),
  numero text,
  date_facture date,
  total_ht numeric,
  total_tva numeric,
  total_ttc numeric,
  fichier_url text,
  nb_pages int,
  statut statut_facture_t not null default 'en_traitement',
  score_confiance numeric,
  controle_arithmetique_ok boolean,
  cout_extraction_tokens int,        -- instrumentation coût (section 14)
  cout_extraction_pages int,
  envoyee_comptable boolean not null default false,
  created_at timestamptz default now(),
  unique (fournisseur_id, numero)     -- bloque le ré-upload d'une même facture
);

create table lignes_facture (
  id uuid primary key default gen_random_uuid(),
  facture_id uuid not null references factures(id) on delete cascade,
  produit_fournisseur_id uuid references produits_fournisseur(id),
  libelle_brut text not null,
  conditionnement_brut text,
  quantite numeric,
  prix_unitaire_ht numeric,
  montant_ht numeric,
  prix_unite_base numeric,           -- null si conditionnement incertain / poids variable
  score_confiance numeric,
  flags text[] not null default '{}'
);
create index idx_lf_facture on lignes_facture (facture_id);

-- ---------- Anomalies -------------------------------------------------
create type type_anomalie_t as enum (
  'ecart_prix', 'ecart_quantite', 'produit_non_livre',
  'doublon_facturation', 'prix_negocie_inconnu', 'conditionnement_incertain'
);
create type statut_anomalie_t as enum (
  'a_verifier', 'confirmee', 'ignoree', 'reclamee', 'avoir_recu'
);

create table anomalies (
  id uuid primary key default gen_random_uuid(),
  ligne_facture_id uuid not null references lignes_facture(id) on delete cascade,
  type type_anomalie_t not null,
  montant_impact numeric not null default 0,
  statut statut_anomalie_t not null default 'a_verifier',
  commentaire text,
  created_at timestamptz default now()
);
create index idx_ano_statut on anomalies (statut);

-- ---------- Réclamations & envoi comptable ---------------------------
create type statut_reclamation_t as enum (
  'brouillon', 'envoyee', 'acceptee', 'refusee', 'partielle'
);

create table reclamations (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null references etablissements(id) on delete cascade,
  fournisseur_id uuid references fournisseurs(id),
  facture_ids uuid[] not null,
  montant_reclame numeric,
  montant_obtenu numeric not null default 0,
  date_envoi timestamptz,
  statut statut_reclamation_t not null default 'brouillon',
  corps_mail text
);

create table envois_comptable (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null references etablissements(id) on delete cascade,
  facture_ids uuid[] not null,
  destinataire text not null,
  date_envoi timestamptz,
  statut text
);

-- =====================================================================
-- RLS — cloisonnement strict par établissement
-- =====================================================================
alter table etablissements enable row level security;
alter table memberships enable row level security;
alter table fournisseurs enable row level security;
alter table produits_fournisseur enable row level security;
alter table prix_negocies enable row level security;
alter table factures enable row level security;
alter table lignes_facture enable row level security;
alter table anomalies enable row level security;
alter table reclamations enable row level security;
alter table envois_comptable enable row level security;
-- produits_canoniques : socle partagé non sensible, laissé sans RLS pour l'instant.

create policy p_etab on etablissements
  for all using (id in (select mes_etablissements()))
  with check (id in (select mes_etablissements()));

create policy p_memberships on memberships
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy p_fournisseurs on fournisseurs
  for all using (etablissement_id in (select mes_etablissements()))
  with check (etablissement_id in (select mes_etablissements()));

create policy p_produits_fournisseur on produits_fournisseur
  for all using (
    fournisseur_id in (
      select id from fournisseurs where etablissement_id in (select mes_etablissements())
    )
  )
  with check (
    fournisseur_id in (
      select id from fournisseurs where etablissement_id in (select mes_etablissements())
    )
  );

create policy p_prix_negocies on prix_negocies
  for all using (
    produit_fournisseur_id in (
      select pf.id from produits_fournisseur pf
      join fournisseurs f on f.id = pf.fournisseur_id
      where f.etablissement_id in (select mes_etablissements())
    )
  )
  with check (
    produit_fournisseur_id in (
      select pf.id from produits_fournisseur pf
      join fournisseurs f on f.id = pf.fournisseur_id
      where f.etablissement_id in (select mes_etablissements())
    )
  );

create policy p_factures on factures
  for all using (etablissement_id in (select mes_etablissements()))
  with check (etablissement_id in (select mes_etablissements()));

create policy p_lignes_facture on lignes_facture
  for all using (
    facture_id in (select id from factures where etablissement_id in (select mes_etablissements()))
  )
  with check (
    facture_id in (select id from factures where etablissement_id in (select mes_etablissements()))
  );

create policy p_anomalies on anomalies
  for all using (
    ligne_facture_id in (
      select lf.id from lignes_facture lf
      join factures fa on fa.id = lf.facture_id
      where fa.etablissement_id in (select mes_etablissements())
    )
  )
  with check (
    ligne_facture_id in (
      select lf.id from lignes_facture lf
      join factures fa on fa.id = lf.facture_id
      where fa.etablissement_id in (select mes_etablissements())
    )
  );

create policy p_reclamations on reclamations
  for all using (etablissement_id in (select mes_etablissements()))
  with check (etablissement_id in (select mes_etablissements()));

create policy p_envois_comptable on envois_comptable
  for all using (etablissement_id in (select mes_etablissements()))
  with check (etablissement_id in (select mes_etablissements()));
