
drop policy if exists profiles_read_self on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists law_firms_read_member on public.law_firms;
drop policy if exists law_firms_create_self on public.law_firms;
drop policy if exists law_firms_update_admin on public.law_firms;
drop policy if exists firm_members_read_same_firm on public.firm_members;
