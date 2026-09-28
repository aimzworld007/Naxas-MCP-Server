# Run Naxas MCP on Localhost

Naxas MCP can run directly on your local computer.

## Quick start

Create a test folder:

```bash
mkdir naxas-mcp-test
cd naxas-mcp-test
```

Initialize the MCP gateway:

```bash
npx naxas-mcp init
```

Edit the generated `.env` and replace the database password placeholder.

Then validate the setup:

```bash
npx naxas-mcp doctor
```

If the checks pass, start the gateway:

```bash
npx naxas-mcp start
```

## Local endpoints

By default the server runs on port 3000:

```text
Dashboard:  http://localhost:3000/
Health:     http://localhost:3000/health
Ready:      http://localhost:3000/ready
MCP:        http://localhost:3000/mcp
```

The admin dashboard requires your `MCP_BEARER_TOKEN`.

## PostgreSQL host rules

### PostgreSQL installed on the same computer

Use:

```text
localhost
```

Example:

```text
postgresql://mcp_readonly:PASSWORD@localhost:5432/mydb
```

### PostgreSQL running in Docker

If Naxas MCP runs in the same Docker network, use the PostgreSQL service/container name, for example:

```text
postgres
```

Example:

```text
postgresql://mcp_readonly:PASSWORD@postgres:5432/mydb
```

If Naxas MCP runs directly on the host computer but PostgreSQL runs in Docker, the PostgreSQL container must expose a port to the host, usually:

```text
localhost:5432
```

### PostgreSQL running privately on a VPS

If the PostgreSQL database exists only inside a private Docker/Coolify network on a VPS, your local computer normally cannot reach its private hostname or container IP.

Recommended architecture:

```text
Internet
   |
   | HTTPS 443
   v
Naxas MCP Gateway on VPS
   |
   | private Docker/Coolify network
   v
PostgreSQL :5432
```

In that setup, deploy Naxas MCP on the same VPS/private network instead of running it on your local computer.

## Security reminder

For production:

- Do not expose PostgreSQL port 5432 publicly.
- Do not share the database password with the AI client.
- Keep database credentials only in the MCP server environment/secrets.
- Use a dedicated read-only PostgreSQL role first.
- Keep writes disabled until intentionally configured.

The AI/MCP client should connect only to the MCP endpoint, not directly to PostgreSQL.
