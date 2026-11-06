
drop trigger if exists on_auth_user_created_jurisflow_profile on auth.users;
drop function if exists private.handle_new_user_profile();

drop trigger if exists law_firms_add_creator_as_owner on public.law_firms;
drop function if exists private.handle_new_law_firm_owner();
