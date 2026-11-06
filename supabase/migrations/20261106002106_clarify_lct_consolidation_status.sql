
update public.legal_library
set summary='Texto actualizado oficial de la Ley 20.744. La Ley 27.802 de Modernización Laboral introduce modificaciones que deben consultarse en su norma original y reglamentación; esta ficha no debe tomarse como consolidación automática de todas esas reformas.'
where firm_id is null
  and source_url='https://www.argentina.gob.ar/normativa/nacional/ley-20744-25552/actualizacion';
