
create index if not exists firm_invitations_invited_by_idx
  on public.firm_invitations (invited_by);

drop policy if exists legal_library_firm_member_access on public.legal_library;
drop policy if exists legal_library_global_read on public.legal_library;

create policy legal_library_read_access
on public.legal_library
for select
to authenticated
using (
  firm_id is null
  or (select private.is_firm_member(firm_id))
);

create policy legal_library_member_insert
on public.legal_library
for insert
to authenticated
with check ((select private.is_firm_member(firm_id)));

create policy legal_library_member_update
on public.legal_library
for update
to authenticated
using ((select private.is_firm_member(firm_id)))
with check ((select private.is_firm_member(firm_id)));

create policy legal_library_member_delete
on public.legal_library
for delete
to authenticated
using ((select private.is_firm_member(firm_id)));
