import { env } from "./config.js";
import { getRequestId } from "./context.js";

export function audit(event: Record<string, unknown>) {
  if (env.AUDIT_LOG_ENABLED.toLowerCase() !== "true") return;
  console.log(JSON.stringify({
    type: "mcp_audit",
    ts: new Date().toISOString(),
    requestId: getRequestId(),
    ...event
  }));
}
