-- Applied to Supabase project JurisFlow as migration 20261106001313_seed_law_27802_modernizacion_laboral.
insert into public.legal_library
  (firm_id,title,resource_type,jurisdiction,citation,source_url,summary,authority,publication_date,verification_status)
select null,'Ley de Modernización Laboral','law','Nacional','Ley 27.802',
  'https://www.argentina.gob.ar/normativa/nacional/ley-27802-2026-423680/texto',
  'Texto original oficial. Sancionada el 27 de febrero de 2026 y publicada el 6 de marzo de 2026. Modifica la Ley de Contrato de Trabajo y otras normas; la página oficial registra normas complementarias y modificatorias posteriores. Revisar texto actualizado, reglamentación y vigencia temporal antes de aplicar.',
  'Honorable Congreso de la Nación Argentina','2026-03-06','verified'
where not exists (
  select 1 from public.legal_library l
  where l.firm_id is null and l.source_url='https://www.argentina.gob.ar/normativa/nacional/ley-27802-2026-423680/texto'
);
