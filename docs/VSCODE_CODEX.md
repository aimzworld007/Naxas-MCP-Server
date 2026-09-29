# VS Code Codex setup

Connect the Codex IDE extension to the hosted Naxas MCP gateway using Streamable HTTP. The Naxas deployment uses:

```text
https://mcp.naxasit.com/mcp
```

This is an MCP endpoint, not a PostgreSQL URL. Database connection strings stay on the gateway in Coolify.

## 1. Prepare the bearer token

The gateway's `MCP_BEARER_TOKEN` value is stored in Coolify. On the Windows computer running VS Code, create a **User** environment variable:

| Variable name | Variable value |
| --- | --- |
| `NAXAS_MCP_TOKEN` | The current `MCP_BEARER_TOKEN` value from Coolify |

Use Windows Start → **Edit environment variables for your account** → **User variables** → **New**. Do not place the token in a repository, screenshot, chat, or the MCP server's *Bearer token env var* field.

If the token has been exposed, generate a new token, update `MCP_BEARER_TOKEN` in Coolify, redeploy the gateway, and replace the Windows variable with that same new value.

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

> Use the Naxas MCP `db_schema` tool to list the available schema and tables. Read only; do not change any data.

A successful response must identify an MCP tool call to `db_schema` and return live schema metadata. Reading `prisma/schema.prisma` from the local repository is **not** a gateway test. As an optional second test, use `db_read` for `SELECT current_database(), current_user;`.

The initial Naxas production rollout has a `readUrl` only; do not configure or attempt `db_write`. See [Naxas live read-only rollout](NAXAS_LIVE_ROLLOUT.md).

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Naxas MCP tools are absent | Confirm the server is enabled in the Codex MCP panel, restart the extension, and open a new chat. Check `ProcessHasToken`. |
| HTTP 401 / unauthorized | Confirm the variable name is `NAXAS_MCP_TOKEN`, its value matches the current Coolify token, and the gateway was redeployed after rotation. Never print the token in logs or screenshots. |
| Gateway responds but no database tools work | Check `/health` and `/ready`, the gateway deployment logs, and the server-side `PROJECTS_JSON` read-only project. |
| `codex` command not found in PowerShell | The separate CLI is not installed or on PATH. Continue using the extension's MCP panel; the CLI is optional. |
| Tools appear in one chat but not another | Local VS Code MCP configuration is separate from ChatGPT web/Work plugin connections. Test inside the Codex IDE extension. |

For Codex MCP configuration options, see the [official Codex MCP documentation](https://developers.openai.com/codex/mcp).
