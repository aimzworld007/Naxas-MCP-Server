# Coolify Deployment

## 1. Create application

Create a Docker-based application from this GitHub repository.

## 2. Domain

Assign a domain such as:

`mcp.example.com`

For the Naxas deployment:

`mcp.naxasit.com`

Enable HTTPS through Coolify/Traefik.

## 3. Environment

Copy the variables from `.env.example` into Coolify secrets/environment settings. Do not commit the real `.env` file.

For a single read-only project:

`PROJECTS_JSON={"myapp":{"readUrl":"postgresql://reader:SECRET@postgres:5432/myapp"}}`

For read + approval-gated writes:

`PROJECTS_JSON={"myapp":{"readUrl":"postgresql://reader:SECRET@postgres:5432/myapp","writeUrl":"postgresql://writer:SECRET@postgres:5432/myapp","writeEnabled":true,"allowDelete":false,"maxWriteRows":50}}`

Recommended production defaults:

- `writeEnabled=false` until write access is intentionally enabled.
- `allowDelete=false` unless deletion is explicitly required.
- Keep `maxWriteRows` conservative, for example 25–100.
- Keep `MCP_RATE_LIMIT_MAX` conservative and increase only when real usage requires it.
- Use a random bearer token of at least 32 characters.

## 4. Networking

Prefer a private Docker/Coolify network between the MCP service and PostgreSQL. Do not expose PostgreSQL port 5432 publicly.

The MCP service should be the only public component, through HTTPS on port 443 via Traefik.

## 5. Health and readiness

Liveness:

`GET /health`

Readiness:

`GET /ready`

Container health checks should use `/ready`.

## 6. MCP endpoint

Configure the client with:

`POST https://mcp.example.com/mcp`

For Naxas:

`POST https://mcp.naxasit.com/mcp`

Use the authentication mechanism configured for your deployment.

## 7. Reverse proxy

The server trusts one reverse-proxy hop so request IP rate limiting works correctly behind Coolify/Traefik. Do not place additional untrusted proxies in front without reviewing the Express `trust proxy` setting.

## 8. Production checklist

- HTTPS active
- `MCP_ALLOWED_HOSTS` contains only the intended hostname
- PostgreSQL port 5432 is not public
- separate read/write database users
- writer is not database owner or superuser
- write tables are explicitly granted
- DELETE disabled unless needed
- row limit configured
- bearer token stored only in Coolify secrets
- audit logging enabled
