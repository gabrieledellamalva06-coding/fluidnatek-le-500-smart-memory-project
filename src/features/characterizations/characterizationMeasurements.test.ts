import assert from "node:assert/strict";
import test from "node:test";

import {
  hasFiniteCharacterizationMeasurement,
  parseOptionalMeasurement,
  requireFiniteCharacterizationMeasurement,
} from "./characterizationMeasurements";

test("rejects a completely empty characterization", () => {
  assert.throws(
    () => requireFiniteCharacterizationMeasurement({}),
    /Enter at least one measurement before saving\./
  );
});
test("whitespace and invalid measurement values are rejected", () => {
  const values = {
    solidsContentPct: parseOptionalMeasurement("   "),
    viscosityMpas: parseOptionalMeasurement("not-a-number"),
  };
  assert.equal(values.solidsContentPct, undefined);
  assert.equal(values.viscosityMpas, undefined);
  assert.throws(() => requireFiniteCharacterizationMeasurement(values));
});

test("accepts one valid finite measurement", () => {
  const values = { conductivityUsCm: parseOptionalMeasurement("12.5") };
  assert.doesNotThrow(() => requireFiniteCharacterizationMeasurement(values));
  assert.equal(hasFiniteCharacterizationMeasurement(values), true);
});

test("accepts numeric zero and keeps missing values missing", () => {
  const values = {
    ph: parseOptionalMeasurement("0"),
    densityGcm3: parseOptionalMeasurement(""),
  };
  assert.equal(values.ph, 0);
  assert.equal(values.densityGcm3, undefined);
  assert.equal(hasFiniteCharacterizationMeasurement(values), true);
});
