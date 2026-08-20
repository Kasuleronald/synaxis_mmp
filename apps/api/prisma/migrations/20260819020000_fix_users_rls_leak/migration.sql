-- Fixes a real tenant-isolation leak: the original `users` policy's
-- `"organizationId" IS NULL` clause was meant to let the pre-auth login
-- lookup find a Platform Administrator's row by email. But it's an
-- unconditional row-level OR, not scoped to that one query -- it made every
-- Platform Administrator account visible to every authenticated org member
-- too (e.g. an Org Admin's staff list included the Platform Admin).
--
-- The login lookup (AuthService.validateUser) and session deserialization
-- (AuthService.findById) already run under an explicit
-- { isPlatformAdmin: true } tenant context for exactly this reason -- the
-- `app.is_platform_admin` clause alone covers them. The IS NULL clause was
-- redundant for its intended purpose and harmful everywhere else.
DROP POLICY tenant_isolation ON "users";
CREATE POLICY tenant_isolation ON "users"
  USING (
    "organizationId" = current_setting('app.current_org_id', true)::text
    OR current_setting('app.is_platform_admin', true) = 'true'
  );
