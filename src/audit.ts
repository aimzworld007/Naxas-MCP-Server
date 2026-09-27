import { env } from "./config.js";
import { getRequestId } from "./context.js";

export interface AuditEvent {
  type: "mcp_audit";
  ts: string;
  requestId?: string;
  [key: string]: unknown;
}

const recentEvents: AuditEvent[] = [];
const MAX_RECENT_EVENTS = 50;

export function audit(event: Record<string, unknown>) {
  if (env.AUDIT_LOG_ENABLED.toLowerCase() !== "true") return;

  const entry: AuditEvent = {
    type: "mcp_audit",
    ts: new Date().toISOString(),
    requestId: getRequestId(),
    ...event
  };

  recentEvents.unshift(entry);
  if (recentEvents.length > MAX_RECENT_EVENTS) recentEvents.length = MAX_RECENT_EVENTS;

  console.log(JSON.stringify(entry));
}

export function getRecentAuditEvents(limit = 20): AuditEvent[] {
  const safeLimit = Math.max(1, Math.min(limit, MAX_RECENT_EVENTS));
  return recentEvents.slice(0, safeLimit);
}
