-- Run as the database owner/admin. Replace passwords before execution.
CREATE ROLE naxas_readonly LOGIN PASSWORD 'CHANGE_ME_READ' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE ROLE naxas_writer LOGIN PASSWORD 'CHANGE_ME_WRITE' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;

GRANT CONNECT ON DATABASE naxas TO naxas_readonly, naxas_writer;
GRANT USAGE ON SCHEMA public TO naxas_readonly, naxas_writer;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO naxas_readonly, naxas_writer;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO naxas_readonly, naxas_writer;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO naxas_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO naxas_writer;

ALTER ROLE naxas_readonly SET default_transaction_read_only = on;
ALTER ROLE naxas_readonly SET statement_timeout = '30s';
ALTER ROLE naxas_writer SET statement_timeout = '30s';
ALTER ROLE naxas_writer SET lock_timeout = '5s';

-- Intentionally no blanket writer DML grant.
-- Grant only the exact tables needed, e.g.:
-- GRANT INSERT, UPDATE ON TABLE "Customer", "Payment" TO naxas_writer;
-- Add DELETE only for explicitly approved tables.
