import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { env, allowedHosts } from "./config.js";
import { registerTools } from "./tools.js";
import { runWithRequestContext } from "./context.js";
import { listProjectIds, listProjectSummaries } from "./projects.js";
import { checkProjectReadHealth } from "./db.js";
import { getRecentAuditEvents } from "./audit.js";
import { adminCss, adminHtml, adminJs } from "./admin-ui.js";
import { samePrincipal, type Principal } from "./security/users.js";
import { AccessStore } from "./security/access-store.js";
import { z } from "zod";

function errorBody(code: string, message: string, requestId: string) {
  return { error: { code, message, requestId } };
}

function getBearerToken(req: express.Request) {
  const auth = req.header("authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
}

const access = new AccessStore(env.MCP_BEARER_TOKEN, listProjectIds(), env.MCP_ACCESS_FILE, env.MCP_USERS_JSON);
const authenticate = (token: string) => access.authenticate(token);

function formatUptime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json({ limit: "256kb" }));

app.use((req, res, next) => {
  const requestId = req.header("x-request-id")?.slice(0, 128) || randomUUID();
  res.setHeader("x-request-id", requestId);
  runWithRequestContext(requestId, next);
});

app.use((req, res, next) => {
  const host = (req.hostname || "").toLowerCase();
  if (allowedHosts.size && !allowedHosts.has(host)) {
    const requestId = String(res.getHeader("x-request-id") || "");
    return res.status(400).json(errorBody("HOST_NOT_ALLOWED", "Host not allowed", requestId));
  }
  next();
});

const mcpLimiter = rateLimit({
  windowMs: env.MCP_RATE_LIMIT_WINDOW_MS,
  limit: env.MCP_RATE_LIMIT_MAX,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many requests" } }
});

app.get("/", (_req, res) => {
  res.type("html").send(adminHtml);
});

app.get("/admin/app.css", (_req, res) => {
  res.type("css").send(adminCss);
});

app.get("/admin/app.js", (_req, res) => {
  res.type("application/javascript").send(adminJs);
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "naxas-mcp-server" });
});

app.get("/ready", (_req, res) => {
  res.json({ ok: true, configuredProjects: listProjectIds().length });
});

app.get("/admin/status", mcpLimiter, async (req, res) => {
  const requestId = String(res.getHeader("x-request-id") || "");
  const principal = authenticate(getBearerToken(req));
  if (principal?.kind !== "owner") {
    return res.status(401).json(errorBody("UNAUTHORIZED", "Unauthorized", requestId));
  }

  const summaries = listProjectSummaries();
  const projects = await Promise.all(
    summaries.map(async project => {
      const health = await checkProjectReadHealth(project.id);
      return {
        ...project,
        database: {
          ok: health.ok,
          latencyMs: health.latencyMs
        }
      };
    })
  );

  const activity = getRecentAuditEvents(20).map(event => ({
    ts: event.ts,
    requestId: event.requestId,
    actor: event.actor,
    project: event.project,
    tool: event.tool,
    status: event.status,
    rows: event.rows,
    operation: event.operation,
    durationMs: event.durationMs
  }));

  res.setHeader("cache-control", "no-store");
  res.json({
    ok: projects.every(project => project.database.ok),
    version: "0.6.0",
    uptime: formatUptime(process.uptime()),
    mcpEndpoint: "/mcp",
    projects,
    users: access.list(),
    activity
  });
});

const mcpSessions = new Map<string, {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
  principal: Principal;
}>();

const grantsSchema = z.strictObject({
  projects: z.array(z.string()).min(1),
  writeProjects: z.array(z.string()).default([])
});
const createUserSchema = grantsSchema.extend({ id: z.string() });

async function changeAccess(req: express.Request, res: express.Response,
  action: () => unknown) {
  const requestId = String(res.getHeader("x-request-id") || "");
  if (authenticate(getBearerToken(req))?.kind !== "owner") {
    return res.status(401).json(errorBody("UNAUTHORIZED", "Unauthorized", requestId));
  }
  try {
    const result = action();
    // Tool handlers capture a principal on initialization. Close old sessions so
    // every permission edit takes effect on the next MCP connection.
    await Promise.allSettled([...mcpSessions.values()].map(session => session.transport.close()));
    res.setHeader("cache-control", "no-store");
    return res.json({ ok: true, result });
  } catch (error) {
    return res.status(400).json(errorBody("INVALID_ACCESS_CHANGE",
      error instanceof Error ? error.message : "Invalid change", requestId));
  }
}

app.post("/admin/users", mcpLimiter, (req, res) => changeAccess(req, res, () => {
  const data = createUserSchema.parse(req.body);
  return { token: access.create(data.id, data.projects, data.writeProjects) };
}));
app.put("/admin/users/:id", mcpLimiter, (req, res) => changeAccess(req, res, () => {
  const data = grantsSchema.parse(req.body);
  access.update(req.params.id as string, data.projects, data.writeProjects);
}));
app.post("/admin/users/:id/rotate", mcpLimiter, (req, res) => changeAccess(req, res, () => ({
  token: access.rotate(req.params.id as string)
})));
app.delete("/admin/users/:id", mcpLimiter, (req, res) => changeAccess(req, res, () => {
  access.remove(req.params.id as string);
}));

async function handleMcpRequest(req: express.Request, res: express.Response) {
  const requestId = String(res.getHeader("x-request-id") || "");

  const principal = authenticate(getBearerToken(req));
  if (!principal) {
    return res.status(401).json(errorBody("UNAUTHORIZED", "Unauthorized", requestId));
  }

  const sessionId = req.header("mcp-session-id") || undefined;
  const existing = sessionId ? mcpSessions.get(sessionId) : undefined;

  if (existing) {
    if (!samePrincipal(principal, existing.principal)) {
      return res.status(404).json({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Session not found" },
        id: null
      });
    }
    try {
      await existing.transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error(JSON.stringify({
        type: "mcp_http_error",
        requestId,
        sessionId,
        message: error instanceof Error ? error.message : "Unknown error"
      }));

      if (!res.headersSent) {
        res.status(500).json(errorBody("MCP_REQUEST_FAILED", "MCP request failed", requestId));
      }
    }
    return;
  }

  if (sessionId) {
    return res.status(404).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Session not found" },
      id: null
    });
  }

  if (req.method !== "POST" || !isInitializeRequest(req.body)) {
    return res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Bad Request: Session ID required" },
      id: null
    });
  }

  const server = new McpServer({ name: "naxas-mcp-server", version: "0.6.0" });
  registerTools(server, principal);

  let transport: StreamableHTTPServerTransport;
  transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: initializedSessionId => {
      mcpSessions.set(initializedSessionId, { transport, server, principal });
    }
  });

  transport.onclose = () => {
    if (transport.sessionId) {
      mcpSessions.delete(transport.sessionId);
    }
    void server.close();
  };

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error(JSON.stringify({
      type: "mcp_http_error",
      requestId,
      message: error instanceof Error ? error.message : "Unknown error"
    }));

    if (!res.headersSent) {
      res.status(500).json(errorBody("MCP_REQUEST_FAILED", "MCP request failed", requestId));
    }
  }
}

app.post("/mcp", mcpLimiter, handleMcpRequest);
app.get("/mcp", mcpLimiter, handleMcpRequest);
app.delete("/mcp", mcpLimiter, handleMcpRequest);

app.use((_req, res) => {
  const requestId = String(res.getHeader("x-request-id") || "");
  res.status(404).json(errorBody("NOT_FOUND", "Route not found", requestId));
});

app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`Naxas MCP server listening on :${env.PORT}`);
});
