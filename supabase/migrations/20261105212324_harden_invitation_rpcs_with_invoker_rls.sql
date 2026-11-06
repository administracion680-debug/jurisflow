
drop function if exists public.create_firm_invitation(uuid, text, text);
drop function if exists public.accept_firm_invitation(text);

drop policy if exists firm_invitations_invitee_read on public.firm_invitations;
create policy firm_invitations_invitee_read
on public.firm_invitations for select to authenticated
using (lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), '')));

drop policy if exists firm_invitations_admin_insert on public.firm_invitations;
create policy firm_invitations_admin_insert
on public.firm_invitations for insert to authenticated
with check ((select private.has_firm_role(firm_id, array['owner','admin']::text[])));

drop policy if exists firm_invitations_admin_update on public.firm_invitations;
create policy firm_invitations_admin_update
on public.firm_invitations for update to authenticated
using ((select private.has_firm_role(firm_id, array['owner','admin']::text[])))
with check ((select private.has_firm_role(firm_id, array['owner','admin']::text[])));

drop policy if exists firm_invitations_invitee_update on public.firm_invitations;
create policy firm_invitations_invitee_update
on public.firm_invitations for update to authenticated
using (
  lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  and status = 'pending'
  and expires_at > now()
)
with check (
  lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  and status = 'accepted'
  and accepted_at is not null
);

drop policy if exists firm_members_invited_insert on public.firm_members;
create policy firm_members_invited_insert
on public.firm_members for insert to authenticated
with check (
  role <> 'owner'
  and exists (
    select 1
    from public.firm_invitations i
    where i.firm_id = firm_members.firm_id
      and lower(i.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
      and i.role = firm_members.role
      and i.status = 'pending'
      and i.expires_at > now()
  )
);

grant select, insert, delete on public.firm_invitations to authenticated;
revoke update on public.firm_invitations from authenticated;
grant update (status, accepted_at) on public.firm_invitations to authenticated;

create or replace function public.create_firm_invitation(
  p_firm_id uuid,
  p_email text,
  p_role text
)
returns text
language plpgsql
security invoker
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
security invoker
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
