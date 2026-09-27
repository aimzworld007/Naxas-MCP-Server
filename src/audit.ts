import { env } from "./config.js";

export function audit(event: Record<string, unknown>) {
  if (env.AUDIT_LOG_ENABLED.toLowerCase() !== "true") return;
  console.log(JSON.stringify({
    type: "mcp_audit",
    ts: new Date().toISOString(),
    ...event
  }));
}
