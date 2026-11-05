-- Applied to Supabase project JurisFlow as migration 20261105235912_allow_firm_members_to_view_colleague_profiles.
drop policy if exists profiles_firm_member_read on public.profiles;
create policy profiles_firm_member_read on public.profiles
for select to authenticated
using (
  exists (
    select 1
    from public.firm_members viewer
    join public.firm_members subject on subject.firm_id = viewer.firm_id
    where viewer.user_id = (select auth.uid())
      and subject.user_id = profiles.id
  )
);
