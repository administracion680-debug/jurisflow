
drop policy if exists profiles_read_access on public.profiles;
create policy profiles_read_self on public.profiles
for select to authenticated
using (id=(select auth.uid()));

create or replace function public.list_firm_directory(p_firm_id uuid)
returns table(user_id uuid,role text,full_name text)
language plpgsql
stable
security definer
set search_path = ''
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

revoke all on function public.list_firm_directory(uuid) from public,anon;
grant execute on function public.list_firm_directory(uuid) to authenticated;
comment on function public.list_firm_directory(uuid) is
  'Devuelve solo nombre y rol de integrantes del mismo estudio; nunca expone teléfono ni otros datos del perfil.';
