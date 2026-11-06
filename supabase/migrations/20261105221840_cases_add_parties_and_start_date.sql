
alter table public.cases
  add column if not exists plaintiff text,
  add column if not exists defendant text,
  add column if not exists start_date date;

create index if not exists cases_firm_start_date_idx
  on public.cases (firm_id, start_date desc);

comment on column public.cases.plaintiff is 'Parte actora o demandante del expediente';
comment on column public.cases.defendant is 'Parte demandada o contraparte del expediente';
comment on column public.cases.start_date is 'Fecha de inicio del expediente';
