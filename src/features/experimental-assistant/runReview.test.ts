import assert from "node:assert/strict";
import test from "node:test";
import type { Material } from "../../core/types/material";
import type { ExperimentalSetup } from "../../core/types/setup";
import type { Formulation } from "../../types";
import { buildCharacterizationReview, buildFormulationReview, buildOperatingChanges, buildSetupReview, compactRows } from "./runReview";

const material = (id: string, name: string, molecularWeight?: string, grade?: string) => ({ id, canonicalName: name, molecularWeight, grade } as Material);

test("hides missing optional values while preserving numeric zero", () => {
  assert.deepEqual(compactRows([["Missing", undefined], ["Blank", "  "], ["Zero", 0]]), [{ label: "Zero", value: "0" }]);
  assert.deepEqual(buildCharacterizationReview({ id: "c", formulationId: "f", ph: 0 }), [{ label: "pH", value: "0" }]);
});

test("builds complete formulation and setup review rows", () => {
  const formulation = { id: "f", projectId: "p", name: "Blend", polymerName: "P1", solvent: "S1", materialBatchIds: [], compositionComponents: [
    { materialId: "p1", materialName: "Polymer A", role: "polymer", quantity: 0, unit: "wt_pct" },
    { materialId: "p2", materialName: "Polymer B", role: "polymer", quantity: 5, unit: "wt_pct" },
    { materialId: "s1", materialName: "Solvent A", role: "solvent", quantity: 100, unit: "vol_pct" },
  ] } satisfies Formulation;
  const review = buildFormulationReview(formulation, [material("p1", "Polymer A", "100 kDa", "G1"), material("p2", "Polymer B", "200 kDa"), material("s1", "Solvent A")]);
  assert.equal(review.polymers.length, 2);
  assert.match(review.polymers[0].value, /100 kDa \/ G1/);
  assert.match(review.polymers[0].value, /0%/);
  assert.equal(review.solvents.length, 1);
  const setup = { id: "s", createdAt: "", updatedAt: "", machine: { model: "LE-500", manufacturer: "Bioinicia" }, injector: { type: "needle", model: "I-1", needleGauge: "22G", needleCount: 0, emitterCount: 2 }, collector: { type: "drum", model: "D-1" }, platformConfiguration: "Dual supply" } satisfies ExperimentalSetup;
  const setupRows = buildSetupReview(setup);
  assert.ok(["Machine", "Manufacturer", "Injector", "Injector model", "Collector", "Collector model", "Needle gauge", "Needle count", "Emitter count", "Working hardware configuration"].every((label) => setupRows.some((row) => row.label === label)));
  assert.equal(setupRows.find((row) => row.label === "Needle count")?.value, "0");
});

test("tracks applied recommendation changes without persistence data", () => {
  const changes = buildOperatingChanges({ temperatureC: 30 }, { temperatureC: 25.1 }, { temperatureC: { source: "Recommended Starting Parameters", previousValue: 30, appliedValue: 25.1 } });
  assert.deepEqual(changes, [{ key: "temperatureC", label: "Temperature", unit: "°C", original: 30, final: 25.1, source: "Recommended Starting Parameters" }]);
});

test("manual adjustment after a recommendation is reported as manual", () => {
  const changes = buildOperatingChanges({ temperatureC: 30 }, { temperatureC: 26 }, { temperatureC: { source: "Recommended Starting Parameters", previousValue: 30, appliedValue: 25.1, manuallyAdjusted: true } });
  assert.equal(changes[0].source, "Manual adjustment");
  assert.equal(changes[0].final, 26);
});
