import type {
  Experiment as UiExperiment,
} from "../../types";

import type {
  ExperimentalSetup,
} from "../../core/types/setup";
import type { Experiment as CanonicalExperiment } from "../../core/types/experiment";

import { CollectionPaths } from "../../config/collectionPaths";
import { experimentRepository } from "../../repositories/experiment.repository";
import { formulationRepository } from "../../repositories/formulation.repository";
import { projectRepository } from "../../repositories/project.repository";
import { processRecordRepository } from "../../repositories/processRecord.repository";
import { setupRepository } from "../../repositories/setup.repository";
import {
  localPersistenceService,
} from "../../services/local.persistence.service";
import { firestoreService, type FirestoreBatchOperation } from "../../services/firestore.service";

import {
  createCanonicalExperiment,
  createExperimentalSetup,
  isEquivalentSetup,
  mapCanonicalExperimentToUi,
} from "./experiment.mapper";
import {
  createPlannedVariation,
  isDuplicateRunName,
  variationChanges,
  normalizeVariationAudit,
  VARIATION_SERVER_TIMESTAMP_FIELDS,
  type VariationValues,
} from "../../features/clone-variation/cloneVariation";

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

  cloneExperiment(id: string, input: CloneExperimentInput): Promise<UiExperiment>;
}

export interface CloneExperimentInput extends VariationValues {
  cloneRequestId: string;
  sourceProcessRecordId: string;
  operationIdentifier: string;
  variationCreatedBy: string;
  variationReason: string;
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
    await localPersistenceService.executeBatch(operations.map((operation) => operation.type === "set"
      ? { ...operation, data: operation.data }
      : operation));

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

  async cloneExperiment(id: string, input: CloneExperimentInput): Promise<UiExperiment> {
    validateCloneInput(input);
    const audit = normalizeVariationAudit(input.variationCreatedBy, input.variationReason);
    const source = await experimentRepository.getById(id);
    if (!source) throw new Error(`Experiment "${id}" does not exist in Firestore.`);
    const deterministicId = `EXP_CLONE_${input.cloneRequestId}`;
    const existingRetry = await experimentRepository.getById(deterministicId);
    if (existingRetry) {
      if (existingRetry.cloneRequestId !== input.cloneRequestId || existingRetry.clonedFromExperimentId !== source.id) {
        throw new Error("The clone request identifier is already in use.");
      }
      const [retrySetup, ...retryRecords] = await Promise.all([
        setupRepository.getById(existingRetry.setupId),
        ...existingRetry.processRecordIds.map((recordId) => processRecordRepository.getById(recordId)),
      ]);
      return mapCanonicalExperimentToUi(existingRetry, {
        setupsById: new Map(retrySetup ? [[retrySetup.id, retrySetup]] : []),
        processRecordsById: new Map(retryRecords.filter((record): record is NonNullable<typeof record> => record !== null).map((record) => [record.id, record])),
      });
    }
    if (!source.processRecordIds.includes(input.sourceProcessRecordId)) {
      throw new Error("The selected process record does not belong to the source experiment.");
    }
    const processRecord = await processRecordRepository.getById(input.sourceProcessRecordId);
    const setup = source.setupId ? await setupRepository.getById(source.setupId) : null;
    const formulation = await formulationRepository.getById(source.formulationId);
    if (!processRecord || processRecord.experimentId !== source.id || !setup || !formulation) {
      throw new Error("The source experiment is incomplete and cannot be cloned safely.");
    }
    if (formulation.projectId !== source.projectId || setup.projectId !== source.projectId) {
      throw new Error("The source project, formulation, and setup relationships are inconsistent.");
    }
    const allExperiments = await experimentRepository.getAll();
    if (isDuplicateRunName(input.operationIdentifier, allExperiments.map((experiment) => experiment.operationIdentifier))) {
      throw new Error("This run name already exists. Please choose a unique name.");
    }
    const values: VariationValues = {
      voltageKv: input.voltageKv, collectorVoltageKv: input.collectorVoltageKv,
      flowRateMlH: input.flowRateMlH, distanceMm: input.distanceMm,
      drumSpeedRpm: input.drumSpeedRpm, temperatureC: input.temperatureC,
      humidityPct: input.humidityPct,
    };
    if (variationChanges({
      voltageKv: processRecord.parameters.voltageKv,
      collectorVoltageKv: processRecord.parameters.collectorVoltageKv,
      flowRateMlH: processRecord.parameters.flowRateMlH,
      distanceMm: processRecord.parameters.distanceMm,
      drumSpeedRpm: processRecord.parameters.collectorSpeedRpm,
      temperatureC: processRecord.environment?.temperatureC,
      humidityPct: processRecord.environment?.humidityPct,
    }, values).length === 0) {
      throw new Error("Change at least one operating parameter before creating a variation.");
    }
    const creation = createPlannedVariation({ source, sourceProcessRecord: processRecord, operationIdentifier: input.operationIdentifier, cloneRequestId: input.cloneRequestId, values, ...audit, timestamp: new Date().toISOString() });
    const operations: FirestoreBatchOperation[] = [
      { type: "set", path: CollectionPaths.processRecords(), id: creation.processRecord.id, data: withoutId(creation.processRecord), merge: false },
      { type: "set", path: CollectionPaths.experiments(), id: creation.experiment.id, data: withoutId(creation.experiment), merge: false, serverTimestampFields: [...VARIATION_SERVER_TIMESTAMP_FIELDS] },
    ];
    await firestoreService.executeBatch(operations, { useTimeout: false });
    const persistedExperiment = await firestoreService.getDocument<CanonicalExperiment>(CollectionPaths.experiments(), creation.experiment.id);
    const experimentForRead = persistedExperiment ?? creation.experiment;
    await localPersistenceService.executeBatch([
      { type: "set", path: CollectionPaths.processRecords(), id: creation.processRecord.id, data: withoutId(creation.processRecord), merge: false },
      { type: "set", path: CollectionPaths.experiments(), id: experimentForRead.id, data: withoutId(experimentForRead), merge: false },
    ]);
    return mapCanonicalExperimentToUi(experimentForRead, {
      setupsById: new Map([[setup.id, setup]]),
      processRecordsById: new Map([[creation.processRecord.id, creation.processRecord]]),
    });
  }
}

function validateCloneInput(input: CloneExperimentInput): void {
  if (!input.cloneRequestId.trim() || !/^[A-Za-z0-9_-]+$/.test(input.cloneRequestId)) throw new Error("A valid clone request identifier is required.");
  if (!input.sourceProcessRecordId.trim()) throw new Error("Select a source process record.");
  if (!input.operationIdentifier.trim()) throw new Error("A run name is required.");
  const numbers = [input.voltageKv, input.collectorVoltageKv, input.flowRateMlH, input.distanceMm, input.drumSpeedRpm, input.temperatureC, input.humidityPct];
  if (numbers.some((value) => value !== undefined && !Number.isFinite(value))) throw new Error("All entered operating parameters must be finite numbers.");
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

