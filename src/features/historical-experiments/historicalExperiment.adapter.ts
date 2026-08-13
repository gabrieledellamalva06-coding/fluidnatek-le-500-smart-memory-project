import type {
  Experiment,
  Formulation,
  Project,
  TelemetryRecord,
} from "../../types";
import type { Material } from "../../core/types/material";

import {
  normalizeDisplayText,
  normalizeMachineModel,
  normalizePolymerName,
  normalizeSearchText,
} from "./historicalExperiment.normalizer";

export type HistoricalProcessabilityGrade = 1 | 2 | 3 | 4;

export interface HistoricalExperimentRecord {
  id: string;
  runIdentifier: string;

  projectId: string;
  projectName: string;

  formulationId: string;
  formulationName: string;

  polymer: string;
  polymerType: string;

  solvent: string;
  solventType: string;

  machine: string;
  grade: HistoricalProcessabilityGrade | null;

  flowRateMlH: number | null;
  positiveVoltageKv: number | null;
  negativeVoltageKv: number | null;
  temperatureC: number | null;
  humidityPct: number | null;
  workingDistanceMm: number | null;
  collectorSpeedRpm: number | null;

  operatorComments: string;
  sourceFile: string;
  ingestedAt: string;

  searchText: string;

  experiment: Experiment;
  formulation: Formulation | null;
  project: Project | null;
}

export interface HistoricalExperimentAdapterInput {
  experiments: readonly Experiment[];
  formulations: readonly Formulation[];
  projects: readonly Project[];
  materials?: readonly Material[];
}

export function adaptHistoricalExperiments({
  experiments,
  formulations,
  projects,
  materials = [],
}: HistoricalExperimentAdapterInput): HistoricalExperimentRecord[] {
  const formulationById = new Map(
    formulations.map((formulation) => [formulation.id, formulation])
  );

  const projectById = new Map(
    projects.map((project) => [project.id, project])
  );
  const materialById = new Map(materials.map((material) => [material.id, material]));

  return experiments.map((experiment) => {
    const formulation =
      formulationById.get(experiment.formulationId) ?? null;

    const projectId = resolveProjectId(experiment, formulation);
    const project = projectById.get(projectId) ?? null;

    return adaptHistoricalExperiment({
      experiment,
      formulation,
      project,
      projectId,
      materialById,
    });
  });
}

interface AdaptHistoricalExperimentInput {
  experiment: Experiment;
  formulation: Formulation | null;
  project: Project | null;
  projectId: string;
  materialById: ReadonlyMap<string, Material>;
}

