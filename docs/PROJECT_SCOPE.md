# Project scope and operating model

Naxas MCP is a self-hosted PostgreSQL gateway for VS Code Codex and other Streamable HTTP MCP clients. One gateway instance can connect to several separately configured databases. The primary client is the VS Code Codex extension; a ChatGPT custom app is not part of the planned setup.

## Roles and boundaries

| Component | Responsibility |
| --- | --- |
| `PROJECTS_JSON` in gateway environment | Server-side database URLs keyed by stable project ID (`01`, `02`, `naxas`). Adding or changing a database URL requires a redeploy. |
| Owner dashboard | Project display name, access-mode dropdown (`Disabled`, `Read only`, `Read + Write`), DELETE switch, write row limit, users, token rotation and per-user project-mode dropdowns. Changes persist in `MCP_ACCESS_FILE` and take effect without editing environment variables. |
| VS Code Codex | Connects once to the gateway with the user's bearer token. Every database tool call specifies the intended `project` ID. A repository's `AGENTS.md` can document that mapping. |
| PostgreSQL | Its role privileges decide what a connection can actually execute. A dashboard Write switch cannot grant privileges the database role does not have. |

Example configuration (the password and URL stay on the gateway):

```env
PROJECTS_JSON={"01":{"url":"postgresql://user:password@db-one:5432/app_one"},"02":{"url":"postgresql://user:password@db-two:5432/app_two"}}
MCP_ACCESS_FILE=/app/data/access.json
```

Mount persistent storage at `/app/data`. With a single `url`, the same PostgreSQL role backs both read and write pools. New projects start with controlled Write disabled. For stronger database privilege separation, the legacy `readUrl` and `writeUrl` configuration remains supported. The gateway only permits read queries and controlled single-statement INSERT, UPDATE and DELETE operations; it does not expose general database administration or unrestricted SQL writes.

## Access model

- The owner token from `MCP_BEARER_TOKEN` manages the dashboard and all projects. Do not share it as a developer token.
- Each developer has one separate token. For each project, the owner selects `Disabled`, `Read only`, or `Read + Write` in the user's dropdown.
- Effective writes require a user Write grant, the project Write switch, a PostgreSQL role with write privileges, and the MCP client's explicit approval. DELETE needs the separate project switch. Maximum affected rows are guarded in a transaction.
- Disabling project Read blocks its MCP tools. Write requires project Read to remain enabled.
- Project policy and user grants survive container replacement only when the access file's directory is mounted persistently.

## Delivery

The repository is public and accepts pull requests. The repository owner reviews and merges contributions. GitHub merges, npm publication and Coolify deployment are separate actions. A source change does not automatically update the running gateway or the public npm package.

See [Coolify deployment](COOLIFY.md), [admin dashboard](ADMIN_DASHBOARD.md), [VS Code setup](VSCODE_CODEX.md), and [multi-user access](MULTI_USER_VSCODE.md).
