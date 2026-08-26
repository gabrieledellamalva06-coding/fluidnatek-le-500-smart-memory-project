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

test("real zero is comparable while missing criteria do not add evidence", () => {
  const result = searchSimilarProcessExperiments(
    [context("zero", { collectorVoltageKv: 0 }), context("missing", {})],
    { included: ["collectorVoltageKv", "drumSpeedRpm"], values: { collectorVoltageKv: 0, drumSpeedRpm: 0 } }
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].context.experiment.id, "zero");
  assert.equal(result[0].comparableCriteriaCount, 1);
  assert.equal(result[0].comparableCriteriaTotal, 2);
  assert.equal(result[0].processScore, 100);
  assert.equal(result[0].matchingCriteriaCount, 1);
});

test("three comparable and matching constraints report matches 3/3 and comparable data 3/3", () => {
  const [match] = searchSimilarProcessExperiments(
    [context("all-match", { temperatureC: 20, voltageKv: 15, flowRateMlH: 1 })],
    { included: ["temperatureC", "voltageKv", "flowRateMlH"], values: { temperatureC: 20, voltageKv: 15, flowRateMlH: 1 } }
  );
  assert.equal(match.matchingCriteriaCount, 3);
  assert.equal(match.comparableCriteriaCount, 3);
  assert.equal(match.comparableCriteriaTotal, 3);
});

test("three comparable with two tolerance matches report matches 2/3 and comparable data 3/3", () => {
  const [match] = searchSimilarProcessExperiments(
    [context("two-match", { temperatureC: 30, voltageKv: 15, flowRateMlH: 1 })],
    { included: ["temperatureC", "voltageKv", "flowRateMlH"], values: { temperatureC: 20, voltageKv: 15, flowRateMlH: 1 } }
  );
  assert.equal(match.processScore, 67);
  assert.equal(match.matchingCriteriaCount, 2);
  assert.equal(match.comparableCriteriaCount, 3);
  assert.equal(match.comparableCriteriaTotal, 3);
});

test("two comparable matching constraints out of three report matches 2/3 and comparable data 2/3", () => {
  const [match] = searchSimilarProcessExperiments(
    [context("partial-match", { temperatureC: 20, voltageKv: 15 })],
    { included: ["temperatureC", "voltageKv", "flowRateMlH"], values: { temperatureC: 20, voltageKv: 15, flowRateMlH: 1 } }
  );
  assert.equal(match.matchingCriteriaCount, 2);
  assert.equal(match.comparableCriteriaCount, 2);
  assert.equal(match.comparableCriteriaTotal, 3);
});

test("valid zero is comparable and matching", () => {
  const [match] = searchSimilarProcessExperiments(
    [context("zero-match", { collectorVoltageKv: 0, drumSpeedRpm: 0 })],
    { included: ["collectorVoltageKv", "drumSpeedRpm"], values: { collectorVoltageKv: 0, drumSpeedRpm: 0 } }
  );
  assert.equal(match.matchingCriteriaCount, 2);
  assert.equal(match.comparableCriteriaCount, 2);
});

test("missing selected values are neither comparable nor matches", () => {
  const [match] = searchSimilarProcessExperiments(
    [context("missing-one", { temperatureC: 20 })],
    { included: ["temperatureC", "voltageKv"], values: { temperatureC: 20, voltageKv: 15 } }
  );
  assert.equal(match.matchingCriteriaCount, 1);
  assert.equal(match.comparableCriteriaCount, 1);
  assert.equal(match.comparableCriteriaTotal, 2);
});

test("non-selected parameters are excluded from all counts and the executed constraint snapshot", () => {
  const query = { included: ["temperatureC"] as const, values: { temperatureC: 20, voltageKv: 15 } };
  const [match] = searchSimilarProcessExperiments(
    [context("selected-only", { temperatureC: 20, voltageKv: 100 })],
    { included: [...query.included], values: query.values }
  );
  assert.equal(match.matchingCriteriaCount, 1);
  assert.equal(match.comparableCriteriaCount, 1);
  assert.equal(match.comparableCriteriaTotal, 1);
  assert.deepEqual(match.selectedCriteria, ["temperatureC"]);
  assert.deepEqual(match.queryValues, { temperatureC: 20 });
});
