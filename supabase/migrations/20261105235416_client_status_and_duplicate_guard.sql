
alter table public.clients
  add column if not exists status text not null default 'active';

alter table public.clients
  drop constraint if exists clients_status_check;
alter table public.clients
  add constraint clients_status_check
  check (status in ('active','inactive'));

create unique index if not exists clients_firm_document_unique
  on public.clients (firm_id, lower(document_number))
  where document_number is not null and btrim(document_number) <> '';

comment on column public.clients.status is
  'Estado operativo del cliente: active o inactive.';
