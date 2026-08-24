import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import type { Material } from "../../core/types/material";
import { buildPolymerIdentityOptions, hydratePolymerSelection, selectPolymerIdentity } from "./polymerIdentityOptions";
import { removeOptionalPolymerRow } from "./optionalPolymerRows";

function material(id: string, canonicalName: string, aliases: string[] = [], extra: Partial<Material> = {}): Material {
  return { id, canonicalName, aliases, category: "polymer", manufacturers: [], commercialNames: [], productCodes: [], aiTags: [], metadata: { createdAt: "", updatedAt: "", createdBy: "test", confidence: 1 }, ...extra };
}

test("reviewed exact aliases group variants and preserve every exact ID", () => {
  const options = buildPolymerIdentityOptions([material("peo-1", "PEO 100", ["PEO"]), material("peo-2", "PEO 900", ["peo"])]);
  assert.equal(options.length, 1);
  assert.equal(options[0].key, "identity:PEO");
  assert.deepEqual(options[0].memberMaterialIds.sort(), ["peo-1", "peo-2"]);
});

test("substring and polymer family alone never cause grouping", () => {
  const options = buildPolymerIdentityOptions([
    material("contains", "PEO-looking product", [], { polymerFamily: "Polyether" }),
    material("family", "Another product", [], { polymerFamily: "Polyether" }),
  ]);
  assert.deepEqual(options, []);
});

test("ambiguous or conflicting aliases stay out of normal choices but hydrate losslessly", () => {
  const record = material("ambiguous", "Mixed", ["PEO", "PCL"]);
  assert.deepEqual(buildPolymerIdentityOptions([record]), []);
  const hydrated = hydratePolymerSelection([record], "ambiguous");
  assert.equal(hydrated.materialId, "ambiguous");
  assert.equal(hydrated.identities[0].displayLabel, "Mixed");
  assert.equal(hydrated.identities[0].legacyReviewRequired, true);
});

test("exact existing IDs hydrate without substitution and unresolved IDs remain visible", () => {
  const materials = [material("exact", "PCL product", ["PCL"])];
  assert.deepEqual(hydratePolymerSelection(materials, "exact").identityKey, "identity:PCL");
  const unknown = hydratePolymerSelection(materials, "historic-missing");
  assert.equal(unknown.materialId, "historic-missing");
  assert.equal(unknown.identities.find((item) => item.key === unknown.identityKey)?.variants[0].displayLabel, "Unknown historical material");
});

test("duplicate labels receive exact-ID disambiguators", () => {
  const options = buildPolymerIdentityOptions([material("document-11111111", "Same", ["PVP"]), material("document-22222222", "Same", ["PVP"])]);
  assert.notEqual(options[0].variants[0].displayLabel, options[0].variants[1].displayLabel);
  assert.match(options[0].variants[0].displayLabel, /Variant /);
});

test("row identity changes are independent and preserve zero concentration", () => {
  const rows = [{ materialId: "one", concentration: 0 }, { materialId: "two", concentration: 5 }, { materialId: "three", concentration: undefined }];
  const changed = rows.map((row, index) => index === 1 ? selectPolymerIdentity(row, "identity:PEO") : row);
  assert.deepEqual(changed[0], rows[0]);
  assert.equal(changed[1].materialId, "");
  assert.equal(changed[1].concentration, 5);
  assert.deepEqual(changed[2], rows[2]);
  assert.equal(selectPolymerIdentity(rows[0], "identity:PCL").concentration, 0);
});

test("optional removal and compaction preserve exact ID and concentration", () => {
  assert.deepEqual(removeOptionalPolymerRow({ polymer2Id: "two", polymer2ConcentrationPct: 2, polymer3Id: "exact-three", polymer3ConcentrationPct: 0 }, 2), { polymer2Id: "exact-three", polymer2ConcentrationPct: 0, polymer3Id: "", polymer3ConcentrationPct: undefined });
});

test("normal user-facing labels contain no technical keys or material IDs", () => {
  const options = buildPolymerIdentityOptions([material("XLS_MAT_visible-secret", "PEO Product", ["PEO"])]);
  const labels = options.flatMap((item) => [item.displayLabel, ...item.variants.map((variant) => variant.displayLabel)]);
  assert.equal(labels.some((label) => /material:|identity:|XLS_MAT|visible-secret/i.test(label)), false);
});

