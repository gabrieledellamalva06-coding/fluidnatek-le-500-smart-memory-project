import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { addOptionalPolymerRow, visibleOptionalPolymerRows } from "./optionalPolymerRows";
import {
  addOptionalSolventRow,
  clearNewOptionalSolventRow,
  duplicateVisibleSolventId,
  optionalSolventRowIsComplete,
  removeOptionalSolventRow,
  submittedOptionalSolvents,
  visibleOptionalSolventRows,
  visibleSolventTotal,
  validateVisibleSolvents,
} from "./optionalSolventRows";

const empty = { solvent2Id: "", solvent2RatioPct: undefined, solvent3Id: "", solvent3RatioPct: undefined };

test("only Solvent 1 is initially visible and adding stops at three solvents", () => {
  assert.equal(visibleOptionalSolventRows(empty), 0);
  assert.equal(addOptionalSolventRow(0), 1);
  assert.equal(addOptionalSolventRow(1), 2);
  assert.equal(addOptionalSolventRow(2), 2);
});

test("removing Solvent 3 clears and hides it", () => {
  const result = removeOptionalSolventRow({ solvent2Id: "s2", solvent2RatioPct: 20, solvent3Id: "s3", solvent3RatioPct: 0 }, 3);
  assert.deepEqual(result, { solvent2Id: "s2", solvent2RatioPct: 20, solvent3Id: "", solvent3RatioPct: undefined });
  assert.equal(visibleOptionalSolventRows(result), 1);
});

test("removing Solvent 2 compacts exact Solvent 3 values", () => {
  assert.deepEqual(removeOptionalSolventRow({ solvent2Id: "s2", solvent2RatioPct: 20, solvent3Id: "exact-s3", solvent3RatioPct: 5.5 }, 2), {
    solvent2Id: "exact-s3", solvent2RatioPct: 5.5, solvent3Id: "", solvent3RatioPct: undefined,
  });
});

test("hidden values are excluded and total uses only visible rows", () => {
  const values = { solvent2Id: "s2", solvent2RatioPct: 20, solvent3Id: "stale", solvent3RatioPct: 70 };
  assert.deepEqual(submittedOptionalSolvents(values, 1), [{ materialId: "s2", ratioPct: 20 }]);
  assert.equal(visibleSolventTotal(80, values, 1), 100);
  assert.equal(visibleSolventTotal(80, values, 0), 80);
});

test("incomplete rows stay incomplete and missing differs from zero", () => {
  assert.equal(optionalSolventRowIsComplete("s2", undefined), false);
  assert.equal(optionalSolventRowIsComplete("s2", 0), true);
  assert.equal(Number.isNaN(visibleSolventTotal(100, empty, 1)), true);
});

test("duplicate exact visible IDs are detected without alias matching", () => {
  assert.equal(duplicateVisibleSolventId("same", { ...empty, solvent2Id: "same", solvent2RatioPct: 0 }, 1), "same");
  assert.equal(duplicateVisibleSolventId("s1", { ...empty, solvent2Id: "s2", solvent2RatioPct: 0 }, 1), undefined);
});

test("existing two and three solvent values reveal without changing IDs, ratios, or order", () => {
  const two = { ...empty, solvent2Id: "exact-2", solvent2RatioPct: 20 };
  const three = { ...two, solvent3Id: "exact-3", solvent3RatioPct: 10 };
  assert.equal(visibleOptionalSolventRows(two), 1);
  assert.equal(visibleOptionalSolventRows(three), 2);
  assert.deepEqual(submittedOptionalSolvents(three, 2), [
    { materialId: "exact-2", ratioPct: 20 },
    { materialId: "exact-3", ratioPct: 10 },
  ]);
});

test("obsolete second and third solvent checkboxes are absent", () => {
  const source = readFileSync(join(process.cwd(), "src/components/Formulations.tsx"), "utf8");
  assert.equal(source.includes("Use a second solvent"), false);
  assert.equal(source.includes("Use a third solvent"), false);
  assert.equal(source.includes("useSolvent2"), false);
  assert.equal(source.includes("useSolvent3"), false);
});

test("optional polymer visibility behavior remains unchanged", () => {
  const polymers = { polymer2Id: "", polymer2ConcentrationPct: undefined, polymer3Id: "", polymer3ConcentrationPct: undefined };
  assert.equal(visibleOptionalPolymerRows(polymers), 0);
  assert.equal(addOptionalPolymerRow(0), 1);
});

test("valid solvent totals pass for one, two, and three solvents", () => {
  assert.equal(validateVisibleSolvents("s1", 100, empty, 0).valid, true);
  assert.equal(validateVisibleSolvents("s1", 80, { ...empty, solvent2Id: "s2", solvent2RatioPct: 20 }, 1).valid, true);
  assert.equal(validateVisibleSolvents("s1", 70, { solvent2Id: "s2", solvent2RatioPct: 20, solvent3Id: "s3", solvent3RatioPct: 10 }, 2).valid, true);
});

test("invalid totals are rejected using the existing tolerance", () => {
  assert.equal(validateVisibleSolvents("s1", 100, { solvent2Id: "s2", solvent2RatioPct: 80, solvent3Id: "s3", solvent3RatioPct: 90 }, 2).totalValid, false);
  assert.equal(validateVisibleSolvents("s1", 99.998, empty, 0).totalValid, false);
  assert.equal(validateVisibleSolvents("s1", 100.0005, empty, 0).totalValid, true);
});

test("blank, negative, non-finite, and over-100 ratios are invalid", () => {
  assert.equal(validateVisibleSolvents("s1", undefined, empty, 0).valid, false);
  assert.equal(validateVisibleSolvents("s1", -1, empty, 0).valid, false);
  assert.equal(validateVisibleSolvents("s1", Number.POSITIVE_INFINITY, empty, 0).valid, false);
  assert.equal(validateVisibleSolvents("s1", 101, empty, 0).valid, false);
});

test("newly revealed rows are cleared before use", () => {
  const stale = { solvent2Id: "old-2", solvent2RatioPct: 80, solvent3Id: "old-3", solvent3RatioPct: 90 };
  assert.deepEqual(clearNewOptionalSolventRow(stale, 2), { ...stale, solvent2Id: "", solvent2RatioPct: undefined });
  assert.deepEqual(clearNewOptionalSolventRow(stale, 3), { ...stale, solvent3Id: "", solvent3RatioPct: undefined });
});

test("removal immediately excludes stale ratios from validation and totals", () => {
  const removed = removeOptionalSolventRow({ solvent2Id: "s2", solvent2RatioPct: 80, solvent3Id: "", solvent3RatioPct: undefined }, 2);
  assert.equal(visibleSolventTotal(100, removed, 0), 100);
  assert.equal(validateVisibleSolvents("s1", 100, removed, 0).valid, true);
});

test("validation is pure and leaves legacy loaded records unchanged", () => {
  const legacy = { solvent2Id: "s2", solvent2RatioPct: 80, solvent3Id: "s3", solvent3RatioPct: 90 };
  const snapshot = structuredClone(legacy);
  assert.equal(validateVisibleSolvents("s1", 100, legacy, 2).valid, false);
  assert.deepEqual(legacy, snapshot);
});

test("the create button and submit handler share validation enforcement", () => {
  const source = readFileSync(join(process.cwd(), "src/components/Formulations.tsx"), "utf8");
  assert.match(source, /disabled=\{saving \|\| !solventValidation\.valid\}/);
  assert.match(source, /if \(!solventValidation\.totalValid\)/);
  assert.match(source, /Solvent ratios must total 100%\./);
});
