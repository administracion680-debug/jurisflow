-- Register the official national Infoleg open-data catalogue.
-- This is a source entry only: it does not import the dataset or certify each
-- individual instrument as current. Individual texts must be checked at source.
insert into public.legal_library
  (firm_id,title,resource_type,jurisdiction,citation,source_url,summary,authority,verification_status)
select
  null,
  'Base de Datos Legislativos Infoleg — datos abiertos nacionales',
  'other',
  'Nacional',
  'Dataset oficial de normativa nacional; datos al 31/10/2026; actualización mensual; licencia Creative Commons Attribution 4.0',
  'https://datos.jus.gob.ar/es_AR/dataset/base-de-datos-legislativos-infoleg',
  'Catálogo oficial de documentos normativos nacionales que incluye leyes, decisiones administrativas, decretos, resoluciones, disposiciones, acordadas y otros actos publicados en la primera sección del Boletín Oficial desde mayo de 1997, además de normativa referenciada. La ficha del dataset informa actualización al 31/10/2026, publicación actualizada el 02/11/2026, frecuencia mensual y licencia CC BY 4.0. Esta entrada enlaza al catálogo; no importa automáticamente los archivos ZIP/CSV ni verifica la vigencia individual de cada norma. Comprobar siempre el texto y sus modificaciones en la fuente oficial antes de citar.',
  'Ministerio de Justicia de la Nación — Dirección Nacional del Sistema Argentino de Información Jurídica (Infoleg)',
  'verified'
where not exists (
  select 1 from public.legal_library
  where firm_id is null
    and source_url='https://datos.jus.gob.ar/es_AR/dataset/base-de-datos-legislativos-infoleg'
);
