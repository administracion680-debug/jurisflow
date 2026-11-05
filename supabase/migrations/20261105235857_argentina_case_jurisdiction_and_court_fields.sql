-- Applied to Supabase project JurisFlow as migration 20261105235857_argentina_case_jurisdiction_and_court_fields.
alter table public.cases
  add column if not exists jurisdiction_level text,
  add column if not exists province text,
  add column if not exists locality text,
  add column if not exists branch text,
  add column if not exists court_name text,
  add column if not exists court_department text,
  add column if not exists matter_type text,
  add column if not exists process_stage text;

alter table public.cases drop constraint if exists cases_jurisdiction_level_check;
alter table public.cases add constraint cases_jurisdiction_level_check
  check (jurisdiction_level is null or jurisdiction_level in ('provincial','national','federal','caba'));

alter table public.cases drop constraint if exists cases_branch_check;
alter table public.cases add constraint cases_branch_check
  check (branch is null or branch in (
    'penal','civil','commercial','family','labor','administrative',
    'tax','social_security','execution','juvenile','other'
  ));

create index if not exists cases_firm_jurisdiction_branch_idx
  on public.cases (firm_id,jurisdiction_level,branch,status);

comment on column public.cases.jurisdiction_level is
  'Orden o ámbito judicial: provincial, nacional, federal o justicia propia de CABA.';
comment on column public.cases.branch is
  'Fuero/materia jurídica; no debe confundirse con la jurisdicción territorial.';
