# Admin Dashboard

The MCP gateway includes a lightweight operational dashboard at:

`https://YOUR_DOMAIN/`

For Naxas:

`https://mcp.naxasit.com/`

## Authentication

The dashboard shell is public, but operational data is loaded only from the authenticated endpoint:

`GET /admin/status`

Enter the same `MCP_BEARER_TOKEN` used by the MCP client. The browser keeps it in `sessionStorage` for the current tab/session and sends it only as an Authorization bearer header to the same origin.

The server never sends the bearer token, database passwords, or PostgreSQL connection URLs to the dashboard.

## Dashboard information

The dashboard shows:

- gateway online/attention state
- server version and uptime
- configured project count
- per-project PostgreSQL read health and latency
- whether read access is configured
- whether a write connection exists
- whether write execution is enabled
- whether DELETE is allowed
- maximum write-row guard
- recent MCP audit metadata
- a copy button for the MCP endpoint

Recent activity is kept only in process memory and is cleared when the container restarts.

## What the dashboard does not do

The dashboard intentionally cannot:

- reveal database URLs or passwords
- reveal the MCP bearer token
- execute SQL
- enable or disable writes
- change PostgreSQL privileges
- edit Coolify environment variables
- perform destructive database actions

Write policy remains controlled by server-side environment configuration and PostgreSQL privileges.

## Security notes

- Always use HTTPS.
- Keep `MCP_ALLOWED_HOSTS` restricted to the intended hostname.
- Treat `MCP_BEARER_TOKEN` as a production secret.
- Use the dashboard only from trusted devices.
- Use **Lock dashboard** when finished.
- The dashboard uses same-origin scripts/styles so Helmet CSP remains enabled.
