-- Secure punch creation while preserving the existing 4-digit PIN workflow.
-- The function validates the employee PIN, current punch state and insert atomically.

create or replace function ompro.secure_employee_punch(
  p_employee_id uuid,
  p_pin text,
  p_punch_type text,
  p_location_type text default null,
  p_location_other text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ompro, extensions, pg_catalog
as $$
declare
  v_login jsonb;
  v_now timestamptz := clock_timestamp();
  v_service_date date := (clock_timestamp() at time zone 'Europe/Paris')::date;
  v_start_count integer := 0;
  v_end_count integer := 0;
  v_break_count integer := 0;
  v_resume_count integer := 0;
  v_has_break boolean := false;
  v_punch_id uuid;
begin
  if p_employee_id is null or p_pin is null or p_pin !~ '^\d{4}$' then
    return jsonb_build_object('ok', false, 'message', 'PIN ou salarié invalide');
  end if;

  if p_punch_type not in ('start','break_morning','break_lunch','break_afternoon','resume','end') then
    return jsonb_build_object('ok', false, 'message', 'Type de pointage invalide');
  end if;

  v_login := ompro.employee_login(p_employee_id, p_pin);
  if not coalesce((v_login ->> 'ok')::boolean, false) then
    return jsonb_build_object('ok', false, 'message', coalesce(v_login ->> 'message', 'PIN incorrect'));
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_employee_id::text || ':' || v_service_date::text, 0));

  select
    count(*) filter (where punch_type = 'start'),
    count(*) filter (where punch_type = 'end'),
    count(*) filter (where punch_type in ('break_morning','break_lunch','break_afternoon','pause')),
    count(*) filter (where punch_type = 'resume'),
    coalesce(bool_or(punch_type = p_punch_type), false)
  into v_start_count, v_end_count, v_break_count, v_resume_count, v_has_break
  from ompro.punches
  where employee_id = p_employee_id
    and service_date = v_service_date;

  if p_punch_type = 'start' and v_start_count > v_end_count then
    return jsonb_build_object('ok', false, 'message', 'Tu as déjà commencé une mission');
  elsif p_punch_type in ('break_morning','break_lunch','break_afternoon') then
    if v_start_count <= v_end_count then
      return jsonb_build_object('ok', false, 'message', 'Commence ta journée d’abord');
    end if;
    if v_break_count > v_resume_count then
      return jsonb_build_object('ok', false, 'message', 'Reprends d’abord le service');
    end if;
    if v_has_break then
      return jsonb_build_object('ok', false, 'message', 'Cette pause est déjà enregistrée');
    end if;
  elsif p_punch_type = 'resume' and v_break_count <= v_resume_count then
    return jsonb_build_object('ok', false, 'message', 'Tu n’es pas en pause');
  elsif p_punch_type = 'end' then
    if v_start_count <= v_end_count then
      return jsonb_build_object('ok', false, 'message', 'Aucune mission en cours');
    end if;
    if v_break_count > v_resume_count then
      return jsonb_build_object('ok', false, 'message', 'Reprends d’abord le service');
    end if;
  end if;

  insert into ompro.punches (
    employee_id, punch_type, punched_at, service_date,
    location_type, location_other, source
  ) values (
    p_employee_id,
    p_punch_type,
    v_now,
    v_service_date,
    case when p_punch_type = 'start' then nullif(trim(p_location_type), '') else null end,
    case when p_punch_type = 'start' then nullif(trim(p_location_other), '') else null end,
    'secure_rpc'
  )
  returning id into v_punch_id;

  return jsonb_build_object(
    'ok', true,
    'punch_id', v_punch_id,
    'punched_at', v_now,
    'service_date', v_service_date,
    'punch_type', p_punch_type
  );
exception when others then
  return jsonb_build_object('ok', false, 'message', 'Pointage impossible', 'error_code', sqlstate);
end;
$$;

revoke all on function ompro.secure_employee_punch(uuid,text,text,text,text) from public;
grant execute on function ompro.secure_employee_punch(uuid,text,text,text,text) to anon, authenticated, service_role;

comment on function ompro.secure_employee_punch(uuid,text,text,text,text) is
'Pointage salarié sécurisé par le PIN existant. Validation et insertion atomiques côté serveur.';
