# Gateway owner dashboard

Open `https://YOUR_DOMAIN/` (for the hosted instance, `https://mcp.naxasit.com/`) and sign in with the owner `MCP_BEARER_TOKEN`. The dashboard shell is public, but its status and management APIs require the owner bearer token. The browser stores that token in tab/session `sessionStorage`; do not use the owner token as a developer's VS Code token.

## Project policy

The `Projects` cards display project IDs and names, database read health, connection availability and effective policy. Select `Disabled`, `Read only`, or `Read + Write` from the project Access mode dropdown and press **Save policy**. The owner can also set the display name, Allow DELETE, and maximum affected rows. Changing a policy closes existing MCP sessions so clients reconnect under the new rules.

New single-URL projects start with Write disabled. Write requires Read enabled. With `PROJECTS_JSON={"01":{"url":"postgresql://..."}}`, the same PostgreSQL role is used by the read and write pools; the panel does not alter its actual database privileges. For separate roles, use `readUrl` and `writeUrl` instead. The gateway still blocks DDL, privilege changes, arbitrary SQL write classes, and multiple write statements.

Database URLs themselves remain in `PROJECTS_JSON` on the server. Adding or changing one requires an environment update and redeploy. URLs and passwords are never returned to the browser.

## User access

Create each user in the panel and copy the generated token when it appears; the raw token is shown once. One user token can access several project IDs. For each project, select `Disabled`, `Read only`, or `Read + Write` from that user's dropdown and press **Save grants**. Rotate a token to revoke the old one; remove a user to revoke access. User tokens cannot access the owner dashboard.

The dashboard also shows gateway version, uptime, project health and recent MCP audit metadata. Recent activity is in memory and clears on restart.

## Persistent storage

Set `MCP_ACCESS_FILE=/app/data/access.json` and mount a writable persistent volume at `/app/data`. The file contains token hashes, project policies, and user grants. Without the mount, saved settings may disappear when the container is replaced. Existing env-based `MCP_USERS_JSON` users are imported when the access file is first written; afterward the file takes precedence.

Always use HTTPS and keep the owner token private. The dashboard does not execute SQL or edit Coolify environment variables. See [project scope](PROJECT_SCOPE.md) and [Coolify deployment](COOLIFY.md).
