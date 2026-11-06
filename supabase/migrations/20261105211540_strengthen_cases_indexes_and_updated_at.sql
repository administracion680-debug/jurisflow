create index if not exists cases_firm_case_number_idx
  on public.cases (firm_id, case_number)
  where case_number is not null;

create index if not exists cases_firm_status_updated_idx
  on public.cases (firm_id, status, updated_at desc);

drop trigger if exists cases_set_updated_at on public.cases;
create trigger cases_set_updated_at
before update on public.cases
for each row
execute function private.set_updated_at();