function adaptHistoricalExperiment({
  experiment,
  formulation,
  project,
  projectId,
  materialById,
}: AdaptHistoricalExperimentInput): HistoricalExperimentRecord {
  const telemetry = selectRepresentativeTelemetry(
    experiment.telemetryData
  );

  const runIdentifier =
    normalizeDisplayText(experiment.operationIdentifier) ||
    normalizeDisplayText(experiment.id);

  const projectName = normalizeDisplayText(project?.name);

  const formulationName =
    normalizeDisplayText(formulation?.name) ||
    normalizeDisplayText(formulation?.polymerName) ||
    normalizeDisplayText(experiment.formulationId);

  const polymer = normalizePolymerName(formulation?.polymerName);
  const polymerMaterial = formulation?.polymerMaterialId ? materialById.get(formulation.polymerMaterialId) : undefined;
  const polymerType = readMetadataValue(experiment, [
    "polymerType",
    "polymer_type",
    "canonicalPolymerType",
  ]) || polymerMaterial?.polymerFamily || polymerMaterial?.category || "";

  const solvent = resolveSolventDescription(formulation);
  const solventMaterial = formulation?.solvent1MaterialId ? materialById.get(formulation.solvent1MaterialId) : undefined;
  const solventType = readMetadataValue(experiment, [
    "solventType",
    "solvent_type",
    "canonicalSolventType",
  ]) || solventMaterial?.solventFamily || solventMaterial?.category || "";

  const machine = normalizeMachineModel(experiment.machineModel);
  const grade = normalizeGrade(experiment.jetStabilityGrade);

  const operatorComments = normalizeDisplayText(
    experiment.operatorComments
  );

  const sourceFile = normalizeDisplayText(experiment.sourceFile);
  const ingestedAt = normalizeDisplayText(experiment.ingestedAt);

  const searchText = createSearchText([
    experiment.id,
    runIdentifier,
    projectId,
    projectName,
    experiment.formulationId,
    formulationName,
    formulation?.polymerName,
    polymer,
    polymerType,
    formulation?.solvent,
    formulation?.solvent1Name,
    formulation?.solvent2Name,
    solvent,
    solventType,
    experiment.machineModel,
    machine,
    operatorComments,
    sourceFile,
  ]);

  return {
    id: experiment.id,
    runIdentifier,

    projectId,
    projectName,

    formulationId: experiment.formulationId,
    formulationName,

    polymer,
    polymerType,

    solvent,
    solventType,

    machine,
    grade,

    flowRateMlH: finiteNumberOrNull(telemetry?.flowRateMlH),
    positiveVoltageKv: finiteNumberOrNull(telemetry?.voltageKv),
    negativeVoltageKv: finiteNumberOrNull(
      telemetry?.collectorVoltageKv
    ),
    temperatureC: finiteNumberOrNull(telemetry?.temperatureC),
    humidityPct: finiteNumberOrNull(telemetry?.humidityPct),
    workingDistanceMm: finiteNumberOrNull(telemetry?.distanceMm),
    collectorSpeedRpm: finiteNumberOrNull(
      telemetry?.drumSpeedRpm
    ),

    operatorComments,
    sourceFile,
    ingestedAt,

    searchText,

    experiment,
    formulation,
    project,
  };
}

function resolveProjectId(
  experiment: Experiment,
  formulation: Formulation | null
): string {
  return (
    normalizeDisplayText(
      experiment.metadata?.canonicalProjectId
    ) ||
    normalizeDisplayText(formulation?.projectId)
  );
}

function resolveSolventDescription(
  formulation: Formulation | null
): string {
  if (!formulation) {
    return "";
  }

  const legacyDescription = normalizeDisplayText(
    formulation.solvent
  );

  if (legacyDescription) {
    return legacyDescription;
  }

  const solventNames = [
    normalizeDisplayText(formulation.solvent1Name),
    normalizeDisplayText(formulation.solvent2Name),
  ].filter((value) => value.length > 0);

  return [...new Set(solventNames)].join(" + ");
}

function selectRepresentativeTelemetry(
  telemetryData: readonly TelemetryRecord[]
): TelemetryRecord | null {
  if (telemetryData.length === 0) {
    return null;
  }

  return (
    telemetryData.find(hasRelevantProcessValue) ??
    telemetryData[0] ??
    null
  );
}

function hasRelevantProcessValue(
  telemetry: TelemetryRecord
): boolean {
  return [
    telemetry.flowRateMlH,
    telemetry.voltageKv,
    telemetry.collectorVoltageKv,
    telemetry.temperatureC,
    telemetry.humidityPct,
    telemetry.distanceMm,
    telemetry.drumSpeedRpm,
  ].some(
    (value) =>
      typeof value === "number" && Number.isFinite(value)
  );
}

function normalizeGrade(
  value: number
): HistoricalProcessabilityGrade | null {
  if (
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 4
  ) {
    return value as HistoricalProcessabilityGrade;
  }

  return null;
}

function finiteNumberOrNull(
  value: number | undefined
): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

function readMetadataValue(
  experiment: Experiment,
  candidateKeys: readonly string[]
): string {
  for (const key of candidateKeys) {
    const value = normalizeDisplayText(
      experiment.metadata?.[key]
    );

    if (value) {
      return value;
    }
  }

  return "";
}

function createSearchText(
  values: ReadonlyArray<string | null | undefined>
): string {
  return normalizeSearchText(
    values
      .map((value) => normalizeDisplayText(value))
      .filter((value) => value.length > 0)
      .join(" ")
  );
}
