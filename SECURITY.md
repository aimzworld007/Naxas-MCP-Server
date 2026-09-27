# Security Policy

## Supported versions

Until the first stable release, only the latest commit on `main` is supported.

## Reporting vulnerabilities

Please do not publish credentials, database URLs, exploit payloads, or production data in public issues.
Report security-sensitive findings privately to the repository owner through an appropriate private channel.

## Deployment requirements

- Use separate PostgreSQL roles for read and write access.
- Keep PostgreSQL private; do not expose port 5432 to the public internet.
- Use TLS at the MCP endpoint.
- Use a long random bearer token or replace bearer auth with a production OAuth setup.
- Prefer omitting `writeUrl` unless write operations are genuinely required.
- Never grant the writer role superuser, database-owner, role-management, or schema-owner privileges.
- Review MCP client permissions so write tools require confirmation.
- Treat third-party MCP servers and prompts as untrusted input.

## Secrets

Never commit `.env`, database passwords, bearer tokens, TLS private keys, or production connection strings.
