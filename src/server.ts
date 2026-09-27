import express from "express";
import helmet from "helmet";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { env, allowedHosts } from "./config.js";
import { registerTools } from "./tools.js";

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true, service: "naxas-mcp-server" }));

app.use((req, res, next) => {
  const host = (req.hostname || "").toLowerCase();
  if (allowedHosts.size && !allowedHosts.has(host)) return res.status(400).json({ error: "Host not allowed" });
  next();
});

app.post("/mcp", async (req, res) => {
  const auth = req.header("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || !safeEqual(token, env.MCP_BEARER_TOKEN)) return res.status(401).json({ error: "Unauthorized" });

  const server = new McpServer({ name: "naxas-mcp-server", version: "0.1.0" });
  registerTools(server);

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID()
  });

  res.on("close", () => {
    void transport.close();
    void server.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`Naxas MCP server listening on :${env.PORT}`);
});
