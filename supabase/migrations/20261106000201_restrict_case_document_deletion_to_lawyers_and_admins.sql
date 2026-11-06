
drop policy if exists documents_case_delete on public.documents;
create policy documents_case_delete on public.documents
for delete to authenticated
using (
  (
    case_id is not null
    and private.has_case_access(case_id,firm_id,'write')
    and private.has_firm_role(firm_id,array['owner','admin','lawyer']::text[])
  )
  or (case_id is null and private.has_firm_role(firm_id,array['owner','admin']::text[]))
);

drop policy if exists "JurisFlow assigned members delete case files" on storage.objects;
create policy "JurisFlow assigned lawyers delete case files"
on storage.objects for delete to authenticated
using (
  bucket_id='jurisflow-documentos'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then private.has_case_access(
      ((storage.foldername(name))[2])::uuid,
      ((storage.foldername(name))[1])::uuid,
      'write'
    )
    and private.has_firm_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner','admin','lawyer']::text[]
    )
    else false
  end
);
