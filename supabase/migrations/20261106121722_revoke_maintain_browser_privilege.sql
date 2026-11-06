begin;
revoke maintain on all tables in schema public from anon, authenticated;
alter default privileges for role postgres in schema public revoke maintain on tables from anon, authenticated;
commit;