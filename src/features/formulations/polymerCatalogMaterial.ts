import type { Material } from "../../core/types/material";
import type { CreateMaterialInput } from "../../application/materials/material.service";
import type { PolymerIdentityOption } from "./polymerIdentityOptions";

export const NEW_POLYMER_IDENTITY_KEY = "__new_polymer_identity__";

export interface PolymerCatalogDraft {
  mode: "existing" | "new";
  identityKey: string;
  newIdentity: string;
  newIdentityAlias: string;
  productName: string;
  molecularWeightValue: string;
  molecularWeightUnit: "" | "Da" | "kDa" | "MDa";
  supplier: string;
  articleNumber: string;
  aliases: string;
}

export const EMPTY_POLYMER_CATALOG_DRAFT: PolymerCatalogDraft = {
  mode: "existing",
  identityKey: "",
  newIdentity: "",
  newIdentityAlias: "",
  productName: "",
  molecularWeightValue: "",
  molecularWeightUnit: "",
  supplier: "",
  articleNumber: "",
  aliases: "",
};

const normalized = (value: string | undefined) => (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase();

export function resolveCatalogIdentity(draft: PolymerCatalogDraft, identities: readonly PolymerIdentityOption[]): string {
  if (draft.mode === "new" || draft.identityKey === NEW_POLYMER_IDENTITY_KEY) return draft.newIdentity.trim();
  return identities.find((identity) => identity.key === draft.identityKey)?.displayLabel.trim() ?? "";
}

function reviewedIdentityTerms(identities: readonly PolymerIdentityOption[]): Set<string> {
  return new Set(identities.flatMap((identity) => [
    identity.displayLabel,
    ...identity.variants.flatMap((variant) => variant.material?.aliases ?? []),
  ]).map(normalized).filter(Boolean));
}

export function validatePolymerCatalogDraft(draft: PolymerCatalogDraft, identities: readonly PolymerIdentityOption[]): string | undefined {
  const identity = resolveCatalogIdentity(draft, identities);
  if (!identity) return draft.mode === "new" ? "Enter a new polymer name." : "Choose an existing polymer identity.";
  if (draft.mode === "new" && !draft.newIdentityAlias.trim()) return "Enter a short canonical identity, code, or alias.";
  if (draft.mode === "new") {
    const existingTerms = reviewedIdentityTerms(identities);
    if (existingTerms.has(normalized(identity)) || existingTerms.has(normalized(draft.newIdentityAlias))) {
      return "An equivalent polymer identity already exists. Use Existing polymer instead.";
    }
  }
  if (!draft.productName.trim()) return "Enter the exact product or grade name.";
  if (draft.molecularWeightValue.trim()) {
    const value = Number(draft.molecularWeightValue);
    if (!Number.isFinite(value) || value <= 0) return "Molecular weight must be a finite positive value.";
    if (!draft.molecularWeightUnit) return "Choose a molecular-weight unit.";
  } else if (draft.molecularWeightUnit) {
    return "Enter a molecular-weight value or clear its unit.";
  }
  return undefined;
}

export function findDuplicatePolymerMaterial(
  draft: PolymerCatalogDraft,
  identities: readonly PolymerIdentityOption[],
): Material | undefined {
  const identity = identities.find((item) => item.key === draft.identityKey);
  if (!identity || draft.mode === "new" || draft.identityKey === NEW_POLYMER_IDENTITY_KEY) return undefined;
  const candidateWeight = draft.molecularWeightValue.trim() && draft.molecularWeightUnit
    ? normalized(`${Number(draft.molecularWeightValue)} ${draft.molecularWeightUnit}`)
    : "";
  return identity.variants.map((variant) => variant.material).filter((material): material is Material => Boolean(material)).find((material) => {
    const storedWeight = material.molecularWeightValue !== undefined && material.molecularWeightUnit
      ? normalized(`${material.molecularWeightValue} ${material.molecularWeightUnit}`)
      : normalized(material.molecularWeight);
    const storedSupplier = material.supplier || material.manufacturers?.find((item) => item.trim());
    const storedArticle = material.articleNumber || material.productCodes?.find((item) => item.trim());
    return normalized(material.canonicalName) === normalized(draft.productName)
      && storedWeight === candidateWeight
      && normalized(storedSupplier) === normalized(draft.supplier)
      && normalized(storedArticle) === normalized(draft.articleNumber);
  });
}

export function buildPolymerCatalogCreateInput(
  draft: PolymerCatalogDraft,
  identities: readonly PolymerIdentityOption[],
): CreateMaterialInput {
  const identity = resolveCatalogIdentity(draft, identities);
  const hasWeight = Boolean(draft.molecularWeightValue.trim());
  const molecularWeightValue = hasWeight ? Number(draft.molecularWeightValue) : undefined;
  const molecularWeightUnit = hasWeight ? draft.molecularWeightUnit || undefined : undefined;
  return {
    shortName: draft.mode === "new" ? draft.newIdentityAlias.trim() : identity,
    canonicalName: draft.productName.trim(),
    category: "polymer",
    polymerIdentity: identity,
    grade: draft.productName.trim(),
    molecularWeightValue,
    molecularWeightUnit,
    molecularWeight: molecularWeightValue !== undefined && molecularWeightUnit ? `${molecularWeightValue} ${molecularWeightUnit}` : undefined,
    supplier: draft.supplier.trim() || undefined,
    articleNumber: draft.articleNumber.trim() || undefined,
    aliases: [
      ...(draft.mode === "new" ? [draft.newIdentityAlias.trim()] : []),
      ...draft.aliases.split(/[,;\n]/).map((item) => item.trim()),
    ].filter(Boolean),
  };
}
