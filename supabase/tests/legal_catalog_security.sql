-- Prueba de regresión posterior a la aplicación de docs/sql-proposals/create_legal_catalog.sql.
-- Ejecutar como postgres desde el SQL Editor; no inserta ni modifica filas.

do $test$
declare
  v record;
begin
  for v in
    select *
    from (values
      ('public','legal_norms'),
      ('public','legal_norm_relationships'),
      ('private','legal_norm_relationship_observations'),
      ('private','legal_import_batches')
    ) as expected(schema_name, table_name)
  loop
    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname=v.schema_name
        and c.relname=v.table_name
        and c.relkind='r'
        and c.relrowsecurity
    ) then
      raise exception 'RLS/table missing: %.%', v.schema_name, v.table_name;
    end if;
  end loop;

  if not has_table_privilege('authenticated','public.legal_norms','SELECT')
     or not has_table_privilege('authenticated','public.legal_norm_relationships','SELECT') then
    raise exception 'authenticated must have SELECT on public catalog tables';
  end if;

  if has_table_privilege('anon','public.legal_norms','SELECT')
     or has_table_privilege('anon','public.legal_norm_relationships','SELECT') then
    raise exception 'anon must not read the legal catalog';
  end if;

  if has_table_privilege('authenticated','public.legal_norms','INSERT')
     or has_table_privilege('authenticated','public.legal_norms','UPDATE')
     or has_table_privilege('authenticated','public.legal_norms','DELETE')
     or has_table_privilege('authenticated','public.legal_norms','TRUNCATE')
     or has_table_privilege('authenticated','public.legal_norm_relationships','INSERT')
     or has_table_privilege('authenticated','public.legal_norm_relationships','UPDATE')
     or has_table_privilege('authenticated','public.legal_norm_relationships','DELETE')
     or has_table_privilege('authenticated','public.legal_norm_relationships','TRUNCATE') then
    raise exception 'authenticated has write/elevated privileges on catalog tables';
  end if;

  if has_table_privilege('authenticated','private.legal_import_batches','SELECT')
     or has_table_privilege('authenticated','private.legal_norm_relationship_observations','SELECT')
     or has_table_privilege('anon','private.legal_import_batches','SELECT')
     or has_table_privilege('anon','private.legal_norm_relationship_observations','SELECT') then
    raise exception 'Browser roles must not read private ingestion tables';
  end if;

  if not has_table_privilege('service_role','private.legal_import_batches','INSERT')
     or not has_table_privilege('service_role','private.legal_norm_relationship_observations','INSERT') then
    raise exception 'service_role must be able to perform server-side ingestion';
  end if;

  if has_table_privilege('service_role','private.legal_import_batches','TRUNCATE')
     or has_table_privilege('service_role','private.legal_norm_relationship_observations','TRUNCATE') then
    raise exception 'service_role must not receive TRUNCATE on ingestion tables';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where (table_schema,table_name) in (
      ('public','legal_norms'),
      ('public','legal_norm_relationships'),
      ('private','legal_norm_relationship_observations'),
      ('private','legal_import_batches')
    )
    and column_name in ('source_record','source_payload','full_text')
  ) then
    raise exception 'Raw source payload/full text must not be stored in the compact catalog';
  end if;
end
$test$;
