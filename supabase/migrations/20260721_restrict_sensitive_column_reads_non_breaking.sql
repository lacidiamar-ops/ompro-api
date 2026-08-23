-- Non-breaking read hardening for web roles.
-- Keep columns actively used by the current frontend, including pin_code.
-- Hide internal hashes, precise geolocation, and push cryptographic keys.

revoke select on table ompro.employees from anon, authenticated;
grant select (
  id,
  profile_id,
  full_name,
  role_title,
  team,
  default_site_id,
  is_active,
  created_at,
  is_manager,
  pin_code,
  weekly_base_hours,
  include_in_overtime,
  role,
  active,
  updated_at,
  default_function,
  avatar_code,
  hourly_rate,
  poste,
  contrat,
  date_entree,
  photo_url,
  can_view_manager
) on table ompro.employees to anon, authenticated;

revoke select on table ompro.punches from anon, authenticated;
grant select (
  id,
  employee_id,
  punch_type,
  punched_at,
  service_date,
  site_id,
  source,
  created_by,
  created_at,
  break_label,
  is_adjustment,
  adjustment_reason,
  location_type,
  is_regularized,
  regularization_reason,
  regularization_request_id
) on table ompro.punches to anon, authenticated;

revoke select on table ompro.push_subscriptions from anon, authenticated;
grant select (
  id,
  employee_id,
  endpoint,
  created_at
) on table ompro.push_subscriptions to anon, authenticated;
