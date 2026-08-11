import type {
  MaterialCharacterization,
  SolutionCharacterization,
} from "../../core/types/characterization";
import type { Experiment } from "../../core/types/experiment";
import type { Formulation } from "../../core/types/formulation";
import type { Material } from "../../core/types/material";
import type { ProcessRecord } from "../../core/types/processRecord";
import type { Project } from "../../core/types/project";
import type { ExperimentalSetup } from "../../core/types/setup";

import {
  MaterialCharacterizationRepository,
  SolutionCharacterizationRepository,
} from "../../repositories/characterization.repository";
import { ExperimentRepository } from "../../repositories/experiment.repository";
import { FormulationRepository } from "../../repositories/formulation.repository";
import { MaterialRepository } from "../../repositories/material.repository";
import { ProcessRecordRepository } from "../../repositories/processRecord.repository";
import { ProjectRepository } from "../../repositories/project.repository";
import { SetupRepository } from "../../repositories/setup.repository";

import type {
  LegacySectionADataset,
} from "./legacySectionA.types";

import {
  mapLegacyExperiment,
  mapLegacyFormulation,
  mapLegacyMaterial,
  mapLegacyMaterialCharacterization,
  mapLegacyProcessRecord,
  mapLegacyProject,
  mapLegacySetup,
  mapLegacySolutionCharacterization,
} from "./sectionA.mapper";

import {
  validateSectionADataset,
  type SectionAValidationReport,
} from "./sectionA.validator";

export interface SectionAMigrationCounts {
  projects: number;
  materials: number;
  formulations: number;
  setups: number;
  experiments: number;
  processRecords: number;
  solutionCharacterizations: number;
  materialCharacterizations: number;
}

export type SectionAMigrationEntityType =
  keyof SectionAMigrationCounts;

export interface SectionAMigrationFailure {
  entityType: SectionAMigrationEntityType;
  entityId: string;
  message: string;
}

export interface SectionAMigrationPreview {
  validation: SectionAValidationReport;
  mappedCounts: SectionAMigrationCounts;
}

export interface SectionAMigrationResult
  extends SectionAMigrationPreview {
  migrated: boolean;
  writtenCounts: SectionAMigrationCounts;
  failures: SectionAMigrationFailure[];
}

interface PersistableEntity {
  id: string;
}

interface PersistableRepository<
  TEntity extends PersistableEntity
> {
  save(entity: TEntity): Promise<void>;
}

interface SectionAMappedEntities {
  projects: Project[];
  materials: Material[];
  formulations: Formulation[];
  setups: ExperimentalSetup[];
  experiments: Experiment[];
  processRecords: ProcessRecord[];
  solutionCharacterizations: SolutionCharacterization[];
  materialCharacterizations: MaterialCharacterization[];
}

export class SectionAMigrationService {
  preview(
    dataset: LegacySectionADataset
  ): SectionAMigrationPreview {
    const validation =
      validateSectionADataset(dataset);

    return {
      validation,

      mappedCounts: {
        projects:
          dataset.projects.length,

        materials:
          dataset.materials.length,

        formulations:
          dataset.formulations.length,

        setups:
          dataset.setups.length,

        experiments:
          dataset.runs.length,

        processRecords:
          dataset.runs.length,

        solutionCharacterizations:
          dataset.characterizations.length,

        materialCharacterizations:
          dataset.results.length,
      },
    };
  }

  async migrate(
    dataset: LegacySectionADataset,
    companyId?: string
  ): Promise<SectionAMigrationResult> {
    const preview = this.preview(dataset);

    if (!preview.validation.valid) {
      return {
        ...preview,
        migrated: false,
        writtenCounts:
          this.emptyCounts(),
        failures: [],
      };
    }

    const entities =
      this.mapDataset(dataset);

    const writtenCounts =
      this.emptyCounts();

    const failures:
      SectionAMigrationFailure[] = [];

    const projectRepository =
      new ProjectRepository(companyId);

    const materialRepository =
      new MaterialRepository(companyId);

    const formulationRepository =
      new FormulationRepository(companyId);

    const setupRepository =
      new SetupRepository(companyId);

    const experimentRepository =
      new ExperimentRepository(companyId);

    const processRecordRepository =
      new ProcessRecordRepository(companyId);

    const solutionCharacterizationRepository =
      new SolutionCharacterizationRepository(
        companyId
      );

    const materialCharacterizationRepository =
      new MaterialCharacterizationRepository(
        companyId
      );

    // Replace only previous historical catalog records.
    // User-created materials/formulations are preserved.
    await this.removeObsoleteHistoricalCatalog(
      materialRepository,
      formulationRepository,
      entities.materials,
      entities.formulations
    );

    await this.persistEntities(
      "projects",
      entities.projects,
      projectRepository,
      writtenCounts,
      failures
    );

    await this.persistEntities(
      "materials",
      entities.materials,
      materialRepository,
      writtenCounts,
      failures
    );

    await this.persistEntities(
      "formulations",
      entities.formulations,
      formulationRepository,
      writtenCounts,
      failures
    );

    await this.persistEntities(
      "setups",
      entities.setups,
      setupRepository,
      writtenCounts,
      failures
    );

    await this.persistEntities(
      "experiments",
      entities.experiments,
      experimentRepository,
      writtenCounts,
      failures
    );

    await this.persistEntities(
      "processRecords",
      entities.processRecords,
      processRecordRepository,
      writtenCounts,
      failures
    );

    await this.persistEntities(
      "solutionCharacterizations",
      entities.solutionCharacterizations,
      solutionCharacterizationRepository,
      writtenCounts,
      failures
    );

    await this.persistEntities(
      "materialCharacterizations",
      entities.materialCharacterizations,
      materialCharacterizationRepository,
      writtenCounts,
      failures
    );

    return {
      ...preview,

      migrated:
        failures.length === 0,

      writtenCounts,

      failures,
    };
  }

