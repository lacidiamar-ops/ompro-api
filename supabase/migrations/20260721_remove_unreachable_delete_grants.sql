-- Remove DELETE grants that have no matching RLS DELETE policy.
-- This does not change any currently reachable application flow.

revoke delete on table ompro.employee_mood_checks from anon, authenticated;
revoke delete on table ompro.regularization_requests from anon, authenticated;
revoke delete on table ompro.time_off from anon, authenticated;

-- Anonymous users have no DELETE policy on these tables.
-- Keep authenticated DELETE where manager policies may still rely on it.
revoke delete on table ompro.employees from anon;
revoke delete on table ompro.punches from anon;

comment on table ompro.employee_mood_checks is
  'Employee mood entries protected by RLS/triggers; direct web-role deletion is not permitted.';
comment on table ompro.regularization_requests is
  'Regularization requests use controlled review flows; direct web-role deletion is not permitted.';
comment on table ompro.time_off is
  'Time-off records use controlled workflows; direct web-role deletion is not permitted.';
