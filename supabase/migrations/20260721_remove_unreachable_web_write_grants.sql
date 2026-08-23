-- Remove write privileges that cannot currently pass RLS.
-- This does not change any active policy or frontend-permitted operation.

revoke insert on table ompro.employees from anon;

revoke update on table ompro.overtime_settings from authenticated;

revoke insert, update, delete on table ompro.push_subscriptions from authenticated;

revoke insert, update on table ompro.regularization_requests from authenticated;

revoke insert, update on table ompro.travel_segments from authenticated;
