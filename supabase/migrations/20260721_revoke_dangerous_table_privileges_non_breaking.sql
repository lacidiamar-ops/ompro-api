-- Remove SQL privileges that are never required by the browser application.
-- Keep SELECT/INSERT/UPDATE/DELETE where existing frontend flows may still depend on them.

do $$
declare
  r record;
begin
  for r in
    select table_schema, table_name
    from information_schema.tables
    where table_schema = 'ompro'
      and table_type = 'BASE TABLE'
  loop
    execute format(
      'revoke truncate, trigger, references on table %I.%I from anon, authenticated',
      r.table_schema,
      r.table_name
    );
  end loop;
end
$$;

-- Audit records must be append-only for web roles.
revoke update, delete, truncate on table ompro.audit_log from anon, authenticated;

comment on table ompro.audit_log is
'Append-only application audit trail. Web roles cannot update, delete or truncate records.';
