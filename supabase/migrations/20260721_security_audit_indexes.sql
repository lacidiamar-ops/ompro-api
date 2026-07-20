-- Performance indexes for security investigations.
-- No application table or PIN workflow is modified.

create index if not exists security_audit_log_occurred_at_idx
  on ompro.security_audit_log (occurred_at desc);

create index if not exists security_audit_log_table_time_idx
  on ompro.security_audit_log (table_name, occurred_at desc);

create index if not exists security_audit_log_row_time_idx
  on ompro.security_audit_log (row_id, occurred_at desc)
  where row_id is not null;

create index if not exists security_audit_log_operation_time_idx
  on ompro.security_audit_log (operation, occurred_at desc);
