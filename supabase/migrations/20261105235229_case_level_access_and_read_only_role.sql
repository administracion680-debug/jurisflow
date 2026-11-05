-- Applied to Supabase project JurisFlow as migration
-- 20261105235229_case_level_access_and_read_only_role.
-- Storage path convention: <firm_uuid>/<case_uuid>/<filename>.

create table if not exists public.case_members (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null,
  case_id uuid not null,
  user_id uuid not null,
  access_level text not null default 'write' check (access_level in ('read','write')),
  assigned_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint case_members_case_same_firm_fk foreign key (firm_id,case_id)
    references public.cases(firm_id,id) on delete cascade,
  constraint case_members_firm_user_fk foreign key (firm_id,user_id)
    references public.firm_members(firm_id,user_id) on delete cascade,
  constraint case_members_assigned_by_fk foreign key (assigned_by) references auth.users(id),
  constraint case_members_firm_case_user_key unique (firm_id,case_id,user_id)
);
create index if not exists case_members_user_case_idx on public.case_members(user_id,case_id);
create index if not exists case_members_firm_case_idx on public.case_members(firm_id,case_id);
alter table public.case_members enable row level security;

alter table public.firm_members drop constraint if exists firm_members_role_check;
alter table public.firm_members add constraint firm_members_role_check
  check (role in ('owner','admin','lawyer','assistant','read_only'));
alter table public.firm_invitations drop constraint if exists firm_invitations_role_check;
alter table public.firm_invitations add constraint firm_invitations_role_check
  check (role in ('admin','lawyer','assistant','read_only'));

create or replace function private.has_case_access(p_case_id uuid,p_firm_id uuid,p_required_access text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select case
      when fm.role in ('owner','admin') then true
      when fm.role = 'read_only' then p_required_access = 'read'
      when p_required_access = 'read' then cm.access_level in ('read','write')
      when p_required_access = 'write' then cm.access_level = 'write'
      else false end
    from public.cases c
    join public.firm_members fm on fm.firm_id=c.firm_id and fm.user_id=(select auth.uid())
    left join public.case_members cm on cm.firm_id=c.firm_id and cm.case_id=c.id and cm.user_id=fm.user_id
    where c.id=p_case_id and c.firm_id=p_firm_id
  ),false);
$$;

create or replace function private.has_finance_access(p_firm_id uuid,p_case_id uuid,p_required_access text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select case
      when fm.role in ('owner','admin') then true
      when fm.role='lawyer' and p_case_id is not null and p_required_access='read' then cm.access_level in ('read','write')
      when fm.role='lawyer' and p_case_id is not null and p_required_access='write' then cm.access_level='write'
      else false end
    from public.firm_members fm
    left join public.case_members cm on cm.firm_id=fm.firm_id and cm.case_id=p_case_id and cm.user_id=fm.user_id
    where fm.firm_id=p_firm_id and fm.user_id=(select auth.uid())
  ),false);
$$;

create or replace function private.has_payment_access(p_firm_id uuid,p_fee_entry_id uuid,p_required_access text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select private.has_finance_access(f.firm_id,f.case_id,p_required_access)
    from public.fee_entries f where f.id=p_fee_entry_id and f.firm_id=p_firm_id
  ),false);
$$;

revoke all on function private.has_case_access(uuid,uuid,text) from public,anon;
revoke all on function private.has_finance_access(uuid,uuid,text) from public,anon;
revoke all on function private.has_payment_access(uuid,uuid,text) from public,anon;
grant execute on function private.has_case_access(uuid,uuid,text) to authenticated;
grant execute on function private.has_finance_access(uuid,uuid,text) to authenticated;
grant execute on function private.has_payment_access(uuid,uuid,text) to authenticated;

create or replace function private.assign_case_creator()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.created_by is not null then
    insert into public.case_members(firm_id,case_id,user_id,access_level,assigned_by)
    select new.firm_id,new.id,new.created_by,'write',new.created_by
    where exists(select 1 from public.firm_members fm where fm.firm_id=new.firm_id and fm.user_id=new.created_by)
    on conflict(firm_id,case_id,user_id) do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists cases_assign_creator_membership on public.cases;
create trigger cases_assign_creator_membership after insert on public.cases
for each row execute function private.assign_case_creator();

