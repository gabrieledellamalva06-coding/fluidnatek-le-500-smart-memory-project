import assert from "node:assert/strict";
import test from "node:test";
import type { Experiment } from "../../core/types/experiment";
import type { ProcessRecord } from "../../core/types/processRecord";
import { mapCanonicalExperimentToUi } from "./experiment.mapper";

test("missing process fields remain missing instead of becoming synthetic zero", () => {
  const experiment: Experiment = {
    id: "exp", projectId: "project", formulationId: "form", setupId: "setup",
    operationIdentifier: "run", status: "completed", processRecordIds: ["record"],
    materialCharacterizationIds: [], createdAt: "", updatedAt: "",
    dataQuality: { status: "valid", warnings: [], reviewed: false },
  };
  const record: ProcessRecord = { id: "record", experimentId: "exp", sequence: 0, parameters: {}, createdAt: "" };
  const mapped = mapCanonicalExperimentToUi(experiment, { setupsById: new Map(), processRecordsById: new Map([[record.id, record]]) });
  assert.equal(mapped.distanceMm, undefined);
  assert.equal(mapped.jetStabilityGrade, undefined);
  assert.equal(mapped.telemetryData[0].voltageKv, undefined);
  assert.equal(mapped.telemetryData[0].flowRateMlH, undefined);
  assert.equal(mapped.telemetryData[0].distanceMm, undefined);
});
