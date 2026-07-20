-- Non-breaking security hardening for the existing PIN-based application.
-- This migration intentionally does not modify PIN verification or existing application RLS policies.

create table if not exists ompro.security_audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default clock_timestamp(),
  schema_name text not null,
  table_name text not null,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  db_role text not null default current_user,
  jwt_role text,
  auth_uid uuid,
  row_id text,
  old_data jsonb,
  new_data jsonb
);

alter table ompro.security_audit_log enable row level security;

revoke all on table ompro.security_audit_log from public, anon, authenticated;
grant select, insert on table ompro.security_audit_log to service_role;
grant usage, select on sequence ompro.security_audit_log_id_seq to service_role;

create or replace function ompro.capture_security_audit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, ompro
as $$
declare
  claims jsonb := '{}'::jsonb;
  old_row jsonb;
  new_row jsonb;
begin
  begin
    claims := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
  exception when others then
    claims := '{}'::jsonb;
  end;

  old_row := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  new_row := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;

  insert into ompro.security_audit_log (
    schema_name,
    table_name,
    operation,
    db_role,
    jwt_role,
    auth_uid,
    row_id,
    old_data,
    new_data
  ) values (
    tg_table_schema,
    tg_table_name,
    tg_op,
    current_user,
    claims ->> 'role',
    nullif(claims ->> 'sub', '')::uuid,
    coalesce(new_row ->> 'id', old_row ->> 'id', new_row ->> 'employee_id', old_row ->> 'employee_id'),
    case when old_row is null then null else old_row - array['pin', 'pin_hash', 'manager_code', 'signature_data'] end,
    case when new_row is null then null else new_row - array['pin', 'pin_hash', 'manager_code', 'signature_data'] end
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function ompro.capture_security_audit() from public, anon, authenticated;

do $$
declare
  table_to_protect text;
begin
  foreach table_to_protect in array array[
    'employees',
    'punches',
    'employee_planning',
    'employee_leave_requests',
    'employee_week_validations',
    'employee_mood_checks',
    'overtime_settings',
    'push_subscriptions',
    'regularization_requests',
    'time_off',
    'travel_segments'
  ] loop
    if to_regclass(format('ompro.%I', table_to_protect)) is not null then
      execute format('drop trigger if exists trg_security_audit on ompro.%I', table_to_protect);
      execute format(
        'create trigger trg_security_audit after insert or update or delete on ompro.%I for each row execute function ompro.capture_security_audit()',
        table_to_protect
      );
    end if;
  end loop;
end
$$;
