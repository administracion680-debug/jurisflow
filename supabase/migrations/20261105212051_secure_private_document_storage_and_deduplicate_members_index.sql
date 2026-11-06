
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'jurisflow-documentos',
  'jurisflow-documentos',
  false,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "JurisFlow members read firm documents" on storage.objects;
drop policy if exists "JurisFlow members upload firm documents" on storage.objects;
drop policy if exists "JurisFlow members update firm documents" on storage.objects;
drop policy if exists "JurisFlow members delete firm documents" on storage.objects;

create policy "JurisFlow members read firm documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'jurisflow-documentos'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then (select private.is_firm_member(((storage.foldername(name))[1])::uuid))
    else false
  end
);

create policy "JurisFlow members upload firm documents"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'jurisflow-documentos'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then (select private.is_firm_member(((storage.foldername(name))[1])::uuid))
    else false
  end
);

create policy "JurisFlow members update firm documents"
on storage.objects for update to authenticated
using (
  bucket_id = 'jurisflow-documentos'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then (select private.is_firm_member(((storage.foldername(name))[1])::uuid))
    else false
  end
)
with check (
  bucket_id = 'jurisflow-documentos'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then (select private.is_firm_member(((storage.foldername(name))[1])::uuid))
    else false
  end
);

create policy "JurisFlow members delete firm documents"
on storage.objects for delete to authenticated
using (
  bucket_id = 'jurisflow-documentos'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then (select private.is_firm_member(((storage.foldername(name))[1])::uuid))
    else false
  end
);

drop index if exists public.firm_members_firm_user_uidx;
