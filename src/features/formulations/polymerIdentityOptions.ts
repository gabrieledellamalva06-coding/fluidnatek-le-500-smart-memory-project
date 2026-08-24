import type { Material } from "../../core/types/material";

export const REVIEWED_POLYMER_IDENTITY_ALIASES = {
  ALGINATE: "Alginate", CAB: "CAB", CA: "CA", CHITOSAN: "Chitosan",
  GELATIN: "Gelatin", HPMC: "HPMC", NYLON: "Nylon", PA: "PA", PAN: "PAN",
  PCL: "PCL", PEG: "PEG", PEO: "PEO", PES: "PES", PLGA: "PLGA",
  PVA: "PVA", PVDF: "PVDF", PVP: "PVP", TPU: "TPU", ZEIN: "Zein", EC: "Ethyl Cellulose (EC)",
} as const;

export const EXCLUDED_NORMAL_POLYMER_MATERIAL_IDS = new Set([
  "e8c4f7a7-c186-4d8a-9473-83c5cf045a80",
  "XLS_MAT_d42b4a46-a56a-5156-a24a-1d7091bab490",
  "XLS_MAT_c11a030a-a5f6-55ea-a81f-c3cf04038e76",
  "XLS_MAT_9828c82e-8651-5237-8d36-17f0e54f1562",
  "XLS_MAT_a29316b1-4f86-5504-8aa0-34c2ee89398f",
  "XLS_MAT_207a0040-3b1a-55f5-8c49-54ec4c0c01cd",
  "XLS_MAT_184830de-4217-5d1e-a2ad-2bcab7778286",
]);

export const REVIEWED_STANDALONE_POLYMER_IDENTITIES: Readonly<Record<string, string>> = {
  "XLS_MAT_e7142e88-d7e2-5a81-a0f8-eae880cb53fe": "Carbopol",
  "XLS_MAT_681b54b9-628c-5b1c-95d2-297767a5d972": "Ethyl Cellulose",
  "XLS_MAT_3b38f067-a70f-507c-b72c-b148830b5b22": "EUDRAGIT",
  "XLS_MAT_f6b54f02-5c59-5b40-8a00-ffdb72e3788d": "EUDRAGIT",
  "XLS_MAT_c2d427c1-13d5-5eaf-9a88-6c2ab6338a20": "EUDRAGIT",
  "XLS_MAT_28e1e73f-451d-5a9b-96fd-40c7016f1fa4": "PEG",
  "XLS_MAT_cfa249b8-034d-54a7-aab1-9e769005c278": "PEG",
  "XLS_MAT_440ed179-66d7-576b-97a5-23c6af4686f6": "Pullulan",
  "XLS_MAT_f57418ab-e71c-5359-bf01-24348a9553ee": "PVOH",
  "XLS_MAT_3974f93a-4b5c-52a1-90e7-0391d44ea25b": "PVP",
  "XLS_MAT_ef370c59-82ea-5083-ab8b-54ae2f41f226": "PVP",
  "XLS_MAT_b73e6fdf-3fce-52bd-af07-8587f2b0b9be": "Resom C212",
};

export const MOLECULAR_WEIGHT_REVIEW_MATERIAL_IDS = new Set([
  "XLS_MAT_cfa249b8-034d-54a7-aab1-9e769005c278",
]);

export interface PolymerVariantOption {
  materialId: string;
  identityKey: string;
  canonicalName: string;
  displayLabel: string;
  material?: Material;
  unresolved: boolean;
  legacyReviewRequired?: boolean;
}

export interface PolymerIdentityOption {
  key: string;
  displayLabel: string;
  memberMaterialIds: string[];
  variants: PolymerVariantOption[];
  fallback: boolean;
  legacyReviewRequired?: boolean;
}

export interface PolymerSelectionHydration {
  identityKey: string;
  materialId: string;
  identities: PolymerIdentityOption[];
  unresolved: boolean;
}

export function buildPolymerIdentityOptions(materials: readonly Material[]): PolymerIdentityOption[] {
  const unique = new Map(materials.map((material) => [material.id, material]));
  const grouped = new Map<string, { label: string; materials: Material[]; fallback: boolean }>();
  for (const material of unique.values()) {
    if (EXCLUDED_NORMAL_POLYMER_MATERIAL_IDS.has(material.id)) continue;
    const reviewed = reviewedIdentity(material);
    const standalone = REVIEWED_STANDALONE_POLYMER_IDENTITIES[material.id];
    if (!reviewed && !standalone) continue;
    const standaloneKey = material.id === "XLS_MAT_681b54b9-628c-5b1c-95d2-297767a5d972"
      ? "EC"
      : standalone ? normalizeAlias(standalone) : "";
    const key = reviewed
      ? `identity:${reviewed.key}`
      : standaloneKey in REVIEWED_POLYMER_IDENTITY_ALIASES
        ? `identity:${standaloneKey}`
        : `standalone:${standaloneKey}`;
    const current = grouped.get(key) ?? {
      label: reviewed?.label ?? standalone,
      materials: [],
      fallback: false,
    };
    current.materials.push(material);
    grouped.set(key, current);
  }
  return [...grouped.entries()].map(([key, group]) => {
    const displayLabels = disambiguateVariantLabels(group.materials, group.label);
    const variants = group.materials.map((material, index) => {
      return ({
      materialId: material.id,
      identityKey: key,
      canonicalName: material.canonicalName,
      displayLabel: displayLabels[index],
      material,
      unresolved: false,
    }); }).sort((left, right) => left.displayLabel.localeCompare(right.displayLabel, undefined, { numeric: true, sensitivity: "base" }) || left.materialId.localeCompare(right.materialId));
    return { key, displayLabel: group.label, memberMaterialIds: variants.map((variant) => variant.materialId), variants, fallback: group.fallback };
  }).sort((left, right) => left.displayLabel.localeCompare(right.displayLabel, undefined, { numeric: true, sensitivity: "base" }) || left.key.localeCompare(right.key));
}

