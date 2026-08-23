-- Remove the implicit PUBLIC execution right from exposed SECURITY DEFINER functions.
-- Explicit grants below preserve the current frontend RPC usage for anon/authenticated.

revoke execute on function ompro.change_employee_pin(uuid, text, text) from public;
revoke execute on function ompro.create_regularization_request(uuid, text, date, text, jsonb) from public;
revoke execute on function ompro.create_time_off_with_code(text, uuid, date, date, text, text, text) from public;
revoke execute on function ompro.manager_create_employee(text, text, text, text) from public;
revoke execute on function ompro.manager_delete_punch(text, uuid, text) from public;
revoke execute on function ompro.manager_edit_punch(text, uuid, timestamptz, text, text, text) from public;
revoke execute on function ompro.manager_get_audit_log(text, integer) from public;
revoke execute on function ompro.manager_reset_pin(text, uuid, text) from public;
revoke execute on function ompro.manager_self_regularize(uuid, text, text, date, text, jsonb) from public;
revoke execute on function ompro.manager_update_employee(text, uuid, text, text, boolean) from public;
revoke execute on function ompro.review_regularization_request(text, uuid, text, text) from public;

-- Keep existing app access explicit instead of inherited through PUBLIC.
grant execute on function ompro.change_employee_pin(uuid, text, text) to anon, authenticated;
grant execute on function ompro.create_regularization_request(uuid, text, date, text, jsonb) to anon, authenticated;
grant execute on function ompro.create_time_off_with_code(text, uuid, date, date, text, text, text) to anon, authenticated;
grant execute on function ompro.manager_create_employee(text, text, text, text) to anon, authenticated;
grant execute on function ompro.manager_delete_punch(text, uuid, text) to anon, authenticated;
grant execute on function ompro.manager_edit_punch(text, uuid, timestamptz, text, text, text) to anon, authenticated;
grant execute on function ompro.manager_get_audit_log(text, integer) to anon, authenticated;
grant execute on function ompro.manager_reset_pin(text, uuid, text) to anon, authenticated;
grant execute on function ompro.manager_self_regularize(uuid, text, text, date, text, jsonb) to anon, authenticated;
grant execute on function ompro.manager_update_employee(text, uuid, text, text, boolean) to anon, authenticated;
grant execute on function ompro.review_regularization_request(text, uuid, text, text) to anon, authenticated;

-- Trigger functions must never be called directly by API roles.
revoke all on function ompro.guard_employee_mood_check() from public, anon, authenticated;
revoke all on function ompro.guard_finalized_leave_request_delete() from public, anon, authenticated;
revoke all on function ompro.guard_finalized_regularization_delete() from public, anon, authenticated;
revoke all on function ompro.guard_finalized_week_validation_delete() from public, anon, authenticated;
revoke all on function ompro.guard_push_subscription() from public, anon, authenticated;
revoke all on function ompro.guard_travel_segment() from public, anon, authenticated;

comment on function ompro.guard_employee_mood_check() is 'Internal trigger function; direct execution revoked from API roles.';
comment on function ompro.guard_finalized_leave_request_delete() is 'Internal trigger function; direct execution revoked from API roles.';
comment on function ompro.guard_finalized_regularization_delete() is 'Internal trigger function; direct execution revoked from API roles.';
comment on function ompro.guard_finalized_week_validation_delete() is 'Internal trigger function; direct execution revoked from API roles.';
comment on function ompro.guard_push_subscription() is 'Internal trigger function; direct execution revoked from API roles.';
comment on function ompro.guard_travel_segment() is 'Internal trigger function; direct execution revoked from API roles.';
