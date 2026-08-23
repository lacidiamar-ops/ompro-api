create or replace function ompro.guard_time_off_write()
returns trigger
language plpgsql
set search_path = ompro, pg_temp
as $$
begin
  if new.start_date is null or new.end_date is null or new.end_date < new.start_date then
    raise exception 'invalid_time_off_dates';
  end if;

  if new.paid_hours_per_day is not null and (new.paid_hours_per_day < 0 or new.paid_hours_per_day > 24) then
    raise exception 'invalid_paid_hours_per_day';
  end if;

  if tg_op = 'INSERT' then
    if current_user in ('anon','authenticated') and coalesce(new.status, 'pending') <> 'pending' then
      raise exception 'manager_approval_required';
    end if;
    new.status := coalesce(new.status, 'pending');
  else
    if new.id is distinct from old.id
       or new.employee_id is distinct from old.employee_id
       or new.created_at is distinct from old.created_at then
      raise exception 'protected_time_off_identity';
    end if;

    if current_user in ('anon','authenticated') and new.status is distinct from old.status then
      raise exception 'manager_approval_required';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_time_off_write on ompro.time_off;
create trigger trg_guard_time_off_write
before insert or update on ompro.time_off
for each row execute function ompro.guard_time_off_write();

create or replace function ompro.validate_employee_planning()
returns trigger
language plpgsql
set search_path = ompro, pg_temp
as $$
begin
  if new.work_date is null or new.employee_id is null then
    raise exception 'planning_identity_required';
  end if;

  if new.break_minutes is not null and (new.break_minutes < 0 or new.break_minutes > 600) then
    raise exception 'invalid_break_minutes';
  end if;

  if new.start_time is not null and new.end_time is not null
     and new.start_time = new.end_time then
    raise exception 'invalid_planning_time_range';
  end if;

  if new.mission_order < 0 or new.mission_order > 1000 then
    raise exception 'invalid_mission_order';
  end if;

  if new.location_lat is not null and (new.location_lat < -90 or new.location_lat > 90) then
    raise exception 'invalid_location_latitude';
  end if;

  if new.location_lng is not null and (new.location_lng < -180 or new.location_lng > 180) then
    raise exception 'invalid_location_longitude';
  end if;

  if new.location_accuracy is not null and (new.location_accuracy < 0 or new.location_accuracy > 100000) then
    raise exception 'invalid_location_accuracy';
  end if;

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
      raise exception 'protected_planning_identity';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_employee_planning on ompro.employee_planning;
create trigger trg_validate_employee_planning
before insert or update on ompro.employee_planning
for each row execute function ompro.validate_employee_planning();
