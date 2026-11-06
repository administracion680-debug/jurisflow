
drop policy if exists firm_invitations_admin_read on public.firm_invitations;
drop policy if exists firm_invitations_invitee_read on public.firm_invitations;
create policy firm_invitations_read_access
on public.firm_invitations for select to authenticated
using (
  (select private.has_firm_role(firm_id, array['owner','admin']::text[]))
  or lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
);

drop policy if exists firm_invitations_admin_update on public.firm_invitations;
drop policy if exists firm_invitations_invitee_update on public.firm_invitations;
create policy firm_invitations_update_access
on public.firm_invitations for update to authenticated
using (
  (select private.has_firm_role(firm_id, array['owner','admin']::text[]))
  or (
    lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    and status = 'pending'
    and expires_at > now()
  )
)
with check (
  (select private.has_firm_role(firm_id, array['owner','admin']::text[]))
  or (
    lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    and status = 'accepted'
    and accepted_at is not null
  )
);

drop policy if exists firm_members_admin_insert on public.firm_members;
drop policy if exists firm_members_invited_insert on public.firm_members;
create policy firm_members_authorized_insert
on public.firm_members for insert to authenticated
with check (
  role <> 'owner'
  and (
    (select private.has_firm_role(firm_id, array['owner','admin']::text[]))
    or exists (
      select 1
      from public.firm_invitations i
      where i.firm_id = firm_members.firm_id
        and lower(i.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
        and i.role = firm_members.role
        and i.status = 'pending'
        and i.expires_at > now()
    )
  )
);
