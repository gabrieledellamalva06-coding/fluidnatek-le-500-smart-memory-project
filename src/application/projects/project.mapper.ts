import type { Project as CanonicalProject } from "../../core/types/project";
import type { Project as UiProject } from "../../types";

/**
 * Converte il modello canonico Firestore nel modello attualmente
 * utilizzato dai componenti React.
 *
 * Questo mapper consente una migrazione progressiva della UI senza
 * duplicare la logica di conversione nei componenti.
 */
export function mapCanonicalProjectToUi(
  project: CanonicalProject
): UiProject {
  return {
    id: project.id,
    name: project.name,
    description: project.description ?? "",
    createdAt: project.createdAt,
  };
}

/**
 * Crea un nuovo progetto canonico partendo dai dati richiesti
 * dall'interfaccia legacy.
 */
export function mapNewUiProjectToCanonical(
  project: Omit<UiProject, "id" | "createdAt">
): CanonicalProject {
  const now = new Date().toISOString();

  return {
    id: createProjectId(),
    name: project.name.trim(),
    description: project.description.trim(),
    status: "active",
    materialIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

function createProjectId(): string {
  return `PRJ_${crypto.randomUUID()}`;
}