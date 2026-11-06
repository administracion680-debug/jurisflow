
insert into public.legal_library
  (firm_id,title,resource_type,jurisdiction,citation,source_url,summary,authority,publication_date,verification_status)
select null,v.title,v.resource_type,'Nacional',v.citation,v.source_url,v.summary,v.authority,v.publication_date::date,'verified'
from (values
  ('Decreto 407/2026 — Reglamentación de la Ley de Contrato de Trabajo','regulation','Decreto 407/2026','https://www.argentina.gob.ar/normativa/nacional/decreto-407-2026-426270/texto','Reglamenta, entre otros, artículos de la Ley de Contrato de Trabajo modificados por la Ley 27.802. Verificar texto completo y vigencia de cada artículo reglamentado.','Poder Ejecutivo Nacional','2026-06-01'),
  ('Decreto 408/2026 — Fondo de Asistencia Laboral','regulation','Decreto 408/2026','https://www.argentina.gob.ar/normativa/nacional/norma-426272/texto','Reglamenta el Título II de la Ley 27.802 sobre Fondos de Asistencia Laboral. La norma prorrogó al 1 de noviembre de 2026 la entrada en vigencia del régimen indicado en su artículo 27.','Poder Ejecutivo Nacional','2026-06-01'),
  ('Decreto 409/2026 — Promoción del Empleo Registrado','regulation','Decreto 409/2026','https://www.argentina.gob.ar/normativa/nacional/norma-426271/texto','Reglamentación del régimen de Promoción del Empleo Registrado previsto por la Ley 27.802. Revisar requisitos, porcentajes y plazos aplicables.','Poder Ejecutivo Nacional','2026-06-01'),
  ('Resolución General ARCA 5862/2026 — Promoción del Empleo Registrado','regulation','Resolución General 5862/2026','https://www.argentina.gob.ar/normativa/nacional/norma-426580/texto','Implementa aspectos del régimen de Promoción del Empleo Registrado y plan de facilidades de pago vinculados a la Ley 27.802.','Agencia de Recaudación y Control Aduanero (ARCA)','2026-06-11')
) as v(title,resource_type,citation,source_url,summary,authority,publication_date)
where not exists (select 1 from public.legal_library l where l.firm_id is null and l.source_url=v.source_url);
