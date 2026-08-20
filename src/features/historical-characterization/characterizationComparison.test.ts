import assert from "node:assert/strict";
import test from "node:test";

import type { SolutionCharacterization } from "../../core/types/characterization";
import type { Experiment, Formulation } from "../../types";
import {
  buildCharacterizationComparisonRows,
  buildHistoricalCharacterizationEvidence,
  buildHistoricalCharacterizationEvidenceResult,
  buildPolymerCompositionDisplay,
} from "./characterizationComparison";

const formulation = {
  id: "form-1", projectId: "project-1", name: "Formulation one",
  polymerName: "PCL", polymerConcentrationPct: 10,
  solvent: "DMF", solvent1Name: "DMF", solvent1RatioPct: 100, materialBatchIds: [],
} satisfies Formulation;

function characterization(
  id: string,
  values: Partial<SolutionCharacterization> = {}
): SolutionCharacterization {
  return { id, formulationId: "form-1", ...values };
}

function experiment(id: string): Experiment {
  return {
    id, formulationId: "form-1", operationIdentifier: `Run ${id}`,
    machineModel: "LE-500", injectorType: "needle", collectorType: "drum",
    jetStabilityGrade: 4, operatorComments: "", sourceFile: "", ingestedAt: "",
    telemetryData: [],
  };
}

function evidenceInput(overrides: Partial<Parameters<typeof buildHistoricalCharacterizationEvidence>[0]> = {}) {
  const current = characterization("current");
  return {
    current,
    formulation,
    formulations: [formulation],
    characterizations: [current],
    experiments: [] as Experiment[],
    materials: [],
    ...overrides,
  };
}

test("compares both available values and calculates current minus historical", () => {
  const rows = buildCharacterizationComparisonRows(
    characterization("current", { viscosityMpas: 12.5 }),
    characterization("historical", { viscosityMpas: 10 })
  );
  const viscosity = rows.find((row) => row.key === "viscosityMpas")!;
  assert.equal(viscosity.currentValue, 12.5);
  assert.equal(viscosity.historicalValue, 10);
  assert.equal(viscosity.difference, 2.5);
});

test("keeps missing current values missing", () => {
  const row = buildCharacterizationComparisonRows(
    characterization("current"),
    characterization("historical", { conductivityUsCm: 7 })
  ).find((item) => item.key === "conductivityUsCm")!;
  assert.equal(row.currentValue, undefined);
  assert.equal(row.historicalValue, 7);
  assert.equal(row.difference, undefined);
});

test("keeps missing historical values missing", () => {
  const row = buildCharacterizationComparisonRows(
    characterization("current", { densityGcm3: 1.1 }),
    characterization("historical")
  ).find((item) => item.key === "densityGcm3")!;
  assert.equal(row.currentValue, 1.1);
  assert.equal(row.historicalValue, undefined);
  assert.equal(row.difference, undefined);
});

test("preserves a legitimate numeric zero", () => {
  const row = buildCharacterizationComparisonRows(
    characterization("current", { ph: 0 }),
    characterization("historical", { ph: 0 })
  ).find((item) => item.key === "ph")!;
  assert.equal(row.currentValue, 0);
  assert.equal(row.historicalValue, 0);
  assert.equal(row.difference, 0);
});

test("returns multiple records newest first with formulation-level experiment identity", () => {
  const current = characterization("current");
  const evidence = buildHistoricalCharacterizationEvidence(evidenceInput({
    characterizations: [
      current,
      characterization("older", { measuredAt: "2025-01-01T00:00:00Z" }),
      characterization("newer", { measuredAt: "2026-01-01T00:00:00Z" }),
    ],
    experiments: [experiment("B"), experiment("A")],
  }));
  assert.deepEqual(evidence.map((item) => item.characterization.id), ["newer", "older"]);
  assert.ok(evidence.every((item) => item.group === "same-formulation"));
  assert.deepEqual(evidence[0].experimentIdentities, ["Run A", "Run B"]);
});

test("includes a different formulation ID with equivalent composition", () => {
  const equivalent = { ...formulation, id: "equivalent", name: "Equivalent" };
  const historical = { ...characterization("equivalent-char"), formulationId: equivalent.id };
  const evidence = buildHistoricalCharacterizationEvidence(evidenceInput({
    formulations: [formulation, equivalent], characterizations: [characterization("current"), historical],
  }));
  assert.equal(evidence[0].group, "similar-formulation");
  assert.equal(evidence[0].solutionSimilarity, 100);
  assert.equal(evidence[0].earnedWeight, 70);
  assert.equal(evidence[0].availableWeight, 70);
  assert.deepEqual(evidence[0].criteria?.map((item) => [item.key, item.includedInDenominator]), [
    ["polymer", true], ["polymerFamily", false], ["molecularWeight", false], ["concentration", true], ["solventSystem", true],
  ]);
});

