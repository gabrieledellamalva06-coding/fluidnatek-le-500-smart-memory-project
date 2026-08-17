import assert from "node:assert/strict";
import test from "node:test";
import type { HistoricalExperimentContext } from "./similarity.types";
import { calculateSimilarityScore, calculateSolutionSimilarity } from "./similarity.engine";

function context(concentration?: number): HistoricalExperimentContext {
  return {
    experiment: {
      id: "experiment", formulationId: "form", operationIdentifier: "run",
      machineModel: "", injectorType: "", collectorType: "", operatorComments: "",
      sourceFile: "", ingestedAt: "", telemetryData: [],
    },
    formulation: {
      id: "form", projectId: "project", polymerName: "PEO", solvent: "",
      polymerConcentrationPct: concentration, materialBatchIds: [],
    },
  };
}

test("one-side missing solution criterion is excluded from numerator, denominator and evidence", () => {
  const result = calculateSolutionSimilarity(context(undefined), { polymer: "PEO", polymerConcentrationPct: 10 });
  assert.ok(result);
  assert.equal(result.score, 100);
  assert.equal(result.comparableCriteriaCount, 1);
});

test("both-side missing solution criterion does not increase evidence", () => {
  const result = calculateSolutionSimilarity(context(undefined), { polymer: "PEO" });
  assert.ok(result);
  assert.equal(result.comparableCriteriaCount, 1);
});

test("real zero concentration remains comparable", () => {
  const result = calculateSolutionSimilarity(context(0), { polymer: "PEO", polymerConcentrationPct: 0 });
  assert.ok(result);
  assert.equal(result.score, 100);
  assert.equal(result.comparableCriteriaCount, 2);
});

test("general similarity excludes historical missing values from denominator", () => {
  assert.equal(calculateSimilarityScore(context(undefined), { formulationId: "form", voltageKv: 15 }), 100);
});

test("missing text markers never become an exact match", () => {
  const missingContext = context(undefined);
  missingContext.formulation!.polymerName = "unknown";
  assert.equal(calculateSolutionSimilarity(missingContext, { polymer: "unknown" }), null);
});
