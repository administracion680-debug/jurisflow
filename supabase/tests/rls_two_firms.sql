-- Repeatable RLS smoke test for two fictional firms.
-- Run only in the development Supabase project as a database owner.
-- All fixtures are rolled back; no user, firm, client, or case is retained.
begin;

insert into auth.users (id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
('a1000000-0000-4000-8000-000000000001','authenticated','authenticated','jurisflow-test-owner-a@example.invalid','!disabled',now(),'{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Prueba Estudio Alfa"}'::jsonb,now(),now()),
('b2000000-0000-4000-8000-000000000002','authenticated','authenticated','jurisflow-test-owner-b@example.invalid','!disabled',now(),'{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Prueba Estudio Beta"}'::jsonb,now(),now()),
('c3000000-0000-4000-8000-000000000003','authenticated','authenticated','jurisflow-test-readonly@example.invalid','!disabled',now(),'{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Prueba Solo Lectura"}'::jsonb,now(),now());

-- The law_firms trigger creates each owner membership automatically.
insert into public.law_firms(id,name,created_by) values
('aa000000-0000-4000-8000-00000000000a','TEST JurisFlow Alfa','a1000000-0000-4000-8000-000000000001'),
('bb000000-0000-4000-8000-00000000000b','TEST JurisFlow Beta','b2000000-0000-4000-8000-000000000002');

insert into public.firm_members(firm_id,user_id,role) values
('aa000000-0000-4000-8000-00000000000a','c3000000-0000-4000-8000-000000000003','read_only');

insert into public.cases(id,firm_id,title,created_by) values
('aa100000-0000-4000-8000-00000000000a','aa000000-0000-4000-8000-00000000000a','TEST Causa Alfa','a1000000-0000-4000-8000-000000000001'),
('bb100000-0000-4000-8000-00000000000b','bb000000-0000-4000-8000-00000000000b','TEST Causa Beta','b2000000-0000-4000-8000-000000000002');

-- Deliberately grant write at case level to read_only: the role must still deny writes.
insert into public.case_members(firm_id,case_id,user_id,access_level,assigned_by) values
('aa000000-0000-4000-8000-00000000000a','aa100000-0000-4000-8000-00000000000a','c3000000-0000-4000-8000-000000000003','write','a1000000-0000-4000-8000-000000000001');

-- Insert metadata only; no binary file is uploaded or retained.
insert into public.ai_conversations(id,firm_id,case_id,title,created_by)
values ('aa200000-0000-4000-8000-00000000000a','aa000000-0000-4000-8000-00000000000a','aa100000-0000-4000-8000-00000000000a','TEST Conversación Alfa','a1000000-0000-4000-8000-000000000001');
insert into public.ai_messages(firm_id,conversation_id,role,content,created_by)
values ('aa000000-0000-4000-8000-00000000000a','aa200000-0000-4000-8000-00000000000a','user','Consulta ficticia de prueba','a1000000-0000-4000-8000-000000000001');

insert into storage.objects(bucket_id,name,owner,owner_id,metadata)
values (
  'jurisflow-documentos',
  'aa000000-0000-4000-8000-00000000000a/aa100000-0000-4000-8000-00000000000a/rls-test.txt',
  'a1000000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-000000000001',
  '{"mimetype":"text/plain","size":4}'::jsonb
);

set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);

do $test$
declare own_count integer; foreign_count integer; denied boolean:=false;
begin
  select count(*) into own_count from public.cases where firm_id='aa000000-0000-4000-8000-00000000000a';
  select count(*) into foreign_count from public.cases where firm_id='bb000000-0000-4000-8000-00000000000b';
  if own_count<>1 or foreign_count<>0 then raise exception 'FAIL owner Alfa isolation: own %, foreign %',own_count,foreign_count; end if;
  if (select count(*) from storage.objects where bucket_id='jurisflow-documentos' and name like 'aa000000-0000-4000-8000-00000000000a/%')<>1 then raise exception 'FAIL owner Alfa cannot read its case object'; end if;
  if (select count(*) from public.ai_conversations where id='aa200000-0000-4000-8000-00000000000a')<>1 or (select count(*) from public.ai_messages where conversation_id='aa200000-0000-4000-8000-00000000000a')<>1 then raise exception 'FAIL owner Alfa cannot read its AI conversation'; end if;
  insert into public.ai_messages(firm_id,conversation_id,role,content,created_by) values ('aa000000-0000-4000-8000-00000000000a','aa200000-0000-4000-8000-00000000000a','user','Segunda consulta ficticia','a1000000-0000-4000-8000-000000000001');
  begin
    insert into public.ai_messages(firm_id,conversation_id,role,content,created_by) values ('aa000000-0000-4000-8000-00000000000a','aa200000-0000-4000-8000-00000000000a','assistant','Respuesta que no debe insertarse desde cliente','a1000000-0000-4000-8000-000000000001');
  exception when insufficient_privilege then denied:=true;
  end;
  if not denied then raise exception 'FAIL client inserted an assistant AI message'; end if;
  insert into storage.objects(bucket_id,name,owner,owner_id,metadata)
  values ('jurisflow-documentos','aa000000-0000-4000-8000-00000000000a/aa100000-0000-4000-8000-00000000000a/owner-upload.txt','a1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','{"mimetype":"text/plain","size":4}'::jsonb);
