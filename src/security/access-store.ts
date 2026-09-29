import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";
import { createAuthenticator, tokenSha256, userIdSchema } from "./users.js";
export interface ProjectPolicy {
  name?: string;
  readEnabled: boolean;
  writeEnabled: boolean;
  allowDelete: boolean;
  maxWriteRows: number;
}
interface ProjectPolicyTarget {
  get(id: string): ProjectPolicy;
  update(id: string, policy: ProjectPolicy): void;
}

const grantSchema = z.strictObject({
  tokenSha256: z.string().regex(/^[a-fA-F0-9]{64}$/),
  projects: z.array(z.union([userIdSchema, z.literal("*")])).min(1),
  writeEnabled: z.boolean().optional(),
  writeProjects: z.array(userIdSchema).optional()
});
const registrySchema = z.record(userIdSchema, grantSchema);
const policySchema = z.strictObject({
  name: z.string().min(1).max(100).optional(),
  readEnabled: z.boolean(),
  writeEnabled: z.boolean(),
  allowDelete: z.boolean(),
  maxWriteRows: z.number().int().positive().max(10000)
});
const stateSchema = z.strictObject({
  schemaVersion: z.literal(2),
  users: registrySchema,
  projectPolicies: z.record(userIdSchema, policySchema)
});
export type ManagedUsers = z.infer<typeof registrySchema>;

export class AccessStore {
  private users: ManagedUsers;
  private policies: Record<string, ProjectPolicy>;
  private authenticateFn: ReturnType<typeof createAuthenticator>;

  constructor(private readonly ownerToken: string, private readonly projects: string[],
    private readonly path: string, usersJson = "{}", private readonly policyTarget?: ProjectPolicyTarget) {
    const source = path && existsSync(path) ? readFileSync(path, "utf8") : usersJson;
    const parsed = JSON.parse(source) as unknown;
    // Import existing env users once. The file becomes authoritative after the first edit.
    if (parsed && typeof parsed === "object" && "schemaVersion" in parsed) {
      const state = stateSchema.parse(parsed);
      this.users = state.users;
      this.policies = state.projectPolicies;
    } else {
      this.users = registrySchema.parse(parsed);
      this.policies = {};
    }
    for (const [id, policy] of Object.entries(this.policies)) this.policyTarget?.update(id, policy);
    this.authenticateFn = createAuthenticator(ownerToken, projects, JSON.stringify(this.users));
  }

  authenticate(token: string) { return this.authenticateFn(token); }

  list() {
    return Object.entries(this.users).map(([id, user]) => ({
      id, projects: user.projects[0] === "*" ? this.projects : user.projects,
      writeProjects: user.writeProjects ?? (user.writeEnabled ? (user.projects[0] === "*" ? this.projects : user.projects) : [])
    }));
  }

  private save(next: ManagedUsers, policies = this.policies) {
    if (!this.path) throw new Error("MCP_ACCESS_FILE is required for dashboard edits");
    const authenticate = createAuthenticator(this.ownerToken, this.projects, JSON.stringify(next));
    mkdirSync(dirname(this.path), { recursive: true, mode: 0o700 });
    const temporary = `${this.path}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
    writeFileSync(temporary, JSON.stringify({ schemaVersion: 2, users: next, projectPolicies: policies }, null, 2), { mode: 0o600, flag: "wx" });
    renameSync(temporary, this.path);
    this.users = next;
    this.policies = policies;
    this.authenticateFn = authenticate;
  }

  setProjectPolicy(id: string, policy: ProjectPolicy) {
    if (!this.policyTarget) throw new Error("Project policy management is unavailable");
    const old = this.policyTarget.get(id);
    this.policyTarget.update(id, policy);
    try {
      this.save(this.users, { ...this.policies, [id]: policy });
    } catch (error) {
      this.policyTarget.update(id, old);
      throw error;
    }
  }

  create(id: string, projects: string[], writeProjects: string[]) {
    if (!userIdSchema.safeParse(id).success || id === "owner" || this.users[id]) throw new Error("Invalid or duplicate user ID");
    const token = randomBytes(32).toString("base64url");
    this.save({ ...this.users, [id]: { tokenSha256: tokenSha256(token), projects, writeProjects } });
    return token;
  }

  update(id: string, projects: string[], writeProjects: string[]) {
    const old = this.users[id];
    if (!old) throw new Error("Unknown user");
    this.save({ ...this.users, [id]: { tokenSha256: old.tokenSha256, projects, writeProjects } });
  }

  rotate(id: string) {
    const old = this.users[id];
    if (!old) throw new Error("Unknown user");
    const token = randomBytes(32).toString("base64url");
    this.save({ ...this.users, [id]: { ...old, tokenSha256: tokenSha256(token) } });
    return token;
  }

  remove(id: string) {
    if (!this.users[id]) throw new Error("Unknown user");
    const next = { ...this.users };
    delete next[id];
    this.save(next);
  }
}
