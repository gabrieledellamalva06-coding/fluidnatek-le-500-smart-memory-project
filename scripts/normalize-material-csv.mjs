import fs from "node:fs";
import path from "node:path";

const input = process.argv[2];
const output = process.argv[3] ?? "public/migration/section-a/material_catalog.json";
if (!input) throw new Error("Usage: node scripts/normalize-material-csv.mjs <input.csv> [output.json]");

const text = fs.readFileSync(input, "utf8").replace(/^\uFEFF/, "");
const lines = text.split(/\r?\n/).filter(Boolean);
const headers = lines.shift().split(";");
const rows = lines.map((line) => {
  const values = line.split(";");
  return Object.fromEntries(headers.map((header, index) => [header, (values[index] ?? "").trim()]));
});

const categoryMap = {
  polymer: "polymer", solvent: "solvent", additive: "additive", nanoparticle: "nanoparticle",
  surfactant: "surfactant", salt: "salt", pigment: "other", substrate: "other",
  filter_media: "other", "biological material": "other", filler: "other",
};
const clean = (value) => value.replace(/�/g, "").replace(/\s+/g, " ").trim();
const slug = (value) => clean(value).toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const materials = rows.map((row) => {
  const name = clean(row.name);
  const category = categoryMap[row.category] ?? "other";
  const molecularWeight = clean(row.molecular_weight_kDa);
  return {
    material_id: `CSV_${category}_${slug(name)}`,
    material_name: name,
    material_type: category,
    molecular_weight: molecularWeight,
    molecular_weight_kDa: molecularWeight,
    supplier: "",
    article_number: clean(row.article_code),
    batch_number: "",
    notes: `Imported from materials_list_reviewed.csv; source category: ${clean(row.category)}`,
    short_name: clean(row.short_name),
    polymer_family: clean(row.polymer_family),
    solvent_family: clean(row.solvent_family),
    available: "yes",
  };
});
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(materials, null, 2)}\n`, "utf8");
console.log(`Wrote ${materials.length} normalized materials to ${output}`);
