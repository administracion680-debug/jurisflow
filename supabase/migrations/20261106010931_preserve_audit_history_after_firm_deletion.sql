-- Preserve audit history independently of the lifecycle of a firm.
-- Firm deletion must not fail because its audit trigger writes a final event,
-- and prior audit records should not be silently cascaded away.
alter table public.audit_logs
  drop constraint if exists audit_logs_firm_id_fkey;
