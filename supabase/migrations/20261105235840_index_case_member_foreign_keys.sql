
create index if not exists case_members_firm_user_idx
  on public.case_members (firm_id,user_id);
create index if not exists case_members_assigned_by_idx
  on public.case_members (assigned_by);
