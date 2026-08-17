import assert from "node:assert/strict";
import test from "node:test";
import { buildInitialParameterRecommendation, type RecommendedParameterKey } from "./initialParameterRecommendation";
import type { SolutionSimilarityMatch } from "./similarity.types";

type Values = Partial<Record<RecommendedParameterKey, number>>;

function match(id: string, values: Values, comparableCriteriaCount = 5): SolutionSimilarityMatch {
  return {
    tier: 1, score: 80, comparableCriteriaCount, comparableCriteriaTotal: 5, dataCompleteness: 1, evidenceLevel: "strong", rankingScore: 80, reasons: [],
    context: { experiment: { id, formulationId: "formulation", operationIdentifier: id, machineModel: "machine", injectorType: "injector", collectorType: "collector", distanceMm: values.distanceMm ?? 150, jetStabilityGrade: 4, operatorComments: "", sourceFile: "", ingestedAt: "", telemetryData: [{ timestampSec: 0, voltageKv: values.voltageKv ?? 15, flowRateMlH: values.flowRateMlH ?? 1, distanceMm: values.distanceMm ?? 150, ...values }] } },
  };
}

function parameter(key: RecommendedParameterKey, values: number[]) {
  const result = buildInitialParameterRecommendation(values.map((value, index) => match(`run-${index}`, { [key]: value })));
  const found = result.parameters.find((item) => item.key === key);
  assert.ok(found);
  return found;
}

test("two identical values produce a recommendation, including signed HV- zero", () => {
  assert.equal(parameter("voltageKv", [15, 15]).value, 15);
  assert.equal(parameter("collectorVoltageKv", [0, 0]).value, 0);
});

test("two incompatible values produce no recommendation", () => {
  const temperature = parameter("temperatureC", [25, 2522]);
  assert.equal(temperature.value, undefined);
  assert.equal(temperature.range, undefined);
  assert.equal(temperature.supportingExperimentCount, 0);
  assert.ok(temperature.sources.every((source) => source.status === "no-consensus"));
});

test("small-sample consensus uses the consistent pair and excludes the extreme value", () => {
  const flow = parameter("flowRateMlH", [1, 1, 1222]);
  assert.equal(flow.value, 1);
  assert.deepEqual(flow.range, { minimum: 1, maximum: 1 });
  assert.equal(flow.supportingExperimentCount, 2);
  assert.equal(flow.sources.find((source) => source.rawValue === 1222)?.status, "no-consensus");
});

test("humidity 40 and 100 fails the existing tolerance consensus rule", () => {
  const humidity = parameter("humidityPct", [40, 100]);
  assert.equal(humidity.value, undefined);
  assert.ok(humidity.sources.every((source) => source.status === "no-consensus"));
});

test("IQR exclusion remains distinct and usable range uses only final included values", () => {
  const flow = parameter("flowRateMlH", [1, 1, 1, 1222]);
  assert.equal(flow.value, 1);
  assert.deepEqual(flow.range, { minimum: 1, maximum: 1 });
  assert.equal(flow.sources.find((source) => source.rawValue === 1222)?.status, "outlier");
  assert.equal(flow.filteredOutlierExperimentIds.length, 1);
});

test("insufficient solution evidence remains distinct from consensus exclusion", () => {
  const result = buildInitialParameterRecommendation([match("included-a", { temperatureC: 25 }), match("included-b", { temperatureC: 25 }), match("ineligible", { temperatureC: 25 }, 2)]);
  const temperature = result.parameters.find((item) => item.key === "temperatureC");
  assert.ok(temperature);
  assert.equal(temperature.sources.find((source) => source.experimentId === "ineligible")?.status, "insufficient-evidence");
});

test("recommendation excludes missing values but preserves real zero", () => {
  const missing = match("missing", { collectorVoltageKv: Number.NaN });
  missing.context.experiment.telemetryData[0].collectorVoltageKv = undefined;
  const result = buildInitialParameterRecommendation([
    match("zero-a", { collectorVoltageKv: 0 }),
    match("zero-b", { collectorVoltageKv: 0 }),
    missing,
  ]);
  const hvNegative = result.parameters.find((item) => item.key === "collectorVoltageKv");
  assert.ok(hvNegative);
  assert.equal(hvNegative.value, 0);
  assert.equal(hvNegative.supportingExperimentCount, 2);
  assert.equal(hvNegative.sources.some((source) => source.experimentId === "missing"), false);
});