create or replace function private.prevent_case_firm_change()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.firm_id is distinct from old.firm_id then
    raise exception 'No se puede cambiar el estudio de un expediente existente';
  end if;
  return new;
end;
$$;
drop trigger if exists cases_prevent_firm_change on public.cases;
create trigger cases_prevent_firm_change before update of firm_id on public.cases
for each row execute function private.prevent_case_firm_change();

-- Cases
drop policy if exists cases_firm_member_access on public.cases;
drop policy if exists cases_assigned_read on public.cases;
drop policy if exists cases_assigned_insert on public.cases;
drop policy if exists cases_assigned_update on public.cases;
drop policy if exists cases_admin_delete on public.cases;
create policy cases_assigned_read on public.cases for select to authenticated
using(private.has_case_access(id,firm_id,'read'));
create policy cases_assigned_insert on public.cases for insert to authenticated
with check(private.has_firm_role(firm_id,array['owner','admin','lawyer']::text[]) and created_by=(select auth.uid()));
create policy cases_assigned_update on public.cases for update to authenticated
using(private.has_case_access(id,firm_id,'write'))
with check(private.has_case_access(id,firm_id,'write') and private.is_firm_member(firm_id));
create policy cases_admin_delete on public.cases for delete to authenticated
using(private.has_firm_role(firm_id,array['owner','admin']::text[]));

-- Case assignment administration
drop policy if exists "Members view case members" on public.case_members;
drop policy if exists case_members_read_assigned on public.case_members;
drop policy if exists case_members_admin_insert on public.case_members;
drop policy if exists case_members_admin_update on public.case_members;
drop policy if exists case_members_admin_delete on public.case_members;
create policy case_members_read_assigned on public.case_members for select to authenticated
using(private.has_case_access(case_id,firm_id,'read') or private.has_firm_role(firm_id,array['owner','admin']::text[]));
create policy case_members_admin_insert on public.case_members for insert to authenticated
with check(private.has_firm_role(firm_id,array['owner','admin']::text[]) and assigned_by=(select auth.uid()));
create policy case_members_admin_update on public.case_members for update to authenticated
using(private.has_firm_role(firm_id,array['owner','admin']::text[]))
with check(private.has_firm_role(firm_id,array['owner','admin']::text[]));
create policy case_members_admin_delete on public.case_members for delete to authenticated
using(private.has_firm_role(firm_id,array['owner','admin']::text[]));
grant select,insert,update,delete on public.case_members to authenticated;

-- Clients
drop policy if exists clients_firm_member_access on public.clients;
create policy clients_member_read on public.clients for select to authenticated
using(private.is_firm_member(firm_id));
create policy clients_staff_insert on public.clients for insert to authenticated
with check(private.has_firm_role(firm_id,array['owner','admin','lawyer','assistant']::text[]) and created_by=(select auth.uid()));
create policy clients_staff_update on public.clients for update to authenticated
using(private.has_firm_role(firm_id,array['owner','admin','lawyer','assistant']::text[]))
with check(private.has_firm_role(firm_id,array['owner','admin','lawyer','assistant']::text[]));
create policy clients_admin_delete on public.clients for delete to authenticated
using(private.has_firm_role(firm_id,array['owner','admin']::text[]));

-- Documents inherit case access.
drop policy if exists documents_firm_member_access on public.documents;
create policy documents_case_read on public.documents for select to authenticated
using((case_id is not null and private.has_case_access(case_id,firm_id,'read')) or
      (case_id is null and private.has_firm_role(firm_id,array['owner','admin']::text[])));
create policy documents_case_insert on public.documents for insert to authenticated
with check(uploaded_by=(select auth.uid()) and
      ((case_id is not null and private.has_case_access(case_id,firm_id,'write')) or
       (case_id is null and private.has_firm_role(firm_id,array['owner','admin']::text[]))));
create policy documents_case_update on public.documents for update to authenticated
using((case_id is not null and private.has_case_access(case_id,firm_id,'write')) or
      (case_id is null and private.has_firm_role(firm_id,array['owner','admin']::text[])))
with check((case_id is not null and private.has_case_access(case_id,firm_id,'write')) or
      (case_id is null and private.has_firm_role(firm_id,array['owner','admin']::text[])));
create policy documents_case_delete on public.documents for delete to authenticated
using((case_id is not null and private.has_case_access(case_id,firm_id,'write')) or
      (case_id is null and private.has_firm_role(firm_id,array['owner','admin']::text[])));

