
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
alter function public.has_firm_role(uuid, text[]) set schema private;
alter function public.is_firm_member(uuid) set schema private;
grant execute on function private.has_firm_role(uuid, text[]) to authenticated;
grant execute on function private.is_firm_member(uuid) to authenticated;
create index if not exists calendar_events_firm_case_idx on public.calendar_events(firm_id, case_id);
create index if not exists deadlines_firm_case_idx on public.deadlines(firm_id, case_id);
create index if not exists documents_firm_case_idx on public.documents(firm_id, case_id);
create index if not exists documents_firm_client_idx on public.documents(firm_id, client_id);
create index if not exists clients_created_by_idx on public.clients(created_by);
create index if not exists cases_created_by_idx on public.cases(created_by);
create index if not exists calendar_events_created_by_idx on public.calendar_events(created_by);
create index if not exists deadlines_created_by_idx on public.deadlines(created_by);
create index if not exists documents_uploaded_by_idx on public.documents(uploaded_by);
create index if not exists legal_library_created_by_idx on public.legal_library(created_by);