  private mapDataset(
    dataset: LegacySectionADataset
  ): SectionAMappedEntities {
    const resultsByRunId =
      new Map<string, string[]>();

    for (const result of dataset.results) {
      const currentIds =
        resultsByRunId.get(
          result.run_id
        ) ?? [];

      currentIds.push(
        result.result_id
      );

      resultsByRunId.set(
        result.run_id,
        currentIds
      );
    }

    return {
      projects:
        dataset.projects.map(
          mapLegacyProject
        ),

      materials:
        dataset.materials.map(
          mapLegacyMaterial
        ),

      formulations:
        dataset.formulations.map(
          (formulation) =>
            mapLegacyFormulation(
              formulation,
              dataset.formulationComponents
            )
        ),

      setups:
        dataset.setups.map(
          mapLegacySetup
        ),

      experiments:
        dataset.runs.map(
          (run) =>
            mapLegacyExperiment(
              run,
              resultsByRunId.get(
                run.run_id
              ) ?? []
            )
        ),

      processRecords:
        dataset.runs.map(
          mapLegacyProcessRecord
        ),

      solutionCharacterizations:
        dataset.characterizations.map(
          mapLegacySolutionCharacterization
        ),

      materialCharacterizations:
        dataset.results.map(
          mapLegacyMaterialCharacterization
        ),
    };
  }

  private async persistEntities<
    TEntity extends PersistableEntity
  >(
    entityType: SectionAMigrationEntityType,
    entities: readonly TEntity[],
    repository: PersistableRepository<TEntity>,
    writtenCounts: SectionAMigrationCounts,
    failures: SectionAMigrationFailure[]
  ): Promise<void> {
    for (const entity of entities) {
      try {
        await repository.save(entity);

        writtenCounts[entityType] += 1;
      } catch (error: unknown) {
        failures.push({
          entityType,
          entityId: entity.id,
          message:
            this.getErrorMessage(error),
        });
      }
    }
  }

  private getErrorMessage(
    error: unknown
  ): string {
    if (error instanceof Error) {
      return error.message;
    }

    return "Unknown Firestore migration error.";
  }

  private async removeObsoleteHistoricalCatalog(
    materialRepository: MaterialRepository,
    formulationRepository: FormulationRepository,
    targetMaterials: Material[],
    targetFormulations: Formulation[]
  ): Promise<void> {
    const [
      existingMaterials,
      existingFormulations,
    ] = await Promise.all([
      materialRepository.getAll(),
      formulationRepository.getAll(),
    ]);

    const targetMaterialIds =
      new Set(targetMaterials.map((item) => item.id));

    const targetFormulationIds =
      new Set(targetFormulations.map((item) => item.id));

    const obsoleteMaterialIds =
      existingMaterials
        .filter(
          (item) =>
            (item.id.startsWith("MIG_MAT_") ||
              item.id.startsWith("XLS_MAT_")) &&
            !targetMaterialIds.has(item.id)
        )
        .map((item) => item.id);

    const obsoleteFormulationIds =
      existingFormulations
        .filter(
          (item) =>
            (item.id.startsWith("MIG_FORM_") ||
              item.id.startsWith("XLS_FORM_")) &&
            !targetFormulationIds.has(item.id)
        )
        .map((item) => item.id);

    await Promise.all([
      ...obsoleteMaterialIds.map((id) =>
        materialRepository.delete(id)
      ),
      ...obsoleteFormulationIds.map((id) =>
        formulationRepository.delete(id)
      ),
    ]);
  }

  private emptyCounts():
    SectionAMigrationCounts {
    return {
      projects: 0,
      materials: 0,
      formulations: 0,
      setups: 0,
      experiments: 0,
      processRecords: 0,
      solutionCharacterizations: 0,
      materialCharacterizations: 0,
    };
  }
}

export const sectionAMigrationService =
  new SectionAMigrationService();