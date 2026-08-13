import assert from "node:assert/strict";
import test from "node:test";
import { analyzeSimilarExperiments } from "./historicalAnalysis";
import { calculateSimilarityScore } from "./similarity.engine";
import type { SimilarityMatch } from "./similarity.types";
import type { Experiment } from "../../types";
import * as XLSX from "xlsx";
import { parseWorkbook } from "../../utils/excelParser";
import { buildSmartStartingPoint } from "./smartStartingPoint";

function match(id: string, score: number, positive: number, negative: number, grade = 4): SimilarityMatch {
  const experiment: Experiment = {
    id, formulationId: "F1", operationIdentifier: id, machineModel: "LE-500",
    injectorType: "needle", collectorType: "drum", distanceMm: 150,
    jetStabilityGrade: grade, operatorComments: "", sourceFile: "fixture.xlsx",
    ingestedAt: "2026-01-01T00:00:00.000Z", metadata: { canonicalProjectId: "P1" },
    telemetryData: [{ timestampSec: 0, voltageKv: positive, collectorVoltageKv: negative,
      flowRateMlH: 1, temperatureC: 25, humidityPct: 40, distanceMm: 150 }],
  };
  return { tier: 4, score, context: { experiment, formulation: {
    id: "F1", projectId: "P1", polymerName: "PCL", solvent: "DMF", solidsContentPct: 0,
    viscosityMpas: 0, conductivityUsCm: 0, densityGcm3: 0, materialBatchIds: [] } } };
}

test("similarity is deterministic", () => {
  const context = match("E1", 90, 15, -2).context;
  assert.equal(
    calculateSimilarityScore(context, { formulationId: "F1", voltageKv: 15 }),
    calculateSimilarityScore(context, { formulationId: "F1", voltageKv: 15 })
  );
});

test("insufficient samples produce no numeric recommendation", () => {
  const result = analyzeSimilarExperiments([match("E1", 90, 15, -2), match("E2", 85, 16, -3)], {}, 3);
  assert.equal(result.status, "insufficient_data");
  assert.deepEqual(result.processWindow, {});
  assert.deepEqual(result.recommendation, {});
});

test("interquartile windows keep HV+ separate from HV−", () => {
  const result = analyzeSimilarExperiments([
    match("E1", 90, 10, -1), match("E2", 90, 20, -2),
    match("E3", 90, 30, -3), match("E4", 90, 100, -40),
  ], {}, 3);
  assert.notEqual(result.status, "insufficient_data");
  assert.equal(result.processWindow.voltageKv?.minimum, 17.5);
  assert.equal(result.processWindow.voltageKv?.maximum, 47.5);
  assert.equal(result.processWindow.hvNegativeKv?.median, -2.5);
  assert.deepEqual(result.sourceExperimentIds, ["E1", "E2", "E3", "E4"]);
});

test("Excel import preserves distinct HV fields and does not invent missing measurements", () => {
  const complete = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(complete, XLSX.utils.aoa_to_sheet([
    ["Run", "HV+ (kV)", "HV- (kV)", "Flow (mL/h)", "Temperature", "RH", "Distance"],
    ["RUN-1", 18, -3, 1.2, 24, 42, 160],
  ]), "Variable process sheet");
  const [parsed] = parseWorkbook(complete, "fixture.xlsx");
  assert.equal(parsed?.telemetryData[0]?.voltageKv, 18);
  assert.equal(parsed?.telemetryData[0]?.collectorVoltageKv, -3);

  const incomplete = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(incomplete, XLSX.utils.aoa_to_sheet([
    ["Run", "HV+ (kV)", "Flow (mL/h)"],
    ["RUN-2", 17, ""],
  ]), "Another layout");
  const [incompleteParsed] = parseWorkbook(incomplete, "incomplete.xlsx");
  assert.deepEqual(incompleteParsed?.telemetryData, []);
  assert.equal(incompleteParsed?.jetStabilityGrade, 0);
});

test("smart starting point derives medians only from validated formulation history", () => {
  const first = match("S1", 90, 10, -1).context.experiment;
  const second = match("S2", 90, 20, -2).context.experiment;
  const formulation = { id: "F1", projectId: "P1", polymerName: "PCL", solvent: "DMF", solidsContentPct: 12, viscosityMpas: 0, conductivityUsCm: 0, densityGcm3: 0, materialBatchIds: [] };
  const point = buildSmartStartingPoint(formulation, [first, second]);
  assert.equal(point.status, "available");
  assert.equal(point.values.find((item) => item.label === "HV+")?.value, 15);
  assert.equal(point.values.find((item) => item.label === "HV−")?.value, -1.5);
});
