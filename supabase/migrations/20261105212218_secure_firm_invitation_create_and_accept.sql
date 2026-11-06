
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
  if v_email = '' or v_email !~ '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
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

create or replace function public.accept_firm_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.firm_invitations%rowtype;
  v_email text;
begin
  if (select auth.uid()) is null then
    raise exception 'Debes iniciar sesión para aceptar la invitación';
  end if;

  v_email := lower(coalesce((select auth.jwt() ->> 'email'), ''));

  select *
  into v_invitation
  from public.firm_invitations
  where token_hash = encode(
    extensions.digest(convert_to(coalesce(p_token, ''), 'UTF8'), 'sha256'),
    'hex'
  )
  for update;

  if not found
     or v_invitation.status <> 'pending'
     or v_invitation.expires_at <= now()
     or lower(v_invitation.email) <> v_email then
    raise exception 'La invitación no es válida, está vencida o no corresponde a tu correo';
  end if;

  insert into public.firm_members (firm_id, user_id, role)
  values (v_invitation.firm_id, (select auth.uid()), v_invitation.role)
  on conflict (firm_id, user_id) do nothing;

  update public.firm_invitations
  set status = 'accepted', accepted_at = now()
  where id = v_invitation.id;

  return v_invitation.firm_id;
end;
$$;

revoke all on function public.create_firm_invitation(uuid, text, text) from public, anon;
grant execute on function public.create_firm_invitation(uuid, text, text) to authenticated;

revoke all on function public.accept_firm_invitation(text) from public, anon;
grant execute on function public.accept_firm_invitation(text) to authenticated;
