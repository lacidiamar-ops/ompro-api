create or replace function ompro.protect_hr_request_decisions()
returns trigger
language plpgsql
set search_path = ompro, public
as $$
begin
  -- Les fonctions SECURITY DEFINER manager s'exécutent avec le propriétaire postgres.
  -- Les écritures directes du navigateur (anon/authenticated) ne peuvent pas changer
  -- l'identité du dossier ni les champs réservés au manager.
  if current_user not in ('postgres', 'service_role') then
    if tg_table_name = 'employee_leave_requests' then
      if new.id is distinct from old.id
         or new.employee_id is distinct from old.employee_id
         or new.created_at is distinct from old.created_at
         or new.status is distinct from old.status
         or new.manager_note is distinct from old.manager_note
         or new.reviewed_by is distinct from old.reviewed_by
         or new.reviewed_at is distinct from old.reviewed_at then
        raise exception 'Modification réservée au manager';
      end if;

      if old.signed_at is not null and (
           new.signed_at is distinct from old.signed_at
        or new.signature_data_url is distinct from old.signature_data_url
        or new.signature_name is distinct from old.signature_name
      ) then
        raise exception 'Une demande signée ne peut plus être modifiée directement';
      end if;

    elsif tg_table_name = 'regularization_requests' then
      if new.id is distinct from old.id
         or new.employee_id is distinct from old.employee_id
         or new.request_date is distinct from old.request_date
         or new.created_at is distinct from old.created_at
         or new.status is distinct from old.status
         or new.reviewed_at is distinct from old.reviewed_at
         or new.reviewed_by_name is distinct from old.reviewed_by_name
         or new.manager_note is distinct from old.manager_note then
        raise exception 'Modification réservée au manager';
      end if;

      if old.status <> 'pending' then
        raise exception 'Une demande traitée ne peut plus être modifiée directement';
      end if;

    elsif tg_table_name = 'employee_week_validations' then
      if new.id is distinct from old.id
         or new.employee_id is distinct from old.employee_id
         or new.week_start is distinct from old.week_start
         or new.status is distinct from old.status
         or new.validated_at is distinct from old.validated_at
         or new.manager_note is distinct from old.manager_note
         or new.overtime_reviewed is distinct from old.overtime_reviewed
         or new.overtime_manager_note is distinct from old.overtime_manager_note then
        raise exception 'Modification réservée au manager';
      end if;

      if old.signed_at is not null and (
           new.signed_at is distinct from old.signed_at
        or new.signature_data_url is distinct from old.signature_data_url
        or new.signature_name is distinct from old.signature_name
        or new.week_snapshot is distinct from old.week_snapshot
        or new.planned_minutes is distinct from old.planned_minutes
        or new.real_minutes is distinct from old.real_minutes
        or new.diff_minutes is distinct from old.diff_minutes
      ) then
        raise exception 'Une semaine signée ne peut plus être modifiée directement';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_leave_request_decisions on ompro.employee_leave_requests;
create trigger trg_protect_leave_request_decisions
before update on ompro.employee_leave_requests
for each row execute function ompro.protect_hr_request_decisions();

drop trigger if exists trg_protect_regularization_decisions on ompro.regularization_requests;
create trigger trg_protect_regularization_decisions
before update on ompro.regularization_requests
for each row execute function ompro.protect_hr_request_decisions();

drop trigger if exists trg_protect_week_validation_decisions on ompro.employee_week_validations;
create trigger trg_protect_week_validation_decisions
before update on ompro.employee_week_validations
for each row execute function ompro.protect_hr_request_decisions();