-- Calendar events
drop policy if exists calendar_events_firm_member_access on public.calendar_events;
create policy calendar_events_member_read on public.calendar_events for select to authenticated
using((case_id is null and private.is_firm_member(firm_id)) or
      (case_id is not null and private.has_case_access(case_id,firm_id,'read')));
create policy calendar_events_staff_insert on public.calendar_events for insert to authenticated
with check(created_by=(select auth.uid()) and
      ((case_id is null and private.has_firm_role(firm_id,array['owner','admin','lawyer','assistant']::text[])) or
       (case_id is not null and private.has_case_access(case_id,firm_id,'write'))));
create policy calendar_events_staff_update on public.calendar_events for update to authenticated
using((case_id is null and private.has_firm_role(firm_id,array['owner','admin','lawyer','assistant']::text[])) or
      (case_id is not null and private.has_case_access(case_id,firm_id,'write')))
with check((case_id is null and private.has_firm_role(firm_id,array['owner','admin','lawyer','assistant']::text[])) or
      (case_id is not null and private.has_case_access(case_id,firm_id,'write')));
create policy calendar_events_staff_delete on public.calendar_events for delete to authenticated
using((case_id is null and private.has_firm_role(firm_id,array['owner','admin']::text[])) or
      (case_id is not null and private.has_case_access(case_id,firm_id,'write')));

-- Deadlines
drop policy if exists deadlines_firm_member_access on public.deadlines;
create policy deadlines_member_read on public.deadlines for select to authenticated
using((case_id is null and private.is_firm_member(firm_id)) or
      (case_id is not null and private.has_case_access(case_id,firm_id,'read')));
create policy deadlines_staff_insert on public.deadlines for insert to authenticated
with check(created_by=(select auth.uid()) and
      ((case_id is null and private.has_firm_role(firm_id,array['owner','admin','lawyer','assistant']::text[])) or
       (case_id is not null and private.has_case_access(case_id,firm_id,'write'))));
create policy deadlines_staff_update on public.deadlines for update to authenticated
using((case_id is null and private.has_firm_role(firm_id,array['owner','admin','lawyer','assistant']::text[])) or
      (case_id is not null and private.has_case_access(case_id,firm_id,'write')))
with check((case_id is null and private.has_firm_role(firm_id,array['owner','admin','lawyer','assistant']::text[])) or
      (case_id is not null and private.has_case_access(case_id,firm_id,'write')));
create policy deadlines_staff_delete on public.deadlines for delete to authenticated
using((case_id is null and private.has_firm_role(firm_id,array['owner','admin']::text[])) or
      (case_id is not null and private.has_case_access(case_id,firm_id,'write')));

-- Fees and payments
drop policy if exists fee_entries_firm_member_access on public.fee_entries;
create policy fee_entries_finance_read on public.fee_entries for select to authenticated
using(private.has_finance_access(firm_id,case_id,'read'));
create policy fee_entries_finance_insert on public.fee_entries for insert to authenticated
with check(private.has_finance_access(firm_id,case_id,'write') and created_by=(select auth.uid()));
create policy fee_entries_finance_update on public.fee_entries for update to authenticated
using(private.has_finance_access(firm_id,case_id,'write'))
with check(private.has_finance_access(firm_id,case_id,'write'));
create policy fee_entries_finance_delete on public.fee_entries for delete to authenticated
using(private.has_finance_access(firm_id,case_id,'write'));
drop policy if exists payments_firm_member_access on public.payments;
create policy payments_finance_read on public.payments for select to authenticated
using(private.has_payment_access(firm_id,fee_entry_id,'read'));
create policy payments_finance_insert on public.payments for insert to authenticated
with check(private.has_payment_access(firm_id,fee_entry_id,'write') and received_by=(select auth.uid()));
create policy payments_finance_update on public.payments for update to authenticated
using(private.has_payment_access(firm_id,fee_entry_id,'write'))
with check(private.has_payment_access(firm_id,fee_entry_id,'write'));
create policy payments_finance_delete on public.payments for delete to authenticated
using(private.has_payment_access(firm_id,fee_entry_id,'write'));

