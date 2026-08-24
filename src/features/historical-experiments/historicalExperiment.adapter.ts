import type {
  Experiment,
  Formulation,
  Project,
  TelemetryRecord,
} from "../../types";
import type { Material } from "../../core/types/material";
import type { ExperimentalSetup } from "../../core/types/setup";
import { calculateRecordQuality, type RecordQualitySummary } from "./dataQuality";

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
  concentrationPct: number | null;
  setupName: string;

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
  importStatus: string;
  validationStatus: string;
  status: string;
  recordType: string;
  createdIn: string;
  dataQuality: RecordQualitySummary;

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
  setups?: readonly ExperimentalSetup[];
}

export function adaptHistoricalExperiments({
  experiments,
  formulations,
  projects,
  materials = [],
  setups = [],
}: HistoricalExperimentAdapterInput): HistoricalExperimentRecord[] {
  const formulationById = new Map(
    formulations.map((formulation) => [formulation.id, formulation])
  );

  const projectById = new Map(
    projects.map((project) => [project.id, project])
  );
  const materialById = new Map(materials.map((material) => [material.id, material]));
  const setupById = new Map(setups.map((setup) => [setup.id, setup]));

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
      setupById,
    });
  });
}

interface AdaptHistoricalExperimentInput {
  experiment: Experiment;
  formulation: Formulation | null;
  project: Project | null;
  projectId: string;
  materialById: ReadonlyMap<string, Material>;
  setupById: ReadonlyMap<string, ExperimentalSetup>;
}

function adaptHistoricalExperiment({
  experiment,
  formulation,
  project,
  projectId,
  materialById,
  setupById,
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
  const setupId = readMetadataValue(experiment, ["canonicalSetupId", "setupId"]);
  const setupName = normalizeDisplayText(setupById.get(setupId)?.name) || normalizeDisplayText(setupId);

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
  const isApplicationVariation = Boolean(experiment.variationProvenance?.clonedFromExperimentId);
  const ingestedAt = normalizeDisplayText(experiment.ingestedAt);
  const concentrationPct = finiteNumberOrNull(formulation?.polymerConcentrationPct);

  const searchText = createSearchText([
    experiment.id,
    runIdentifier,
    projectId,
    projectName,
    experiment.formulationId,
    formulationName,
    formulation?.polymerConcentrationPct === undefined ? "" : String(formulation.polymerConcentrationPct),
    setupName,
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

  const flowRateMlH = finiteNumberOrNull(telemetry?.flowRateMlH);
  const positiveVoltageKv = finiteNumberOrNull(telemetry?.voltageKv);
  const negativeVoltageKv = finiteNumberOrNull(telemetry?.collectorVoltageKv);
  const dataQuality = calculateRecordQuality({ project: projectName, formulation: formulationName, setup: setupName, flowRate: flowRateMlH, hvPlus: positiveVoltageKv, hvMinus: negativeVoltageKv, grade, sourceFile, characterization: false });
  return {
    id: experiment.id,
    runIdentifier,

    projectId,
    projectName,

    formulationId: experiment.formulationId,
    formulationName,
    concentrationPct,
    setupName,

    polymer,
    polymerType,

    solvent,
    solventType,

    machine,
    grade,

    flowRateMlH,
    positiveVoltageKv,
    negativeVoltageKv,
    temperatureC: finiteNumberOrNull(telemetry?.temperatureC),
    humidityPct: finiteNumberOrNull(telemetry?.humidityPct),
    workingDistanceMm: finiteNumberOrNull(telemetry?.distanceMm),
    collectorSpeedRpm: finiteNumberOrNull(
      telemetry?.drumSpeedRpm
    ),

    operatorComments,
    sourceFile,
    ingestedAt,
    importStatus: isApplicationVariation ? "" : readMetadataValue(experiment, ["importStatus", "import_status"]) || (sourceFile ? "Imported" : "Manual"),
    validationStatus: isApplicationVariation ? "" : readMetadataValue(experiment, ["validationStatus", "validation_status"]) || "Unvalidated",
    status: readMetadataValue(experiment, ["canonicalStatus"]) || "Unknown",
    recordType: isApplicationVariation ? "Experiment variation" : "Historical experiment",
    createdIn: isApplicationVariation ? "Smart Memory application" : "",
    dataQuality,

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
