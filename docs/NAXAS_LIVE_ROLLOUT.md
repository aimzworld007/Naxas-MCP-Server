# Naxas Live Read-Only Rollout

> Historical instructions for the first Naxas database connection. For the current multi-project gateway and panel-managed access, see [project scope](PROJECT_SCOPE.md), [Coolify setup](COOLIFY.md), and [admin dashboard](ADMIN_DASHBOARD.md).

This is the recommended first production rollout for `mcp.naxasit.com`.

## Goal

Connect the MCP server to the production Naxas PostgreSQL database with **read-only access only**. Do not configure a writer connection during this phase.

## 1. Create the read-only database role

In pgAdmin Query Tool, connect to the Naxas application database as the database owner/admin.

Open:

`sql/naxas-readonly-bootstrap.sql`

Replace:

`CHANGE_ME_READ`

with a strong generated password and run the script.

Do not commit or paste the real password into GitHub issues, chat, logs, or screenshots.

### Important PostgreSQL note

`ALTER DEFAULT PRIVILEGES` applies to objects created in the future by the role executing that command. If your migrations create objects under a different owner role, apply equivalent default privileges as that owner, or explicitly grant SELECT after migrations.

## 2. Verify the role

Reconnect to the same database as `naxas_readonly`.

Run:

`sql/verify-readonly.sql`

Expected results:

- current user is `naxas_readonly`
- `default_transaction_read_only` is `on`
- schema/table metadata can be read
- SELECT works on application tables
- INSERT/UPDATE/DELETE fail

Do not proceed if any write succeeds.

## 3. Configure Coolify

Set these environment values in the MCP application:

```env
MCP_ALLOWED_HOSTS=mcp.naxasit.com
MCP_BEARER_TOKEN=<LONG_RANDOM_SECRET>
PROJECTS_JSON={"naxas":{"readUrl":"postgresql://naxas_readonly:<PASSWORD>@<PRIVATE_POSTGRES_HOST>:5432/<DATABASE>"}}
DB_STATEMENT_TIMEOUT_MS=30000
DB_LOCK_TIMEOUT_MS=5000
MCP_RATE_LIMIT_WINDOW_MS=60000
MCP_RATE_LIMIT_MAX=60
DEFAULT_MAX_WRITE_ROWS=100
AUDIT_LOG_ENABLED=true
```

Keep `PROJECTS_JSON` read-only. Do **not** add `writeUrl` yet.

If the password contains reserved URI characters such as `@`, `:`, `/`, `?`, `#`, or `%`, URL-encode the password before placing it in the PostgreSQL connection URL.

## 4. Networking

Use the private/internal PostgreSQL hostname reachable from the MCP container.

Do not expose PostgreSQL port 5432 publicly.

Public traffic should terminate at:

`https://mcp.naxasit.com`

through Coolify/Traefik HTTPS.

## 5. Redeploy and verify service status

After saving the environment variables, redeploy the MCP app.

Verify:

```text
GET https://mcp.naxasit.com/health
GET https://mcp.naxasit.com/ready
```

Expected responses are HTTP 200.

`/ready` should report at least one configured project.

## 6. First MCP database checks

Use only:

- `db_schema`
- `db_read`

Recommended first queries:

```sql
SELECT current_database(), current_user;
```

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name
LIMIT 50;
```

Then inspect one known application table with a small `LIMIT`.

## 7. Acceptance criteria

Read-only rollout passes only if:

- MCP app is healthy and ready
- Naxas project is recognized
- schema inspection succeeds
- SELECT succeeds
- database role reports read-only mode
- production data is not modified
- PostgreSQL 5432 remains private
- audit log records the MCP read operations
- no `writeUrl` is configured

## 8. Next phase

After the read-only rollout is stable, create a separate restricted writer role.

Then add `writeUrl` while keeping:

```json
{
  "writeEnabled": false,
  "allowDelete": false,
  "maxWriteRows": 10
}
```

First test `db_write_preview`. Enable actual writes only after preview behavior and PostgreSQL grants are verified.
