create or replace function ompro.protect_audit_log_immutability()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, ompro
as $$
begin
  if current_user not in ('postgres', 'service_role') then
    raise exception 'Audit records are immutable';
  end if;
  return old;
end;
$$;

revoke all on function ompro.protect_audit_log_immutability() from public, anon, authenticated;
grant execute on function ompro.protect_audit_log_immutability() to service_role;

drop trigger if exists trg_protect_audit_log_immutability on ompro.audit_log;
create trigger trg_protect_audit_log_immutability
before update or delete on ompro.audit_log
for each row execute function ompro.protect_audit_log_immutability();

drop trigger if exists trg_protect_security_audit_log_immutability on ompro.security_audit_log;
create trigger trg_protect_security_audit_log_immutability
before update or delete on ompro.security_audit_log
for each row execute function ompro.protect_audit_log_immutability();
