# Security Policy

## Supported versions

Until the first stable release, only the latest commit on `main` is supported.

## Reporting vulnerabilities

Please do not publish credentials, database URLs, exploit payloads, or production data in public issues.
Report security-sensitive findings privately to the repository owner through an appropriate private channel.

## Deployment requirements

- Use a dedicated PostgreSQL role with the minimum privileges needed for each database. Separate read and write roles are supported through `readUrl` and `writeUrl` when stronger separation is required.
- Keep PostgreSQL private; do not expose port 5432 to the public internet.
- Use TLS at the MCP endpoint.
- Use a long random owner token and separate per-user tokens managed in the gateway panel.
- Leave each project's Write mode disabled until needed. A single `url` uses the same PostgreSQL role for read and write connections.
- Never grant the writer role superuser, database-owner, role-management, or schema-owner privileges.
- Review MCP client permissions so write tools require confirmation.
- Persist `MCP_ACCESS_FILE` on a writable mounted volume; protect and back up the token hashes and grants in it.
- Treat third-party MCP servers and prompts as untrusted input.

## Secrets

Never commit `.env`, database passwords, bearer tokens, TLS private keys, or production connection strings.