export function hydratePolymerSelection(materials: readonly Material[], materialId: string): PolymerSelectionHydration {
  const identities = buildPolymerIdentityOptions(materials);
  if (!materialId) return { identityKey: "", materialId: "", identities, unresolved: false };
  const identity = identities.find((item) => item.memberMaterialIds.includes(materialId));
  if (identity) return { identityKey: identity.key, materialId, identities, unresolved: false };
  const material = materials.find((item) => item.id === materialId);
  const key = `legacy:${materialId}`;
  const canonicalName = material?.canonicalName.trim() || "Unknown historical material";
  const variant: PolymerVariantOption = { materialId, identityKey: key, canonicalName, displayLabel: material ? variantBaseLabel(material, canonicalName) : "Unknown historical material", material, unresolved: !material, legacyReviewRequired: true };
  return { identityKey: key, materialId, unresolved: !material, identities: [...identities, { key, displayLabel: canonicalName, memberMaterialIds: [materialId], variants: [variant], fallback: true, legacyReviewRequired: true }] };
}

export function selectPolymerIdentity<T extends { materialId: string; concentration: number | undefined }>(row: T, identityKey: string): T & { identityKey: string } {
  return { ...row, identityKey, materialId: "" };
}

function reviewedIdentity(material: Material): { key: string; label: string } | undefined {
  const explicitIdentity = material.polymerIdentity?.trim();
  if (explicitIdentity) {
    const normalizedIdentity = normalizeAlias(explicitIdentity);
    if (normalizedIdentity in REVIEWED_POLYMER_IDENTITY_ALIASES) {
      const key = normalizedIdentity as keyof typeof REVIEWED_POLYMER_IDENTITY_ALIASES;
      return { key, label: REVIEWED_POLYMER_IDENTITY_ALIASES[key] };
    }
    return { key: `CUSTOM:${normalizedIdentity}`, label: explicitIdentity };
  }
  const matches = [...new Set((material.aliases ?? []).map((alias) => normalizeAlias(alias)).filter((alias) => alias in REVIEWED_POLYMER_IDENTITY_ALIASES))];
  if (matches.length !== 1) return undefined;
  const key = matches[0] as keyof typeof REVIEWED_POLYMER_IDENTITY_ALIASES;
  return { key, label: REVIEWED_POLYMER_IDENTITY_ALIASES[key] };
}

function normalizeAlias(value: string): string { return value.trim().toLocaleUpperCase(); }

function variantBaseLabel(material: Material, identityLabel: string): string {
  const product = material.canonicalName.trim() || "Unnamed material";
  if (MOLECULAR_WEIGHT_REVIEW_MATERIAL_IDS.has(material.id)) return `Molecular-weight data requires review · ${product}`;
  const molecularWeight = material.molecularWeight?.trim();
  return molecularWeight ? `${molecularWeight} · ${identityLabel}` : `Molecular weight unknown · ${product}`;
}

function disambiguateVariantLabels(materials: readonly Material[], identityLabel: string): string[] {
  const base = materials.map((material) => variantBaseLabel(material, identityLabel));
  const withSupplier = base.map((label, index) => {
    if (base.filter((item) => item === label).length < 2) return label;
    const supplier = materials[index].supplier?.trim() || (materials[index].manufacturers ?? []).map((item) => item.trim()).filter(Boolean).join(", ");
    return supplier ? `${label} · ${supplier}` : label;
  });
  const withCode = withSupplier.map((label, index) => {
    if (withSupplier.filter((item) => item === label).length < 2) return label;
    const code = materials[index].articleNumber?.trim() || (materials[index].productCodes ?? []).map((item) => item.trim()).find(Boolean);
    return code ? `${label} · Article/product ${code}` : label;
  });
  const ordinals = new Map<string, number>();
  return withCode.map((label) => {
    if (withCode.filter((item) => item === label).length < 2) return label;
    const ordinal = (ordinals.get(label) ?? 0) + 1;
    ordinals.set(label, ordinal);
    return `${label} · Variant ${ordinal}`;
  });
}
