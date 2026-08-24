import type { Experiment, VariationParameterChange, VariationParameterKey } from "../../core/types/experiment";
import type { ProcessRecord, ProcessParameters, EnvironmentalConditions } from "../../core/types/processRecord";

export type { VariationParameterKey } from "../../core/types/experiment";
export interface VariationValues { flowRateMlH?: number; voltageKv?: number; collectorVoltageKv?: number; temperatureC?: number; humidityPct?: number; distanceMm?: number; drumSpeedRpm?: number; }
export interface VariationChange { key: VariationParameterKey; label: string; unit: string; previous?: number; next?: number; }

const PARAMETER_INFO: Array<[VariationParameterKey, string, string]> = [
  ["flowRateMlH", "Flow rate", "mL/h"], ["voltageKv", "HV+", "kV"], ["collectorVoltageKv", "HV−", "kV"],
  ["temperatureC", "Temperature", "°C"], ["humidityPct", "Relative humidity", "%"], ["distanceMm", "Working distance", "mm"], ["drumSpeedRpm", "Drum/collector speed", "rpm"],
];

export interface VariationEvidenceRecord extends VariationValues { id?: string; }
export interface ResolvedVariationEvidence { changes: VariationChange[] | null; }
export interface VariationAudit { variationCreatedBy: string; variationReason: string; }
export const VARIATION_SERVER_TIMESTAMP_FIELDS = ["variationCreatedAt"] as const;

export function processRecordVariationValues(record: ProcessRecord): VariationValues {
  return { flowRateMlH: record.parameters.flowRateMlH, voltageKv: record.parameters.voltageKv, collectorVoltageKv: record.parameters.collectorVoltageKv, temperatureC: record.environment?.temperatureC, humidityPct: record.environment?.humidityPct, distanceMm: record.parameters.distanceMm, drumSpeedRpm: record.parameters.collectorSpeedRpm };
}

export function variationChanges(source: VariationValues, next: VariationValues): VariationChange[] {
  return PARAMETER_INFO.flatMap(([key, label, unit]) => Object.is(source[key], next[key]) ? [] : [{ key, label, unit, previous: source[key], next: next[key] }]);
}

export function persistedVariationChanges(source: VariationValues, next: VariationValues): VariationParameterChange[] {
  return variationChanges(source, next).map((change) => ({
    key: change.key,
    ...(change.previous !== undefined ? { previousValue: change.previous } : {}),
    ...(change.next !== undefined ? { newValue: change.next } : {}),
    unit: change.unit,
  }));
}

export function resolveVariationEvidence(input: {
  structuredChanges?: readonly VariationParameterChange[];
  sourceProcessRecordId?: string;
  sourceRecords: readonly VariationEvidenceRecord[];
  variationRecords: readonly VariationEvidenceRecord[];
}): ResolvedVariationEvidence {
  if (input.structuredChanges) {
    return { changes: input.structuredChanges.map((change) => {
      const info = PARAMETER_INFO.find(([key]) => key === change.key);
      return { key: change.key, label: info?.[1] ?? change.key, unit: change.unit, previous: change.previousValue, next: change.newValue };
    }) };
  }
  const sourceRecord = input.sourceProcessRecordId
    ? input.sourceRecords.find((record) => record.id === input.sourceProcessRecordId)
    : input.sourceRecords.length === 1 ? input.sourceRecords[0] : undefined;
  if (!sourceRecord || input.variationRecords.length !== 1) return { changes: null };
  return { changes: variationChanges(sourceRecord, input.variationRecords[0]) };
}

export function normalizeVariationAudit(changedBy: string, reason: string): VariationAudit {
  const variationCreatedBy = changedBy.trim();
  const variationReason = reason.trim();
  if (!variationCreatedBy) throw new Error("Changed by is required.");
  if (!variationReason) throw new Error("Reason for variation is required.");
  return { variationCreatedBy, variationReason };
}

export function canConfirmVariation(input: { draftValid: boolean; changeCount: number; changedBy: string; reason: string; saving: boolean }): boolean {
  return input.draftValid && input.changeCount > 0 && Boolean(input.changedBy.trim()) && Boolean(input.reason.trim()) && !input.saving;
}

export function normalizeRunName(value: string): string { return value.trim().toLocaleLowerCase(); }
export function isDuplicateRunName(proposed: string, existingNames: readonly string[]): boolean { const normalized = normalizeRunName(proposed); return Boolean(normalized && existingNames.some((name) => normalizeRunName(name) === normalized)); }
export function variationRootName(value: string): string { let root = value.trim(); while (/-variant\d*$/i.test(root)) root = root.replace(/-variant\d*$/i, "").trim(); return root || "VARIATION"; }
export function suggestVariationRunName(sourceName: string, existingNames: readonly string[]): string { const root = variationRootName(sourceName); const normalizedNames = new Set(existingNames.map(normalizeRunName)); let suffix = 1; while (normalizedNames.has(normalizeRunName(`${root}-VARIANT${suffix}`))) suffix += 1; return `${root}-VARIANT${suffix}`; }

export function initialProcessRecordSelection(ids: readonly string[]): string {
  return ids.length === 1 ? ids[0] : "";
}

export function createPlannedVariation(input: { source: Experiment; sourceProcessRecord: ProcessRecord; operationIdentifier: string; cloneRequestId: string; values: VariationValues; variationCreatedBy: string; variationReason: string; timestamp: string }): { experiment: Experiment; processRecord: ProcessRecord } {
  const experimentId = `EXP_CLONE_${input.cloneRequestId}`;
  const processRecordId = `PROC_CLONE_${input.cloneRequestId}`;
  const parameters: ProcessParameters = { voltageKv: input.values.voltageKv, collectorVoltageKv: input.values.collectorVoltageKv, flowRateMlH: input.values.flowRateMlH, distanceMm: input.values.distanceMm, collectorSpeedRpm: input.values.drumSpeedRpm };
  const environment: EnvironmentalConditions | undefined = input.values.temperatureC !== undefined || input.values.humidityPct !== undefined ? { temperatureC: input.values.temperatureC, humidityPct: input.values.humidityPct } : undefined;
  return {
    experiment: { id: experimentId, projectId: input.source.projectId, formulationId: input.source.formulationId, setupId: input.source.setupId, operationIdentifier: input.operationIdentifier.trim(), status: "planned", processRecordIds: [processRecordId], materialCharacterizationIds: [], clonedFromExperimentId: input.source.id, sourceProcessRecordId: input.sourceProcessRecord.id, cloneRequestId: input.cloneRequestId, changedParameters: persistedVariationChanges(processRecordVariationValues(input.sourceProcessRecord), input.values), variationCreatedBy: input.variationCreatedBy, variationReason: input.variationReason, createdAt: input.timestamp, updatedAt: input.timestamp, dataQuality: { status: "valid", warnings: [], reviewed: false } },
    processRecord: { id: processRecordId, experimentId, sequence: 0, timestampSec: 0, parameters, environment, createdAt: input.timestamp },
  };
}
