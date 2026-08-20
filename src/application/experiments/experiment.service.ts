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
  localPersistenceService,
} from "../../services/local.persistence.service";
import { firestoreService, type FirestoreBatchOperation } from "../../services/firestore.service";

import {
  createCanonicalExperiment,
  createExperimentalSetup,
  isEquivalentSetup,
  mapCanonicalExperimentToUi,
} from "./experiment.mapper";

import type {
  CreateExperimentInput,
  UpdateExperimentInput,
} from "./experiment.mapper";

export interface ExperimentService {
  getExperiments(): Promise<
    UiExperiment[]
  >;

  createExperiment(
    input: CreateExperimentInput
  ): Promise<UiExperiment>;

  updateExperiment(
    id: string,
    input: UpdateExperimentInput
  ): Promise<UiExperiment>;

  cloneExperiment(id: string, input: CloneExperimentInput): Promise<UiExperiment>;
}

export interface CloneExperimentInput {
  operationIdentifier: string;
  voltageKv?: number;
  collectorVoltageKv?: number;
  flowRateMlH?: number;
  distanceMm?: number;
  drumSpeedRpm?: number;
  temperatureC?: number;
  humidityPct?: number;
  jetStabilityGrade?: 1 | 2 | 3 | 4;
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

  async updateExperiment(id: string, input: UpdateExperimentInput): Promise<UiExperiment> {
    const experiment = await experimentRepository.getById(id);
    if (!experiment) throw new Error(`Experiment "${id}" does not exist in Firestore.`);
    const processRecordId = experiment.processRecordIds[0];
    const processRecord = processRecordId ? await processRecordRepository.getById(processRecordId) : null;
    if (!processRecord) throw new Error(`Experiment "${id}" has no editable process record.`);
    if (input.operationIdentifier !== undefined && input.operationIdentifier.trim() === "") throw new Error("Run name cannot be empty.");
    const numericValues = [input.voltageKv, input.collectorVoltageKv, input.flowRateMlH, input.distanceMm, input.drumSpeedRpm, input.temperatureC, input.humidityPct].filter((value): value is number => value !== undefined);
    if (numericValues.some((value) => !Number.isFinite(value))) throw new Error("All numeric parameters must be finite numbers.");
    if (input.jetStabilityGrade !== undefined && ![1, 2, 3, 4].includes(input.jetStabilityGrade)) throw new Error("Processability grade must be between 1 and 4.");
    const parameters = {
      ...processRecord.parameters,
      ...(input.voltageKv !== undefined ? { voltageKv: input.voltageKv } : {}),
      ...(input.collectorVoltageKv !== undefined ? { collectorVoltageKv: input.collectorVoltageKv } : {}),
      ...(input.flowRateMlH !== undefined ? { flowRateMlH: input.flowRateMlH } : {}),
      ...(input.distanceMm !== undefined ? { distanceMm: input.distanceMm } : {}),
      ...(input.drumSpeedRpm !== undefined ? { collectorSpeedRpm: input.drumSpeedRpm } : {}),
    };
    const environment = input.temperatureC !== undefined || input.humidityPct !== undefined
      ? { ...processRecord.environment, ...(input.temperatureC !== undefined ? { temperatureC: input.temperatureC } : {}), ...(input.humidityPct !== undefined ? { humidityPct: input.humidityPct } : {}) }
      : processRecord.environment;
    const evaluation = input.jetStabilityGrade !== undefined || input.operatorComments !== undefined
      ? { ...processRecord.evaluation, ...(input.jetStabilityGrade !== undefined ? { jetStabilityGrade: input.jetStabilityGrade, processabilityGrade: input.jetStabilityGrade, isStable: input.jetStabilityGrade >= 4 } : {}), ...(input.operatorComments !== undefined ? { operatorComments: input.operatorComments } : {}) }
      : processRecord.evaluation;
    const experimentPatch = {
      ...(input.operationIdentifier !== undefined ? { operationIdentifier: input.operationIdentifier.trim() } : {}),
      ...(input.operatorComments !== undefined ? { notes: input.operatorComments } : {}),
      updatedAt: new Date().toISOString(),
    };
    await experimentRepository.update(id, experimentPatch);
    await processRecordRepository.update(processRecord.id, { parameters, environment, evaluation });
    const refreshed = await this.getExperiments();
    const updated = refreshed.find((item) => item.id === id);
    if (!updated) throw new Error("Experiment was updated but could not be reloaded.");
    return updated;
  }

  async cloneExperiment(id: string, input: CloneExperimentInput): Promise<UiExperiment> {
    const source = await experimentRepository.getById(id);
    if (!source) throw new Error(`Experiment "${id}" does not exist in Firestore.`);
    const processRecord = source.processRecordIds[0] ? await processRecordRepository.getById(source.processRecordIds[0]) : null;
    const setup = source.setupId ? await setupRepository.getById(source.setupId) : null;
    if (!processRecord || !setup) throw new Error("The source experiment is incomplete and cannot be cloned safely.");
    const evaluation = processRecord.evaluation;
    const voltageKv = input.voltageKv ?? processRecord.parameters.voltageKv;
    const flowRateMlH = input.flowRateMlH ?? processRecord.parameters.flowRateMlH;
    const distanceMm = input.distanceMm ?? processRecord.parameters.distanceMm;
    const jetStabilityGrade = input.jetStabilityGrade ?? evaluation?.jetStabilityGrade;
    if (voltageKv === undefined || flowRateMlH === undefined || distanceMm === undefined || jetStabilityGrade === undefined) {
      throw new Error("The source experiment is missing required process values or processability grade.");
    }
    return this.createExperiment({
      formulationId: source.formulationId,
      operationIdentifier: input.operationIdentifier.trim(),
      machineModel: setup.machine.model,
      injectorType: setup.injector.type,
      collectorType: setup.collector.type,
      voltageKv,
      collectorVoltageKv: input.collectorVoltageKv ?? processRecord.parameters.collectorVoltageKv,
      flowRateMlH,
      distanceMm,
      drumSpeedRpm: input.drumSpeedRpm ?? processRecord.parameters.collectorSpeedRpm,
      jetStabilityGrade,
      operatorComments: `Cloned from ${source.operationIdentifier || source.id}. Original record preserved.`,
      sourceFile: `clone:${source.id}`,
      temperatureC: input.temperatureC ?? processRecord.environment?.temperatureC,
      humidityPct: input.humidityPct ?? processRecord.environment?.humidityPct,
    });
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

