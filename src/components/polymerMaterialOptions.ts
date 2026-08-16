import type { Material } from "../core/types/material";

const POLYMER_CATEGORIES = new Set(["polymer", "biopolymer", "copolymer"]);

export function buildPolymerMaterialOptions(materials: readonly Material[]): Material[] {
  const byDocumentId = new Map<string, Material>();

  for (const material of materials) {
    if (POLYMER_CATEGORIES.has(material.category)) {
      // The repository merge already uses this same rule: a later record with
      // the same document ID is the override. Different IDs are never collapsed.
      byDocumentId.set(material.id, material);
    }
  }

  return [...byDocumentId.values()].sort(
    (left, right) =>
      left.canonicalName.localeCompare(right.canonicalName, undefined, {
        numeric: true,
        sensitivity: "base",
      }) || left.id.localeCompare(right.id)
  );
}

export function formatPolymerOptionLabel(material: Material): string {
  const canonicalName = material.canonicalName.trim() || material.id;
  const family = material.polymerFamily?.trim();
  const aliases = [...new Set(material.aliases.map((alias) => alias.trim()).filter(Boolean))]
    .filter((alias) => alias.localeCompare(canonicalName, undefined, { sensitivity: "base" }) !== 0);
  const details = [family, aliases.length > 0 ? `aliases: ${aliases.join(", ")}` : undefined]
    .filter(Boolean)
    .join("; ");

  return details ? `${canonicalName} — ${details}` : canonicalName;
}
