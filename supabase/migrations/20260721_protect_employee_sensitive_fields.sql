-- Prevent direct browser updates from escalating employee privileges or replacing PIN data.
-- Existing SECURITY DEFINER manager/PIN RPCs remain functional.

create or replace function ompro.protect_employee_sensitive_fields()
returns trigger
language plpgsql
set search_path = pg_catalog, ompro
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if new.pin_hash is distinct from old.pin_hash
       or new.pin_code is distinct from old.pin_code
       or new.role is distinct from old.role
       or new.is_manager is distinct from old.is_manager
       or new.can_view_manager is distinct from old.can_view_manager
       or new.active is distinct from old.active
       or new.is_active is distinct from old.is_active
       or new.profile_id is distinct from old.profile_id then
      raise exception using
        errcode = '42501',
        message = 'Modification sensible interdite. Utilisez la fonction sécurisée prévue.';
    end if;
  end if;

  new.updated_at := clock_timestamp();
  return new;
end;
$$;

revoke all on function ompro.protect_employee_sensitive_fields() from public, anon, authenticated;

drop trigger if exists trg_protect_employee_sensitive_fields on ompro.employees;
create trigger trg_protect_employee_sensitive_fields
before update on ompro.employees
for each row execute function ompro.protect_employee_sensitive_fields();
