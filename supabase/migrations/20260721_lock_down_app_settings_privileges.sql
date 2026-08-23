revoke all privileges on table ompro.app_settings from anon;
revoke all privileges on table ompro.app_settings from authenticated;

comment on table ompro.app_settings is
'Sensitive internal settings. Direct anon/authenticated access is revoked; access is only through vetted SECURITY DEFINER RPCs.';
