import { z } from "zod";
import { env } from "./config.js";
import { assertProjectAccess, type Principal } from "./security/users.js";

const projectId = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/);
const projectValue = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().min(1).optional(),
  readUrl: z.string().min(1).optional(),
  writeUrl: z.string().min(1).optional(),
  writeEnabled: z.boolean().default(false),
  allowDelete: z.boolean().default(false),
  maxWriteRows: z.number().int().positive().max(10000).optional()
}).refine(value => Boolean(value.url || value.readUrl), "A database URL is required");
const registrySchema = z.record(projectId, projectValue);

export interface ProjectConfig {
  id: string;
  name: string;
  readUrl: string;
  writeUrl: string;
  readEnabled: boolean;
  writeEnabled: boolean;
  allowDelete: boolean;
  maxWriteRows: number;
}

function loadRegistry(): Map<string, ProjectConfig> {
  let raw: unknown;
  try {
    raw = JSON.parse(env.PROJECTS_JSON);
  } catch {
    throw new Error("PROJECTS_JSON must be valid JSON");
  }

  const parsed = registrySchema.parse(raw);
  const entries = Object.entries(parsed);
  if (!entries.length) throw new Error("PROJECTS_JSON must contain at least one project");

  return new Map(entries.map(([id, value]) => [
    id,
    {
      id,
      name: value.name ?? id,
      readUrl: (value.readUrl ?? value.url)!,
      writeUrl: value.writeUrl ?? value.url ?? "",
      readEnabled: true,
      writeEnabled: value.writeEnabled,
      allowDelete: value.allowDelete,
      maxWriteRows: value.maxWriteRows ?? env.DEFAULT_MAX_WRITE_ROWS
    }
  ]));
}

const projects = loadRegistry();

export function getProject(id: string): ProjectConfig {
  const project = projects.get(id);
  if (!project) throw new Error("Unknown or unauthorized project");
  return project;
}

export function getProjectForPrincipal(id: string, principal: Principal): ProjectConfig {
  assertProjectAccess(principal, id);
  const project = getProject(id);
  if (!project.readEnabled) throw new Error("Read operations are disabled for this project");
  return project;
}

export interface ProjectPolicy {
  name?: string;
  readEnabled: boolean;
  writeEnabled: boolean;
  allowDelete: boolean;
  maxWriteRows: number;
}

export function updateProjectPolicy(id: string, policy: ProjectPolicy) {
  const project = getProject(id);
  if (policy.writeEnabled && !policy.readEnabled) throw new Error("Read must be enabled before Write");
  if (policy.writeEnabled && !project.writeUrl) throw new Error("Write connection is not configured");
  if (policy.name !== undefined && (!policy.name.trim() || policy.name.length > 100)) throw new Error("Invalid project name");
  Object.assign(project, policy);
}

export function getProjectPolicy(id: string): ProjectPolicy {
  const { name, readEnabled, writeEnabled, allowDelete, maxWriteRows } = getProject(id);
  return { name, readEnabled, writeEnabled, allowDelete, maxWriteRows };
}

export function listProjectIds(): string[] {
  return [...projects.keys()].sort();
}


export interface ProjectSummary {
  id: string;
  name: string;
  readConfigured: boolean;
  readEnabled: boolean;
  writeConfigured: boolean;
  writeEnabled: boolean;
  allowDelete: boolean;
  maxWriteRows: number;
}

export function listProjectSummaries(): ProjectSummary[] {
  return [...projects.values()]
    .map(project => ({
      id: project.id,
      name: project.name,
      readConfigured: Boolean(project.readUrl),
      readEnabled: project.readEnabled,
      writeConfigured: Boolean(project.writeUrl),
      writeEnabled: project.writeEnabled,
      allowDelete: project.allowDelete,
      maxWriteRows: project.maxWriteRows
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}
