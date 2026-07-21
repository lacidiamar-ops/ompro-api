create or replace function ompro.guard_finalized_leave_request_delete()
returns trigger
language plpgsql
security definer
set search_path = ompro, pg_temp
as $$
begin
  if coalesce(old.status, 'pending') not in ('pending', 'draft', 'cancelled')
     or old.reviewed_at is not null
     or old.reviewed_by is not null
     or old.signed_at is not null then
    raise exception 'finalized_leave_request_cannot_be_deleted';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_guard_finalized_leave_request_delete on ompro.employee_leave_requests;
create trigger trg_guard_finalized_leave_request_delete
before delete on ompro.employee_leave_requests
for each row execute function ompro.guard_finalized_leave_request_delete();

create or replace function ompro.guard_finalized_week_validation_delete()
returns trigger
language plpgsql
security definer
set search_path = ompro, pg_temp
as $$
begin
  if old.validated_at is not null
     or old.signed_at is not null
     or coalesce(old.overtime_reviewed, false) = true
     or coalesce(old.status, 'draft') in ('approved', 'validated', 'rejected', 'locked', 'finalized') then
    raise exception 'finalized_week_validation_cannot_be_deleted';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_guard_finalized_week_validation_delete on ompro.employee_week_validations;
create trigger trg_guard_finalized_week_validation_delete
before delete on ompro.employee_week_validations
for each row execute function ompro.guard_finalized_week_validation_delete();

create or replace function ompro.guard_finalized_regularization_delete()
returns trigger
language plpgsql
security definer
set search_path = ompro, pg_temp
as $$
begin
  if coalesce(old.status, 'pending') <> 'pending'
     or old.reviewed_at is not null
     or old.reviewed_by_name is not null then
    raise exception 'processed_regularization_cannot_be_deleted';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_guard_finalized_regularization_delete on ompro.regularization_requests;
create trigger trg_guard_finalized_regularization_delete
before delete on ompro.regularization_requests
for each row execute function ompro.guard_finalized_regularization_delete();
