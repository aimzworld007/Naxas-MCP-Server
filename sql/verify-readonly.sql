-- Verify Naxas MCP read-only role.
-- Connect as naxas_readonly before running these checks.

SELECT current_user;
SELECT current_database();
SHOW default_transaction_read_only;
SHOW statement_timeout;
SHOW idle_in_transaction_session_timeout;

-- Expected: SELECT works.
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name
LIMIT 20;

-- Expected: application table reads work when tables exist.
-- Replace "User" with a known table if needed.
-- SELECT * FROM "User" LIMIT 1;

-- Expected: writes FAIL with a read-only transaction/permission error.
-- Run only as an explicit verification check:
-- UPDATE "User" SET "id" = "id" WHERE 1 = 0;
