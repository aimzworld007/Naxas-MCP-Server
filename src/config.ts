import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  MCP_BEARER_TOKEN: z.string().min(32),
  MCP_ALLOWED_HOSTS: z.string().default("localhost,127.0.0.1"),
  PROJECTS_JSON: z.string().min(2),
  DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  DB_LOCK_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  AUDIT_LOG_ENABLED: z.string().default("true")
});

export const env = envSchema.parse(process.env);
export const allowedHosts = new Set(
  env.MCP_ALLOWED_HOSTS.split(",").map(v => v.trim().toLowerCase()).filter(Boolean)
);
