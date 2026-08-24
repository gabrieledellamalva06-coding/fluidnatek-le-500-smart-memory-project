import type { Experiment, Formulation, TelemetryRecord } from "../../types";
import { RECOMMENDATION_CONFIG } from "./recommendation.config";

export type SmartStartingPointKey = "voltageKv" | "collectorVoltageKv" | "flowRateMlH" | "temperatureC" | "humidityPct" | "distanceMm";

export interface SmartStartingPointValue {
  key: SmartStartingPointKey;
  label: string;
  value: number;
  unit: string;
  evidenceCount: number;
  sourceExperimentIds: string[];
}

export interface SmartStartingPoint {
  status: "available" | "limited_evidence" | "insufficient_data";
  successfulExperimentCount: number;
  supportedParameterCount: number;
  values: SmartStartingPointValue[];
}

export type SmartStartingPointFormValues = Partial<Record<SmartStartingPointKey, number | undefined>>;

interface ParameterDefinition {
  key: SmartStartingPointKey;
  label: string;
  unit: string;
  read: (record: TelemetryRecord) => number | undefined;
  limit: { minimum: number; maximum: number };
}

const PARAMETERS: readonly ParameterDefinition[] = [
  { key: "voltageKv", label: "HV+", unit: "kV", read: (record) => record.voltageKv, limit: RECOMMENDATION_CONFIG.limits.voltageKv },
  { key: "collectorVoltageKv", label: "HV−", unit: "kV", read: (record) => record.collectorVoltageKv, limit: RECOMMENDATION_CONFIG.limits.hvNegativeKv },
  { key: "flowRateMlH", label: "Flow", unit: "mL/h", read: (record) => record.flowRateMlH, limit: RECOMMENDATION_CONFIG.limits.flowRateMlH },
  { key: "temperatureC", label: "Temperature", unit: "°C", read: (record) => record.temperatureC, limit: RECOMMENDATION_CONFIG.limits.temperatureC },
  { key: "humidityPct", label: "RH", unit: "%", read: (record) => record.humidityPct, limit: RECOMMENDATION_CONFIG.limits.humidityPct },
  { key: "distanceMm", label: "Distance", unit: "mm", read: (record) => record.distanceMm, limit: RECOMMENDATION_CONFIG.limits.distanceMm },
];

export function buildSmartStartingPoint(formulation: Formulation, experiments: readonly Experiment[], minimumParameterEvidence = 2): SmartStartingPoint {
  const eligible = experiments.filter((experiment) =>
    experiment.formulationId === formulation.id
    && successfulGrade(experiment.jetStabilityGrade)
    && PARAMETERS.some((parameter) => validValues(experiment, parameter).length > 0)
  );
  const values = PARAMETERS.flatMap((parameter): SmartStartingPointValue[] => {
    const contributions = eligible.flatMap((experiment) => {
      const experimentValues = validValues(experiment, parameter);
      return experimentValues.length > 0 ? [{ experimentId: experiment.id, value: median(experimentValues) }] : [];
    });
    if (contributions.length < minimumParameterEvidence) return [];
    return [{
      key: parameter.key,
      label: parameter.label,
      unit: parameter.unit,
      value: median(contributions.map((item) => item.value)),
      evidenceCount: contributions.length,
      sourceExperimentIds: contributions.map((item) => item.experimentId),
    }];
  });
  return {
    status: eligible.length === 0 ? "insufficient_data" : values.length > 0 ? "available" : "limited_evidence",
    successfulExperimentCount: eligible.length,
    supportedParameterCount: values.length,
    values,
  };
}

export function changedSmartStartingPointValues(current: SmartStartingPointFormValues, point: SmartStartingPoint): SmartStartingPointValue[] {
  return point.values.filter((item) => current[item.key] !== item.value);
}

export function applySmartStartingPointValues(current: SmartStartingPointFormValues, point: SmartStartingPoint): SmartStartingPointFormValues {
  return point.values.reduce<SmartStartingPointFormValues>((next, item) => ({ ...next, [item.key]: item.value }), { ...current });
}

function validValues(experiment: Experiment, parameter: ParameterDefinition): number[] {
  return experiment.telemetryData.map(parameter.read).filter((value): value is number =>
    typeof value === "number" && Number.isFinite(value) && value >= parameter.limit.minimum && value <= parameter.limit.maximum
  );
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = (sorted.length - 1) / 2;
  const lower = sorted[Math.floor(middle)];
  const upper = sorted[Math.ceil(middle)];
  return lower + (upper - lower) * (middle - Math.floor(middle));
}

function successfulGrade(value: number | undefined): value is 3 | 4 {
  return value === 3 || value === 4;
}
