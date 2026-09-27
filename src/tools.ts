import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getPool } from "./db.js";
import { assertReadQuery, assertWriteQuery } from "./security/sql-policy.js";
import { audit } from "./audit.js";
import { getProject } from "./projects.js";

const projectSchema = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/);

function resultText(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

export function registerTools(server: McpServer) {
  server.registerTool("db_read", {
    description: "Run a read-only PostgreSQL query against a server-side allowlisted project.",
    inputSchema: { project: projectSchema, sql: z.string().min(1), params: z.array(z.unknown()).default([]) },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
  }, async ({ project, sql, params }) => {
    getProject(project);
    assertReadQuery(sql);
    const started = Date.now();
    const res = await getPool(project, "read").query(sql, params);
    audit({ project, tool: "db_read", rows: res.rowCount, durationMs: Date.now() - started, status: "success" });
    return resultText({ rowCount: res.rowCount, rows: res.rows });
  });

  server.registerTool("db_schema", {
    description: "Inspect PostgreSQL schema metadata for a server-side allowlisted project.",
    inputSchema: { project: projectSchema, schema: z.string().default("public") },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
  }, async ({ project, schema }) => {
    getProject(project);
    const sql = `
      SELECT c.table_name, c.column_name, c.data_type, c.is_nullable, c.column_default
      FROM information_schema.columns c
      WHERE c.table_schema = $1
      ORDER BY c.table_name, c.ordinal_position
    `;
    const res = await getPool(project, "read").query(sql, [schema]);
    audit({ project, tool: "db_schema", rows: res.rowCount, status: "success" });
    return resultText({ schema, columns: res.rows });
  });

  server.registerTool("db_write_preview", {
    description: "Preview one data-change statement with PostgreSQL EXPLAIN only; no write is executed.",
    inputSchema: {
      project: projectSchema,
      sql: z.string().min(1),
      params: z.array(z.unknown()).default([]),
      reason: z.string().min(3)
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, async ({ project, sql, params, reason }) => {
    getProject(project);
    assertWriteQuery(sql);
    const started = Date.now();
    const res = await getPool(project, "write").query("EXPLAIN (FORMAT JSON) " + sql, params);
    audit({ project, tool: "db_write_preview", reason, durationMs: Date.now() - started, status: "success" });
    return resultText({ executesWrite: false, plan: res.rows });
  });

  server.registerTool("db_write", {
    description: "Execute exactly one INSERT, UPDATE, or DELETE statement after explicit user approval.",
    inputSchema: {
      project: projectSchema,
      sql: z.string().min(1),
      params: z.array(z.unknown()).default([]),
      reason: z.string().min(3)
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false }
  }, async ({ project, sql, params, reason }) => {
    getProject(project);
    assertWriteQuery(sql);
    const pool = getPool(project, "write");
    const client = await pool.connect();
    const started = Date.now();
    try {
      await client.query("BEGIN");
      const res = await client.query(sql, params);
      await client.query("COMMIT");
      audit({ project, tool: "db_write", operation: sql.trim().split(/\s+/)[0]?.toUpperCase(), rows: res.rowCount, reason, durationMs: Date.now() - started, status: "success" });
      return resultText({ rowCount: res.rowCount, rows: res.rows });
    } catch (error) {
      await client.query("ROLLBACK");
      audit({ project, tool: "db_write", reason, durationMs: Date.now() - started, status: "failed" });
      throw error;
    } finally {
      client.release();
    }
  });
}
