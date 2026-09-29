import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer } from "node:net";
import { test } from "node:test";

const ownerToken = "O".repeat(43);
const aliceToken = "A".repeat(43);
const bobToken = "B".repeat(43);
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No port assigned");
  await new Promise<void>(resolve => server.close(() => resolve()));
  return address.port;
}

test("MCP users cannot reuse sessions or query another user's project", async () => {
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const env = {
    ...process.env,
    PORT: String(port),
    MCP_ALLOWED_HOSTS: "127.0.0.1,localhost",
    MCP_BEARER_TOKEN: ownerToken,
    PROJECTS_JSON: JSON.stringify({
      naxas: { readUrl: "postgresql://unused:unused@127.0.0.1:5432/unused" },
      other: { readUrl: "postgresql://unused:unused@127.0.0.1:5432/unused" }
    }),
    MCP_USERS_JSON: JSON.stringify({
      alice: { tokenSha256: hash(aliceToken), projects: ["naxas"] },
      bob: { tokenSha256: hash(bobToken), projects: ["other"] }
    })
  };
  const child = spawn(process.execPath, ["--import", "tsx", "src/server.ts"], {
    cwd: process.cwd(),
    env,
    stdio: ["ignore", "ignore", "pipe"]
  });
  let errors = "";
  child.stderr.on("data", chunk => { errors += chunk.toString(); });

  const headers = (token: string) => ({
    authorization: `Bearer ${token}`,
    accept: "application/json, text/event-stream",
    "content-type": "application/json"
  });
  const post = (token: string, body: object, session?: string) => fetch(baseUrl + "/mcp", {
    method: "POST",
    headers: { ...headers(token), ...(session ? { "mcp-session-id": session } : {}) },
    body: JSON.stringify(body)
  });

  try {
    let ready = false;
    for (let attempt = 0; attempt < 50; attempt++) {
      if (child.exitCode !== null) throw new Error(`Server exited: ${errors}`);
      try {
        if ((await fetch(baseUrl + "/health")).ok) { ready = true; break; }
      } catch { /* Wait for startup. */ }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(ready, `Server did not start: ${errors}`);

    const dashboard = await fetch(baseUrl + "/");
    const html = await dashboard.text();
    assert.match(html, /\/admin\/app\.js\?v=[a-f0-9]{12}/);
    assert.equal(dashboard.headers.get("cache-control"), "no-store");
    const script = await fetch(baseUrl + "/admin/app.js");
    assert.equal(script.headers.get("cache-control"), "no-store");
    assert.match(await script.text(), /modeOptions/);

    const initialized = await post(aliceToken, {
      jsonrpc: "2.0", id: 1, method: "initialize",
      params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "test", version: "1" } }
    });
    assert.equal(initialized.status, 200);
    const session = initialized.headers.get("mcp-session-id");
    assert.ok(session);
    await initialized.text();

    const wrongSession = await post(bobToken, { jsonrpc: "2.0", id: 2, method: "tools/list" }, session);
    assert.equal(wrongSession.status, 404);
    const admin = await fetch(baseUrl + "/admin/status", { headers: headers(aliceToken) });
    assert.equal(admin.status, 401);

    const list = await post(aliceToken, { jsonrpc: "2.0", id: 3, method: "tools/list" }, session);
    assert.equal(list.status, 200);
    assert.match(await list.text(), /db_schema/);

    const otherProject = await post(aliceToken, {
      jsonrpc: "2.0", id: 4, method: "tools/call",
      params: { name: "db_schema", arguments: { project: "other", schema: "public" } }
    }, session);
    assert.match(await otherProject.text(), /Unknown or unauthorized project/);
  } finally {
    child.kill();
  }
});
