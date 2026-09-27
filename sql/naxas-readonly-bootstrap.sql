-- Naxas MCP read-only bootstrap
-- Run as a database owner/admin connected to the target application database.
-- Replace CHANGE_ME_READ with a strong secret before running.
-- This script is intentionally read-only; it does not create a writer role.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'naxas_readonly') THEN
    CREATE ROLE naxas_readonly
      LOGIN
      PASSWORD 'CHANGE_ME_READ'
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION;
  END IF;
END
$$;

GRANT CONNECT ON DATABASE current_database() TO naxas_readonly;
GRANT USAGE ON SCHEMA public TO naxas_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO naxas_readonly;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO naxas_readonly;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO naxas_readonly;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON SEQUENCES TO naxas_readonly;

ALTER ROLE naxas_readonly SET default_transaction_read_only = on;
ALTER ROLE naxas_readonly SET statement_timeout = '30s';
ALTER ROLE naxas_readonly SET idle_in_transaction_session_timeout = '30s';

-- Optional hardening: prevent temp-table creation by revoking TEMP at database level.
-- Review application needs before enabling:
-- REVOKE TEMP ON DATABASE <YOUR_DATABASE_NAME> FROM naxas_readonly;
