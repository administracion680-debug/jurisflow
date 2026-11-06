-- Cover the audit actor foreign key and avoid scans when an auth user is deleted.
-- The partial index omits NULL actor_id values while retaining every referencing row.
create index if not exists audit_logs_actor_id_idx
  on public.audit_logs (actor_id)
  where actor_id is not null;
