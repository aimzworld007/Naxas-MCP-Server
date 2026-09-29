# VS Code Codex setup

## All links in one place

| Resource | Link |
| --- | --- |
| GitHub source and README | [Naxas MCP Server](https://github.com/aimzworld007/Naxas-MCP-Server) |
| Published npm package | [naxas-mcp on npm](https://www.npmjs.com/package/naxas-mcp) |
| Live MCP endpoint (for Codex) | [https://mcp.naxasit.com/mcp](https://mcp.naxasit.com/mcp) |
| Gateway health | [https://mcp.naxasit.com/health](https://mcp.naxasit.com/health) |
| Gateway readiness | [https://mcp.naxasit.com/ready](https://mcp.naxasit.com/ready) |
| VS Code Codex setup | [This guide](VSCODE_CODEX.md) |
| Project scope | [Architecture and access model](PROJECT_SCOPE.md) |
| Multi-user VS Code access | [Per-user token and project setup](MULTI_USER_VSCODE.md) |
| npm CLI / local installation | [NPM CLI guide](NPM_CLI.md) |
| Localhost setup | [Localhost guide](LOCALHOST.md) |
| Coolify deployment | [Coolify guide](COOLIFY.md) |
| Admin dashboard | [Admin dashboard guide](ADMIN_DASHBOARD.md) |
| Official Codex MCP reference | [OpenAI Codex MCP docs](https://developers.openai.com/codex/mcp) |

The MCP endpoint expects an authenticated MCP client; opening it in a browser is not a connection test. The health and readiness URLs are service checks. To use the hosted gateway from VS Code, follow the steps below. To install or self-host the npm package, use the NPM CLI and deployment guides above.

Connect the Codex IDE extension to the hosted Naxas MCP gateway using Streamable HTTP. The Naxas deployment uses:

```text
https://mcp.naxasit.com/mcp
```

This is an MCP endpoint, not a PostgreSQL URL. Database connection strings stay on the gateway in Coolify.

## 1. Prepare the bearer token

Ask the gateway owner to create your developer user in the panel and give you the token privately. The gateway's `MCP_BEARER_TOKEN` is the **owner/admin token** and should not be distributed to developers. On the Windows computer running VS Code, create a **User** environment variable:

| Variable name | Variable value |
| --- | --- |
| `NAXAS_MCP_TOKEN` | Your own token issued in the gateway panel |

Use Windows Start → **Edit environment variables for your account** → **User variables** → **New**. Do not place the token in a repository, screenshot, chat, or the MCP server's *Bearer token env var* field.

If your token has been exposed, ask the owner to rotate it in the panel and replace the Windows variable. Owner-token rotation still requires changing `MCP_BEARER_TOKEN` in Coolify and redeploying.

Close **all** VS Code windows and reopen VS Code so its process inherits the new environment variable. In the VS Code PowerShell terminal, verify presence without printing the secret:

```powershell
[pscustomobject]@{
  ProcessHasToken = [bool]$env:NAXAS_MCP_TOKEN
  UserHasToken    = [bool][Environment]::GetEnvironmentVariable('NAXAS_MCP_TOKEN', 'User')
}
```

Both values should be `True`. If `UserHasToken` is `False`, create the User variable. If only `ProcessHasToken` is `False`, close every VS Code window and reopen it from a fresh Windows session.

## 2. Add the server in Codex

In VS Code, open **Codex → gear menu → MCP servers → Add server**:

| Field | Value |
| --- | --- |
| Name | `naxas_mcp` |
| Type | **Streamable HTTP** |
| URL | `https://mcp.naxasit.com/mcp` |
| Bearer token env var | `NAXAS_MCP_TOKEN` |

Leave custom headers empty unless your deployment explicitly requires them. **Bearer token env var expects the name of an environment variable, not the token value.** Save, restart the Codex extension, and start a new Codex chat if the tool catalog is stale.

Alternatively, the equivalent entry in the Windows user's `~/.codex/config.toml` is:

```toml
[mcp_servers.naxas_mcp]
url = "https://mcp.naxasit.com/mcp"
bearer_token_env_var = "NAXAS_MCP_TOKEN"
default_tools_approval_mode = "writes"
```

Use either the UI or the config file to define the server; avoid duplicate entries under different names. `codex mcp list` requires the separate Codex CLI and is not needed for the IDE extension.

## 3. Verify read-only access

In **VS Code's Codex chat**, ask:

> Use Naxas MCP `db_schema` for project `01` to list its schema and tables. Read only; do not change any data.

A successful response must identify an MCP tool call to `db_schema` and return live schema metadata. Reading `prisma/schema.prisma` from the local repository is **not** a gateway test. As an optional second test, use `db_read` for `SELECT current_database(), current_user;`.

Every tool call needs the project ID (`01` in this example). In each code repository's `AGENTS.md`, record the corresponding gateway ID so Codex selects the intended database. A write also needs a user Write grant and the project Write switch; ask for explicit approval before execution.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Naxas MCP tools are absent | Confirm the server is enabled in the Codex MCP panel, restart the extension, and open a new chat. Check `ProcessHasToken`. |
| HTTP 401 / unauthorized | Confirm `NAXAS_MCP_TOKEN` contains your active user token; ask the owner if it was rotated or removed. Never print the token in logs or screenshots. |
| Gateway responds but no database tools work | Check `/health`, `/ready`, deployment logs, the project ID in `PROJECTS_JSON`, and your panel Read grant. |
| `codex` command not found in PowerShell | The separate CLI is not installed or on PATH. Continue using the extension's MCP panel; the CLI is optional. |
| Tools appear in one chat but not another | Restart the Codex extension and start a fresh VS Code chat. |

For Codex MCP configuration options, see the [official Codex MCP documentation](https://developers.openai.com/codex/mcp).
