
alter table public.ai_citations
  drop constraint if exists ai_citations_document_same_firm_fk;
alter table public.ai_citations
  add constraint ai_citations_document_same_firm_fk
  foreign key (firm_id,document_id)
  references public.documents(firm_id,id)
  on delete cascade;

create or replace function private.validate_ai_citation_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_case_id uuid;
  v_source_firm_id uuid;
  v_document_case_id uuid;
begin
  select c.case_id into v_case_id
  from public.ai_conversations c
  where c.id=new.conversation_id and c.firm_id=new.firm_id;
  if v_case_id is null then
    raise exception 'La conversación jurídica no existe en este estudio';
  end if;

  if new.source_id is not null then
    select l.firm_id into v_source_firm_id
    from public.legal_library l where l.id=new.source_id;
    if not found or (v_source_firm_id is not null and v_source_firm_id<>new.firm_id) then
      raise exception 'La fuente jurídica no pertenece a este estudio ni es global';
    end if;
    if new.source_url is null or new.source_url !~ '^https://' then
      raise exception 'La cita de una fuente jurídica requiere guardar su URL HTTPS';
    end if;
    if new.source_verified and not exists (
      select 1 from public.legal_library l
      where l.id=new.source_id and l.verification_status='verified'
    ) then
      raise exception 'No se puede marcar como verificada una fuente pendiente o descartada';
    end if;
  end if;

  if new.document_id is not null then
    select d.case_id into v_document_case_id
    from public.documents d
    where d.id=new.document_id and d.firm_id=new.firm_id;
    if not found or v_document_case_id is distinct from v_case_id then
      raise exception 'El documento citado no pertenece al expediente de la conversación';
    end if;
  end if;
  return new;
end;
$$;
