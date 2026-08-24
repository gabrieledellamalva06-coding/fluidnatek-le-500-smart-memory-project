import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import type { Experiment, Formulation, TelemetryRecord } from "../../types";
import { applySmartStartingPointValues, buildSmartStartingPoint, changedSmartStartingPointValues } from "./smartStartingPoint";

const formulation: Formulation = { id: "F1", projectId: "P1", polymerName: "PEO", solvent: "Water", solidsContentPct: 10, viscosityMpas: 0, conductivityUsCm: 0, densityGcm3: 0, materialBatchIds: [] };

function experiment(id: string, grade: number | undefined, telemetryData: TelemetryRecord[], formulationId = "F1"): Experiment {
  return { id, formulationId, operationIdentifier: id, machineModel: "LE-500", injectorType: "needle", collectorType: "drum", jetStabilityGrade: grade, operatorComments: "", sourceFile: "test", ingestedAt: "2026-01-01", telemetryData };
}

test("requires exact formulation and includes only successful grades 3 and 4", () => {
  const point = buildSmartStartingPoint(formulation, [
    experiment("grade-3", 3, [{ timestampSec: 0, voltageKv: 10 }]),
    experiment("grade-4", 4, [{ timestampSec: 0, voltageKv: 20 }]),
    experiment("grade-1", 1, [{ timestampSec: 0, voltageKv: 90 }]),
    experiment("grade-2", 2, [{ timestampSec: 0, voltageKv: 90 }]),
    experiment("missing-grade", undefined, [{ timestampSec: 0, voltageKv: 90 }]),
    experiment("invalid-grade", 5, [{ timestampSec: 0, voltageKv: 90 }]),
    experiment("different-formulation", 4, [{ timestampSec: 0, voltageKv: 90 }], "F2"),
    experiment("no-process-data", 4, [{ timestampSec: 0 }]),
  ]);
  assert.equal(point.successfulExperimentCount, 2);
  assert.equal(point.values.find((item) => item.key === "voltageKv")?.value, 15);
  assert.deepEqual(point.values.find((item) => item.key === "voltageKv")?.sourceExperimentIds, ["grade-3", "grade-4"]);
});

test("preserves genuine zero and excludes missing, placeholder, NaN, and non-finite values", () => {
  const bad = { timestampSec: 0, collectorVoltageKv: "—", voltageKv: Number.NaN } as unknown as TelemetryRecord;
  const point = buildSmartStartingPoint(formulation, [
    experiment("zero-1", 3, [bad, { timestampSec: 1, collectorVoltageKv: 0 }]),
    experiment("zero-2", 4, [{ timestampSec: 0, collectorVoltageKv: 0, voltageKv: Number.POSITIVE_INFINITY }]),
  ]);
  assert.equal(point.values.find((item) => item.key === "collectorVoltageKv")?.value, 0);
  assert.equal(point.values.some((item) => item.key === "voltageKv"), false);
});

test("requires at least two contributing experiments per parameter", () => {
  const point = buildSmartStartingPoint(formulation, [
    experiment("one-flow", 4, [{ timestampSec: 0, flowRateMlH: 2 }]),
    experiment("no-flow", 4, [{ timestampSec: 0, voltageKv: 10 }]),
  ]);
  assert.equal(point.values.some((item) => item.key === "flowRateMlH"), false);
  assert.equal(point.supportedParameterCount, 0);
});

test("multiple records become one experiment median before equal experiment weighting", () => {
  const point = buildSmartStartingPoint(formulation, [
    experiment("many-records", 4, [
      { timestampSec: 0, voltageKv: 100 },
      { timestampSec: 1, voltageKv: 100 },
      { timestampSec: 2, voltageKv: 100 },
    ]),
    experiment("one-record", 4, [{ timestampSec: 0, voltageKv: 0 }]),
  ]);
  const voltage = point.values.find((item) => item.key === "voltageKv");
  assert.equal(voltage?.value, 50);
  assert.equal(voltage?.evidenceCount, 2);
});

test("coverage counts only parameters supported by at least two experiments", () => {
  const point = buildSmartStartingPoint(formulation, [
    experiment("first", 3, [{ timestampSec: 0, voltageKv: 10, flowRateMlH: 1 }]),
    experiment("second", 4, [{ timestampSec: 0, voltageKv: 20 }]),
  ]);
  assert.equal(point.supportedParameterCount, 1);
  assert.deepEqual(point.values.map((item) => item.key), ["voltageKv"]);
});

test("apply changes only supported local values while cancel leaves current values unchanged", () => {
  const point = buildSmartStartingPoint(formulation, [
    experiment("first", 3, [{ timestampSec: 0, voltageKv: 10 }]),
    experiment("second", 4, [{ timestampSec: 0, voltageKv: 20 }]),
  ]);
  const current = { voltageKv: 12, flowRateMlH: 3, distanceMm: 150 };
  const cancelled = { ...current };
  assert.deepEqual(changedSmartStartingPointValues(current, point).map((item) => item.key), ["voltageKv"]);
  assert.deepEqual(cancelled, current);
  assert.deepEqual(applySmartStartingPointValues(current, point), { voltageKv: 15, flowRateMlH: 3, distanceMm: 150 });
  assert.deepEqual(current, { voltageKv: 12, flowRateMlH: 3, distanceMm: 150 });
});

test("RunConfig apply is local-only and the preview contains the required warning", () => {
  const source = readFileSync(join(process.cwd(), "src/components/RunConfig.tsx"), "utf8");
  const applyBody = source.slice(source.indexOf("function applySmartStartingPoint()"), source.indexOf("const analyze ="));
  assert.equal(applyBody.includes("onAddExperiment"), false);
  assert.equal(applyBody.includes("setRunName"), false);
  assert.equal(applyBody.includes("setDrumSpeedRpm"), false);
  assert.match(source, /Applying these historical medians will replace the corresponding values in the current run form\./);
  assert.equal(source.includes("Confidence: {Math.round(smartStartingPoint"), false);
});
