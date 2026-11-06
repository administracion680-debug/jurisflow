-- Applied to Supabase project JurisFlow as migration 20261106000740_fix_ai_citation_constraints_and_index_foreign_keys.
alter table public.ai_citations drop constraint if exists ai_citations_document_same_firm_fk;
alter table public.ai_citations add constraint ai_citations_document_same_firm_fk
  foreign key (firm_id,document_id) references public.documents(firm_id,id)
  on delete set null (document_id);

alter table public.ai_citations drop constraint if exists ai_citations_source_required;
alter table public.ai_citations add constraint ai_citations_source_required
  check (source_id is not null or document_id is not null or source_url is not null);

create index if not exists ai_citations_firm_document_idx on public.ai_citations(firm_id,document_id);
create index if not exists ai_citations_firm_message_idx on public.ai_citations(firm_id,message_id);
create index if not exists ai_citations_source_id_idx on public.ai_citations(source_id);
create index if not exists ai_conversations_created_by_idx on public.ai_conversations(created_by);
create index if not exists ai_messages_created_by_idx on public.ai_messages(created_by);
create index if not exists legal_library_verified_by_idx on public.legal_library(verified_by);

create or replace function private.prevent_ai_conversation_reassignment()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.firm_id is distinct from old.firm_id or new.case_id is distinct from old.case_id then
    raise exception 'Una conversación jurídica no se puede trasladar a otro estudio o expediente';
  end if;
  return new;
end;
$$;
drop trigger if exists ai_conversations_prevent_reassignment on public.ai_conversations;
create trigger ai_conversations_prevent_reassignment before update of firm_id,case_id
on public.ai_conversations for each row execute function private.prevent_ai_conversation_reassignment();