-- Legal library
drop policy if exists legal_library_member_delete on public.legal_library;
drop policy if exists legal_library_member_insert on public.legal_library;
drop policy if exists legal_library_member_update on public.legal_library;
drop policy if exists legal_library_read_access on public.legal_library;
create policy legal_library_read_access on public.legal_library for select to authenticated
using(firm_id is null or private.is_firm_member(firm_id));
create policy legal_library_staff_insert on public.legal_library for insert to authenticated
with check(firm_id is not null and private.has_firm_role(firm_id,array['owner','admin','lawyer']::text[])
  and (created_by is null or created_by=(select auth.uid())));
create policy legal_library_staff_update on public.legal_library for update to authenticated
using(firm_id is not null and private.has_firm_role(firm_id,array['owner','admin','lawyer']::text[]))
with check(firm_id is not null and private.has_firm_role(firm_id,array['owner','admin','lawyer']::text[]));
create policy legal_library_admin_delete on public.legal_library for delete to authenticated
using(firm_id is not null and private.has_firm_role(firm_id,array['owner','admin']::text[]));

-- Private object paths must be <firm_uuid>/<case_uuid>/<filename>.
drop policy if exists "JurisFlow members read firm documents" on storage.objects;
drop policy if exists "JurisFlow members upload firm documents" on storage.objects;
drop policy if exists "JurisFlow members update firm documents" on storage.objects;
drop policy if exists "JurisFlow members delete firm documents" on storage.objects;

create policy "JurisFlow assigned members read case files" on storage.objects for select to authenticated
using(bucket_id='jurisflow-documentos' and case
  when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then private.has_case_access(((storage.foldername(name))[2])::uuid,((storage.foldername(name))[1])::uuid,'read')
  else false end);
create policy "JurisFlow assigned members upload case files" on storage.objects for insert to authenticated
with check(bucket_id='jurisflow-documentos' and case
  when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then private.has_case_access(((storage.foldername(name))[2])::uuid,((storage.foldername(name))[1])::uuid,'write')
  else false end);
create policy "JurisFlow assigned members update case files" on storage.objects for update to authenticated
using(bucket_id='jurisflow-documentos' and case
  when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then private.has_case_access(((storage.foldername(name))[2])::uuid,((storage.foldername(name))[1])::uuid,'write')
  else false end)
with check(bucket_id='jurisflow-documentos' and case
  when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then private.has_case_access(((storage.foldername(name))[2])::uuid,((storage.foldername(name))[1])::uuid,'write')
  else false end);
create policy "JurisFlow assigned members delete case files" on storage.objects for delete to authenticated
using(bucket_id='jurisflow-documentos' and case
  when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then private.has_case_access(((storage.foldername(name))[2])::uuid,((storage.foldername(name))[1])::uuid,'write')
  else false end);

create or replace function public.create_firm_invitation(p_firm_id uuid,p_email text,p_role text)
returns text language plpgsql set search_path = ''
as $$
declare v_email text; v_token text;
begin
  if (select auth.uid()) is null then raise exception 'Debes iniciar sesión para invitar integrantes'; end if;
  if not (select private.has_firm_role(p_firm_id,array['owner','admin']::text[])) then
    raise exception 'No tienes permisos para invitar integrantes a este estudio';
  end if;
  v_email:=lower(trim(coalesce(p_email,'')));
  if v_email='' or v_email !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$' then
    raise exception 'Ingresá un correo electrónico válido';
  end if;
  if p_role not in ('admin','lawyer','assistant','read_only') then
    raise exception 'El rol indicado no está permitido';
  end if;
  update public.firm_invitations set status='revoked'
  where firm_id=p_firm_id and lower(email)=v_email and status='pending';
  v_token:=encode(extensions.gen_random_bytes(32),'hex');
  insert into public.firm_invitations(firm_id,email,role,token_hash,invited_by)
  values(p_firm_id,v_email,p_role,encode(extensions.digest(convert_to(v_token,'UTF8'),'sha256'),'hex'),(select auth.uid()));
  return v_token;
end;
$$;
revoke all on function public.create_firm_invitation(uuid,text,text) from public,anon;
grant execute on function public.create_firm_invitation(uuid,text,text) to authenticated;

comment on table public.case_members is
  'Asignaciones explícitas de integrantes a expedientes; los permisos se aplican mediante RLS.';
comment on column public.case_members.access_level is
  'read permite consultar; write permite consultar y modificar. La administración de asignaciones queda en owner/admin.';
