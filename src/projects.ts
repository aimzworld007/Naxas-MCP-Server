import { z } from "zod";
import { env } from "./config.js";

const projectId = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/);
const projectValue = z.object({
  readUrl: z.string().min(1),
  writeUrl: z.string().min(1).optional()
});
const registrySchema = z.record(projectId, projectValue);

export interface ProjectConfig {
  id: string;
  readUrl: string;
  writeUrl?: string;
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

  return new Map(entries.map(([id, value]) => [id, { id, ...value }]));
}

const projects = loadRegistry();

export function getProject(id: string): ProjectConfig {
  const project = projects.get(id);
  if (!project) throw new Error("Unknown or unauthorized project");
  return project;
}

export function listProjectIds(): string[] {
  return [...projects.keys()].sort();
}
