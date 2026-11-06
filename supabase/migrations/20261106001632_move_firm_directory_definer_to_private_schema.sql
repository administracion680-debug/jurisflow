
create or replace function private.list_firm_directory(p_firm_id uuid)
returns table(user_id uuid,role text,full_name text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.is_firm_member(p_firm_id) then
    raise exception 'No tenés acceso al directorio de este estudio';
  end if;
  return query
    select fm.user_id,fm.role,p.full_name
    from public.firm_members fm
    left join public.profiles p on p.id=fm.user_id
    where fm.firm_id=p_firm_id
    order by fm.role,coalesce(p.full_name,'');
end;
$$;

grant usage on schema private to authenticated;
grant execute on function private.list_firm_directory(uuid) to authenticated;

create or replace function public.list_firm_directory(p_firm_id uuid)
returns table(user_id uuid,role text,full_name text)
language sql stable security invoker set search_path = ''
as $$
  select * from private.list_firm_directory(p_firm_id);
$$;

revoke all on function public.list_firm_directory(uuid) from public,anon;
grant execute on function public.list_firm_directory(uuid) to authenticated;
