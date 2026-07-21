-- Rate-limit repeated employee PIN failures without changing existing PIN values.
-- Apply through the normal Supabase migration pipeline after review.

create table if not exists ompro.employee_login_limits (
  employee_id uuid primary key references ompro.employees(id) on delete cascade,
  failed_attempts integer not null default 0,
  first_failed_at timestamptz,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table ompro.employee_login_limits enable row level security;

create index if not exists employee_login_limits_locked_until_idx
  on ompro.employee_login_limits (locked_until)
  where locked_until is not null;

create or replace function ompro.employee_login(p_employee_id uuid, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = 'ompro', 'extensions'
as $function$
declare
  v_employee record;
  v_limit ompro.employee_login_limits%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  if p_employee_id is null or p_pin is null or length(p_pin) > 32 then
    return jsonb_build_object('ok', false, 'error', 'invalid_request', 'message', 'PIN incorrect');
  end if;

  select id, full_name, role, active, pin_hash, can_view_manager, hourly_rate,
         contrat, avatar_code, weekly_base_hours, default_function
    into v_employee
    from ompro.employees
   where id = p_employee_id and active = true;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select * into v_limit
    from ompro.employee_login_limits
   where employee_id = v_employee.id
   for update;

  if found and v_limit.locked_until is not null and v_limit.locked_until > v_now then
    return jsonb_build_object(
      'ok', false,
      'error', 'temporarily_locked',
      'message', 'Trop de tentatives. Réessayez dans quelques minutes.',
      'retry_after_seconds', greatest(1, ceil(extract(epoch from (v_limit.locked_until - v_now)))::integer
    );
  end if;

  if v_employee.pin_hash is null
     or v_employee.pin_hash <> extensions.crypt(p_pin, v_employee.pin_hash) then
    insert into ompro.employee_login_limits (
      employee_id, failed_attempts, first_failed_at, locked_until, updated_at
    ) values (
      v_employee.id, 1, v_now, null, v_now
    )
    on conflict (employee_id) do update
      set failed_attempts = case
            when ompro.employee_login_limits.first_failed_at is null
              or ompro.employee_login_limits.first_failed_at < v_now - interval '15 minutes'
            then 1
            else ompro.employee_login_limits.failed_attempts + 1
          end,
          first_failed_at = case
            when ompro.employee_login_limits.first_failed_at is null
              or ompro.employee_login_limits.first_failed_at < v_now - interval '15 minutes'
            then v_now
            else ompro.employee_login_limits.first_failed_at
          end,
          locked_until = case
            when (case
                    when ompro.employee_login_limits.first_failed_at is null
                      or ompro.employee_login_limits.first_failed_at < v_now - interval '15 minutes'
                    then 1
                    else ompro.employee_login_limits.failed_attempts + 1
                  end) >= 8
            then v_now + interval '10 minutes'
            else null
          end,
          updated_at = v_now;

    insert into ompro.audit_log
      (action, entity_type, entity_id, actor_type, actor_id, actor_name, reason)
    values
      ('login_failed', 'employee', v_employee.id::text, 'system', v_employee.id,
       v_employee.full_name, 'Wrong PIN at login');

    return jsonb_build_object('ok', false, 'error', 'wrong_pin', 'message', 'PIN incorrect');
  end if;

  delete from ompro.employee_login_limits where employee_id = v_employee.id;

  insert into ompro.audit_log
    (action, entity_type, entity_id, actor_type, actor_id, actor_name)
  values
    ('login_success', 'employee', v_employee.id::text, 'employee', v_employee.id, v_employee.full_name);

  return jsonb_build_object(
    'ok', true,
    'employee', jsonb_build_object(
      'id', v_employee.id,
      'full_name', v_employee.full_name,
      'role', v_employee.role,
      'can_view_manager', coalesce(v_employee.can_view_manager, false),
      'hourly_rate', v_employee.hourly_rate,
      'contrat', v_employee.contrat,
      'avatar_code', v_employee.avatar_code,
      'weekly_base_hours', v_employee.weekly_base_hours,
      'default_function', v_employee.default_function
    )
  );
end;
$function$;