end;
$test$;

select set_config('request.jwt.claim.sub','b2000000-0000-4000-8000-000000000002',true);

do $test$
declare own_count integer; foreign_count integer; denied boolean:=false;
begin
  select count(*) into own_count from public.cases where firm_id='bb000000-0000-4000-8000-00000000000b';
  select count(*) into foreign_count from public.cases where firm_id='aa000000-0000-4000-8000-00000000000a';
  if own_count<>1 or foreign_count<>0 then raise exception 'FAIL owner Beta isolation: own %, foreign %',own_count,foreign_count; end if;
  if (select count(*) from public.ai_conversations where id='aa200000-0000-4000-8000-00000000000a')<>0 or (select count(*) from public.ai_messages where conversation_id='aa200000-0000-4000-8000-00000000000a')<>0 then raise exception 'FAIL owner Beta can read Alfa AI conversation'; end if;
  if (select count(*) from storage.objects where bucket_id='jurisflow-documentos' and name like 'aa000000-0000-4000-8000-00000000000a/%')<>0 then raise exception 'FAIL owner Beta can read Alfa Storage object'; end if;
  denied:=false;
  begin
    insert into storage.objects(bucket_id,name,owner,owner_id,metadata)
    values ('jurisflow-documentos','aa000000-0000-4000-8000-00000000000a/aa100000-0000-4000-8000-00000000000a/foreign-upload.txt','b2000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000002','{"mimetype":"text/plain","size":4}'::jsonb);
  exception when insufficient_privilege then denied:=true;
  end;
  if not denied then raise exception 'FAIL owner Beta could upload into Alfa Storage path'; end if;
  denied:=false;
  begin
    perform 1 from public.search_case_materials(
      'aa000000-0000-4000-8000-00000000000a',
      'aa100000-0000-4000-8000-00000000000a',
      'prueba',10
    );
  exception when others then
    if sqlerrm like '%No tenés acceso a este expediente%' then denied:=true; else raise; end if;
  end;
  if not denied then raise exception 'FAIL cross-firm legal search was not denied'; end if;
end;
$test$;

select set_config('request.jwt.claim.sub','c3000000-0000-4000-8000-000000000003',true);

do $test$
declare visible_count integer; changed_count integer; storage_visible integer; storage_changed integer; ai_visible integer; ai_denied boolean:=false;
begin
  select count(*) into visible_count from public.cases where id='aa100000-0000-4000-8000-00000000000a';
  select count(*) into storage_visible from storage.objects where bucket_id='jurisflow-documentos' and name like 'aa000000-0000-4000-8000-00000000000a/%';
  select count(*) into ai_visible from public.ai_conversations where id='aa200000-0000-4000-8000-00000000000a';
  if ai_visible<>1 then raise exception 'FAIL read_only cannot read assigned AI conversation'; end if;
  begin
    insert into public.ai_messages(firm_id,conversation_id,role,content,created_by) values ('aa000000-0000-4000-8000-00000000000a','aa200000-0000-4000-8000-00000000000a','user','Consulta no autorizada','c3000000-0000-4000-8000-000000000003');
  exception when insufficient_privilege then ai_denied:=true;
  end;
  if not ai_denied then raise exception 'FAIL read_only can insert AI messages'; end if;
  update storage.objects set metadata=jsonb_set(metadata,'{size}','9'::jsonb) where bucket_id='jurisflow-documentos' and name='aa000000-0000-4000-8000-00000000000a/aa100000-0000-4000-8000-00000000000a/rls-test.txt';
  get diagnostics storage_changed = row_count;
  update public.cases set title='TEST MUST NOT CHANGE' where id='aa100000-0000-4000-8000-00000000000a';
  get diagnostics changed_count = row_count;
  if visible_count<>1 or changed_count<>0 then raise exception 'FAIL read_only: visible %, updated %',visible_count,changed_count; end if;
  if storage_visible<>2 or storage_changed<>0 then raise exception 'FAIL read_only Storage: visible %, updated %',storage_visible,storage_changed; end if;
end;
$test$;

reset role;
set local role anon;

do $test$
declare denied boolean:=false; storage_visible integer;
begin
  begin
    perform 1 from public.cases limit 1;
  exception when insufficient_privilege then
    denied:=true;
  end;
  if not denied then raise exception 'FAIL anonymous role can read cases'; end if;
  select count(*) into storage_visible from storage.objects where bucket_id='jurisflow-documentos';
  if storage_visible<>0 then raise exception 'FAIL anonymous role can read private Storage metadata: %',storage_visible; end if;
end;
$test$;

reset role;
rollback;
