-- Tenant-scoped audit trail. Deliberately records metadata only:
-- never stores client fields, document text, notes, message bodies or payment values.
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  entity_table text not null,
  entity_id text not null,
  operation text not null check (operation in ('INSERT','UPDATE','DELETE')),
  changed_fields text[] not null default '{}',
  occurred_at timestamptz not null default now()
);

create index if not exists audit_logs_firm_occurred_idx
  on public.audit_logs (firm_id, occurred_at desc);
create index if not exists audit_logs_entity_idx
  on public.audit_logs (firm_id, entity_table, entity_id, occurred_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_select_admins on public.audit_logs;
create policy audit_logs_select_admins
  on public.audit_logs for select to authenticated
  using (
    exists (
      select 1
      from public.firm_members fm
      where fm.firm_id = audit_logs.firm_id
        and fm.user_id = (select auth.uid())
        and fm.role in ('owner','admin')
    )
  );

revoke all on public.audit_logs from anon, authenticated;
grant select on public.audit_logs to authenticated;

create or replace function private.capture_audit_metadata()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_payload jsonb;
  v_old jsonb;
  v_new jsonb;
  v_firm_id uuid;
  v_entity_id text;
  v_changed_fields text[] := '{}';
begin
  if tg_op = 'DELETE' then
    v_payload := to_jsonb(old);
    v_old := v_payload;
  else
    v_payload := to_jsonb(new);
    v_new := v_payload;
  end if;

  if tg_table_name = 'law_firms' then
    v_firm_id := (v_payload ->> 'id')::uuid;
  else
    v_firm_id := (v_payload ->> 'firm_id')::uuid;
  end if;

  v_entity_id := coalesce(
    v_payload ->> 'id',
    v_payload ->> 'case_id',
    v_payload ->> 'fee_entry_id'
  );

  if v_firm_id is null or v_entity_id is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  if tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    select coalesce(array_agg(n.key order by n.key), '{}')
      into v_changed_fields
    from jsonb_each(v_new) n
    full join jsonb_each(v_old) o using (key)
    where n.value is distinct from o.value
      and n.key not in ('created_at','updated_at');
  end if;

  insert into public.audit_logs
    (firm_id, actor_id, entity_table, entity_id, operation, changed_fields)
  values
    (v_firm_id, auth.uid(), tg_table_name, v_entity_id, tg_op, v_changed_fields);

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$function$;

revoke all on function private.capture_audit_metadata() from public, anon, authenticated;

do $block$
declare
  v_table text;
begin
  foreach v_table in array array[
    'law_firms',
    'firm_members',
    'firm_invitations',
    'clients',
    'cases',
    'case_members',
    'documents',
    'calendar_events',
    'deadlines',
    'fee_entries',
    'payments',
    'legal_library'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', v_table || '_audit_metadata', v_table);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function private.capture_audit_metadata()',
      v_table || '_audit_metadata',
      v_table
    );
  end loop;
end;
$block$;

comment on table public.audit_logs is
  'Tenant-scoped metadata audit trail. Does not store record contents or confidential document/message text.';
