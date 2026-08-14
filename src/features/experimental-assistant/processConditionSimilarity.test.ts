import assert from "node:assert/strict";
import test from "node:test";
import { calculateProcessConditionSimilarity, searchSimilarProcessExperiments } from "./processConditionSimilarity.engine";
import type { HistoricalExperimentContext } from "./similarity.types";

function context(id: string, values: Partial<Record<string, number>>): HistoricalExperimentContext {
  return { experiment: { id, formulationId: "f", operationIdentifier: id, machineModel: "m", injectorType: "i", collectorType: "c", distanceMm: values.distanceMm ?? 0, jetStabilityGrade: 4, operatorComments: "", sourceFile: "", ingestedAt: "", telemetryData: [{ timestampSec: 0, voltageKv: values.voltageKv, collectorVoltageKv: values.collectorVoltageKv, flowRateMlH: values.flowRateMlH, temperatureC: values.temperatureC, humidityPct: values.humidityPct, distanceMm: values.distanceMm, drumSpeedRpm: values.drumSpeedRpm }] } } as HistoricalExperimentContext;
}

test("exact, signed HV- and tolerance semantics are deterministic", () => {
  assert.equal(calculateProcessConditionSimilarity(20, 20, "temperatureC"), 1);
  assert.equal(calculateProcessConditionSimilarity(-5, -5, "collectorVoltageKv"), 1);
  assert.equal(calculateProcessConditionSimilarity(20, 25, "temperatureC"), 0);
});

test("partial evidence receives lower completeness-aware ranking", () => {
  const result = searchSimilarProcessExperiments([context("partial", { temperatureC: 20 }), context("complete", { temperatureC: 21, voltageKv: 15, flowRateMlH: 10 })], { included: ["temperatureC", "voltageKv", "flowRateMlH"], values: { temperatureC: 20, voltageKv: 15, flowRateMlH: 10 } });
  assert.equal(result[0].context.experiment.id, "complete");
  assert.equal(result.find((item) => item.context.experiment.id === "partial")?.comparableCriteriaCount, 1);
});

test("missing and zero-closeness records are excluded; ties are deterministic", () => {
  const result = searchSimilarProcessExperiments([context("z", { temperatureC: 100 }), context("b", { temperatureC: 20 }), context("a", { temperatureC: 20 }), context("missing", {})], { included: ["temperatureC"], values: { temperatureC: 20 } });
  assert.deepEqual(result.map((item) => item.context.experiment.id), ["a", "b"]);
});
