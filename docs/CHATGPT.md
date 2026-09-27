# Connect to ChatGPT

The server exposes a remote MCP endpoint at:

`https://YOUR_DOMAIN/mcp`

and a health endpoint at:

`https://YOUR_DOMAIN/health`

## ChatGPT availability

ChatGPT support for custom MCP apps depends on plan and workspace settings. Full MCP support, including write/modify actions, is currently available to eligible Business and Enterprise/Edu workspaces. Some other plans may support more limited read/fetch MCP usage. Check current OpenAI documentation before deployment.

## Configuration

1. Deploy this server to a stable HTTPS endpoint.
2. Set a strong `MCP_BEARER_TOKEN`.
3. Configure `PROJECTS_JSON` with server-side PostgreSQL connection strings.
4. In an eligible ChatGPT workspace, enable developer mode and create a custom app.
5. Enter the MCP endpoint URL.
6. Configure authentication for the server.
7. Scan the exposed tools and review their permissions.
8. Configure write/modify actions so users are asked for confirmation before execution.

## Recommended permissions

- `db_read`: allow read actions.
- `db_schema`: allow read actions.
- `db_write`: ask before changes.

The PostgreSQL writer role must still be restricted even when client-side confirmation is enabled. Client confirmation is not a replacement for database privileges.
