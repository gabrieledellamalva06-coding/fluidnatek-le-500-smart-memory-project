import assert from "node:assert/strict";
import test from "node:test";
import { classifyCategoricalComparison, classifyNumericComparison } from "./comparisonClassification";
import { processParameterTolerances } from "./processParameterTolerances";
import { isMissingValue } from "./valueSemantics";

const exactCases: Array<[string, number, string]> = [
  ["HV+", 15, "voltageKv"], ["HV- zero", 0, "collectorVoltageKv"],
  ["HV- negative", -5, "collectorVoltageKv"], ["Flow", 1, "flowRateMlH"],
  ["Temperature", 25, "temperatureC"], ["Humidity", 40, "humidityPct"],
  ["Distance", 150, "distanceMm"], ["Drum zero", 0, "drumSpeedRpm"],
];

for (const [label, value, key] of exactCases) {
  test(`${label}: exact numeric equality is Same`, () => {
    assert.deepEqual(classifyNumericComparison(value, value, processParameterTolerances[key]), { kind: "same", comparable: true });
  });
}

test("missing numeric combinations are No data and not comparable", () => {
  const tolerance = processParameterTolerances.voltageKv;
  for (const [left, right] of [[undefined, 15], [15, undefined], [undefined, undefined], [null, 0], ["", 0], [Number.NaN, Number.NaN]]) {
    assert.deepEqual(classifyNumericComparison(left, right, tolerance), { kind: "no-data", comparable: false });
  }
});

test("missing categorical markers are never Same", () => {
  for (const value of ["unknown", "No data", "n/a", "NA", "not available", "not specified", "   "]) {
    assert.deepEqual(classifyCategoricalComparison(value, value), { kind: "no-data", comparable: false });
  }
});

test("zero stays valid across Same, Close, Different and missing", () => {
  const tolerance = processParameterTolerances.collectorVoltageKv;
  assert.equal(classifyNumericComparison(0, 0, tolerance).kind, "same");
  assert.equal(classifyNumericComparison(0, undefined, tolerance).kind, "no-data");
  assert.equal(classifyNumericComparison(0, 1, tolerance).kind, "close");
  assert.equal(classifyNumericComparison(0, 2, tolerance).kind, "different");
});

test("tolerance boundary is Close and a value outside is Different", () => {
  const tolerance = processParameterTolerances.voltageKv;
  assert.equal(classifyNumericComparison(20, 22, tolerance).kind, "close");
  assert.equal(classifyNumericComparison(20, 22.01, tolerance).kind, "different");
});

test("missing normalization preserves real zero", () => {
  assert.equal(isMissingValue(0), false);
  assert.equal(isMissingValue(Number.POSITIVE_INFINITY), true);
});
