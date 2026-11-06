Proposed SQL only; not applied. Generate the actual migration with Supabase CLI after initializing and linking the repository.

-- Least-privilege hardening for the exposed public schema.
-- RLS does not protect TRUNCATE, and browser roles must never manage table
-- maintenance, references, or triggers directly.
revoke truncate, references, trigger, maintain
  on all tables in schema public
  from anon, authenticated;

-- Prevent future tables and sequences created by the application migration owner
-- from inheriting broad browser-role grants. Future migrations must grant only what they use.
-- PostgreSQL's default PUBLIC EXECUTE for functions is global; a per-schema
-- REVOKE cannot remove it. SECURITY DEFINER functions must therefore live in
-- the private schema or be explicitly revoked in their creating migration.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
