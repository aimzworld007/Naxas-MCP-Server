# Naxas MCP Server

Open-source, self-hostable PostgreSQL MCP gateway for ChatGPT-compatible and other MCP clients.

It is designed around one rule: **read by default; write only through a separately privileged database role and an approval-capable MCP client.**

## Why this exists

A single deployment can safely expose multiple PostgreSQL projects without accepting arbitrary database URLs from tool calls. Projects are configured only on the server through `PROJECTS_JSON`.

Example:

```json
{
  "naxas": {
    "readUrl": "postgresql://reader:***@postgres:5432/naxas",
    "writeUrl": "postgresql://writer:***@postgres:5432/naxas"
  },
  "another_app": {
    "readUrl": "postgresql://reader:***@postgres:5432/another_app"
  }
}
```

Omit `writeUrl` to make a project permanently read-only.

## Tools

| Tool | Purpose | Recommended client policy |
| --- | --- | --- |
| `db_read` | SELECT / WITH / EXPLAIN | Read without write permission |
| `db_schema` | Inspect schema metadata | Read without write permission |
| `db_write_preview` | Non-executing EXPLAIN for a proposed write | Read/preview |
| `db_write` | One INSERT / UPDATE / DELETE | Ask for explicit confirmation |

The server blocks DDL, role/privilege changes, COPY, transaction-control statements, and multiple write statements.

Recommended write flow: inspect with `db_read` → preview with `db_write_preview` → ask the user for approval → execute with `db_write` → verify with `db_read`.

## Security model

Security is layered:

1. MCP client permission/confirmation.
2. Server-side project allowlist.
3. SQL policy enforcement.
4. Separate PostgreSQL read/write roles.
5. PostgreSQL privileges remain the final authority.
6. Query and lock timeouts.
7. Structured audit events.

Do not grant the writer role superuser, owner, schema-management, or role-management capabilities.

## Quick start

```bash
cp .env.example .env
# Edit .env with strong credentials and PROJECTS_JSON
docker compose up --build
```

Health check:

```text
GET http://127.0.0.1:3000/health
```

Remote MCP endpoint:

```text
POST https://your-domain.example/mcp
```

See [Coolify deployment](docs/COOLIFY.md) and [ChatGPT connection](docs/CHATGPT.md).

## Development checks

```bash
npm install
npm run check
```

This runs strict TypeScript checking, SQL-policy tests, and a production build.

## PostgreSQL roles

`sql/postgres-roles.sql` contains a conservative starting point. Customize database name, credentials, and table-level writer grants before running it.

For public deployments, create your own roles rather than reusing the application owner/admin account.

## Open source

Licensed under the MIT License. You can fork, self-host, modify, and redistribute this project subject to the license terms.

## Current maturity

Pre-1.0. Review the code and security model before using it with production databases. Production operators remain responsible for PostgreSQL privileges, secrets, network isolation, and MCP client permissions.
