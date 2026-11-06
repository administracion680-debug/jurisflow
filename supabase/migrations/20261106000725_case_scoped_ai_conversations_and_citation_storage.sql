-- Applied to Supabase project JurisFlow as migration 20261106000725_case_scoped_ai_conversations_and_citation_storage.
alter table public.documents
  add constraint documents_firm_id_id_unique unique (firm_id,id);
alter table public.documents
  add constraint documents_firm_case_id_unique unique (firm_id,case_id,id);

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null,
  case_id uuid not null,
  title text not null default 'Consulta jurídica',
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_conversations_firm_id_id_unique unique (firm_id,id),
  constraint ai_conversations_case_same_firm_fk foreign key (firm_id,case_id)
    references public.cases(firm_id,id) on delete cascade,
  constraint ai_conversations_created_by_fk foreign key (created_by) references auth.users(id)
);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null,
  conversation_id uuid not null,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  constraint ai_messages_firm_id_id_unique unique (firm_id,id),
  constraint ai_messages_conversation_same_firm_fk foreign key (firm_id,conversation_id)
    references public.ai_conversations(firm_id,id) on delete cascade,
  constraint ai_messages_created_by_fk foreign key (created_by) references auth.users(id)
);

create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null,
  case_id uuid not null,
  document_id uuid not null,
  chunk_index integer not null check (chunk_index>=0),
  page_number integer,
  content text not null,
  search_vector tsvector generated always as (to_tsvector('spanish',coalesce(content,''))) stored,
  created_at timestamptz not null default now(),
  constraint document_chunks_unique unique (document_id,chunk_index),
  constraint document_chunks_case_same_firm_fk foreign key (firm_id,case_id)
    references public.cases(firm_id,id) on delete cascade,
  constraint document_chunks_document_same_case_fk foreign key (firm_id,case_id,document_id)
    references public.documents(firm_id,case_id,id) on delete cascade
);

create table public.ai_citations (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null,
  conversation_id uuid not null,
  message_id uuid not null,
  source_id uuid,
  document_id uuid,
  citation_text text not null,
  source_url text,
  excerpt text,
  page_number integer,
  article_number text,
  source_verified boolean not null default false,
  created_at timestamptz not null default now(),
  constraint ai_citations_conversation_same_firm_fk foreign key (firm_id,conversation_id)
    references public.ai_conversations(firm_id,id) on delete cascade,
  constraint ai_citations_message_same_firm_fk foreign key (firm_id,message_id)
    references public.ai_messages(firm_id,id) on delete cascade,
  constraint ai_citations_source_fk foreign key (source_id)
    references public.legal_library(id) on delete set null,
  constraint ai_citations_document_same_firm_fk foreign key (firm_id,document_id)
    references public.documents(firm_id,id) on delete set null,
  constraint ai_citations_source_required check (source_id is not null or document_id is not null)
);

create index ai_conversations_firm_case_created_idx on public.ai_conversations(firm_id,case_id,created_at desc);
create index ai_messages_firm_conversation_created_idx on public.ai_messages(firm_id,conversation_id,created_at);
create index ai_citations_firm_conversation_idx on public.ai_citations(firm_id,conversation_id);
create index document_chunks_case_document_idx on public.document_chunks(firm_id,case_id,document_id);
create index document_chunks_search_vector_idx on public.document_chunks using gin(search_vector);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.document_chunks enable row level security;
alter table public.ai_citations enable row level security;

create policy ai_conversations_case_read on public.ai_conversations for select to authenticated
using (private.has_case_access(case_id,firm_id,'read'));
create policy ai_conversations_case_insert on public.ai_conversations for insert to authenticated
with check (private.has_case_access(case_id,firm_id,'write') and created_by=(select auth.uid()));
create policy ai_conversations_case_update on public.ai_conversations for update to authenticated
using (private.has_case_access(case_id,firm_id,'write'))
with check (private.has_case_access(case_id,firm_id,'write'));
create policy ai_conversations_case_delete on public.ai_conversations for delete to authenticated
using (private.has_case_access(case_id,firm_id,'write') and
  (created_by=(select auth.uid()) or private.has_firm_role(firm_id,array['owner','admin']::text[])));

create policy ai_messages_case_read on public.ai_messages for select to authenticated
using (exists (select 1 from public.ai_conversations c where c.id=ai_messages.conversation_id
  and c.firm_id=ai_messages.firm_id and private.has_case_access(c.case_id,c.firm_id,'read')));
create policy ai_messages_user_insert on public.ai_messages for insert to authenticated
with check (role='user' and created_by=(select auth.uid()) and
  exists (select 1 from public.ai_conversations c where c.id=ai_messages.conversation_id
    and c.firm_id=ai_messages.firm_id and private.has_case_access(c.case_id,c.firm_id,'write')));

create policy document_chunks_case_read on public.document_chunks for select to authenticated
using (private.has_case_access(case_id,firm_id,'read'));
create policy ai_citations_case_read on public.ai_citations for select to authenticated
using (exists (select 1 from public.ai_conversations c where c.id=ai_citations.conversation_id
  and c.firm_id=ai_citations.firm_id and private.has_case_access(c.case_id,c.firm_id,'read')));

grant select,insert,update,delete on public.ai_conversations to authenticated;
grant select,insert on public.ai_messages to authenticated;
grant select on public.document_chunks,public.ai_citations to authenticated;

create or replace function private.validate_ai_citation_tenant()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_case_id uuid; v_source_firm_id uuid; v_document_case_id uuid;
begin
  select c.case_id into v_case_id from public.ai_conversations c
  where c.id=new.conversation_id and c.firm_id=new.firm_id;
  if v_case_id is null then raise exception 'La conversación jurídica no existe en este estudio'; end if;
  if new.source_id is not null then
    select l.firm_id into v_source_firm_id from public.legal_library l where l.id=new.source_id;
    if not found or (v_source_firm_id is not null and v_source_firm_id<>new.firm_id) then
      raise exception 'La fuente jurídica no pertenece a este estudio ni es global';
    end if;
    if new.source_verified and not exists (select 1 from public.legal_library l
      where l.id=new.source_id and l.verification_status='verified') then
      raise exception 'No se puede marcar como verificada una fuente pendiente o descartada';
    end if;
  end if;
  if new.document_id is not null then
    select d.case_id into v_document_case_id from public.documents d
    where d.id=new.document_id and d.firm_id=new.firm_id;
    if not found or v_document_case_id is distinct from v_case_id then
      raise exception 'El documento citado no pertenece al expediente de la conversación';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists ai_citations_validate_tenant on public.ai_citations;
create trigger ai_citations_validate_tenant before insert or update on public.ai_citations
for each row execute function private.validate_ai_citation_tenant();

comment on table public.ai_conversations is 'Conversaciones IA por expediente, sujetas a permisos RLS de la causa.';
comment on table public.document_chunks is 'Fragmentos de documentos para búsqueda textual en español; no contiene embeddings.';
comment on table public.ai_citations is 'Citas trazables a fuentes jurídicas globales/del estudio o documentos del mismo expediente.';
