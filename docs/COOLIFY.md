# Coolify Deployment

## 1. Create application

Create a Docker-based application from this GitHub repository.

## 2. Domain

Assign a domain such as:

`mcp.example.com`

Enable HTTPS through Coolify/Traefik.

## 3. Environment

Copy the variables from `.env.example` into Coolify secrets/environment settings. Do not commit the real `.env` file.

For a single read-only project:

`PROJECTS_JSON={"myapp":{"readUrl":"postgresql://reader:SECRET@postgres:5432/myapp"}}`

For read + approval-gated write:

`PROJECTS_JSON={"myapp":{"readUrl":"postgresql://reader:SECRET@postgres:5432/myapp","writeUrl":"postgresql://writer:SECRET@postgres:5432/myapp"}}`

## 4. Networking

Prefer a private Docker/Coolify network between the MCP service and PostgreSQL. Do not expose PostgreSQL port 5432 publicly.

## 5. Health check

Use:

`GET /health`

Expected result:

`{"ok":true,"service":"naxas-mcp-server"}`

## 6. MCP endpoint

Configure the client with:

`POST https://mcp.example.com/mcp`

and the authentication mechanism configured for your deployment.
