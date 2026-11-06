
drop policy if exists legal_library_global_read on public.legal_library;
create policy legal_library_global_read
on public.legal_library for select to authenticated
using (firm_id is null or (select private.is_firm_member(firm_id)));
