-- Applied to Supabase project JurisFlow as migration 20261106000912_private_case_material_search.
create or replace function public.search_case_materials(
  p_firm_id uuid,p_case_id uuid,p_query text,p_limit integer default 10
)
returns table (
  source_type text,title text,citation text,excerpt text,source_url text,
  page_number integer,source_id uuid,document_id uuid,verified boolean,rank real
)
language plpgsql stable set search_path = ''
as $$
declare v_query tsquery; v_limit integer;
begin
  if (select auth.uid()) is null then raise exception 'Debes iniciar sesión para investigar una causa'; end if;
  if not private.has_case_access(p_case_id,p_firm_id,'read') then raise exception 'No tenés acceso a este expediente'; end if;
  if nullif(trim(coalesce(p_query,'')),'') is null then raise exception 'Ingresá un término de búsqueda'; end if;
  if length(p_query)>500 then raise exception 'La búsqueda supera el máximo permitido'; end if;
  v_query:=websearch_to_tsquery('spanish',p_query);
  v_limit:=least(greatest(coalesce(p_limit,10),1),30);
  return query
  select 'document'::text,d.file_name::text,
    ('Documento del expediente · página '||coalesce(ch.page_number::text,'sin número'))::text,
    left(ch.content,1200)::text,null::text,ch.page_number,null::uuid,d.id,false,
    ts_rank_cd(ch.search_vector,v_query)::real
  from public.document_chunks ch
  join public.documents d on d.id=ch.document_id and d.firm_id=ch.firm_id
  where ch.firm_id=p_firm_id and ch.case_id=p_case_id and ch.search_vector @@ v_query
  union all
  select 'legal_source'::text,l.title::text,l.citation::text,left(coalesce(l.summary,''),1200)::text,
    l.source_url::text,null::integer,l.id,null::uuid,true,
    ts_rank_cd(to_tsvector('spanish',coalesce(l.title,'')||' '||coalesce(l.citation,'')||' '||
      coalesce(l.summary,'')||' '||coalesce(l.authority,'')),v_query)::real
  from public.legal_library l
  where l.verification_status='verified' and (l.firm_id is null or l.firm_id=p_firm_id)
    and to_tsvector('spanish',coalesce(l.title,'')||' '||coalesce(l.citation,'')||' '||
      coalesce(l.summary,'')||' '||coalesce(l.authority,'')) @@ v_query
  order by rank desc limit v_limit;
end;
$$;
revoke all on function public.search_case_materials(uuid,uuid,text,integer) from public,anon;
grant execute on function public.search_case_materials(uuid,uuid,text,integer) to authenticated;
comment on function public.search_case_materials(uuid,uuid,text,integer) is
  'Busca fragmentos del expediente y fuentes jurídicas verificadas visibles para el usuario; respeta acceso RLS por causa.';
