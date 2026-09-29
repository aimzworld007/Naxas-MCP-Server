# Multi-user access from VS Code

The hosted Naxas MCP gateway gives each developer one bearer token and project-specific read/write grants. The same token works across that user's allowed projects in the **Streamable HTTP** custom MCP connection in VS Code Codex. No ChatGPT plugin is required.

The owner token `MCP_BEARER_TOKEN` retains all projects. Put database URLs in `PROJECTS_JSON` on the gateway. A stable project ID such as `01`, `02`, or `naxas` selects the database in tool calls; an optional `name` is shown in the panel. Example:

```json
{"01":{"url":"postgresql://naxas_user:password@db:5432/naxas"},"02":{"url":"postgresql://other_user:password@db:5432/other"}}
```

Keep URLs and passwords on the gateway only. New single-URL projects start in Read only mode. In the owner panel, choose `Disabled`, `Read only`, or `Read + Write` from each project's dropdown and save. Select a mode for each user/project and save grants. DELETE and max write rows remain separate controls. Changes are stored in `MCP_ACCESS_FILE` and take effect without an env edit or redeploy. `url` is used for both read and write connections; the DB role must have the necessary privileges for writes to succeed. The MCP SQL tool still accepts only controlled INSERT, UPDATE, and DELETE operations. Existing `readUrl`/`writeUrl` entries continue to work.

## Manage users in the gateway panel

Set `MCP_ACCESS_FILE=/app/data/access.json` and mount persistent storage at `/app/data` (included in `docker-compose.yml`; for Coolify attach a persistent volume). This file holds token hashes and grants, not raw tokens or database passwords. It must survive container replacement and be writable by the Node process. Back it up privately.

Open the gateway home page and sign in with the **owner token**. Set each project's mode dropdown and press **Save policy**. Create a user; the panel shows their token **once**. Copy it securely. Each user starts with Read only for currently configured projects. Change any user/project dropdown to `Disabled`, `Read only`, or `Read + Write` and press **Save grants**. **Rotate token** revokes the old token, and **Remove** revokes the user. Changes take effect immediately; existing MCP sessions close and VS Code must reconnect. No env edit or redeploy is needed for policy or permission changes. To add a database connection, update `PROJECTS_JSON` and redeploy, then assign access in the panel.

If `MCP_USERS_JSON` already contains users, the first panel change imports them into the access file. Once the file exists, it takes precedence over `MCP_USERS_JSON`. Keep the owner token in the environment. Do not share it as a normal developer token.

## Optional environment-only setup

1. Define project database connections in `PROJECTS_JSON` on the gateway as before. Keep PostgreSQL private and start with read-only database roles.
2. For each user, run `naxas-mcp generate-user-token` on a trusted local machine. It prints a random **user token** and its **tokenSha256**. Give the token to that user privately, only once. Put only the SHA-256 hash in the server configuration. Do not commit or screenshot either value.
3. Set `MCP_USERS_JSON` in the gateway's Coolify environment and redeploy. For example, with placeholder hashes:

```json
{
  "alice": {
    "tokenSha256": "<64-hex-character-hash>",
    "projects": ["naxas"]
  },
  "bob": {
    "tokenSha256": "<different-64-hex-character-hash>",
    "projects": ["another_app"]
  }
}
```

Coolify environment variables normally need the JSON on one line. Every project name must already exist in `PROJECTS_JSON`. User IDs use lowercase letters, numbers, `_`, or `-`. The same token/hash cannot be assigned twice or reused as the owner token. The gateway refuses to start on invalid configuration.

Existing environment configuration can still grant explicit projects. `projects: ["*"]` means every project configured at startup; it also includes new projects after redeploy. For narrower access, list IDs. In the panel, project grants are always explicit.

## Each developer's VS Code setup

1. Create a Windows User environment variable named `NAXAS_MCP_TOKEN` with **that developer's own raw user token** as its value.
2. In Codex → MCP servers → Add server, choose **Streamable HTTP**:

| Field | Value |
| --- | --- |
| URL | `https://mcp.naxasit.com/mcp` |
| Bearer token env var | `NAXAS_MCP_TOKEN` |

3. Close all VS Code windows, reopen VS Code, and test with a permitted project:

> Use Naxas MCP `db_schema` for project `01`. Read only; do not change data.

For each code repository, put its project ID in `AGENTS.md`, for example: `For this repository, use Naxas MCP project "01" for live DB checks. Compare with local code. Do not write without an explicit request.` The folder name alone does not choose a database.

The **Bearer token env var** field takes the variable name, never the raw token. The same variable name can be used on separate computers with different values. See the [full VS Code setup guide](VSCODE_CODEX.md).

## Access and operations

- A user can call tools only for projects in their allowlist. An unknown or unauthorized project gets the same error.
- An MCP session initialized by one user cannot be used with another user's token.
- The owner token retains access to all configured projects and the admin status dashboard. User tokens cannot access `/admin/status`.
- Audit events record `user:<id>` or `owner:owner` as `actor`; the owner dashboard can inspect those events. Use the panel to rotate or revoke tokens.

Database connections remain server-managed. The panel manages access grants, not database URLs or arbitrary SQL privileges. `db_write` accepts only the gateway's controlled INSERT, UPDATE, and DELETE operations, with the configured limits.
