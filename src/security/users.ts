import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const idSchema = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/);
const userSchema = z.strictObject({
  tokenSha256: z.string().regex(/^[a-fA-F0-9]{64}$/),
  projects: z.array(z.union([idSchema, z.literal("*")])),
  writeEnabled: z.boolean().default(false),
  writeProjects: z.array(idSchema).optional()
});
const usersSchema = z.record(idSchema, userSchema);
export type UserRecord = z.input<typeof userSchema>;
export const userIdSchema = idSchema;

export interface Principal {
  id: string;
  kind: "owner" | "user";
  projects: ReadonlySet<string>;
  writeEnabled: boolean;
  writeProjects?: ReadonlySet<string>;
}

export function tokenSha256(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createAuthenticator(
  ownerToken: string,
  availableProjects: readonly string[],
  usersJson = "{}"
) {
  let raw: unknown;
  try {
    raw = JSON.parse(usersJson);
  } catch {
    throw new Error("MCP_USERS_JSON must be valid JSON");
  }

  const users = usersSchema.parse(raw);
  const available = new Set(availableProjects);
  const ownerHash = Buffer.from(tokenSha256(ownerToken), "hex");
  const owner: Principal = {
    id: "owner",
    kind: "owner",
    projects: available,
    writeEnabled: true
  };
  const entries: { hash: Buffer; principal: Principal }[] = [];
  const seenHashes = new Set([ownerHash.toString("hex")]);

  for (const [id, value] of Object.entries(users)) {
    const allProjects = value.projects.length === 1 && value.projects[0] === "*";
    if (value.projects.includes("*") && !allProjects) {
      throw new Error(`MCP_USERS_JSON user "${id}" must use wildcard alone`);
    }
    if (!allProjects && value.projects.some(project => !available.has(project))) {
      throw new Error(`MCP_USERS_JSON user "${id}" references an unknown project`);
    }
    if (new Set(value.projects).size !== value.projects.length) {
      throw new Error(`MCP_USERS_JSON user "${id}" repeats a project`);
    }
    if (value.writeProjects && (new Set(value.writeProjects).size !== value.writeProjects.length ||
      value.writeProjects.some(project => !available.has(project) || (!allProjects && !value.projects.includes(project))))) {
      throw new Error(`MCP_USERS_JSON user "${id}" has invalid write projects`);
    }
    const hash = value.tokenSha256.toLowerCase();
    if (seenHashes.has(hash)) {
      throw new Error("MCP_USERS_JSON contains a duplicate bearer token hash");
    }
    seenHashes.add(hash);
    entries.push({
      hash: Buffer.from(hash, "hex"),
      principal: {
        id,
        kind: "user",
        projects: new Set(allProjects ? available : value.projects),
        writeEnabled: value.writeEnabled || Boolean(value.writeProjects?.length),
        writeProjects: value.writeProjects ? new Set(value.writeProjects) : undefined
      }
    });
  }

  return (token: string): Principal | undefined => {
    if (!token) return undefined;
    const provided = Buffer.from(tokenSha256(token), "hex");
    const ownerMatches = timingSafeEqual(provided, ownerHash);
    let userMatch: Principal | undefined;
    for (const entry of entries) {
      if (timingSafeEqual(provided, entry.hash)) userMatch = entry.principal;
    }
    return ownerMatches ? owner : userMatch;
  };
}

export function assertProjectAccess(principal: Principal, project: string) {
  if (!principal.projects.has(project)) {
    throw new Error("Unknown or unauthorized project");
  }
}

export function assertWriteAccess(principal: Principal, project?: string) {
  if (!principal.writeEnabled || (project && principal.writeProjects && !principal.writeProjects.has(project))) {
    throw new Error("Write operations are disabled for this user");
  }
}

export function samePrincipal(a: Principal, b: Principal) {
  return a.kind === b.kind && a.id === b.id;
}

export function actorId(principal: Principal) {
  return `${principal.kind}:${principal.id}`;
}
