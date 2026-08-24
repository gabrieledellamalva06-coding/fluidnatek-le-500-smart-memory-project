import assert from "node:assert/strict";
import test from "node:test";
import type { Experiment } from "../../types";
import { adaptHistoricalExperiments } from "./historicalExperiment.adapter";

function experiment(overrides: Partial<Experiment>): Experiment {
  return { id: "exp", formulationId: "form", operationIdentifier: "run", machineModel: "LE-500", injectorType: "needle", collectorType: "drum", operatorComments: "", sourceFile: "Firestore", ingestedAt: "2026-08-21T10:00:00Z", telemetryData: [], metadata: { canonicalProjectId: "project", canonicalSetupId: "setup", canonicalStatus: "completed" }, ...overrides };
}

test("app-created variation metadata is planned and is not presented as imported", () => {
  const record = adaptHistoricalExperiments({ experiments: [experiment({ sourceFile: "", metadata: { canonicalProjectId: "project", canonicalSetupId: "setup", canonicalStatus: "planned" }, variationProvenance: { clonedFromExperimentId: "source", sourceProcessRecordId: "process", cloneRequestId: "request", changedParameters: [] } })], formulations: [], projects: [] })[0];
  assert.equal(record.status, "planned");
  assert.equal(record.recordType, "Experiment variation");
  assert.equal(record.createdIn, "Smart Memory application");
  assert.equal(record.importStatus, "");
  assert.equal(record.validationStatus, "");
  assert.equal(record.sourceFile, "");
});

test("genuine imported metadata remains unchanged", () => {
  const record = adaptHistoricalExperiments({ experiments: [experiment({ sourceFile: "batch.xlsx", metadata: { canonicalProjectId: "project", canonicalSetupId: "setup", canonicalStatus: "completed", importStatus: "Imported", validationStatus: "Validated" } })], formulations: [], projects: [] })[0];
  assert.equal(record.importStatus, "Imported");
  assert.equal(record.validationStatus, "Validated");
  assert.equal(record.sourceFile, "batch.xlsx");
  assert.equal(record.recordType, "Historical experiment");
});
