create or replace function private.create_firm_invitation(
  p_firm_id uuid,
  p_email text,
  p_role text,
  p_token_hash text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_email is null or length(trim(p_email)) < 5 or position('@' in p_email) < 2 then
    raise exception 'A valid email is required';
  end if;
  if p_role not in ('admin','lawyer','assistant','read_only') then
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
$function$;