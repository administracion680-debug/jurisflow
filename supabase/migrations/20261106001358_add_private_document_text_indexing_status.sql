
alter table public.documents
  add column if not exists index_status text not null default 'pending',
  add column if not exists indexed_at timestamptz,
  add column if not exists index_error text;

alter table public.documents drop constraint if exists documents_index_status_check;
alter table public.documents add constraint documents_index_status_check
  check (index_status in ('pending','indexed','failed','unsupported'));

drop policy if exists document_chunks_case_insert on public.document_chunks;
create policy document_chunks_case_insert on public.document_chunks
for insert to authenticated
with check (
  private.has_case_access(case_id,firm_id,'write')
  and exists (
    select 1 from public.documents d
    where d.id=document_chunks.document_id
      and d.firm_id=document_chunks.firm_id
      and d.case_id=document_chunks.case_id
  )
);

drop policy if exists document_chunks_case_delete on public.document_chunks;
create policy document_chunks_case_delete on public.document_chunks
for delete to authenticated
using (private.has_case_access(case_id,firm_id,'write'));

grant select,insert,delete on public.document_chunks to authenticated;
