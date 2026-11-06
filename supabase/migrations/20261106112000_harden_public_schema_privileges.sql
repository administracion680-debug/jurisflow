-- Least-privilege hardening for the exposed public schema.
-- RLS does not protect TRUNCATE, and browser roles must never manage table
-- maintenance, references, or triggers directly.
revoke truncate, references, trigger, maintain
  on all tables in schema public
  from anon, authenticated;

-- Prevent future objects created by either migration owner from inheriting
-- broad browser-role grants. Future migrations must grant only what they use.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role supabase_admin in schema public
  revoke all on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role supabase_admin in schema public
  revoke all on sequences from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
alter default privileges for role supabase_admin in schema public
  revoke execute on functions from public, anon, authenticated;
