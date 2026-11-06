-- Metadata-only audit trail acceptance test. All synthetic rows are rolled back.
begin;
insert into auth.users (id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
('d4000000-0000-4000-8000-000000000004','authenticated','authenticated','audit-owner@example.invalid','!disabled',now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now()),
('e5000000-0000-4000-8000-000000000005','authenticated','authenticated','audit-assistant@example.invalid','!disabled',now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now());
insert into public.law_firms(id,name,created_by)
values ('dd000000-0000-4000-8000-00000000000d','TEST Audit JurisFlow','d4000000-0000-4000-8000-000000000004');
insert into public.firm_members(firm_id,user_id,role)
values ('dd000000-0000-4000-8000-00000000000d','e5000000-0000-4000-8000-000000000005','assistant');
set local role authenticated;
select set_config('request.jwt.claim.sub','d4000000-0000-4000-8000-000000000004',true);
insert into public.clients(id,firm_id,full_name,created_by)
values ('dd100000-0000-4000-8000-00000000000d','dd000000-0000-4000-8000-00000000000d','CLIENTE FICTICIO AUDITORIA','d4000000-0000-4000-8000-000000000004');
update public.clients set phone='dato-ficticio' where id='dd100000-0000-4000-8000-00000000000d';
do $test$
declare v_count integer; v_fields text[];
begin
 select count(*) into v_count
 from public.audit_logs
 where firm_id='dd000000-0000-4000-8000-00000000000d'
   and entity_table='clients'
   and entity_id='dd100000-0000-4000-8000-00000000000d';
 select changed_fields into v_fields
 from public.audit_logs
 where firm_id='dd000000-0000-4000-8000-00000000000d'
   and entity_table='clients'
   and entity_id='dd100000-0000-4000-8000-00000000000d'
   and operation='UPDATE';
 if v_count<>2 then raise exception 'FAIL: expected insert+update audit records, got %',v_count; end if;
 if not ('phone'=any(v_fields)) then raise exception 'FAIL: changed field phone missing from audit'; end if;
 if exists (select 1 from information_schema.columns where table_schema='public' and table_name='audit_logs' and column_name in ('old_data','new_data','content','document_text')) then
   raise exception 'FAIL: audit table unexpectedly stores record content';
 end if;
end;
$test$;
select set_config('request.jwt.claim.sub','e5000000-0000-4000-8000-000000000005',true);
do $test$
declare v_count integer; v_denied boolean:=false;
begin
 select count(*) into v_count from public.audit_logs where firm_id='dd000000-0000-4000-8000-00000000000d';
 if v_count<>0 then raise exception 'FAIL: assistant role can read restricted audit records'; end if;
 begin
   insert into public.audit_logs(firm_id,actor_id,entity_table,entity_id,operation)
   values ('dd000000-0000-4000-8000-00000000000d','e5000000-0000-4000-8000-000000000005','clients','forged','INSERT');
 exception when insufficient_privilege then v_denied:=true;
 end;
 if not v_denied then raise exception 'FAIL: assistant role can write audit records directly'; end if;
end;
$test$;
reset role;
-- Audit rows remain available for retention even after a firm is removed.
delete from public.law_firms where id='dd000000-0000-4000-8000-00000000000d';
do $test$
declare v_count integer;
begin
 select count(*) into v_count from public.audit_logs where firm_id='dd000000-0000-4000-8000-00000000000d';
 if v_count<2 then raise exception 'FAIL: audit history did not survive firm deletion (rows=%)',v_count; end if;
end;
$test$;
rollback;