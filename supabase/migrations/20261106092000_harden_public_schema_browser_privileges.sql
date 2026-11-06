-- Remove dangerous browser-role privileges without changing ordinary RLS-governed
-- SELECT/INSERT/UPDATE/DELETE grants used by the application.
-- Apply only after reviewing the migration history against the live project.
begin;

revoke create on schema public from anon, authenticated;

revoke truncate, references, trigger
  on all tables in schema public
  from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke truncate, references, trigger on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on tables from public;

alter default privileges for role postgres in schema public
  revoke all on sequences from public;

commit;
