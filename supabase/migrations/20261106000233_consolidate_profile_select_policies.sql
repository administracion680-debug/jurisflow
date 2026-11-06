-- Applied to Supabase project JurisFlow as migration 20261106000233_consolidate_profile_select_policies.
drop policy if exists "Users view own profile" on public.profiles;
drop policy if exists profiles_firm_member_read on public.profiles;
create policy profiles_read_access on public.profiles
for select to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1
    from public.firm_members viewer
    join public.firm_members subject on subject.firm_id = viewer.firm_id
    where viewer.user_id = (select auth.uid())
      and subject.user_id = profiles.id
  )
);
