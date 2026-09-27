import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { env, allowedHosts } from "./config.js";
import { registerTools } from "./tools.js";
import { runWithRequestContext } from "./context.js";
import { listProjectIds, listProjectSummaries } from "./projects.js";
import { checkProjectReadHealth } from "./db.js";
import { getRecentAuditEvents } from "./audit.js";
import { adminCss, adminHtml, adminJs } from "./admin-ui.js";

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

function errorBody(code: string, message: string, requestId: string) {
  return { error: { code, message, requestId } };
}

function getBearerToken(req: express.Request) {
  const auth = req.header("authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
}

function isAuthorized(req: express.Request) {
  const token = getBearerToken(req);
  return Boolean(token) && safeEqual(token, env.MCP_BEARER_TOKEN);
}

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
  if (!isAuthorized(req)) {
    return res.status(401).json(errorBody("UNAUTHORIZED", "Unauthorized", requestId));
  }

  const summaries = listProjectSummaries();
  const projects = await Promise.all(
    summaries.map(async project => ({
      ...project,
      database: await checkProjectReadHealth(project.id)
    }))
  );

  res.json({
    ok: projects.every(project => project.database.ok),
    version: "0.4.0",
    uptime: formatUptime(process.uptime()),
    mcpEndpoint: "/mcp",
    projects,
    activity: getRecentAuditEvents(20)
  });
});

app.post("/mcp", mcpLimiter, async (req, res) => {
  const requestId = String(res.getHeader("x-request-id") || "");

  if (!isAuthorized(req)) {
    return res.status(401).json(errorBody("UNAUTHORIZED", "Unauthorized", requestId));
  }

  const server = new McpServer({ name: "naxas-mcp-server", version: "0.4.0" });
  registerTools(server);

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID()
  });

  res.on("close", () => {
    void transport.close();
    void server.close();
  });

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
});

app.use((_req, res) => {
  const requestId = String(res.getHeader("x-request-id") || "");
  res.status(404).json(errorBody("NOT_FOUND", "Route not found", requestId));
});

app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`Naxas MCP server listening on :${env.PORT}`);
});
