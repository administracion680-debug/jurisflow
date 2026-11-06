
create or replace function public.create_firm_invitation(
  p_firm_id uuid,
  p_email text,
  p_role text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_token text;
begin
  if (select auth.uid()) is null then
    raise exception 'Debes iniciar sesión para invitar integrantes';
  end if;

  if not (select private.has_firm_role(p_firm_id, array['owner','admin']::text[])) then
    raise exception 'No tienes permisos para invitar integrantes a este estudio';
  end if;

  v_email := lower(trim(coalesce(p_email, '')));
  if v_email = '' or v_email !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' then
    raise exception 'Ingresá un correo electrónico válido';
  end if;

  if p_role not in ('admin','lawyer','assistant') then
    raise exception 'El rol indicado no está permitido';
  end if;

  if exists (
    select 1
    from auth.users u
    join public.firm_members fm on fm.user_id = u.id
    where fm.firm_id = p_firm_id
      and lower(u.email) = v_email
  ) then
    raise exception 'Esta persona ya pertenece al estudio';
  end if;

  update public.firm_invitations
  set status = 'revoked'
  where firm_id = p_firm_id
    and lower(email) = v_email
    and status = 'pending';

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.firm_invitations (
    firm_id, email, role, token_hash, invited_by
  )
  values (
    p_firm_id,
    v_email,
    p_role,
    encode(extensions.digest(convert_to(v_token, 'UTF8'), 'sha256'), 'hex'),
    (select auth.uid())
  );

  return v_token;
end;
$$;
