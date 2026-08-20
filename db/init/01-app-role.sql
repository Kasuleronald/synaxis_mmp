-- Runs once, automatically, the first time the postgres container initializes
-- its data volume. Creates the restricted role the running API connects as.
--
-- POSTGRES_USER (life_mmp) is Postgres's bootstrap role and is a superuser --
-- superusers bypass row-level security entirely. If the app connected as
-- that role, every RLS policy in the init migration would be silently a
-- no-op. scholars_life_mmp_app is deliberately NOT a superuser and NOT
-- BYPASSRLS, so local dev actually exercises the same isolation guarantees
-- production relies on.
--
-- Named with the "scholars_" prefix to match the production role (Webuzo's
-- database-user creation enforces that prefix on the live server, and every
-- migration's GRANT statements are hardcoded to this exact name) -- see
-- DEPLOY.md.
CREATE ROLE scholars_life_mmp_app LOGIN PASSWORD 'life_mmp_app_dev' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
GRANT CONNECT ON DATABASE life_mmp TO scholars_life_mmp_app;
