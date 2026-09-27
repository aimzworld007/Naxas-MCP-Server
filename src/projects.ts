import { env } from "./config.js";

export type ProjectId = "naxas";

export interface ProjectConfig {
  id: ProjectId;
  readUrl: string;
  writeUrl: string;
}

const projects: Record<ProjectId, ProjectConfig> = {
  naxas: {
    id: "naxas",
    readUrl: env.NAXAS_DB_READ_URL,
    writeUrl: env.NAXAS_DB_WRITE_URL
  }
};

export function getProject(id: string): ProjectConfig {
  const project = projects[id as ProjectId];
  if (!project) throw new Error("Unknown or unauthorized project");
  return project;
}
