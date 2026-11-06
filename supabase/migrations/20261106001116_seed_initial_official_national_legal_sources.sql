-- Applied to Supabase project JurisFlow as migration 20261106001116_seed_initial_official_national_legal_sources.
insert into public.legal_library
  (firm_id,title,resource_type,jurisdiction,citation,source_url,summary,authority,publication_date,verification_status)
select null,v.title,'law','Nacional',v.citation,v.source_url,v.summary,
  'Honorable Congreso de la Nación Argentina',v.publication_date::date,'verified'
from (values
  ('Constitución de la Nación Argentina','Ley 24.430 — texto oficial de la Constitución Nacional','https://www.argentina.gob.ar/normativa/nacional/804/texto','Texto oficial publicado por la Ley 24.430; incluye la reforma constitucional de 1994.','1994-12-14'),
  ('Código Civil y Comercial de la Nación','Ley 26.994 — texto actualizado','https://www.argentina.gob.ar/normativa/nacional/ley-26994-235975/actualizacion','Texto actualizado oficial del Código Civil y Comercial. Verificar reformas posteriores y vigencia del artículo aplicable.','2014-10-01'),
  ('Código Penal de la Nación','Ley 11.179 — texto actualizado','https://www.argentina.gob.ar/normativa/nacional/ley-11179-16546/actualizacion','Texto ordenado 1984 actualizado del Código Penal de la Nación. Verificar modificaciones y leyes penales especiales.','1921-09-30'),
  ('Ley de Contrato de Trabajo','Ley 20.744 — texto actualizado','https://www.argentina.gob.ar/normativa/nacional/ley-20744-25552/actualizacion','Texto actualizado oficial. La página consultada incorpora modificaciones de la Ley 27.802 publicada el 6 de marzo de 2026; revisar vigencia y régimen transitorio de cada reforma.','1974-09-05'),
  ('Defensa del Consumidor','Ley 24.240 — texto actualizado','https://www.argentina.gob.ar/normativa/nacional/ley-24240-638/actualizacion','Texto actualizado del régimen legal de protección y defensa de consumidores y usuarios.','1993-09-22')
) as v(title,citation,source_url,summary,publication_date)
where not exists (select 1 from public.legal_library l where l.firm_id is null and l.source_url=v.source_url);
