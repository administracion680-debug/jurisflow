-- Applied to Supabase project JurisFlow as migration 20261105235840_index_case_member_foreign_keys.
create index if not exists case_members_firm_user_idx
  on public.case_members (firm_id,user_id);
create index if not exists case_members_assigned_by_idx
  on public.case_members (assigned_by);
