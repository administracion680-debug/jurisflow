-- Applied to Supabase project JurisFlow as migration 20261106000606_legal_source_verification_metadata.
alter table public.legal_library
  add column if not exists authority text,
  add column if not exists publication_date date,
  add column if not exists verification_status text not null default 'pending',
  add column if not exists verified_by uuid,
  add column if not exists verified_at timestamptz,
  add column if not exists last_checked_at timestamptz,
  add column if not exists content_hash text;

alter table public.legal_library drop constraint if exists legal_library_verification_status_check;
alter table public.legal_library add constraint legal_library_verification_status_check
  check (verification_status in ('pending','verified','rejected'));

alter table public.legal_library drop constraint if exists legal_library_verified_by_fkey;
alter table public.legal_library add constraint legal_library_verified_by_fkey
  foreign key (verified_by) references auth.users(id) on delete set null;

create index if not exists legal_library_firm_verification_idx
  on public.legal_library (firm_id,verification_status,resource_type);

create or replace function private.validate_legal_source_verification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.verification_status = 'verified'
     and (
       new.source_url is distinct from old.source_url
       or new.citation is distinct from old.citation
       or new.authority is distinct from old.authority
       or new.title is distinct from old.title
     ) then
    new.verification_status := 'pending';
    new.verified_by := null;
    new.verified_at := null;
    new.last_checked_at := null;
  end if;

  if new.verification_status = 'verified' then
    if new.source_url is null or new.source_url !~ '^https://' then
      raise exception 'Para verificar una fuente se requiere una URL HTTPS';
    end if;
    if nullif(trim(coalesce(new.authority,'')),'') is null
       or nullif(trim(coalesce(new.citation,'')),'') is null then
      raise exception 'Para verificar una fuente se requiere autoridad y cita identificable';
    end if;
    new.verified_by := (select auth.uid());
    new.verified_at := now();
    new.last_checked_at := now();
  else
    new.verified_by := null;
    new.verified_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists legal_library_validate_verification on public.legal_library;
create trigger legal_library_validate_verification
before insert or update of title,source_url,citation,authority,verification_status
on public.legal_library
for each row execute function private.validate_legal_source_verification();

comment on column public.legal_library.verification_status is
  'Estado de verificación manual. verified no certifica vigencia; requiere revisión periódica de la fuente oficial.';
