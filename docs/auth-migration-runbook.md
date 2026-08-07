# Supabase Auth cutover runbook

The application keeps legacy login as the default until staging validation is complete.

1. Back up production and create a separate Supabase staging project.
2. Apply `202608070002_auth_profiles_rls.sql` in staging.
3. Create Auth users with real unique email addresses. Do not copy legacy plaintext passwords through SQL.
4. Assign the first trusted administrator using the UUID statement at the end of the migration.
5. Add minimum-permission RLS policies to each operational table and test every read/write flow.
6. Set `VITE_AUTH_MODE=supabase` only in staging; verify login, logout, refresh, roles and inactive users.
7. Invite/reset production user passwords, apply the migration, verify admin access, then enable the production flag.
8. After the rollback window, remove the legacy password query and column.

Rollback: restore `VITE_AUTH_MODE=legacy`. The profiles migration is additive and does not delete legacy users.
