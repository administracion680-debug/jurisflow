-- PROPUESTA SQL — ejecutar solo después de la importación por lotes,
-- validación de conteos y comprobación de que el proyecto conserva margen
-- bajo la cuota Free. No aplicar antes de cargar datos.

begin;

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

commit;
