#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import dotenv from "dotenv";
import pg from "pg";

const { Pool } = pg;
const VERSION = "0.5.1";

function token() {
  return randomBytes(32).toString("base64url");
}

function safeProjectId(value: string) {
  return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(value);
}

function help() {
  console.log(`
Naxas MCP CLI v${VERSION}

Usage:
  naxas-mcp init             Create a safe read-only .env template
  naxas-mcp generate-token   Generate a strong MCP bearer token
  naxas-mcp doctor           Validate config and test read-only DB connectivity
  naxas-mcp start            Start the MCP gateway
  naxas-mcp help             Show this help

Recommended first run:
  npx naxas-mcp init
  # edit .env and replace the DB password placeholder
  npx naxas-mcp doctor
  npx naxas-mcp start
`.trim());
}

async function init() {
  const envPath = resolve(process.cwd(), ".env");
  if (existsSync(envPath)) {
    console.error("Refusing to overwrite existing .env");
    process.exitCode = 1;
    return;
  }

  const rl = createInterface({ input, output });
  try {
    console.log("Naxas MCP Gateway setup\n");
    const projectRaw = (await rl.question("Project ID [myapp]: ")).trim() || "myapp";
    if (!safeProjectId(projectRaw)) {
      throw new Error("Project ID must use lowercase letters, numbers, _ or -");
    }

    const host = (await rl.question("Private PostgreSQL host [postgres]: ")).trim() || "postgres";
    const port = (await rl.question("PostgreSQL port [5432]: ")).trim() || "5432";
    const database = (await rl.question(`Database name [${projectRaw}]: `)).trim() || projectRaw;
    const user = (await rl.question("Read-only DB user [mcp_readonly]: ")).trim() || "mcp_readonly";
    const allowedHost = (await rl.question("Public MCP hostname [localhost]: ")).trim() || "localhost";

    const generatedToken = token();
    const readUrl = `postgresql://${encodeURIComponent(user)}:REPLACE_WITH_URL_ENCODED_PASSWORD@${host}:${port}/${database}`;
    const projects = JSON.stringify({ [projectRaw]: { readUrl } });

    const body = [
      "PORT=3000",
      `MCP_BEARER_TOKEN=${generatedToken}`,
      `MCP_ALLOWED_HOSTS=${allowedHost},localhost,127.0.0.1`,
      `PROJECTS_JSON=${projects}`,
      "DB_STATEMENT_TIMEOUT_MS=30000",
      "DB_LOCK_TIMEOUT_MS=5000",
      "MCP_RATE_LIMIT_WINDOW_MS=60000",
      "MCP_RATE_LIMIT_MAX=60",
      "DEFAULT_MAX_WRITE_ROWS=100",
      "AUDIT_LOG_ENABLED=true",
      ""
    ].join("\n");

    writeFileSync(envPath, body, { mode: 0o600, flag: "wx" });

    console.log("\n✓ Created .env in read-only mode");
    console.log("✓ Generated a strong MCP bearer token");
    console.log("✓ No writeUrl configured");
    console.log("\nNext:");
    console.log("1. Edit .env and replace REPLACE_WITH_URL_ENCODED_PASSWORD");
    console.log("2. Run: naxas-mcp doctor");
    console.log("3. Run: naxas-mcp start");
  } finally {
    rl.close();
  }
}

function loadLocalEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) throw new Error(".env not found. Run: naxas-mcp init");
  return dotenv.parse(readFileSync(envPath));
}

async function doctor() {
  const checks: Array<{ label: string; ok: boolean; detail?: string }> = [];

  const major = Number(process.versions.node.split(".")[0]);
  checks.push({ label: "Node.js >= 20", ok: major >= 20, detail: process.version });

  let parsed: Record<string, string>;
  try {
    parsed = loadLocalEnv();
    checks.push({ label: ".env found", ok: true });
  } catch (error) {
    checks.push({ label: ".env found", ok: false, detail: error instanceof Error ? error.message : "missing" });
    printChecks(checks);
    process.exitCode = 1;
    return;
  }

  const bearer = parsed.MCP_BEARER_TOKEN || "";
  checks.push({ label: "Bearer token >= 32 chars", ok: bearer.length >= 32 });

  let projects: Record<string, { readUrl: string; writeUrl?: string; writeEnabled?: boolean }>;
  try {
    projects = JSON.parse(parsed.PROJECTS_JSON || "{}");
    checks.push({ label: "PROJECTS_JSON valid", ok: Object.keys(projects).length > 0 });
  } catch {
    checks.push({ label: "PROJECTS_JSON valid", ok: false });
    printChecks(checks);
    process.exitCode = 1;
    return;
  }

  for (const [id, project] of Object.entries(projects)) {
    const placeholder = project.readUrl?.includes("REPLACE_WITH_URL_ENCODED_PASSWORD");
    checks.push({ label: `${id}: read URL configured`, ok: Boolean(project.readUrl) && !placeholder });

    if (project.writeUrl || project.writeEnabled) {
      checks.push({
        label: `${id}: safe initial mode`,
        ok: !project.writeEnabled,
        detail: project.writeEnabled ? "writeEnabled=true" : "write connection configured but disabled"
      });
    }

    if (project.readUrl && !placeholder) {
      const pool = new Pool({
        connectionString: project.readUrl,
        max: 1,
        connectionTimeoutMillis: 5000,
        statement_timeout: 5000
      });
      try {
        const result = await pool.query("SELECT current_user, current_database(), current_setting('default_transaction_read_only') AS read_only");
        const row = result.rows[0];
        checks.push({
          label: `${id}: PostgreSQL reachable`,
          ok: true,
          detail: `${row.current_user}@${row.current_database}`
        });
        checks.push({
          label: `${id}: DB role read-only`,
          ok: row.read_only === "on",
          detail: `default_transaction_read_only=${row.read_only}`
        });
      } catch (error) {
        checks.push({
          label: `${id}: PostgreSQL reachable`,
          ok: false,
          detail: error instanceof Error ? error.message : "connection failed"
        });
      } finally {
        await pool.end().catch(() => undefined);
      }
    }
  }

  printChecks(checks);
  if (checks.some(check => !check.ok)) process.exitCode = 1;
}

function printChecks(checks: Array<{ label: string; ok: boolean; detail?: string }>) {
  console.log("\nNaxas MCP doctor\n");
  for (const check of checks) {
    console.log(`${check.ok ? "✓" : "✗"} ${check.label}${check.detail ? ` — ${check.detail}` : ""}`);
  }
}

function start() {
  const serverPath = fileURLToPath(new URL("./server.js", import.meta.url));
  const child = spawn(process.execPath, [serverPath], {
    stdio: "inherit",
    env: process.env
  });

  child.on("exit", code => {
    process.exitCode = code ?? 1;
  });
}

async function main() {
  const command = process.argv[2] || "help";
  switch (command) {
    case "init":
      await init();
      break;
    case "generate-token":
      console.log(token());
      break;
    case "doctor":
      await doctor();
      break;
    case "start":
      start();
      break;
    case "help":
    case "--help":
    case "-h":
      help();
      break;
    case "--version":
    case "-v":
      console.log(VERSION);
      break;
    default:
      console.error(`Unknown command: ${command}\n`);
      help();
      process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
