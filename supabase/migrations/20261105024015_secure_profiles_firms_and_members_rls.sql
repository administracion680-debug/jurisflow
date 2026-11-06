
-- Enable and explicitly define owner/member access on the original identity tables.
alter table public.profiles enable row level security;
alter table public.law_firms enable row level security;
alter table public.firm_members enable row level security;

drop policy if exists profiles_read_self on public.profiles;
create policy profiles_read_self on public.profiles
  for select to authenticated using (id = (select auth.uid()));
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists law_firms_read_member on public.law_firms;
create policy law_firms_read_member on public.law_firms
  for select to authenticated
  using ((select private.is_firm_member(id)));
drop policy if exists law_firms_create_self on public.law_firms;
create policy law_firms_create_self on public.law_firms
  for insert to authenticated
  with check (created_by = (select auth.uid()));
drop policy if exists law_firms_update_admin on public.law_firms;
create policy law_firms_update_admin on public.law_firms
  for update to authenticated
  using ((select private.has_firm_role(id, array['owner','admin']::text[])))
  with check ((select private.has_firm_role(id, array['owner','admin']::text[])));
drop policy if exists law_firms_delete_owner on public.law_firms;
create policy law_firms_delete_owner on public.law_firms
  for delete to authenticated
  using ((select private.has_firm_role(id, array['owner']::text[])));

drop policy if exists firm_members_read_same_firm on public.firm_members;
create policy firm_members_read_same_firm on public.firm_members
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_firm_member(firm_id)));

-- No direct client-side INSERT/UPDATE/DELETE on firm_members:
-- owner creation and invitation acceptance happen through controlled database functions.

-- Explicitly remove broad table privileges and grant only the operations covered above.
revoke all on table public.profiles, public.law_firms, public.firm_members from anon;
revoke all on table public.profiles, public.law_firms, public.firm_members from authenticated;
grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.law_firms to authenticated;
grant select on table public.firm_members to authenticated;
