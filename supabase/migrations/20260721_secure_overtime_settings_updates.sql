create or replace function ompro.validate_overtime_settings()
returns trigger
language plpgsql
set search_path = ompro, pg_temp
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'overtime_settings_id_immutable';
  end if;

  if new.seuil_hebdo_heures < 1 or new.seuil_hebdo_heures > 60 then
    raise exception 'invalid_weekly_threshold';
  end if;

  if new.tranche1_heures < 0 or new.tranche1_heures > 30 then
    raise exception 'invalid_first_band_hours';
  end if;

  if new.taux_tranche1 < 0 or new.taux_tranche1 > 300
     or new.taux_tranche2 < 0 or new.taux_tranche2 > 300
     or new.taux_nuit < 0 or new.taux_nuit > 300 then
    raise exception 'invalid_overtime_rate';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function ompro.validate_overtime_settings() from public;

drop trigger if exists trg_validate_overtime_settings on ompro.overtime_settings;
create trigger trg_validate_overtime_settings
before update on ompro.overtime_settings
for each row execute function ompro.validate_overtime_settings();

create or replace function ompro.manager_update_overtime_settings(
  p_manager_code text,
  p_seuil_hebdo_heures numeric,
  p_tranche1_heures numeric,
  p_taux_tranche1 numeric,
  p_taux_tranche2 numeric,
  p_taux_nuit numeric
)
returns jsonb
language plpgsql
security definer
set search_path = ompro, extensions, pg_temp
as $$
declare
  v_hash text;
  v_row ompro.overtime_settings%rowtype;
begin
  select value into v_hash
  from ompro.app_settings
  where key = 'manager_code_hash'
  limit 1;

  if v_hash is null or v_hash <> extensions.crypt(p_manager_code, v_hash) then
    return jsonb_build_object('ok', false, 'error', 'wrong_manager_code', 'message', 'Code manager incorrect');
  end if;

  if p_seuil_hebdo_heures < 1 or p_seuil_hebdo_heures > 60
     or p_tranche1_heures < 0 or p_tranche1_heures > 30
     or p_taux_tranche1 < 0 or p_taux_tranche1 > 300
     or p_taux_tranche2 < 0 or p_taux_tranche2 > 300
     or p_taux_nuit < 0 or p_taux_nuit > 300 then
    return jsonb_build_object('ok', false, 'error', 'invalid_settings', 'message', 'Paramètres hors limites');
  end if;

  update ompro.overtime_settings
  set seuil_hebdo_heures = p_seuil_hebdo_heures,
      tranche1_heures = p_tranche1_heures,
      taux_tranche1 = p_taux_tranche1,
      taux_tranche2 = p_taux_tranche2,
      taux_nuit = p_taux_nuit
  where id = (select id from ompro.overtime_settings order by id limit 1)
  returning * into v_row;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'settings_not_found');
  end if;

  insert into ompro.audit_log(action, entity_type, entity_id, actor_type, actor_name, payload)
  values (
    'overtime_settings_updated',
    'overtime_settings',
    v_row.id::text,
    'manager',
    'Manager',
    jsonb_build_object(
      'seuil_hebdo_heures', v_row.seuil_hebdo_heures,
      'tranche1_heures', v_row.tranche1_heures,
      'taux_tranche1', v_row.taux_tranche1,
      'taux_tranche2', v_row.taux_tranche2,
      'taux_nuit', v_row.taux_nuit
    )
  );

  return jsonb_build_object('ok', true, 'settings', to_jsonb(v_row));
end;
$$;

revoke all on function ompro.manager_update_overtime_settings(text,numeric,numeric,numeric,numeric,numeric) from public;
grant execute on function ompro.manager_update_overtime_settings(text,numeric,numeric,numeric,numeric,numeric) to anon, authenticated, service_role;
