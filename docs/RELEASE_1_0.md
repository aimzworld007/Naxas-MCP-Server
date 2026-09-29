# Naxas MCP 1.0.0

Version 1.0.0 marks the first stable release of the documented self-hosted gateway for VS Code Codex and other Streamable HTTP MCP clients.

## Included

- Multiple server-configured PostgreSQL projects, selected by stable project ID.
- Owner dashboard for each project's Disabled, Read only, or Read + Write mode, plus DELETE and row-limit controls.
- Separate user tokens with per-project access modes and rotation/revocation.
- Persistent access settings through `MCP_ACCESS_FILE` and a mounted data directory.
- Read and schema tools, write previews, and guarded single-statement DML writes.
- CLI setup and doctor commands, Docker/Coolify deployment guidance, and Windows npm release script.

## Upgrade from 0.6.0

No configuration or access-file migration is needed for this version bump. Back up the existing access file before replacing a running container, keep its persistent mount, and deploy the reviewed `main` commit. Verify `/health`, `/ready`, the dashboard's project modes, and an authorized read-only `db_schema` call for a configured project. Enable writes only after checking the database role and project/user grants.

Publishing the npm package is separate from deploying the gateway. After the PR is merged, publish `1.0.0` using the documented Windows script and verify the npm registry version. Do not publish the same version twice.
