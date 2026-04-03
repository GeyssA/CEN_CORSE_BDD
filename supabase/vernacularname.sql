-- =============================================================================
-- QUE FAIRE DANS SUPABASE ? (oui : la table doit être créée une fois)
-- =============================================================================
--
-- L’appli ne crée pas la table toute seule. Deux étapes :
--
-- ÉTAPE 1 — Créer la table (recommandé : ce script, pas l’éditeur « à la main »)
--   • Ouvrir le projet Supabase → menu « SQL » → « New query »
--   • Coller TOUT le contenu de ce fichier (sans les lignes de commentaires si vous préférez)
--   • Cliquer « Run »
--   → La table public.vernacularname existe, avec les bonnes colonnes et la lecture pour l’app.
--
--   Alternative : « Table Editor » → « New table » → possible mais pénible pour les noms
--   de colonnes avec majuscules (vernacularName). Le SQL ci-dessous évite les erreurs.
--
-- ÉTAPE 2 — Remplir la table avec vos données TaxRef
--   • Comme pour taxon_ref.csv, générer le fichier depuis le dépôt :
--       node build-vernacularname-csv.js vernacularname.txt vernacularname.csv
--     → vernacularname.csv utilise le point-virgule (;) et le même csvEscape que taxon_ref.csv.
--   • Table Editor → table vernacularname → « Insert » → « Import data from CSV »
--     (délimiteur « ; » si demandé) — colonnes : id, vernacularName, source, language, locationID, countryCode
--   • Ou utiliser l’extension « SQL » avec COPY … FROM (si vous avez un fichier sur le serveur).
--
-- Lien métier : vernacularname.id = même identifiant que la colonne cdNom des observations
-- (scientificNameID TAXREF) et que taxon_ref.scientificnameid (fichier taxon_ref.csv importé).
-- L’app ne remplit NOM_VERNACULAIRE qu’avec une ligne vernacularname où language = 'Français'
-- et dont id est présent dans taxon_ref (scientificnameid).
-- =============================================================================

create table if not exists public.vernacularname (
  id bigint not null,
  "vernacularName" text,
  source text,
  language text,
  "locationID" text,
  "countryCode" text
);

create index if not exists idx_vernacularname_id_lang on public.vernacularname (id, language);

comment on table public.vernacularname is 'Noms vernaculaires TaxRef ; id = scientificNameID (référence cdNom SINP)';

alter table public.vernacularname enable row level security;

drop policy if exists "Lecture vernacularname anon" on public.vernacularname;
create policy "Lecture vernacularname anon"
  on public.vernacularname
  for select
  to anon, authenticated
  using (true);

-- Exemple pour la vue lisible (adapter les alias réels de votre schéma) :
-- left join public.vernacularname v
--   on v.id = b."cdNom"::bigint and v.language = 'Français'
-- ...
-- coalesce(v."vernacularName", tr.vernacularname) as "NOM_VERNACULAIRE"
