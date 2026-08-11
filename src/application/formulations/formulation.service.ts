import type { Formulation as UiFormulation } from "../../types";
import { formulationRepository } from "../../repositories/formulation.repository";
import { materialRepository } from "../../repositories/material.repository";
import { projectRepository } from "../../repositories/project.repository";
import { solutionCharacterizationRepository } from "../../repositories/characterization.repository";
import {
  createCanonicalFormulation,
  mapCanonicalFormulationToUi,
} from "./formulation.mapper";

export interface FormulationService {
  getFormulations(): Promise<UiFormulation[]>;
  createFormulation(formulation: Omit<UiFormulation, "id">): Promise<UiFormulation>;
}

class FirestoreFormulationService implements FormulationService {
  async getFormulations(): Promise<UiFormulation[]> {
    const [formulations, materials, characterizations] = await Promise.all([
      formulationRepository.getAll(),
      materialRepository.getAll(),
      solutionCharacterizationRepository.getAll(),
    ]);

    const materialsById = new Map(materials.map((item) => [item.id, item]));
    const characterizationsById = new Map(characterizations.map((item) => [item.id, item]));
    const characterizationsByFormulationId = new Map(
      [...characterizations]
        .sort((a, b) => parseDate(a.measuredAt) - parseDate(b.measuredAt))
        .map((item) => [item.formulationId, item])
    );

    return formulations
      .map((formulation) =>
        mapCanonicalFormulationToUi(formulation, {
          materialsById,
          characterizationsById,
          characterizationsByFormulationId,
        })
      )
      .sort((a, b) => (a.name || a.polymerName).localeCompare(b.name || b.polymerName));
  }

  async createFormulation(input: Omit<UiFormulation, "id">): Promise<UiFormulation> {
    await validateProject(input.projectId);
    const existingMaterials = await materialRepository.getAll();
    const creation = createCanonicalFormulation(input, existingMaterials);

    const existingIds = new Set(existingMaterials.map((item) => item.id));
    for (const material of creation.materials) {
      if (!existingIds.has(material.id)) {
        await materialRepository.save(material);
      }
    }

    await formulationRepository.save(creation.formulation);

    const allMaterials = [...existingMaterials, ...creation.materials];
    const materialsById = new Map(allMaterials.map((item) => [item.id, item]));

    return mapCanonicalFormulationToUi(creation.formulation, {
      materialsById,
      characterizationsById: new Map(),
      characterizationsByFormulationId: new Map(),
    });
  }
}

async function validateProject(projectId: string): Promise<void> {
  const id = projectId.trim();
  if (!id) throw new Error("A valid project is required to create a formulation.");
  const project = await projectRepository.getById(id);
  if (!project) throw new Error(`Project "${id}" does not exist in Firestore.`);
}

function parseDate(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export const formulationService: FormulationService = new FirestoreFormulationService();
