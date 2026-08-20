-- Runs once, automatically, the first time the postgres container initializes
-- its data volume. Creates the restricted role the running API connects as.
--
-- POSTGRES_USER (life_mmp) is Postgres's bootstrap role and is a superuser --
-- superusers bypass row-level security entirely. If the app connected as
-- that role, every RLS policy in the init migration would be silently a
-- no-op. life_mmp_app is deliberately NOT a superuser and NOT BYPASSRLS, so
-- local dev actually exercises the same isolation guarantees production
-- will rely on.
CREATE ROLE life_mmp_app LOGIN PASSWORD 'life_mmp_app_dev' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
GRANT CONNECT ON DATABASE life_mmp TO life_mmp_app;
