create or replace function ompro.calculate_daily_work(
  p_employee_id uuid,
  p_service_date date
)
returns table (
  mission_count integer,
  gross_minutes integer,
  break_minutes integer,
  worked_minutes integer,
  first_start timestamptz,
  last_end timestamptz,
  anomaly_count integer,
  anomalies jsonb
)
language plpgsql
security invoker
set search_path = pg_catalog, ompro
as $$
declare
  r record;
  v_mission_start timestamptz;
  v_pause_start timestamptz;
  v_mission_break_seconds numeric := 0;
  v_gross_seconds numeric := 0;
  v_break_seconds numeric := 0;
  v_missions integer := 0;
  v_first timestamptz;
  v_last timestamptz;
  v_anomalies jsonb := '[]'::jsonb;
begin
  for r in
    select id, punch_type, punched_at, is_regularized
    from ompro.punches
    where employee_id = p_employee_id
      and service_date = p_service_date
    order by punched_at, created_at, id
  loop
    case r.punch_type
      when 'start' then
        if v_mission_start is null then
          v_mission_start := r.punched_at;
          v_pause_start := null;
          v_mission_break_seconds := 0;
          v_first := coalesce(v_first, r.punched_at);
        else
          v_anomalies := v_anomalies || jsonb_build_array(jsonb_build_object('type','duplicate_start','punch_id',r.id,'punched_at',r.punched_at));
        end if;
      when 'break_morning', 'break_lunch', 'break_afternoon', 'pause' then
        if v_mission_start is null then
          v_anomalies := v_anomalies || jsonb_build_array(jsonb_build_object('type','break_without_mission','punch_id',r.id,'punched_at',r.punched_at));
        elsif v_pause_start is null then
          v_pause_start := r.punched_at;
        else
          v_anomalies := v_anomalies || jsonb_build_array(jsonb_build_object('type','duplicate_break','punch_id',r.id,'punched_at',r.punched_at));
        end if;
      when 'resume' then
        if v_mission_start is null then
          v_anomalies := v_anomalies || jsonb_build_array(jsonb_build_object('type','resume_without_mission','punch_id',r.id,'punched_at',r.punched_at));
        elsif v_pause_start is null then
          v_anomalies := v_anomalies || jsonb_build_array(jsonb_build_object('type','resume_without_break','punch_id',r.id,'punched_at',r.punched_at));
        else
          v_mission_break_seconds := v_mission_break_seconds + greatest(extract(epoch from (r.punched_at - v_pause_start)), 0);
          v_pause_start := null;
        end if;
      when 'end' then
        if v_mission_start is null then
          v_anomalies := v_anomalies || jsonb_build_array(jsonb_build_object('type','end_without_start','punch_id',r.id,'punched_at',r.punched_at,'regularized',r.is_regularized));
        else
          if v_pause_start is not null then
            v_mission_break_seconds := v_mission_break_seconds + greatest(extract(epoch from (r.punched_at - v_pause_start)), 0);
            v_anomalies := v_anomalies || jsonb_build_array(jsonb_build_object('type','end_during_break','punch_id',r.id,'punched_at',r.punched_at));
            v_pause_start := null;
          end if;
          v_gross_seconds := v_gross_seconds + greatest(extract(epoch from (r.punched_at - v_mission_start)), 0);
          v_break_seconds := v_break_seconds + v_mission_break_seconds;
          v_missions := v_missions + 1;
          v_last := r.punched_at;
          v_mission_start := null;
          v_mission_break_seconds := 0;
        end if;
    end case;
  end loop;

  if v_mission_start is not null then
    v_anomalies := v_anomalies || jsonb_build_array(jsonb_build_object('type','open_mission','started_at',v_mission_start));
  end if;

  mission_count := v_missions;
  gross_minutes := round(v_gross_seconds / 60.0)::integer;
  break_minutes := round(v_break_seconds / 60.0)::integer;
  worked_minutes := greatest(round((v_gross_seconds - v_break_seconds) / 60.0)::integer, 0);
  first_start := v_first;
  last_end := v_last;
  anomaly_count := jsonb_array_length(v_anomalies);
  anomalies := v_anomalies;
  return next;
end;
$$;

revoke all on function ompro.calculate_daily_work(uuid,date) from public;
grant execute on function ompro.calculate_daily_work(uuid,date) to anon, authenticated, service_role;

create or replace view ompro.daily_work_summary
with (security_invoker = true)
as
select d.employee_id, e.full_name, d.service_date,
       c.mission_count, c.gross_minutes, c.break_minutes, c.worked_minutes,
       c.first_start, c.last_end, c.anomaly_count, c.anomalies
from (select distinct employee_id, service_date from ompro.punches) d
join ompro.employees e on e.id = d.employee_id
cross join lateral ompro.calculate_daily_work(d.employee_id, d.service_date) c;

grant select on ompro.daily_work_summary to anon, authenticated, service_role;
