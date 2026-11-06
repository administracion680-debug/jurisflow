
-- JurisFlow MVP: tenant-scoped legal workspace tables
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete cascade,
  full_name text not null,
  document_number text,
  email text,
  phone text,
  address text,
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_firm_id_id_unique unique (firm_id, id)
);

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete cascade,
  client_id uuid,
  title text not null,
  case_number text,
  court text,
  jurisdiction text,
  status text not null default 'active' check (status in ('active','pending','closed','archived')),
  description text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cases_firm_id_id_unique unique (firm_id, id),
  constraint cases_client_same_firm_fk foreign key (firm_id, client_id)
    references public.clients(firm_id, id) on delete set null (client_id)
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete cascade,
  case_id uuid,
  title text not null,
  description text,
  event_type text not null default 'meeting',
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_case_same_firm_fk foreign key (firm_id, case_id)
    references public.cases(firm_id, id) on delete set null (case_id)
);

create table if not exists public.deadlines (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete cascade,
  case_id uuid,
  title text not null,
  description text,
  due_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','completed','cancelled')),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deadlines_case_same_firm_fk foreign key (firm_id, case_id)
    references public.cases(firm_id, id) on delete set null (case_id)
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete cascade,
  case_id uuid,
  client_id uuid,
  file_name text not null,
  storage_path text,
  mime_type text,
  file_size bigint,
  notes text,
  uploaded_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  constraint documents_case_same_firm_fk foreign key (firm_id, case_id)
    references public.cases(firm_id, id) on delete set null (case_id),
  constraint documents_client_same_firm_fk foreign key (firm_id, client_id)
    references public.clients(firm_id, id) on delete set null (client_id)
);

create table if not exists public.legal_library (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid references public.law_firms(id) on delete cascade,
  title text not null,
  resource_type text not null default 'other',
  jurisdiction text,
  citation text,
  source_url text,
  summary text,
  created_by uuid default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

-- RLS on every tenant data table. Access is limited to authenticated firm members.
do $$
declare t text;
begin
  foreach t in array array['clients','cases','calendar_events','deadlines','documents','legal_library']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_firm_member_access', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select public.is_firm_member(firm_id))) with check ((select public.is_firm_member(firm_id)))',
      t || '_firm_member_access', t
    );
  end loop;
end $$;

-- Indexes for tenant filters, relations, and FK performance.
create index if not exists law_firms_created_by_idx on public.law_firms(created_by);
create index if not exists clients_firm_id_idx on public.clients(firm_id);
create index if not exists cases_firm_id_idx on public.cases(firm_id);
create index if not exists cases_client_id_idx on public.cases(firm_id, client_id);
create index if not exists calendar_events_firm_starts_idx on public.calendar_events(firm_id, starts_at);
create index if not exists deadlines_firm_due_idx on public.deadlines(firm_id, due_at);
create index if not exists documents_firm_id_idx on public.documents(firm_id);
create index if not exists legal_library_firm_id_idx on public.legal_library(firm_id);

-- Trigger-only privileged functions are not exposed as API RPCs.
revoke execute on function public.add_firm_owner() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
-- RLS helper functions remain executable only by authenticated users and database owner.
revoke execute on function public.has_firm_role(uuid, text[]) from public, anon;
revoke execute on function public.is_firm_member(uuid) from public, anon;
