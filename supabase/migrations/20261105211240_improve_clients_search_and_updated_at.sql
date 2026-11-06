create index if not exists clients_firm_document_number_idx
  on public.clients (firm_id, document_number)
  where document_number is not null;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
before update on public.clients
for each row
execute function private.set_updated_at();