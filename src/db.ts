import pg from "pg";
import { env } from "./config.js";
import { getProject } from "./projects.js";

const { Pool } = pg;
const pools = new Map<string, pg.Pool>();

function poolKey(project: string, mode: "read" | "write") {
  return project + ":" + mode;
}

export function getPool(projectId: string, mode: "read" | "write") {
  const project = getProject(projectId);
  const key = poolKey(project.id, mode);
  let pool = pools.get(key);
  if (!pool) {
    pool = new Pool({
      connectionString: mode === "read" ? project.readUrl : project.writeUrl,
      max: 5,
      application_name: "naxas-mcp-" + mode,
      statement_timeout: env.DB_STATEMENT_TIMEOUT_MS,
      lock_timeout: mode === "write" ? env.DB_LOCK_TIMEOUT_MS : undefined
    });
    pools.set(key, pool);
  }
  return pool;
}
