import type {
  Experiment as CanonicalExperiment,
  ExperimentStatus,
} from "../../core/types/experiment";

import type {
  ExperimentalSetup,
} from "../../core/types/setup";

import type {
  ProcessRecord,
  ProcessabilityGrade,
} from "../../core/types/processRecord";

import type {
  DataQualityInfo,
} from "../../core/types/dataQuality";

import type {
  Experiment as UiExperiment,
  TelemetryRecord,
} from "../../types";

export interface CreateExperimentInput {
  formulationId: string;

  operationIdentifier: string;

  machineModel: string;

  injectorType: string;

  collectorType: string;

  voltageKv: number;

  collectorVoltageKv?: number;

  flowRateMlH: number;

  distanceMm: number;

  drumSpeedRpm?: number;

  jetStabilityGrade: ProcessabilityGrade;

  operatorComments: string;

  sourceFile: string;

  temperatureC?: number;

  humidityPct?: number;
}

export interface CanonicalExperimentCreation {
  experiment: CanonicalExperiment;

  setup: ExperimentalSetup;

  processRecord: ProcessRecord;
}

export interface ExperimentReadContext {
  setupsById: ReadonlyMap<
    string,
    ExperimentalSetup
  >;

  processRecordsById: ReadonlyMap<
    string,
    ProcessRecord
  >;
}

export function createCanonicalExperiment(
  input: CreateExperimentInput,
  projectId: string,
  setup: ExperimentalSetup,
  timestamp: string
): CanonicalExperimentCreation {
  const experimentId = createEntityId("EXP");
  const processRecordId =
    createEntityId("PROC");

  const processRecord: ProcessRecord = {
    id: processRecordId,
    experimentId,
    sequence: 0,
    timestampSec: 0,

    parameters: {
      voltageKv: input.voltageKv,
      collectorVoltageKv: input.collectorVoltageKv,
      flowRateMlH: input.flowRateMlH,
      distanceMm: input.distanceMm,
      collectorSpeedRpm: input.drumSpeedRpm,
    },

    environment:
      input.temperatureC !== undefined ||
      input.humidityPct !== undefined
        ? {
            temperatureC:
              input.temperatureC,
            humidityPct:
              input.humidityPct,
          }
        : undefined,

    evaluation: {
      jetStabilityGrade:
        input.jetStabilityGrade,

      isStable:
        input.jetStabilityGrade >= 4,

      operatorComments:
        normalizeOptionalText(
          input.operatorComments
        ),
    },

    createdAt: timestamp,
  };

  const experiment: CanonicalExperiment = {
    id: experimentId,

    projectId,

    formulationId:
      input.formulationId.trim(),

    setupId: setup.id,

    operationIdentifier:
      input.operationIdentifier.trim(),

    status: mapCreationStatus(),

    processRecordIds: [
      processRecordId,
    ],

    materialCharacterizationIds: [],

    startedAt: timestamp,

    notes:
      normalizeOptionalText(
        input.operatorComments
      ),

    createdAt: timestamp,

    updatedAt: timestamp,

    dataQuality:
      createValidDataQuality(),
  };

  return {
    experiment,
    setup,
    processRecord,
  };
}

export function createExperimentalSetup(
  input: CreateExperimentInput,
  projectId: string,
  timestamp: string
): ExperimentalSetup {
  return {
    id: createEntityId("SETUP"),

    projectId,

    name: createSetupName(input),

    machine: {
      model: input.machineModel.trim(),
      manufacturer: "Fluidnatek",
    },

    injector: {
      type: input.injectorType.trim(),

      needleCount:
        resolveNeedleCount(
          input.injectorType
        ),

      emitterCount:
        resolveEmitterCount(
          input.injectorType
        ),
    },

    collector: {
      type: input.collectorType.trim(),
    },

    createdAt: timestamp,

    updatedAt: timestamp,

    dataQuality:
      createValidDataQuality(),
  };
}

