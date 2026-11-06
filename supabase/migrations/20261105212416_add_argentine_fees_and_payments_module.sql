
create table if not exists public.fee_entries (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete cascade,
  client_id uuid,
  case_id uuid,
  description text not null,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'ARS' check (currency = 'ARS'),
  due_date date,
  status text not null default 'pending'
    check (status in ('pending','partial','paid','cancelled')),
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fee_entries_firm_id_id_unique unique (firm_id,id),
  constraint fee_entries_client_same_firm_fk
    foreign key (firm_id,client_id) references public.clients(firm_id,id),
  constraint fee_entries_case_same_firm_fk
    foreign key (firm_id,case_id) references public.cases(firm_id,id)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete cascade,
  fee_entry_id uuid not null,
  amount numeric(14,2) not null check (amount > 0),
  paid_at timestamptz not null default now(),
  payment_method text not null default 'other'
    check (payment_method in ('cash','transfer','debit_card','credit_card','other')),
  reference text,
  notes text,
  received_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  constraint payments_fee_same_firm_fk
    foreign key (firm_id,fee_entry_id) references public.fee_entries(firm_id,id)
);

alter table public.fee_entries enable row level security;
alter table public.payments enable row level security;

drop policy if exists fee_entries_firm_member_access on public.fee_entries;
create policy fee_entries_firm_member_access
on public.fee_entries for all to authenticated
using ((select private.is_firm_member(firm_id)))
with check ((select private.is_firm_member(firm_id)));

drop policy if exists payments_firm_member_access on public.payments;
create policy payments_firm_member_access
on public.payments for all to authenticated
using ((select private.is_firm_member(firm_id)))
with check ((select private.is_firm_member(firm_id)));

drop trigger if exists fee_entries_set_updated_at on public.fee_entries;
create trigger fee_entries_set_updated_at
before update on public.fee_entries
for each row execute function private.set_updated_at();

create index if not exists fee_entries_firm_status_due_idx
on public.fee_entries (firm_id,status,due_date);

create index if not exists fee_entries_firm_client_idx
on public.fee_entries (firm_id,client_id);

create index if not exists payments_firm_fee_paid_idx
on public.payments (firm_id,fee_entry_id,paid_at desc);
