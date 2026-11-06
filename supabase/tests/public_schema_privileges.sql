-- Run as database owner after the privilege-hardening migration.
-- Read-only assertions: no fixtures or persistent data changes.
do $test$
declare
  v record;
begin
  if has_schema_privilege('anon', 'public', 'CREATE')
     or has_schema_privilege('authenticated', 'public', 'CREATE') then
    raise exception 'Browser role can create objects in public schema';
  end if;

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
  if exists (
    select 1
    from pg_default_acl d
    join pg_namespace n on n.oid = d.defaclnamespace
    join pg_roles owner_role on owner_role.oid = d.defaclrole
    cross join lateral aclexplode(d.defaclacl) acl
    left join pg_roles grantee_role on grantee_role.oid = acl.grantee
    where n.nspname = 'public'
      and owner_role.rolname = 'postgres'
      and d.defaclobjtype in ('r', 'S')
      and (acl.grantee = 0 or grantee_role.rolname in ('anon', 'authenticated'))
  ) then
    raise exception 'Public-schema table/sequence defaults still expose new objects to browser roles or PUBLIC';
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and (
        has_function_privilege('anon', p.oid, 'EXECUTE')
        or has_function_privilege('authenticated', p.oid, 'EXECUTE')
      )
  ) then
    raise exception 'A SECURITY DEFINER function in public is executable by a browser role';
  end if;

  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
  ) then
    raise exception 'A public table is missing row-level security';
  end if;
end;
$test$;
