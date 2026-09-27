# Naxas MCP Server

Central, production-oriented MCP gateway for Naxas and future PostgreSQL projects.

## Security model

- Read tools use a dedicated read-only PostgreSQL role.
- Write tools are exposed separately and must be approval-gated by the MCP client.
- DDL, privilege changes, COPY/program execution, and transaction-control statements are blocked.
- Project connections are server-side allowlisted; callers never supply database URLs.
- PostgreSQL should remain on a private/internal network.
- Every tool call is audit logged without storing database credentials.

## Initial tools

- `db_read` — SELECT/WITH/EXPLAIN only.
- `db_schema` — tables, columns, indexes, constraints.
- `db_write` — INSERT/UPDATE/DELETE only; intended for explicit client approval.

## Deployment

Target endpoint: `https://mcp.naxasit.com`

Deploy the Docker image in Coolify, configure environment variables from `.env.example`, and keep PostgreSQL port 5432 private.

## Status

Phase 1 scaffold. Naxas is the first configured project; additional projects can be added through the server-side project registry.
