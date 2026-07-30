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

  createFormulation(
    formulation: Omit<UiFormulation, "id">
  ): Promise<UiFormulation>;
}

class FirestoreFormulationService
  implements FormulationService
{
  async getFormulations(): Promise<
    UiFormulation[]
  > {
    const [
      formulations,
      materials,
      characterizations,
    ] = await Promise.all([
      formulationRepository.getAll(),
      materialRepository.getAll(),
      solutionCharacterizationRepository.getAll(),
    ]);

    const materialsById = new Map(
      materials.map((material) => [
        material.id,
        material,
      ])
    );

    const characterizationsById =
      new Map(
        characterizations.map(
          (characterization) => [
            characterization.id,
            characterization,
          ]
        )
      );

    const characterizationsByFormulationId =
      new Map(
        characterizations.map(
          (characterization) => [
            characterization.formulationId,
            characterization,
          ]
        )
      );

    return formulations
      .map((formulation) =>
        mapCanonicalFormulationToUi(
          formulation,
          {
            materialsById,
            characterizationsById,
            characterizationsByFormulationId,
          }
        )
      )
      .sort((first, second) =>
        first.polymerName.localeCompare(
          second.polymerName
        )
      );
  }

  async createFormulation(
    input: Omit<UiFormulation, "id">
  ): Promise<UiFormulation> {
    await validateProject(input.projectId);

    const existingMaterials =
      await materialRepository.getAll();

    const creation =
      createCanonicalFormulation(
        input,
        existingMaterials
      );

    const existingMaterialIds =
      new Set(
        existingMaterials.map(
          (material) => material.id
        )
      );

    const materialsToCreate =
      creation.materials.filter(
        (material) =>
          !existingMaterialIds.has(
            material.id
          )
      );

    for (
      const material of materialsToCreate
    ) {
      await materialRepository.save(
        material
      );
    }

    try {
      await formulationRepository.save(
        creation.formulation
      );

      await solutionCharacterizationRepository.save(
        creation.characterization
      );
    } catch (error: unknown) {
      await rollbackFormulation(
        creation.formulation.id,
        creation.characterization.id
      );

      throw error;
    }

    const materialsById = new Map(
      creation.materials.map(
        (material) => [
          material.id,
          material,
        ]
      )
    );

    const characterizationsById =
      new Map([
        [
          creation.characterization.id,
          creation.characterization,
        ],
      ]);

    const characterizationsByFormulationId =
      new Map([
        [
          creation.characterization
            .formulationId,
          creation.characterization,
        ],
      ]);

    return mapCanonicalFormulationToUi(
      creation.formulation,
      {
        materialsById,
        characterizationsById,
        characterizationsByFormulationId,
      }
    );
  }
}

async function validateProject(
  projectId: string
): Promise<void> {
  const normalizedProjectId =
    projectId.trim();

  if (!normalizedProjectId) {
    throw new Error(
      "A valid project is required to create a formulation."
    );
  }

  const project =
    await projectRepository.getById(
      normalizedProjectId
    );

  if (!project) {
    throw new Error(
      `Project "${normalizedProjectId}" does not exist in Firestore.`
    );
  }
}

async function rollbackFormulation(
  formulationId: string,
  characterizationId: string
): Promise<void> {
  const rollbackOperations = [
    formulationRepository.delete(
      formulationId
    ),

    solutionCharacterizationRepository.delete(
      characterizationId
    ),
  ];

  await Promise.allSettled(
    rollbackOperations
  );
}

export const formulationService: FormulationService =
  new FirestoreFormulationService();