import assert from "node:assert/strict";
import test from "node:test";
import type { Experiment } from "../../core/types/experiment";
import type { ProcessRecord } from "../../core/types/processRecord";
import {
  createPlannedVariation,
  initialProcessRecordSelection,
  isDuplicateRunName,
  processRecordVariationValues,
  persistedVariationChanges,
  resolveVariationEvidence,
  normalizeVariationAudit,
  canConfirmVariation,
  VARIATION_SERVER_TIMESTAMP_FIELDS,
  suggestVariationRunName,
  variationChanges,
} from "./cloneVariation";

const source: Experiment = {
  id: "EXP_SOURCE", projectId: "PROJECT_A", formulationId: "FORM_A", setupId: "SETUP_A",
  operationIdentifier: "RUN-7", status: "completed", processRecordIds: ["PROC_A", "PROC_B"],
  materialCharacterizationIds: ["CHAR_A"], notes: "historical comment", createdAt: "old", updatedAt: "old",
  dataQuality: { status: "valid", warnings: [], reviewed: false },
};
const processRecord: ProcessRecord = {
  id: "PROC_B", experimentId: source.id, sequence: 1, timestampSec: 10,
  parameters: { voltageKv: 0, collectorVoltageKv: -2, flowRateMlH: 1, distanceMm: 150, collectorSpeedRpm: 200 },
  environment: { temperatureC: 22 }, evaluation: { jetStabilityGrade: 4, operatorComments: "result" }, createdAt: "old",
};

test("planned variation preserves exact links and structured provenance without mutating the source", () => {
  const before = structuredClone(source);
  const created = createPlannedVariation({ source, sourceProcessRecord: processRecord, operationIdentifier: " RUN-7-VARIANT1 ", cloneRequestId: "request-1", values: { voltageKv: 1, collectorVoltageKv: 0, drumSpeedRpm: 0 }, variationCreatedBy: "Dilara", variationReason: "Higher flow", timestamp: "now" });
  assert.deepEqual(source, before);
  assert.equal(created.experiment.id, "EXP_CLONE_request-1");
  assert.equal(created.processRecord.id, "PROC_CLONE_request-1");
  assert.equal(created.experiment.clonedFromExperimentId, source.id);
  assert.equal(created.experiment.cloneRequestId, "request-1");
  assert.equal(created.experiment.sourceProcessRecordId, processRecord.id);
  assert.equal(created.experiment.variationCreatedBy, "Dilara");
  assert.equal(created.experiment.variationReason, "Higher flow");
  assert.deepEqual(created.experiment.changedParameters, [
    { key: "flowRateMlH", previousValue: 1, unit: "mL/h" },
    { key: "voltageKv", previousValue: 0, newValue: 1, unit: "kV" },
    { key: "collectorVoltageKv", previousValue: -2, newValue: 0, unit: "kV" },
    { key: "temperatureC", previousValue: 22, unit: "°C" },
    { key: "distanceMm", previousValue: 150, unit: "mm" },
    { key: "drumSpeedRpm", previousValue: 200, newValue: 0, unit: "rpm" },
  ]);
  assert.equal(created.experiment.projectId, source.projectId);
  assert.equal(created.experiment.formulationId, source.formulationId);
  assert.equal(created.experiment.setupId, source.setupId);
  assert.equal(created.experiment.status, "planned");
  assert.deepEqual(created.experiment.processRecordIds, [created.processRecord.id]);
  assert.deepEqual(created.experiment.materialCharacterizationIds, []);
  assert.equal(created.experiment.notes, undefined);
  assert.equal(created.processRecord.evaluation, undefined);
  assert.equal(created.processRecord.parameters.collectorVoltageKv, 0);
  assert.equal(created.processRecord.parameters.collectorSpeedRpm, 0);
  assert.equal(created.processRecord.parameters.flowRateMlH, undefined);
});

test("the same clone request produces the same experiment and process-record IDs", () => {
  const input = { source, sourceProcessRecord: processRecord, operationIdentifier: "RUN-8", cloneRequestId: "stable", values: { voltageKv: 1 }, variationCreatedBy: "Dilara", variationReason: "Audit", timestamp: "now" };
  assert.deepEqual(createPlannedVariation(input), createPlannedVariation(input));
});

