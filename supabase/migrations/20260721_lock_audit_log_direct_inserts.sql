-- Prevent direct web writes to the application audit log.
-- Audit entries are written by SECURITY DEFINER functions and triggers.

revoke insert on table ompro.audit_log from anon, authenticated;