export function mapCanonicalExperimentToUi(
  experiment: CanonicalExperiment,
  context: ExperimentReadContext
): UiExperiment {
  const setup =
    context.setupsById.get(
      experiment.setupId
    );

  const processRecords =
    experiment.processRecordIds
      .map((processRecordId) =>
        context.processRecordsById.get(
          processRecordId
        )
      )
      .filter(
        (
          processRecord
        ): processRecord is ProcessRecord =>
          processRecord !== undefined
      )
      .sort(
        (first, second) =>
          first.sequence - second.sequence
      );

  const primaryProcessRecord =
    processRecords[0];

  return {
    id: experiment.id,

    formulationId:
      experiment.formulationId,

    operationIdentifier:
      experiment.operationIdentifier,

    machineModel:
      setup?.machine.model ??
      "Unknown machine",

    injectorType:
      setup?.injector.type ??
      "Unknown injector",

    collectorType:
      setup?.collector.type ??
      "Unknown collector",

    distanceMm:
      primaryProcessRecord
        ?.parameters.distanceMm,

    jetStabilityGrade:
      primaryProcessRecord
        ?.evaluation
        ?.jetStabilityGrade,

    operatorComments:
      primaryProcessRecord
        ?.evaluation
        ?.operatorComments ??
      experiment.notes ??
      "",

    sourceFile:
      resolveSourceFile(experiment),

    ingestedAt:
      experiment.createdAt,

    telemetryData:
      processRecords.map(
        mapProcessRecordToTelemetry
      ),

    metadata: {
      canonicalStatus:
        experiment.status,

      canonicalSetupId:
        experiment.setupId,

      canonicalProjectId:
        experiment.projectId,
    },
  };
}

export function isEquivalentSetup(
  setup: ExperimentalSetup,
  input: CreateExperimentInput,
  projectId: string
): boolean {
  return (
    normalizeValue(
      setup.projectId ?? ""
    ) === normalizeValue(projectId) &&
    normalizeValue(
      setup.machine.model
    ) ===
      normalizeValue(
        input.machineModel
      ) &&
    normalizeValue(
      setup.injector.type
    ) ===
      normalizeValue(
        input.injectorType
      ) &&
    normalizeValue(
      setup.collector.type
    ) ===
      normalizeValue(
        input.collectorType
      )
  );
}

function mapProcessRecordToTelemetry(
  processRecord: ProcessRecord
): TelemetryRecord {
  return {
    id: processRecord.id,

    experimentId:
      processRecord.experimentId,

    timestampSec:
      processRecord.timestampSec ?? 0,

    voltageKv:
      processRecord.parameters
        .voltageKv,

    collectorVoltageKv:
      processRecord.parameters
        .collectorVoltageKv,

    flowRateMlH:
      processRecord.parameters
        .flowRateMlH,

    temperatureC:
      processRecord.environment
        ?.temperatureC,

    humidityPct:
      processRecord.environment
        ?.humidityPct,

    distanceMm:
      processRecord.parameters
        .distanceMm,

    drumSpeedRpm:
      processRecord.parameters
        .collectorSpeedRpm,
  };
}

function createValidDataQuality(): DataQualityInfo {
  return {
    status: "valid",
    warnings: [],
    reviewed: false,
  };
}

function mapCreationStatus(): ExperimentStatus {
  return "running";
}

function resolveSourceFile(
  experiment: CanonicalExperiment
): string {
  const sourceFile =
    experiment.source &&
    "fileName" in experiment.source &&
    typeof experiment.source.fileName ===
      "string"
      ? experiment.source.fileName
      : undefined;

  return sourceFile ?? "Firestore";
}

function createSetupName(
  input: CreateExperimentInput
): string {
  return [
    input.machineModel.trim(),
    input.injectorType.trim(),
    input.collectorType.trim(),
  ].join(" | ");
}

function resolveNeedleCount(
  injectorType: string
): number | undefined {
  const normalized =
    normalizeValue(injectorType);

  if (normalized.includes("x8")) {
    return 8;
  }

  if (
    normalized.includes("single") ||
    normalized.includes("coaxial")
  ) {
    return 1;
  }

  return undefined;
}

function resolveEmitterCount(
  injectorType: string
): number | undefined {
  const normalized =
    normalizeValue(injectorType);

  if (normalized.includes("x4")) {
    return 4;
  }

  if (
    normalized.includes("single") ||
    normalized.includes("coaxial")
  ) {
    return 1;
  }

  return undefined;
}

function normalizeOptionalText(
  value: string
): string | undefined {
  const normalizedValue = value.trim();

  return normalizedValue.length > 0
    ? normalizedValue
    : undefined;
}

function normalizeValue(
  value: string
): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, " ");
}

function createEntityId(
  prefix: string
): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export interface UpdateExperimentInput {
  operationIdentifier?: string;
  voltageKv?: number;
  collectorVoltageKv?: number;
  flowRateMlH?: number;
  distanceMm?: number;
  drumSpeedRpm?: number;
  temperatureC?: number;
  humidityPct?: number;
  jetStabilityGrade?: ProcessabilityGrade;
  operatorComments?: string;
}
