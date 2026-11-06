-- PROPUESTA SQL — NO APLICADA.
-- Antes de usar: inicializar/vincular el proyecto con Supabase CLI v3,
-- generar la migración con el CLI, revisar el diff y obtener autorización
-- explícita para la conexión/proyecto remoto elegido.
-- Catálogo compacto: no almacena source_record ni texto íntegro de normas.

begin;

create schema if not exists private;

create table if not exists private.legal_import_batches (
  id uuid primary key default gen_random_uuid(),
  source_code text not null check (source_code in ('infoleg_national','saij_provincial')),
  source_resource text not null,
  source_name text not null,
  dataset_url text not null,
  license text not null,
  source_file_sha256 text not null check (source_file_sha256 ~ '^[a-f0-9]{64}$'),
  source_updated_through date,
  importer_version text not null,
  input_rows bigint not null default 0 check (input_rows >= 0),
  accepted_rows bigint not null default 0 check (accepted_rows >= 0),
  rejected_rows bigint not null default 0 check (rejected_rows >= 0),
  duplicate_groups bigint not null default 0 check (duplicate_groups >= 0),
  status text not null default 'prepared'
    check (status in ('prepared','validated','applied','reverted')),
  report_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  unique (source_code, source_resource, source_file_sha256)
);

create table if not exists public.legal_norms (
  id uuid primary key default gen_random_uuid(),
  source_code text not null check (source_code in ('infoleg_national','saij_provincial')),
  source_record_key text not null unique,
  source_id text,
  jurisdiction_type text not null,
  jurisdiction_normalized text not null,
  source_province_id text,
  resource_type text not null,
  title text not null,
  authority text,
  citation text,
  source_url text,
  original_source_url text,
  updated_source_url text,
  publication_date date,
  enactment_date date,
  bulletin_number text,
  bulletin_page text,
  summary text,
  source_status text,
  source_status_as_of date,
  modified_by_count text,
  modifies_count text,
  deduplication_key text,
  duplicate_candidate boolean not null default false,
  duplicate_exact boolean not null default false,
  duplicate_conflict boolean not null default false,
  verification_status text not null default 'pending'
    check (verification_status in ('pending','verified','disputed','rejected')),
  source_file_sha256 text not null check (source_file_sha256 ~ '^[a-f0-9]{64}$'),
  source_row_number bigint not null check (source_row_number >= 2),
  source_row_hash text not null check (source_row_hash ~ '^[a-f0-9]{64}$'),
  captured_at timestamptz not null,
  batch_id uuid not null references private.legal_import_batches(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (source_code, source_file_sha256, source_row_number)
);

create table if not exists private.legal_norm_relationship_observations (
  id uuid primary key default gen_random_uuid(),
  source_code text not null check (source_code = 'infoleg_national'),
  source_resource text not null check (source_resource in ('modificatorias','modificadas')),
  source_record_key text not null unique,
  source_file_sha256 text not null check (source_file_sha256 ~ '^[a-f0-9]{64}$'),
  source_row_number bigint not null check (source_row_number >= 2),
  source_row_hash text not null check (source_row_hash ~ '^[a-f0-9]{64}$'),
  modifying_source_record_id text not null,
  modified_source_record_id text not null,
  relation_type text not null default 'modifies',
  duplicate_candidate boolean not null default false,
  verification_status text not null default 'pending'
    check (verification_status in ('pending','verified','disputed','rejected')),
  batch_id uuid not null references private.legal_import_batches(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (source_file_sha256, source_row_number)
);

create table if not exists public.legal_norm_relationships (
  id uuid primary key default gen_random_uuid(),
  source_code text not null check (source_code = 'infoleg_national'),
  modifying_source_record_id text not null,
  modified_source_record_id text not null,
  relation_type text not null default 'modifies',
  observation_count integer not null check (observation_count > 0),
  verification_status text not null default 'pending'
    check (verification_status in ('pending','verified','disputed','rejected')),
  created_at timestamptz not null default now(),
  unique (source_code, modifying_source_record_id, modified_source_record_id, relation_type)
);

create index if not exists legal_norms_source_id_idx
  on public.legal_norms (source_code, source_id);
create index if not exists legal_norms_jurisdiction_type_date_idx
  on public.legal_norms (jurisdiction_type, jurisdiction_normalized, resource_type, publication_date desc);
create index if not exists legal_norms_deduplication_key_idx
  on public.legal_norms (deduplication_key);
create index if not exists legal_norms_source_file_idx
  on public.legal_norms (source_file_sha256);
create index if not exists legal_norms_batch_id_idx
  on public.legal_norms (batch_id);
create index if not exists legal_norms_search_idx
  on public.legal_norms using gin (
    to_tsvector('spanish', coalesce(title,'') || ' ' || coalesce(summary,''))
  );

create index if not exists legal_norm_relationship_observations_pair_idx
  on private.legal_norm_relationship_observations
  (modifying_source_record_id, modified_source_record_id);
create index if not exists legal_norm_relationship_observations_batch_idx
  on private.legal_norm_relationship_observations (batch_id);
create index if not exists legal_norm_relationships_modified_id_idx
  on public.legal_norm_relationships (modified_source_record_id);

alter table public.legal_norms enable row level security;
alter table public.legal_norm_relationships enable row level security;
alter table private.legal_norm_relationship_observations enable row level security;
alter table private.legal_import_batches enable row level security;

revoke all on table public.legal_norms, public.legal_norm_relationships from anon, authenticated;
grant select on table public.legal_norms, public.legal_norm_relationships to authenticated;

revoke all on table private.legal_norm_relationship_observations, private.legal_import_batches from anon, authenticated;
grant all on table public.legal_norms, public.legal_norm_relationships to service_role;
grant all on table private.legal_norm_relationship_observations, private.legal_import_batches to service_role;
grant usage on schema private to service_role;

drop policy if exists legal_norms_read_authenticated on public.legal_norms;
create policy legal_norms_read_authenticated
  on public.legal_norms for select to authenticated using (true);

drop policy if exists legal_norm_relationships_read_authenticated on public.legal_norm_relationships;
create policy legal_norm_relationships_read_authenticated
  on public.legal_norm_relationships for select to authenticated using (true);

commit;
