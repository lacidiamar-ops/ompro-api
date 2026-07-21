-- Non-breaking protection for updates to existing punches.
-- Keeps legacy update paths available while preventing identity changes and inconsistent dates.

create or replace function ompro.guard_punch_update()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, ompro
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'Identifiant du pointage non modifiable';
  end if;

  if new.employee_id is distinct from old.employee_id then
    raise exception 'Salarié du pointage non modifiable';
  end if;

  if new.punch_type is distinct from old.punch_type then
    raise exception 'Type de pointage non modifiable';
  end if;

  if new.created_at is distinct from old.created_at then
    raise exception 'Date de création non modifiable';
  end if;

  if new.regularization_request_id is distinct from old.regularization_request_id
     and current_user not in ('postgres', 'service_role') then
    raise exception 'Référence de régularisation protégée';
  end if;

  if new.punched_at is null then
    raise exception 'Heure de pointage obligatoire';
  end if;

  if new.service_date is distinct from (new.punched_at at time zone 'Europe/Paris')::date then
    raise exception 'Date de service incohérente avec l’heure';
  end if;

  if new.is_regularized is true and
     (new.regularization_reason is null or length(trim(new.regularization_reason)) < 3) then
    raise exception 'Motif de régularisation obligatoire';
  end if;

  if old.is_regularized is true and new.is_regularized is false
     and current_user not in ('postgres', 'service_role') then
    raise exception 'Une régularisation validée ne peut pas être annulée directement';
  end if;

  return new;
end;
$$;

revoke all on function ompro.guard_punch_update() from public, anon, authenticated;

drop trigger if exists trg_guard_punch_update on ompro.punches;
create trigger trg_guard_punch_update
before update on ompro.punches
for each row execute function ompro.guard_punch_update();
