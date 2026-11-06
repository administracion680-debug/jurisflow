-- Add official national entry points for provincial and national legal research.
-- These are portal references, not imported legal texts or an assertion that every
-- individual statute/judgment has been checked for current validity.
insert into public.legal_library
  (firm_id,title,resource_type,jurisdiction,citation,source_url,summary,authority,verification_status)
select
  null,
  'Sistema Argentino de Información Jurídica (SAIJ) — buscador oficial',
  'other',
  'Nacional y provincial',
  'Portal oficial de consulta jurídica gratuita; legislación, decretos, jurisprudencia y doctrina',
  'https://www.saij.gob.ar/',
  'Portal de consulta gratuita enlazado desde Argentina.gob.ar. La información oficial del trámite describe una base de más de 900.000 documentos provenientes de fuentes oficiales, con actualización diaria: legislación nacional, decretos nacionales y provinciales, jurisprudencia nacional y provincial, doctrina y otras fuentes. Consultar el documento individual y su vigencia antes de citar.',
  'Ministerio de Justicia de la Nación — Sistema Argentino de Información Jurídica',
  'verified'
where not exists (
  select 1 from public.legal_library
  where firm_id is null and source_url='https://www.saij.gob.ar/'
);

insert into public.legal_library
  (firm_id,title,resource_type,jurisdiction,citation,source_url,summary,authority,verification_status)
select
  null,
  'Base SAIJ de Normativa Provincial — datos abiertos',
  'other',
  'Provincial',
  'Dataset oficial de normativa provincial; actualización mensual; datos al 31/10/2026; licencia Creative Commons Attribution 4.0',
  'https://datos.jus.gob.ar/dataset/base-saij-de-normativa-provincial',
  'Catálogo oficial de documentos normativos provinciales: leyes, decretos leyes, textos ordenados, códigos y constituciones publicados en los boletines oficiales provinciales. El portal ofrece un recurso CSV y gráficos por provincia, fecha, vigencia y tipo normativo. La ficha informa actualización mensual. Esta entrada enlaza al dataset; todavía no importa automáticamente el CSV a la búsqueda interna.',
  'Ministerio de Justicia de la Nación — Dirección Nacional del Sistema Argentino de Información Jurídica',
  'verified'
where not exists (
  select 1 from public.legal_library
  where firm_id is null and source_url='https://datos.jus.gob.ar/dataset/base-saij-de-normativa-provincial'
);

insert into public.legal_library
  (firm_id,title,resource_type,jurisdiction,citation,source_url,summary,authority,verification_status)
select
  null,
  'Infoleg — directorio de portales oficiales provinciales y CABA',
  'other',
  'Provincial y CABA',
  'Directorio institucional de gobiernos, legislaturas, poderes judiciales y boletines oficiales',
  'https://www.infoleg.gob.ar/?page_id=95',
  'Directorio oficial para localizar portales institucionales de las 23 provincias y la Ciudad Autónoma de Buenos Aires. Incluye accesos a gobiernos, cámaras legislativas, poderes judiciales y boletines oficiales según la jurisdicción. Usar el portal de la autoridad emisora como fuente primaria de cada norma o fallo.',
  'Infoleg — Información Legislativa y Documental',
  'verified'
where not exists (
  select 1 from public.legal_library
  where firm_id is null and source_url='https://www.infoleg.gob.ar/?page_id=95'
);
