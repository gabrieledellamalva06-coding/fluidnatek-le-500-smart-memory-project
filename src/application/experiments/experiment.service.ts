import type {
  Experiment as UiExperiment,
} from "../../types";

import type {
  ExperimentalSetup,
} from "../../core/types/setup";

import { CollectionPaths } from "../../config/collectionPaths";
import { experimentRepository } from "../../repositories/experiment.repository";
import { formulationRepository } from "../../repositories/formulation.repository";
import { projectRepository } from "../../repositories/project.repository";
import { processRecordRepository } from "../../repositories/processRecord.repository";
import { setupRepository } from "../../repositories/setup.repository";
import {
  firestoreService,
  type FirestoreBatchOperation,
} from "../../services/firestore.service";

import {
  createCanonicalExperiment,
  createExperimentalSetup,
  isEquivalentSetup,
  mapCanonicalExperimentToUi,
} from "./experiment.mapper";

import type {
  CreateExperimentInput,
} from "./experiment.mapper";

export interface ExperimentService {
  getExperiments(): Promise<
    UiExperiment[]
  >;

  createExperiment(
    input: CreateExperimentInput
  ): Promise<UiExperiment>;
}

class FirestoreExperimentService
  implements ExperimentService
{
  async getExperiments(): Promise<
    UiExperiment[]
  > {
    const [
      experiments,
      setups,
      processRecords,
    ] = await Promise.all([
      experimentRepository.getAll(),
      setupRepository.getAll(),
      processRecordRepository.getAll(),
    ]);

    const setupsById = new Map(
      setups.map((setup) => [
        setup.id,
        setup,
      ])
    );

    const processRecordsById = new Map(
      processRecords.map(
        (processRecord) => [
          processRecord.id,
          processRecord,
        ]
      )
    );

    return experiments
      .map((experiment) =>
        mapCanonicalExperimentToUi(
          experiment,
          {
            setupsById,
            processRecordsById,
          }
        )
      )
      .sort((first, second) =>
        second.ingestedAt.localeCompare(
          first.ingestedAt
        )
      );
  }

  async createExperiment(
    input: CreateExperimentInput
  ): Promise<UiExperiment> {
    validateInput(input);

    const formulation =
      await formulationRepository.getById(
        input.formulationId.trim()
      );

    if (!formulation) {
      throw new Error(
        `Formulation "${input.formulationId}" does not exist in Firestore.`
      );
    }

    const project =
      await projectRepository.getById(
        formulation.projectId
      );

    if (!project) {
      throw new Error(
        `Project "${formulation.projectId}" associated with the formulation does not exist in Firestore.`
      );
    }

    const timestamp =
      new Date().toISOString();

    const setupResolution =
      await resolveSetup(
        input,
        formulation.projectId,
        timestamp
      );

    const creation =
      createCanonicalExperiment(
        input,
        formulation.projectId,
        setupResolution.setup,
        timestamp
      );

    const operations: FirestoreBatchOperation[] =
      [];

    if (setupResolution.wasCreated) {
      operations.push({
        type: "set",
        path: CollectionPaths.setups(),
        id: creation.setup.id,
        data: withoutId(creation.setup),
      });
    }

    operations.push(
      {
        type: "set",
        path:
          CollectionPaths.processRecords(),
        id: creation.processRecord.id,
        data: withoutId(
          creation.processRecord
        ),
      },
      {
        type: "set",
        path:
          CollectionPaths.experiments(),
        id: creation.experiment.id,
        data: withoutId(
          creation.experiment
        ),
      }
    );

    await firestoreService.executeBatch(
      operations
    );

    return mapCanonicalExperimentToUi(
      creation.experiment,
      {
        setupsById: new Map([
          [
            creation.setup.id,
            creation.setup,
          ],
        ]),

        processRecordsById: new Map([
          [
            creation.processRecord.id,
            creation.processRecord,
          ],
        ]),
      }
    );
  }
}

interface SetupResolution {
  setup: ExperimentalSetup;
  wasCreated: boolean;
}

async function resolveSetup(
  input: CreateExperimentInput,
  projectId: string,
  timestamp: string
): Promise<SetupResolution> {
  const existingSetups =
    await setupRepository.getAll();

  const equivalentSetup =
    existingSetups.find((setup) =>
      isEquivalentSetup(
        setup,
        input,
        projectId
      )
    );

  if (equivalentSetup) {
    return {
      setup: equivalentSetup,
      wasCreated: false,
    };
  }

  return {
    setup: createExperimentalSetup(
      input,
      projectId,
      timestamp
    ),
    wasCreated: true,
  };
}

function validateInput(
  input: CreateExperimentInput
): void {
  if (!input.formulationId.trim()) {
    throw new Error(
      "A formulation is required."
    );
  }

  if (!input.operationIdentifier.trim()) {
    throw new Error(
      "An operation identifier is required."
    );
  }

  if (!input.machineModel.trim()) {
    throw new Error(
      "A machine model is required."
    );
  }

  if (!input.injectorType.trim()) {
    throw new Error(
      "An injector type is required."
    );
  }

  if (!input.collectorType.trim()) {
    throw new Error(
      "A collector type is required."
    );
  }

  if (
    !Number.isFinite(input.voltageKv) ||
    input.voltageKv < 0
  ) {
    throw new Error(
      "Voltage must be a valid non-negative number."
    );
  }

  if (
    !Number.isFinite(input.flowRateMlH) ||
    input.flowRateMlH < 0
  ) {
    throw new Error(
      "Flow rate must be a valid non-negative number."
    );
  }

  if (
    !Number.isFinite(input.distanceMm) ||
    input.distanceMm <= 0
  ) {
    throw new Error(
      "Distance must be a valid positive number."
    );
  }

  if (
    input.jetStabilityGrade < 1 ||
    input.jetStabilityGrade > 4
  ) {
    throw new Error(
      "Processability grade must be between 1 and 4."
    );
  }
}

function withoutId<
  TEntity extends { id: string }
>(
  entity: TEntity
): Omit<TEntity, "id"> {
  const {
    id: _id,
    ...entityData
  } = entity;

  return entityData;
}

export const experimentService: ExperimentService =
  new FirestoreExperimentService();

