-- PROPUESTA SQL — NO APLICADA.
-- Antes de usar: inicializar/vincular el proyecto con Supabase CLI v3,
-- generar la migración con el CLI, revisar el diff y obtener autorización
-- explícita para la conexión/proyecto remoto elegido.
-- Catálogo compacto: no almacena source_record ni texto íntegro de normas.

begin;

create schema if not exists private;

create table if not exists private.legal_import_batches (
  id uuid primary key default gen_random_uuid(),
  source_code smallint not null check (source_code in (1,2)), -- 1=Infoleg nacional; 2=SAIJ provincial
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
  unique (source_code, source_resource, source_file_sha256),
  unique (id, source_code)
);

create table if not exists public.legal_norms (
  id uuid primary key default gen_random_uuid(),
  source_code smallint not null check (source_code in (1,2)), -- 1=Infoleg nacional; 2=SAIJ provincial
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
  source_row_number integer not null check (source_row_number >= 2),
  source_row_hash bytea not null check (octet_length(source_row_hash) = 32),
  batch_id uuid not null,
  created_at timestamptz not null default now(),
  unique (batch_id, source_row_number),
  foreign key (batch_id, source_code)
    references private.legal_import_batches(id, source_code) on delete restrict
);


create table if not exists public.legal_norm_relationships (
  id uuid primary key default gen_random_uuid(),
  modifying_source_record_id text not null,
  modified_source_record_id text not null,
  relation_type text not null default 'modifies',
  observation_count integer not null check (observation_count > 0),
  modificatorias_batch_id uuid not null references private.legal_import_batches(id) on delete restrict,
  modificadas_batch_id uuid not null references private.legal_import_batches(id) on delete restrict,
  verification_status text not null default 'pending'
    check (verification_status in ('pending','verified','disputed','rejected')),
  created_at timestamptz not null default now(),
  unique (modifying_source_record_id, modified_source_record_id, relation_type)
);

-- Los índices secundarios se crean después de importar y medir el tamaño;
-- ver docs/sql-proposals/index_legal_catalog_after_import.sql.

alter table public.legal_norms enable row level security;
alter table public.legal_norm_relationships enable row level security;
alter table private.legal_import_batches enable row level security;

revoke all on table public.legal_norms, public.legal_norm_relationships from anon, authenticated;
grant select on table public.legal_norms, public.legal_norm_relationships to authenticated;

revoke all on table private.legal_import_batches from anon, authenticated;
grant select, insert, update, delete on table public.legal_norms, public.legal_norm_relationships to service_role;
grant select, insert, update, delete on table private.legal_import_batches to service_role;
grant usage on schema private to service_role;

drop policy if exists legal_norms_read_authenticated on public.legal_norms;
create policy legal_norms_read_authenticated
  on public.legal_norms for select to authenticated using (true);

drop policy if exists legal_norm_relationships_read_authenticated on public.legal_norm_relationships;
create policy legal_norm_relationships_read_authenticated
  on public.legal_norm_relationships for select to authenticated using (true);

commit;
