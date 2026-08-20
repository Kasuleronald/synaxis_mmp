-- The QR check-in flow (Section 2) is deliberately unauthenticated: a
-- visitor scanning a poster has no account and no session cookie. Their
-- first query has to find the AttendanceSession by its qrToken before any
-- organizationId is known -- the same chicken-and-egg the users table
-- solves for login-by-email, solved the same way: a narrow GUC read by
-- exactly one policy, for exactly one lookup shape.
--
-- This does NOT touch attendance_records, members, or any other
-- ministry-data table -- once the session's organizationId is resolved from
-- this one lookup, every subsequent query in the check-in flow runs under a
-- normal tenant context, not this bypass.
DROP POLICY tenant_isolation ON "attendance_sessions";
CREATE POLICY tenant_isolation ON "attendance_sessions"
  USING (
    "organizationId" = current_setting('app.current_org_id', true)::text
    OR current_setting('app.public_checkin', true) = 'true'
  );
