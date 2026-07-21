alter default privileges for role postgres in schema ompro
revoke execute on functions from public;

alter default privileges for role postgres in schema ompro
grant execute on functions to service_role;
