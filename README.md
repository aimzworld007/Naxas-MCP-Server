# Naxas MCP Server

Open-source, self-hostable PostgreSQL MCP gateway for VS Code Codex and other MCP clients.

It is designed around one rule: **read by default; controlled writes only when the owner enables project and user access and the database role permits them.**

The current scope is [one gateway, multiple databases, multiple users, VS Code Codex, and owner-managed project policy](docs/PROJECT_SCOPE.md). A ChatGPT custom app is outside the planned workflow.

## Why this exists

A single deployment can safely expose multiple PostgreSQL projects without accepting arbitrary database URLs from tool calls. Projects are configured only on the server through `PROJECTS_JSON`.

Example:

```json
{
  "naxas": { "url": "postgresql://gateway_user:***@postgres:5432/naxas" },
  "another_app": { "url": "postgresql://gateway_user:***@postgres:5432/another_app" }
}
```

New projects start in Read only mode. Use the owner dashboard's project and user mode dropdowns (`Disabled`, `Read only`, `Read + Write`) and Save buttons; DELETE and maximum write rows are separate controls. Policy changes persist in `MCP_ACCESS_FILE`; database connections still come only from server environment. With one `url`, the database role must allow writes for Write to succeed. Existing `readUrl` / `writeUrl` settings remain supported.

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
4. PostgreSQL role privileges; optional separate read/write roles.
5. PostgreSQL privileges remain the final authority.
6. Query and lock timeouts.
7. Structured audit events with request IDs.
8. HTTP rate limiting and request-size limits.
9. Per-project write enablement, DELETE opt-in, and max-row rollback guards.

Do not grant the writer role superuser, owner, schema-management, or role-management capabilities.

## Install with npm

Users can run:

```bash
npx naxas-mcp init
```

or install globally:

```bash
npm install -g naxas-mcp
naxas-mcp init
```

Recommended first-run flow:

```bash
naxas-mcp init
# edit .env and replace the database password placeholder
naxas-mcp doctor
naxas-mcp start
```

CLI commands:

| Command | Purpose |
| --- | --- |
| `naxas-mcp init` | Create a safe read-only `.env` template and strong MCP token |
| `naxas-mcp doctor` | Validate config and test PostgreSQL read connectivity |
| `naxas-mcp generate-token` | Generate a secure bearer token |
| `naxas-mcp generate-user-token` | Generate a user token and SHA-256 hash for legacy env setup |
| `naxas-mcp start` | Start the MCP gateway |
| `naxas-mcp help` | Show CLI help |

`init` intentionally does not collect the database password interactively. It writes a placeholder so the real password can be added directly to a local `.env` or a deployment secret store such as Coolify.

## Quick start

```bash
cp .env.example .env
# Edit .env with strong credentials and PROJECTS_JSON
docker compose up --build
```

Health and readiness checks:

```text
GET http://127.0.0.1:3000/health
GET http://127.0.0.1:3000/ready
```

Admin dashboard:

```text
GET https://your-domain.example/
```

The dashboard requires the MCP bearer token before operational data is displayed.

Remote MCP endpoint:

```text
POST https://your-domain.example/mcp
```

See [project scope](docs/PROJECT_SCOPE.md), [Coolify deployment](docs/COOLIFY.md), [admin dashboard](docs/ADMIN_DASHBOARD.md), [VS Code Codex setup](docs/VSCODE_CODEX.md), [multi-user access](docs/MULTI_USER_VSCODE.md), [localhost setup](docs/LOCALHOST.md), and [npm release](docs/NPM_CLI.md). [Initial Naxas rollout](docs/NAXAS_LIVE_ROLLOUT.md) and [ChatGPT connection](docs/CHATGPT.md) remain as historical/optional references.

## Development checks

```bash
npm install
npm run check
```

This runs strict TypeScript checking, tests, a production build, and CLI help smoke test.

## PostgreSQL roles

`sql/postgres-roles.sql` contains a conservative starting point. Customize database name, credentials, and table-level writer grants before running it.

For public deployments, create your own roles rather than reusing the application owner/admin account.

## Open source

Licensed under the MIT License. You can fork, self-host, modify, and redistribute this project subject to the license terms.

## Current maturity

Version 1.0 covers the documented multi-project, multi-user gateway and owner-managed access controls. Production operators remain responsible for PostgreSQL privileges, secrets, network isolation, backups, and MCP client permissions. See [version 1.0 release notes](docs/RELEASE_1_0.md).
