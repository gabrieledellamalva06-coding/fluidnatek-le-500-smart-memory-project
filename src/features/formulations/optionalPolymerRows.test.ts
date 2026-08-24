import assert from "node:assert/strict";
import test from "node:test";

import {
  addOptionalPolymerRow,
  optionalPolymerRowIsComplete,
  removeOptionalPolymerRow,
  submittedOptionalPolymers,
  visibleOptionalPolymerRows,
} from "./optionalPolymerRows";

const empty = {
  polymer2Id: "",
  polymer2ConcentrationPct: undefined,
  polymer3Id: "",
  polymer3ConcentrationPct: undefined,
};

test("only Polymer 1 is visible initially and adding stops after Polymer 3", () => {
  assert.equal(visibleOptionalPolymerRows(empty), 0);
  assert.equal(addOptionalPolymerRow(0), 1);
  assert.equal(addOptionalPolymerRow(1), 2);
  assert.equal(addOptionalPolymerRow(2), 2);
});

test("removing Polymer 3 clears its exact values", () => {
  const result = removeOptionalPolymerRow({
    polymer2Id: "material-2",
    polymer2ConcentrationPct: 4.5,
    polymer3Id: "material-3",
    polymer3ConcentrationPct: 0,
  }, 3);
  assert.deepEqual(result, {
    polymer2Id: "material-2",
    polymer2ConcentrationPct: 4.5,
    polymer3Id: "",
    polymer3ConcentrationPct: undefined,
  });
});

test("removing Polymer 2 compacts all Polymer 3 values into Polymer 2", () => {
  const result = removeOptionalPolymerRow({
    polymer2Id: "material-2",
    polymer2ConcentrationPct: 2,
    polymer3Id: "material-3-exact-id",
    polymer3ConcentrationPct: 7.25,
  }, 2);
  assert.deepEqual(result, {
    polymer2Id: "material-3-exact-id",
    polymer2ConcentrationPct: 7.25,
    polymer3Id: "",
    polymer3ConcentrationPct: undefined,
  });
});

test("hidden and removed values are not submitted and zero remains valid", () => {
  const values = {
    polymer2Id: "material-2",
    polymer2ConcentrationPct: 0,
    polymer3Id: "stale-hidden-id",
    polymer3ConcentrationPct: 9,
  };
  assert.deepEqual(submittedOptionalPolymers(values, 1), [
    { materialId: "material-2", concentrationPct: 0 },
  ]);
  assert.equal(optionalPolymerRowIsComplete("material-2", 0), true);
  assert.equal(optionalPolymerRowIsComplete("material-2", undefined), false);
});

test("existing two- and three-polymer values reveal rows without changing stored data", () => {
  const two = { ...empty, polymer2Id: "exact-2", polymer2ConcentrationPct: 3.2 };
  const three = { ...two, polymer3Id: "exact-3", polymer3ConcentrationPct: 6.8 };
  assert.equal(visibleOptionalPolymerRows(two), 1);
  assert.equal(visibleOptionalPolymerRows(three), 2);
  assert.deepEqual(submittedOptionalPolymers(three, 2), [
    { materialId: "exact-2", concentrationPct: 3.2 },
    { materialId: "exact-3", concentrationPct: 6.8 },
  ]);
});

test("optional polymer row changes leave solvent state unchanged", () => {
  const form = {
    ...empty,
    polymer2Id: "material-2",
    polymer2ConcentrationPct: 5,
    solvent1Id: "solvent-1",
    solvent1RatioPct: 80,
    solvent2Id: "solvent-2",
    solvent2RatioPct: 20,
  };
  const updated = { ...form, ...removeOptionalPolymerRow(form, 2) };
  assert.deepEqual(
    {
      solvent1Id: updated.solvent1Id,
      solvent1RatioPct: updated.solvent1RatioPct,
      solvent2Id: updated.solvent2Id,
      solvent2RatioPct: updated.solvent2RatioPct,
    },
    {
      solvent1Id: "solvent-1",
      solvent1RatioPct: 80,
      solvent2Id: "solvent-2",
      solvent2RatioPct: 20,
    }
  );
});
