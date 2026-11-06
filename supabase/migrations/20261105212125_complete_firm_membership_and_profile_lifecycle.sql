
create or replace function private.handle_new_law_firm_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.firm_members (firm_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict (firm_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists law_firms_add_creator_as_owner on public.law_firms;
create trigger law_firms_add_creator_as_owner
after insert on public.law_firms
for each row execute function private.handle_new_law_firm_owner();

create or replace function private.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    nullif(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_jurisflow_profile on auth.users;
create trigger on_auth_user_created_jurisflow_profile
after insert on auth.users
for each row execute function private.handle_new_user_profile();

drop trigger if exists law_firms_set_updated_at on public.law_firms;
create trigger law_firms_set_updated_at before update on public.law_firms
for each row execute function private.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function private.set_updated_at();

drop trigger if exists calendar_events_set_updated_at on public.calendar_events;
create trigger calendar_events_set_updated_at before update on public.calendar_events
for each row execute function private.set_updated_at();

drop trigger if exists deadlines_set_updated_at on public.deadlines;
create trigger deadlines_set_updated_at before update on public.deadlines
for each row execute function private.set_updated_at();

drop policy if exists firm_members_admin_insert on public.firm_members;
create policy firm_members_admin_insert
on public.firm_members for insert to authenticated
with check (
  role <> 'owner'
  and (select private.has_firm_role(firm_id, array['owner','admin']::text[]))
);

drop policy if exists firm_members_admin_update on public.firm_members;
create policy firm_members_admin_update
on public.firm_members for update to authenticated
using (
  role <> 'owner'
  and (select private.has_firm_role(firm_id, array['owner','admin']::text[]))
)
with check (
  role <> 'owner'
  and (select private.has_firm_role(firm_id, array['owner','admin']::text[]))
);

drop policy if exists firm_members_admin_delete on public.firm_members;
create policy firm_members_admin_delete
on public.firm_members for delete to authenticated
using (
  role <> 'owner'
  and (select private.has_firm_role(firm_id, array['owner','admin']::text[]))
);
