# Multi-user access from VS Code

The hosted Naxas MCP gateway can give each developer a separate bearer token and a project allowlist. It works with the **Streamable HTTP** custom MCP connection in the VS Code Codex extension. This mode does not require a ChatGPT plugin, OAuth service, or an npm account for each developer.

The existing single-owner `MCP_BEARER_TOKEN` and `PROJECTS_JSON` setup remains valid. With no `MCP_USERS_JSON`, behavior is unchanged.

## Owner setup

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

Each user is **read-only by default**, even when a project has a writer connection. To grant writes later, `writeEnabled: true` must be set for that user **and** the project must separately have `writeEnabled: true` with a restricted writer role. The MCP client should require confirmation for `db_write`.

## Each developer's VS Code setup

1. Create a Windows User environment variable named `NAXAS_MCP_TOKEN` with **that developer's own raw user token** as its value.
2. In Codex → MCP servers → Add server, choose **Streamable HTTP**:

| Field | Value |
| --- | --- |
| URL | `https://mcp.naxasit.com/mcp` |
| Bearer token env var | `NAXAS_MCP_TOKEN` |

3. Close all VS Code windows, reopen VS Code, and test with a permitted project:

> Use Naxas MCP `db_schema` for project `naxas`. Read only; do not change data.

The **Bearer token env var** field takes the variable name, never the raw token. The same variable name can be used on separate computers with different values. See the [full VS Code setup guide](VSCODE_CODEX.md).

## Access and operations

- A user can call tools only for projects in their allowlist. An unknown or unauthorized project gets the same error.
- An MCP session initialized by one user cannot be used with another user's token.
- The owner token retains access to all configured projects and the admin status dashboard. User tokens cannot access `/admin/status`.
- Audit events record `user:<id>` or `owner:owner` as `actor`; the owner dashboard can inspect those events. Rotate a user's token by replacing its hash and redeploying. Remove the user entry to revoke access.

This first multi-user mode is managed through server configuration. It does not provide self-service connection management, encrypted per-user database credentials, or a public OAuth flow. Those can be built separately without requiring a ChatGPT plugin.