test("parameter comparison distinguishes missing values and preserves valid zero", () => {
  const changes = variationChanges({ voltageKv: 0, flowRateMlH: 1 }, { voltageKv: 0, flowRateMlH: undefined });
  assert.deepEqual(changes.map((change) => change.key), ["flowRateMlH"]);
  assert.equal(changes[0].previous, 1);
  assert.equal(changes[0].next, undefined);
});

test("structured provenance records one or multiple changes and excludes unchanged fields", () => {
  assert.deepEqual(persistedVariationChanges({ flowRateMlH: 2, temperatureC: 25 }, { flowRateMlH: 3, temperatureC: 25 }), [
    { key: "flowRateMlH", previousValue: 2, newValue: 3, unit: "mL/h" },
  ]);
  assert.deepEqual(persistedVariationChanges({ voltageKv: 0, collectorVoltageKv: 4 }, { voltageKv: 5, collectorVoltageKv: 0 }), [
    { key: "voltageKv", previousValue: 0, newValue: 5, unit: "kV" },
    { key: "collectorVoltageKv", previousValue: 4, newValue: 0, unit: "kV" },
  ]);
});

test("structured provenance preserves missing-to-value and value-to-missing", () => {
  assert.deepEqual(persistedVariationChanges({ flowRateMlH: undefined, temperatureC: 20 }, { flowRateMlH: 3, temperatureC: undefined }), [
    { key: "flowRateMlH", newValue: 3, unit: "mL/h" },
    { key: "temperatureC", previousValue: 20, unit: "°C" },
  ]);
});

test("legacy variation fallback uses an exact source record and never guesses among ambiguous records", () => {
  const exact = resolveVariationEvidence({ sourceProcessRecordId: "source-2", sourceRecords: [{ id: "source-1", flowRateMlH: 1 }, { id: "source-2", flowRateMlH: 2 }], variationRecords: [{ id: "clone", flowRateMlH: 3 }] });
  assert.deepEqual(exact.changes?.map((change) => [change.key, change.previous, change.next]), [["flowRateMlH", 2, 3]]);
  assert.equal(resolveVariationEvidence({ sourceRecords: [{ id: "source-1" }, { id: "source-2" }], variationRecords: [{ id: "clone" }] }).changes, null);
  assert.equal(resolveVariationEvidence({ sourceProcessRecordId: "missing", sourceRecords: [{ id: "only" }], variationRecords: [{ id: "clone" }] }).changes, null);
});

test("source drum speed and zero-valued voltage remain available to prefill the editor", () => {
  const values = processRecordVariationValues(processRecord);
  assert.equal(values.drumSpeedRpm, 200);
  assert.equal(values.voltageKv, 0);
});

test("run names are unique after trim and case normalization and suggestions do not nest suffixes", () => {
  assert.equal(isDuplicateRunName(" run-7 ", ["RUN-7"]), true);
  assert.equal(suggestVariationRunName("RUN-7-VARIANT1", ["run-7-variant1", "RUN-7-VARIANT2"]), "RUN-7-VARIANT3");
});

test("multiple process records require explicit selection", () => {
  assert.equal(initialProcessRecordSelection(["only"]), "only");
  assert.equal(initialProcessRecordSelection(["first", "second"]), "");
  assert.equal(initialProcessRecordSelection([]), "");
});

test("variation audit requires trimmed non-empty actor and reason", () => {
  assert.deepEqual(normalizeVariationAudit("  Dilara  ", "  Testing a higher flow rate  "), { variationCreatedBy: "Dilara", variationReason: "Testing a higher flow rate" });
  assert.throws(() => normalizeVariationAudit("   ", "reason"), /Changed by is required/);
  assert.throws(() => normalizeVariationAudit("Dilara", "   "), /Reason for variation is required/);
});

test("confirmation remains disabled until the draft and audit fields are valid and not saving", () => {
  const base = { draftValid: true, changeCount: 1, changedBy: "Dilara", reason: "Reason", saving: false };
  assert.equal(canConfirmVariation(base), true);
  assert.equal(canConfirmVariation({ ...base, changedBy: " " }), false);
  assert.equal(canConfirmVariation({ ...base, reason: " " }), false);
  assert.equal(canConfirmVariation({ ...base, changeCount: 0 }), false);
  assert.equal(canConfirmVariation({ ...base, saving: true }), false);
});

test("variation creation requests an authoritative server timestamp in the atomic experiment write", () => {
  assert.deepEqual(VARIATION_SERVER_TIMESTAMP_FIELDS, ["variationCreatedAt"]);
});
