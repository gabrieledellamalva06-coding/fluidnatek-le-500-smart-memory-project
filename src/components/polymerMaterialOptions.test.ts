import assert from "node:assert/strict";
import test from "node:test";
import type { Material, MaterialCategory } from "../core/types/material";
import { buildPolymerMaterialOptions, formatPolymerOptionLabel } from "./polymerMaterialOptions";

function material(id: string, canonicalName: string, overrides: Partial<Material> = {}): Material {
  return {
    id,
    canonicalName,
    category: "polymer" as MaterialCategory,
    aliases: [],
    manufacturers: [],
    commercialNames: [],
    productCodes: [],
    aiTags: [],
    metadata: { createdAt: "", updatedAt: "", createdBy: "test", confidence: 1 },
    ...overrides,
  };
}

test("Pullulan is displayed by canonical name and never becomes PU", () => {
  const pullulan = material("pullulan", "PULLULAN COSMETIC GRADE");
  assert.equal(formatPolymerOptionLabel(pullulan), "PULLULAN COSMETIC GRADE");
});

test("different PEO molecular weights remain separate options", () => {
  const result = buildPolymerMaterialOptions([
    material("peo-100", "PEO - 100kDa", { aliases: ["PEO"], molecularWeight: "100 kDa" }),
    material("peo-2m", "PEO - 2MDa - Polyox", { aliases: ["PEO"], molecularWeight: "2 MDa" }),
  ]);
  assert.deepEqual(result.map((item) => item.id).sort(), ["peo-100", "peo-2m"]);
});

test("alginate and chitosan are not collapsed by shared family", () => {
  const result = buildPolymerMaterialOptions([
    material("alginate", "ALGINATE", { polymerFamily: "Polysaccharide" }),
    material("chitosan", "CHITOSAN", { polymerFamily: "Polysaccharide" }),
  ]);
  assert.equal(result.length, 2);
});

test("different TPU, PCL and PVP grades remain separate", () => {
  const result = buildPolymerMaterialOptions([
    material("tpu-a", "TECOPHILIC HP-60D-35", { aliases: ["TPU"] }),
    material("tpu-b", "TECOPHILIC HP-60D-60", { aliases: ["TPU"] }),
    material("pcl-a", "PCL 14000", { aliases: ["PCL"] }),
    material("pcl-b", "PCL 6800 D", { aliases: ["PCL"] }),
    material("pvp-a", "PVP K25", { aliases: ["PVP"] }),
    material("pvp-b", "PVP K30", { aliases: ["PVP"] }),
  ]);
  assert.equal(result.length, 6);
});

test("a real same-ID override produces one option while different IDs remain", () => {
  const result = buildPolymerMaterialOptions([
    material("same", "Firestore version"),
    material("same", "Local override"),
    material("different", "Local override"),
  ]);
  assert.equal(result.length, 2);
  assert.equal(result.find((item) => item.id === "same")?.canonicalName, "Local override");
});

test("solvents are excluded without changing solvent data", () => {
  const result = buildPolymerMaterialOptions([
    material("polymer", "PEO"),
    material("solvent", "DMF", { category: "solvent" }),
  ]);
  assert.deepEqual(result.map((item) => item.id), ["polymer"]);
});