test("reviewed invalid IDs are excluded while plausible exact-ID mappings remain", () => {
  const invalid = material("XLS_MAT_d42b4a46-a56a-5156-a24a-1d7091bab490", "Blue shimmer");
  const placeholder = material("e8c4f7a7-c186-4d8a-9473-83c5cf045a80", "2. MATERIAL");
  const carbopol = material("XLS_MAT_e7142e88-d7e2-5a81-a0f8-eae880cb53fe", "Carbopol 971P");
  const eudragit = material("XLS_MAT_3b38f067-a70f-507c-b72c-b148830b5b22", "EUDRAGIT FS 100");
  const options = buildPolymerIdentityOptions([invalid, placeholder, carbopol, eudragit]);
  assert.deepEqual(options.map((item) => item.displayLabel).sort(), ["Carbopol", "EUDRAGIT"]);
});

test("existing excluded IDs hydrate without replacement or material mutation", () => {
  const excluded = material("XLS_MAT_184830de-4217-5d1e-a2ad-2bcab7778286", "Propylene glycol");
  const snapshot = structuredClone(excluded);
  const hydrated = hydratePolymerSelection([excluded], excluded.id);
  assert.equal(hydrated.materialId, excluded.id);
  assert.equal(hydrated.identities.at(-1)?.displayLabel, "Propylene glycol");
  assert.equal(hydrated.identities.at(-1)?.legacyReviewRequired, true);
  assert.deepEqual(excluded, snapshot);
});

test("Polymer 1, 2, and 3 render the same safe selector component", () => {
  const source = readFileSync(join(process.cwd(), "src/components/Formulations.tsx"), "utf8");
  assert.equal((source.match(/<PolymerIdentityVariantSelect/g) ?? []).length, 3);
  assert.match(source, />Choose polymer</);
  assert.match(source, />Choose molecular weight or grade</);
  assert.equal(source.includes("Exact Material Variant"), false);
  assert.equal(source.includes("Polymer 1 Identity"), false);
});

test("variant labels are concise and contain no Supplier unknown noise", () => {
  const [peg] = buildPolymerIdentityOptions([
    material("peg-10", "PEG - Polietilenglicol - 10kDa", ["PEG"], { molecularWeight: "10 kDa", articleNumber: "code-not-needed" }),
    material("peg-20", "PEG - Polietilenglicol - 20kDa", ["PEG"], { molecularWeight: "20 kDa" }),
  ]);
  assert.deepEqual(peg.variants.map((variant) => variant.displayLabel), ["10 kDa · PEG", "20 kDa · PEG"]);
  assert.equal(peg.variants.some((variant) => variant.displayLabel.includes("Supplier unknown")), false);
  assert.equal(peg.variants.some((variant) => variant.displayLabel.includes("code-not-needed")), false);
});

test("article codes appear only when needed to disambiguate equal variants", () => {
  const [peo] = buildPolymerIdentityOptions([
    material("peo-a", "PEO product A", ["PEO"], { molecularWeight: "300 kDa", articleNumber: "A-1" }),
    material("peo-b", "PEO product B", ["PEO"], { molecularWeight: "300 kDa", articleNumber: "B-2" }),
  ]);
  assert.match(peo.variants[0].displayLabel, /Article\/product/);
  assert.match(peo.variants[1].displayLabel, /Article\/product/);
});

test("ambiguous PEG 400 metadata is flagged without conversion", () => {
  const options = buildPolymerIdentityOptions([
    material("XLS_MAT_cfa249b8-034d-54a7-aab1-9e769005c278", "PEG400 SIGMA GRADO R&D", [], { molecularWeight: "400 kDa" }),
    material("XLS_MAT_28e1e73f-451d-5a9b-96fd-40c7016f1fa4", "PEG - 400 - Sigma"),
  ]);
  const labels = options.flatMap((option) => option.variants.map((variant) => variant.displayLabel));
  assert.equal(labels.includes("Molecular-weight data requires review · PEG400 SIGMA GRADO R&D"), true);
  assert.equal(labels.includes("Molecular weight unknown · PEG - 400 - Sigma"), true);
  assert.equal(labels.some((label) => label === "400 kDa · PEG"), false);
});

test("audited EC records consolidate only through exact alias and ID review", () => {
  const options = buildPolymerIdentityOptions([
    material("ec-alias", "Ethyl Cellulose-SIGMA ALDRICH", ["EC"]),
    material("XLS_MAT_681b54b9-628c-5b1c-95d2-297767a5d972", "Ethyl Cellulose - 22 CP"),
  ]);
  assert.equal(options.length, 1);
  assert.equal(options[0].displayLabel, "Ethyl Cellulose (EC)");
  assert.deepEqual(options[0].memberMaterialIds.sort(), ["XLS_MAT_681b54b9-628c-5b1c-95d2-297767a5d972", "ec-alias"]);
});
