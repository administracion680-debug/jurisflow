
create or replace function private.prevent_tenant_firm_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.firm_id is distinct from old.firm_id then
    raise exception 'No se puede trasladar un registro entre estudios';
  end if;
  return new;
end;
$$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'clients','documents','calendar_events','deadlines','fee_entries','payments','legal_library'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', target_table || '_prevent_firm_change', target_table);
    execute format(
      'create trigger %I before update of firm_id on public.%I for each row execute function private.prevent_tenant_firm_change()',
      target_table || '_prevent_firm_change', target_table
    );
  end loop;
end;
$$;
