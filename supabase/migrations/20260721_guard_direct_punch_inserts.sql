-- Server-side safety net for the legacy direct punch insert path.
-- Keeps the current PIN workflow unchanged while enforcing sequence rules in PostgreSQL.

create or replace function ompro.guard_direct_punch_insert()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, ompro
as $$
declare
  v_active boolean;
  v_last_type text;
  v_break_count integer;
  v_resume_count integer;
  v_start_count integer;
  v_end_count integer;
begin
  select coalesce(active, false) into v_active
  from ompro.employees
  where id = new.employee_id;

  if not coalesce(v_active, false) then
    raise exception 'Salarié inactif ou introuvable';
  end if;

  if new.punch_type not in ('start','break_morning','break_lunch','break_afternoon','pause','resume','end') then
    raise exception 'Type de pointage invalide';
  end if;

  new.punched_at := coalesce(new.punched_at, clock_timestamp());
  new.service_date := coalesce(new.service_date, (new.punched_at at time zone 'Europe/Paris')::date);

  if new.service_date <> (new.punched_at at time zone 'Europe/Paris')::date then
    raise exception 'Date de service incohérente';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.employee_id::text || ':' || new.service_date::text, 0));

  select punch_type into v_last_type
  from ompro.punches
  where employee_id = new.employee_id
    and service_date = new.service_date
  order by punched_at desc, created_at desc
  limit 1;

  select
    count(*) filter (where punch_type = 'start'),
    count(*) filter (where punch_type = 'end'),
    count(*) filter (where punch_type in ('break_morning','break_lunch','break_afternoon','pause')),
    count(*) filter (where punch_type = 'resume')
  into v_start_count, v_end_count, v_break_count, v_resume_count
  from ompro.punches
  where employee_id = new.employee_id
    and service_date = new.service_date;

  if exists (
    select 1 from ompro.punches
    where employee_id = new.employee_id
      and punch_type = new.punch_type
      and punched_at between new.punched_at - interval '8 seconds' and new.punched_at + interval '8 seconds'
  ) then
    raise exception 'Pointage déjà enregistré';
  end if;

  case new.punch_type
    when 'start' then
      if v_start_count > v_end_count then raise exception 'Une mission est déjà en cours'; end if;
    when 'break_morning' then
      if v_start_count <= v_end_count then raise exception 'Aucune mission en cours'; end if;
      if v_break_count > v_resume_count then raise exception 'Une pause est déjà en cours'; end if;
      if exists (select 1 from ompro.punches where employee_id=new.employee_id and service_date=new.service_date and punch_type='break_morning') then raise exception 'Pause matin déjà enregistrée'; end if;
    when 'break_lunch' then
      if v_start_count <= v_end_count then raise exception 'Aucune mission en cours'; end if;
      if v_break_count > v_resume_count then raise exception 'Une pause est déjà en cours'; end if;
      if exists (select 1 from ompro.punches where employee_id=new.employee_id and service_date=new.service_date and punch_type='break_lunch') then raise exception 'Pause midi déjà enregistrée'; end if;
    when 'break_afternoon' then
      if v_start_count <= v_end_count then raise exception 'Aucune mission en cours'; end if;
      if v_break_count > v_resume_count then raise exception 'Une pause est déjà en cours'; end if;
      if exists (select 1 from ompro.punches where employee_id=new.employee_id and service_date=new.service_date and punch_type='break_afternoon') then raise exception 'Pause après-midi déjà enregistrée'; end if;
    when 'pause' then
      if v_start_count <= v_end_count then raise exception 'Aucune mission en cours'; end if;
      if v_break_count > v_resume_count then raise exception 'Une pause est déjà en cours'; end if;
    when 'resume' then
      if v_break_count <= v_resume_count then raise exception 'Aucune pause en cours'; end if;
    when 'end' then
      if v_start_count <= v_end_count then raise exception 'Aucune mission en cours'; end if;
      if v_break_count > v_resume_count then raise exception 'Reprise obligatoire avant la fin'; end if;
  end case;

  if v_last_type = new.punch_type and new.punch_type not in ('start','end') then
    raise exception 'Séquence de pointage invalide';
  end if;

  return new;
end;
$$;

revoke all on function ompro.guard_direct_punch_insert() from public, anon, authenticated;

drop trigger if exists trg_guard_direct_punch_insert on ompro.punches;
create trigger trg_guard_direct_punch_insert
before insert on ompro.punches
for each row execute function ompro.guard_direct_punch_insert();
