-- PROPUESTA SQL — ejecutar solo después de la importación por lotes,
-- validación de conteos y comprobación de que el proyecto conserva margen
-- bajo la cuota Free. No aplicar antes de cargar datos.

begin;

create index if not exists legal_norms_source_id_idx
  on public.legal_norms (source_id)
  where source_code = 1 and source_id is not null;
create index if not exists legal_norms_jurisdiction_type_date_idx
  on public.legal_norms (jurisdiction_type, jurisdiction_normalized, resource_type, publication_date desc);

create index if not exists legal_norms_search_idx
  on public.legal_norms using gin (
    to_tsvector('spanish', coalesce(title,'') || ' ' || coalesce(summary,''))
  );

create index if not exists legal_norm_relationships_modified_id_idx
  on public.legal_norm_relationships (modified_source_record_id);

commit;
