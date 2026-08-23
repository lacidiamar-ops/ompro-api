create or replace function ompro.guard_employee_mood_check()
returns trigger
language plpgsql
security definer
set search_path = ompro, pg_temp
as $$
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
       or new.employee_id is distinct from old.employee_id
       or new.mood_date is distinct from old.mood_date
       or new.created_at is distinct from old.created_at then
      raise exception 'protected_mood_identity_fields';
    end if;
  end if;

  if new.energy_score not between 0 and 10
     or new.mental_score not between 0 and 10
     or new.fatigue_score not between 0 and 10
     or new.stress_score not between 0 and 10 then
    raise exception 'invalid_mood_score';
  end if;

  if length(coalesce(new.mood_key, '')) > 50
     or length(coalesce(new.mood_label, '')) > 120
     or length(coalesce(new.avatar_code, '')) > 100
     or length(coalesce(new.note, '')) > 2000 then
    raise exception 'mood_text_too_long';
  end if;

  if new.mood_date > current_date + 1 then
    raise exception 'future_mood_date_not_allowed';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_guard_employee_mood_check on ompro.employee_mood_checks;
create trigger trg_guard_employee_mood_check
before insert or update on ompro.employee_mood_checks
for each row execute function ompro.guard_employee_mood_check();

create or replace function ompro.guard_push_subscription()
returns trigger
language plpgsql
security definer
set search_path = ompro, pg_temp
as $$
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
       or new.employee_id is distinct from old.employee_id
       or new.created_at is distinct from old.created_at then
      raise exception 'protected_push_identity_fields';
    end if;
  end if;

  if length(new.endpoint) < 20 or length(new.endpoint) > 4096 then
    raise exception 'invalid_push_endpoint';
  end if;
  if new.endpoint !~ '^https://' then
    raise exception 'push_endpoint_must_be_https';
  end if;
  if length(new.p256dh) < 20 or length(new.p256dh) > 1024
     or length(new.auth) < 8 or length(new.auth) > 512 then
    raise exception 'invalid_push_keys';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_push_subscription on ompro.push_subscriptions;
create trigger trg_guard_push_subscription
before insert or update on ompro.push_subscriptions
for each row execute function ompro.guard_push_subscription();

create or replace function ompro.guard_travel_segment()
returns trigger
language plpgsql
security definer
set search_path = ompro, pg_temp
as $$
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
       or new.employee_id is distinct from old.employee_id
       or new.trip_date is distinct from old.trip_date
       or new.created_at is distinct from old.created_at then
      raise exception 'protected_travel_identity_fields';
    end if;
  end if;

  if new.segment_order < 0 or new.segment_order > 100 then
    raise exception 'invalid_segment_order';
  end if;
  if new.end_time is not null and new.end_time < new.start_time then
    raise exception 'travel_end_before_start';
  end if;
  if new.start_lat is not null and (new.start_lat < -90 or new.start_lat > 90) then
    raise exception 'invalid_start_latitude';
  end if;
  if new.end_lat is not null and (new.end_lat < -90 or new.end_lat > 90) then
    raise exception 'invalid_end_latitude';
  end if;
  if new.start_lng is not null and (new.start_lng < -180 or new.start_lng > 180) then
    raise exception 'invalid_start_longitude';
  end if;
  if new.end_lng is not null and (new.end_lng < -180 or new.end_lng > 180) then
    raise exception 'invalid_end_longitude';
  end if;
  if length(coalesce(new.transport_mode, '')) > 50
     or length(coalesce(new.status, '')) > 50
     or length(coalesce(new.note, '')) > 2000 then
    raise exception 'travel_text_too_long';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_travel_segment on ompro.travel_segments;
create trigger trg_guard_travel_segment
before insert or update on ompro.travel_segments
for each row execute function ompro.guard_travel_segment();