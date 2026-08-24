import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import type { Material } from "../../core/types/material";
import { buildPolymerIdentityOptions } from "./polymerIdentityOptions";
import {
  buildPolymerCatalogCreateInput,
  EMPTY_POLYMER_CATALOG_DRAFT,
  findDuplicatePolymerMaterial,
  validatePolymerCatalogDraft,
} from "./polymerCatalogMaterial";

function material(id: string, canonicalName: string, extra: Partial<Material> = {}): Material {
  return { id, canonicalName, aliases: ["PCL"], category: "polymer", manufacturers: [], commercialNames: [], productCodes: [], aiTags: [], metadata: { createdAt: "", updatedAt: "", createdBy: "test", confidence: 1 }, ...extra };
}

test("creates a structured exact variant under an existing identity", () => {
  const identities = buildPolymerIdentityOptions([material("pcl-80", "PCL grade 80")]);
  const draft = { ...EMPTY_POLYMER_CATALOG_DRAFT, identityKey: "identity:PCL", productName: "PCL grade 120", molecularWeightValue: "120", molecularWeightUnit: "kDa" as const, supplier: "Supplier A", articleNumber: "PCL-120" };
  assert.equal(validatePolymerCatalogDraft(draft, identities), undefined);
  assert.deepEqual(buildPolymerCatalogCreateInput(draft, identities), {
    shortName: "PCL", canonicalName: "PCL grade 120", category: "polymer", polymerIdentity: "PCL", grade: "PCL grade 120",
    molecularWeightValue: 120, molecularWeightUnit: "kDa", molecularWeight: "120 kDa", supplier: "Supplier A", articleNumber: "PCL-120", aliases: [],
  });
});

test("missing molecular weight stays missing and zero is rejected", () => {
  const identities = buildPolymerIdentityOptions([material("pcl", "PCL")]);
  const missing = { ...EMPTY_POLYMER_CATALOG_DRAFT, identityKey: "identity:PCL", productName: "Unspecified weight" };
  assert.equal(buildPolymerCatalogCreateInput(missing, identities).molecularWeightValue, undefined);
  assert.match(validatePolymerCatalogDraft({ ...missing, molecularWeightValue: "0", molecularWeightUnit: "kDa" }, identities) ?? "", /positive/);
});

test("detects an exact duplicate and returns its existing exact ID", () => {
  const existing = material("existing-exact-id", "PCL grade 120", { molecularWeightValue: 120, molecularWeightUnit: "kDa", molecularWeight: "120 kDa", supplier: "Supplier A", articleNumber: "PCL-120" });
  const identities = buildPolymerIdentityOptions([existing]);
  const draft = { ...EMPTY_POLYMER_CATALOG_DRAFT, identityKey: "identity:PCL", productName: " pcl grade 120 ", molecularWeightValue: "120", molecularWeightUnit: "kDa" as const, supplier: "supplier a", articleNumber: "pcl-120" };
  assert.equal(findDuplicatePolymerMaterial(draft, identities)?.id, "existing-exact-id");
});

test("supports an explicit new identity without guessing from product text", () => {
  const draft = { ...EMPTY_POLYMER_CATALOG_DRAFT, mode: "new" as const, newIdentity: "New Polymer", newIdentityAlias: "NP", productName: "Grade A" };
  const input = buildPolymerCatalogCreateInput(draft, []);
  assert.equal(input.polymerIdentity, "New Polymer");
  assert.equal(input.shortName, "NP");
  assert.deepEqual(input.aliases, ["NP"]);
  assert.equal(input.canonicalName, "Grade A");
});

test("blank new identity and alias are rejected", () => {
  const blank = { ...EMPTY_POLYMER_CATALOG_DRAFT, mode: "new" as const, newIdentity: "   ", newIdentityAlias: "NP", productName: "Grade A" };
  assert.match(validatePolymerCatalogDraft(blank, []), /new polymer name/i);
  assert.match(validatePolymerCatalogDraft({ ...blank, newIdentity: "New Polymer", newIdentityAlias: "  " }, []), /short canonical identity/i);
});

test("normalized reviewed names and aliases block duplicate identities without substring matching", () => {
  const identities = buildPolymerIdentityOptions([material("pcl", "PCL grade")]);
  const base = { ...EMPTY_POLYMER_CATALOG_DRAFT, mode: "new" as const, newIdentity: "New Polymer", newIdentityAlias: "NP", productName: "Grade A" };
  assert.match(validatePolymerCatalogDraft({ ...base, newIdentity: "  pcl  " }, identities), /Existing polymer/i);
  assert.match(validatePolymerCatalogDraft({ ...base, newIdentityAlias: "pCl" }, identities), /Existing polymer/i);
  assert.equal(validatePolymerCatalogDraft({ ...base, newIdentity: "PCLX" }, identities), undefined);
});

test("catalog UI has explicit cancel/close and selects the created exact ID", () => {
  const source = readFileSync(join(process.cwd(), "src/components/Formulations.tsx"), "utf8");
  assert.match(source, /aria-label="Close polymer material form"/);
  assert.match(source, />Cancel<\/button>/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /catalogSaveInFlight\.current/);
  assert.match(source, /polymerId: material\.id/);
  assert.match(source, /mode === "existing" \? "Existing polymer" : "New polymer"/);
  assert.match(source, /No formulation is created by this action/);
  const closeHandler = source.slice(source.indexOf("const closePolymerCatalog"), source.indexOf("const selectCatalogMaterial"));
  assert.doesNotMatch(closeHandler, /onAddMaterial|onAddFormulation/);
  const catalogSaveHandler = source.slice(source.indexOf("const createPolymerCatalogMaterial"), source.indexOf("const createMaterial"));
  assert.doesNotMatch(catalogSaveHandler, /onAddFormulation/);
  assert.match(source, /\+ Add existing polymer variant OR new polymer/);
  assert.match(source, /\+ Add another polymer/);
});
