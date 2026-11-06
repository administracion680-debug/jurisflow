
-- Prevent duplicate memberships for the same person in the same firm.
create unique index if not exists firm_members_firm_user_uidx
  on public.firm_members(firm_id, user_id);

-- Invitation records store only a hash of a one-time token, never the token itself.
create table if not exists public.firm_invitations (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin','lawyer','assistant')),
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  invited_by uuid not null default auth.uid() references auth.users(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.firm_invitations enable row level security;
drop policy if exists firm_invitations_admin_read on public.firm_invitations;
create policy firm_invitations_admin_read
  on public.firm_invitations for select to authenticated
  using ((select private.has_firm_role(firm_id, array['owner','admin']::text[])));
drop policy if exists firm_invitations_admin_delete on public.firm_invitations;
create policy firm_invitations_admin_delete
  on public.firm_invitations for delete to authenticated
  using ((select private.has_firm_role(firm_id, array['owner','admin']::text[])));

create index if not exists firm_invitations_firm_status_idx
  on public.firm_invitations(firm_id, status, expires_at);

create or replace function private.create_firm_invitation(
  p_firm_id uuid,
  p_email text,
  p_role text,
  p_token_hash text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_email is null or length(trim(p_email)) < 5 or position('@' in p_email) < 2 then
    raise exception 'A valid email is required';
  end if;
  if p_role not in ('admin','lawyer','assistant') then
    raise exception 'Invalid invitation role';
  end if;
  if p_token_hash is null or length(p_token_hash) < 32 then
    raise exception 'A secure invitation token hash is required';
  end if;
  if not private.has_firm_role(p_firm_id, array['owner','admin']::text[]) then
    raise exception 'Only firm owners or admins can invite members';
  end if;
  if p_role = 'admin' and not private.has_firm_role(p_firm_id, array['owner']::text[]) then
    raise exception 'Only firm owners can invite admins';
  end if;

  insert into public.firm_invitations(firm_id,email,role,token_hash,invited_by)
  values (p_firm_id, lower(trim(p_email)), p_role, p_token_hash, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function private.accept_firm_invitation(p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_email text;
  v_inv public.firm_invitations%rowtype;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  select lower(u.email) into v_email from auth.users u where u.id = v_user_id;
  if v_email is null then
    raise exception 'Authenticated email not found';
  end if;

  select * into v_inv
  from public.firm_invitations
  where token_hash = p_token_hash
    and status = 'pending'
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Invitation is invalid, expired, or already used';
  end if;
  if v_inv.email <> v_email then
    raise exception 'This invitation belongs to a different email address';
  end if;

  insert into public.firm_members(firm_id,user_id,role)
  values (v_inv.firm_id,v_user_id,v_inv.role)
  on conflict (firm_id,user_id) do nothing;

  update public.firm_invitations
  set status='accepted', accepted_at=now()
  where id=v_inv.id;

  return v_inv.firm_id;
end;
$$;

revoke all on function private.create_firm_invitation(uuid,text,text,text) from public, anon;
revoke all on function private.accept_firm_invitation(text) from public, anon;
grant execute on function private.create_firm_invitation(uuid,text,text,text) to authenticated;
grant execute on function private.accept_firm_invitation(text) to authenticated;