test("includes similar composition using the existing solution similarity score", () => {
  const similar = { ...formulation, id: "similar", polymerConcentrationPct: 12, solvent1RatioPct: 90 };
  const historical = { ...characterization("similar-char"), formulationId: similar.id };
  const evidence = buildHistoricalCharacterizationEvidence(evidenceInput({
    formulations: [formulation, similar], characterizations: [characterization("current"), historical],
  }));
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].group, "similar-formulation");
  assert.ok((evidence[0].solutionSimilarity ?? 0) < 100);
  assert.ok((evidence[0].solutionSimilarity ?? 0) >= 30);
});

test("excludes a clearly unrelated formulation", () => {
  const unrelated = { ...formulation, id: "unrelated", polymerName: "Nylon", solvent: "Water", solvent1Name: "Water" };
  assert.deepEqual(buildHistoricalCharacterizationEvidence(evidenceInput({
    formulations: [formulation, unrelated],
    characterizations: [characterization("current"), { ...characterization("other"), formulationId: unrelated.id }],
  })), []);
});

test("excludes known incompatible solvent systems and produces a transparent reason", () => {
  const incompatible = { ...formulation, id: "incompatible", solvent: "Ethanol + Water", solvent1Name: "Ethanol", solvent1RatioPct: 30, solvent2Name: "Water", solvent2RatioPct: 70 };
  const result = buildHistoricalCharacterizationEvidenceResult(evidenceInput({
    formulations: [formulation, incompatible],
    characterizations: [characterization("current"), { ...characterization("incompatible-char"), formulationId: incompatible.id }],
  }));
  assert.equal(result.eligible.length, 0);
  assert.equal(result.excluded.length, 1);
  assert.equal(result.excluded[0].reason, "Excluded from characterization evidence: solvent system not comparable.");
});

test("missing solvent data is excluded and never converted to zero", () => {
  const missingSolvent = { ...formulation, id: "missing-solvent", solvent: "", solvent1Name: undefined, solvent1RatioPct: undefined };
  const result = buildHistoricalCharacterizationEvidenceResult(evidenceInput({
    formulations: [formulation, missingSolvent],
    characterizations: [characterization("current"), { ...characterization("missing-char"), formulationId: missingSolvent.id }],
  }));
  assert.equal(result.eligible.length, 0);
  assert.equal(result.excluded[0].reason, "Excluded from characterization evidence: insufficient solvent data for comparison.");
});

test("excludes cross-formulation evidence with fewer than two comparable composition criteria", () => {
  const incomplete = { id: "incomplete", projectId: "project-2", polymerName: "PCL", solvent: "", materialBatchIds: [] } satisfies Formulation;
  assert.deepEqual(buildHistoricalCharacterizationEvidence(evidenceInput({
    formulations: [formulation, incomplete],
    characterizations: [characterization("current"), { ...characterization("incomplete-char"), formulationId: incomplete.id }],
  })), []);
});

test("orders same formulation first, then similarity, date, formulation and characterization IDs", () => {
  const exact = characterization("exact", { measuredAt: "2020-01-01" });
  const equivalentA = { ...formulation, id: "equivalent-a" };
  const equivalentB = { ...formulation, id: "equivalent-b" };
  const similar = { ...formulation, id: "similar", polymerConcentrationPct: 12 };
  const evidence = buildHistoricalCharacterizationEvidence(evidenceInput({
    formulations: [formulation, equivalentA, equivalentB, similar],
    characterizations: [characterization("current"), exact,
      { ...characterization("b-char"), formulationId: equivalentB.id, measuredAt: "2025-01-01" },
      { ...characterization("a-char"), formulationId: equivalentA.id, measuredAt: "2025-01-01" },
      { ...characterization("similar-char"), formulationId: similar.id, measuredAt: "2026-01-01" }],
  }));
  assert.deepEqual(evidence.map((item) => item.characterization.id), ["exact", "a-char", "b-char", "similar-char"]);
});

test("polymer display falls back to formulation concentration and preserves zero", () => {
  const withFallback = { ...formulation, polymerConcentrationPct: 9, compositionComponents: [{ materialId: "polymer", materialName: "PEO", role: "polymer" as const }] };
  assert.deepEqual(buildPolymerCompositionDisplay(withFallback), [{ name: "PEO", concentration: 9, unit: "%" }]);
  assert.deepEqual(buildPolymerCompositionDisplay({ ...withFallback, polymerConcentrationPct: 0 }), [{ name: "PEO", concentration: 0, unit: "%" }]);
});
