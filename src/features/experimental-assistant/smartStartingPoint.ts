import type { Experiment, Formulation } from "../../types";
import { RECOMMENDATION_CONFIG } from "./recommendation.config";

export interface SmartStartingPointValue {
  label: string;
  value: number;
  unit: string;
  evidenceCount: number;
  sourceExperimentIds: string[];
}

export interface SmartStartingPoint {
  status: "available" | "limited_evidence" | "insufficient_data";
  confidence: number;
  rationale: string;
  values: SmartStartingPointValue[];
}

export function buildSmartStartingPoint(
  formulation: Formulation,
  experiments: readonly Experiment[],
  minimumEvidence = 2
): SmartStartingPoint {
  const matching = experiments.filter((experiment) => {
    const related = experiment.formulationId === formulation.id;
    return related && experiment.telemetryData.length > 0 && validGrade(experiment.jetStabilityGrade);
  });
  const sourceIds = matching.map((item) => item.id);
  const values = [
    summarize("HV+", "kV", matching.flatMap((item) => item.telemetryData.map((record) => record.voltageKv)), sourceIds, RECOMMENDATION_CONFIG.limits.voltageKv),
    summarize("HV−", "kV", matching.flatMap((item) => item.telemetryData.map((record) => record.collectorVoltageKv)), sourceIds, RECOMMENDATION_CONFIG.limits.hvNegativeKv),
    summarize("Flow", "mL/h", matching.flatMap((item) => item.telemetryData.map((record) => record.flowRateMlH)), sourceIds, RECOMMENDATION_CONFIG.limits.flowRateMlH),
    summarize("Temperature", "°C", matching.flatMap((item) => item.telemetryData.map((record) => record.temperatureC)), sourceIds, RECOMMENDATION_CONFIG.limits.temperatureC),
    summarize("RH", "%", matching.flatMap((item) => item.telemetryData.map((record) => record.humidityPct)), sourceIds, RECOMMENDATION_CONFIG.limits.humidityPct),
    summarize("Distance", "mm", matching.flatMap((item) => item.telemetryData.map((record) => record.distanceMm)), sourceIds, RECOMMENDATION_CONFIG.limits.distanceMm),
  ].filter((value): value is SmartStartingPointValue => value !== null);
  if (matching.length === 0) return { status: "insufficient_data", confidence: 0, rationale: "No validated historical experiment exists for this formulation.", values: [] };
  const confidence = Math.min(1, matching.length / minimumEvidence) * 0.7 + (values.length / 6) * 0.3;
  return {
    status: matching.length >= minimumEvidence && values.length > 0 ? "available" : "limited_evidence",
    confidence: Math.round(confidence * 100) / 100,
    rationale: `${matching.length} validated historical experiment${matching.length === 1 ? "" : "s"} for the selected formulation. Values are medians, not invented setpoints.`,
    values,
  };
}

function summarize(label: string, unit: string, values: readonly number[], sourceIds: string[], limit: { minimum: number; maximum: number }): SmartStartingPointValue | null {
  const clean = values.filter((value) => Number.isFinite(value) && value >= limit.minimum && value <= limit.maximum).sort((a, b) => a - b);
  if (clean.length === 0) return null;
  const middle = (clean.length - 1) * 0.5;
  const lower = clean[Math.floor(middle)] ?? clean[0];
  const upper = clean[Math.ceil(middle)] ?? lower;
  return { label, unit, value: lower + (upper - lower) * (middle - Math.floor(middle)), evidenceCount: clean.length, sourceExperimentIds: sourceIds };
}

function validGrade(value: number): boolean { return Number.isInteger(value) && value >= 1 && value <= 4; }
