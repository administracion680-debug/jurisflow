-- Run as database owner after the privilege-hardening migration.
-- Read-only assertions: no fixtures or persistent data changes.
do $test$
declare
  v record;
begin
  for v in
    select c.oid, n.nspname, c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
  loop
    if has_table_privilege('anon', v.oid, 'TRUNCATE')
       or has_table_privilege('authenticated', v.oid, 'TRUNCATE')
       or has_table_privilege('anon', v.oid, 'MAINTAIN')
       or has_table_privilege('authenticated', v.oid, 'MAINTAIN')
       or has_table_privilege('anon', v.oid, 'REFERENCES')
       or has_table_privilege('authenticated', v.oid, 'REFERENCES')
       or has_table_privilege('anon', v.oid, 'TRIGGER')
       or has_table_privilege('authenticated', v.oid, 'TRIGGER') then
      raise exception 'Browser role retains a dangerous table privilege on %.%', v.nspname, v.relname;
    end if;
  end loop;
end;
$test$;
