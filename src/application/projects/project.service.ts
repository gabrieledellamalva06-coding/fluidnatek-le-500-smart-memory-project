import type { Project as CanonicalProject } from "../../core/types/project";
import type { Project as UiProject } from "../../types";
import { projectRepository } from "../../repositories/project.repository";

import {
  mapCanonicalProjectToUi,
  mapNewUiProjectToCanonical,
} from "./project.mapper";

export interface ProjectService {
  getProjects(): Promise<UiProject[]>;

  createProject(
    project: Omit<UiProject, "id" | "createdAt">
  ): Promise<UiProject>;

  deleteProject(projectId: string): Promise<void>;
}

class FirestoreProjectService implements ProjectService {
  async getProjects(): Promise<UiProject[]> {
  const projects = await projectRepository.getAll();

 

  return projects
    .map(mapCanonicalProjectToUi)
    .filter((project) => project.status === "active" && !isHiddenProjectName(project.name))
    .sort(compareProjectsByCreationDate);
}

  async createProject(
    project: Omit<UiProject, "id" | "createdAt">
  ): Promise<UiProject> {
    const canonicalProject =
      mapNewUiProjectToCanonical(project);

    await projectRepository.save(canonicalProject);

    return mapCanonicalProjectToUi(canonicalProject);
  }

  async deleteProject(
    projectId: string
  ): Promise<void> {
    const normalizedProjectId = projectId.trim();

    if (!normalizedProjectId) {
      throw new Error(
        "Cannot delete a project without a valid identifier."
      );
    }

    await projectRepository.delete(normalizedProjectId);
  }
}

function compareProjectsByCreationDate(
  first: UiProject,
  second: UiProject
): number {
  return (
    parseDateTimestamp(second.createdAt) -
    parseDateTimestamp(first.createdAt)
  );
}

function parseDateTimestamp(value: string): number {
  const timestamp = Date.parse(value);

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export const projectService: ProjectService =
  new FirestoreProjectService();

export type { CanonicalProject };

/** Presentation quarantine for confirmed demo/test projects. Documents stay in Firestore. */
const HIDDEN_PROJECT_NAMES = new Set([
  "lars",
  "lars-001",
  "antonio",
  "gabriele",
  "dilara",
  "santiago",
  "rus",
  "suma",
  "app-firestore-test",
  "ffqegq",
  "ftk-example",
  "test recommendation engine descrizione dataset tecnico temporaneo per verifica applicativa",
]);

function normalizeProjectName(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ");
}

function isHiddenProjectName(value: string): boolean {
  const normalized = normalizeProjectName(value);
  return HIDDEN_PROJECT_NAMES.has(normalized) ||
    normalized.includes("app firestore test") ||
    normalized.includes("lars 001") ||
    (normalized.startsWith("test recommendation engine") && normalized.includes("dataset tecnico temporaneo"));
}
