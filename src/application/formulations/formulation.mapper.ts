import type {
  Formulation as CanonicalFormulation,
  FormulationComponent,
  FormulationComponentRole,
} from "../../core/types/formulation";

import type {
  Material,
  MaterialCategory,
} from "../../core/types/material";

import type { SolutionCharacterization } from "../../core/types/characterization";
import type { Formulation as UiFormulation } from "../../types";

export interface FormulationReadContext {
  materialsById: ReadonlyMap<string, Material>;
  characterizationsById: ReadonlyMap<string, SolutionCharacterization>;
  characterizationsByFormulationId: ReadonlyMap<string, SolutionCharacterization>;
}

export interface CanonicalFormulationCreation {
  formulation: CanonicalFormulation;
  materials: Material[];
}

export function mapCanonicalFormulationToUi(
  formulation: CanonicalFormulation,
  context: FormulationReadContext
): UiFormulation {
  const polymerComponents = findComponentsByRole(formulation.components, "polymer");
  const solventComponents = findComponentsByRole(formulation.components, "solvent");
  const characterization = resolveCharacterization(formulation, context);

  const polymerComponent = polymerComponents[0];
  const solvent1Component = solventComponents[0];
  const solvent2Component = solventComponents[1];

  const polymerName = resolveMaterialName(polymerComponent, context.materialsById) || "";
  const solvent1Name = resolveMaterialName(solvent1Component, context.materialsById) || "";
  const solvent2Name = resolveMaterialName(solvent2Component, context.materialsById) || "";

  const solvent = [
    solvent1Name && formatSolvent(solvent1Name, solvent1Component),
    solvent2Name && formatSolvent(solvent2Name, solvent2Component),
  ].filter(Boolean).join(" + ");

  const polymerConcentrationPct =
    polymerComponent?.concentrationPct ??
    (polymerComponent?.unit === "wt_pct" ? polymerComponent.quantity : undefined);

  return {
    id: formulation.id,
    projectId: formulation.projectId,
    name: formulation.name,
    polymerName,
    polymerMaterialId: polymerComponent?.materialId,
    polymerConcentrationPct,
    solvent,
    solvent1Name,
    solvent1MaterialId: solvent1Component?.materialId,
    solvent1RatioPct: readRatio(solvent1Component),
    solvent2Name: solvent2Name || undefined,
    solvent2MaterialId: solvent2Component?.materialId,
    solvent2RatioPct: readRatio(solvent2Component),
    notes: formulation.notes,
    solidsContentPct: characterization?.solidsContentPct ?? polymerConcentrationPct,
    viscosityMpas: characterization?.viscosityMpas,
    conductivityUsCm: characterization?.conductivityUsCm,
    densityGcm3: characterization?.densityGcm3,
    materialBatchIds: [],
  };
}

export function createCanonicalFormulation(
  input: Omit<UiFormulation, "id">,
  existingMaterials: readonly Material[]
): CanonicalFormulationCreation {
  const now = new Date().toISOString();
  const formulationId = createEntityId("FORM");

  const polymer = resolveOrCreateMaterial(
    input.polymerName,
    "polymer",
    existingMaterials,
    now
  );

  const solvent1Name = (input.solvent1Name || input.solvent).trim();
  const solvent1 = resolveOrCreateMaterial(
    solvent1Name,
    "solvent",
    existingMaterials,
    now
  );

  const solvent2Name = input.solvent2Name?.trim();
  const solvent2 = solvent2Name
    ? resolveOrCreateMaterial(solvent2Name, "solvent", existingMaterials, now)
    : undefined;

  const components: FormulationComponent[] = [
    createPolymerComponent(
      formulationId,
      polymer.id,
      input.polymerConcentrationPct ?? input.solidsContentPct
    ),
    createSolventComponent(
      formulationId,
      solvent1.id,
      input.solvent1RatioPct
    ),
  ];

  if (solvent2) {
    components.push(
      createSolventComponent(
        formulationId,
        solvent2.id,
        input.solvent2RatioPct
      )
    );
  }

  const formulation: CanonicalFormulation = {
    id: formulationId,
    projectId: input.projectId,
    name: input.name?.trim() || createFormulationName(input.polymerName, solvent1Name),
    components,
    notes: normalizeOptionalText(input.notes),
    createdAt: now,
    updatedAt: now,
  };

  return {
    formulation,
    materials: [polymer, solvent1, ...(solvent2 ? [solvent2] : [])],
  };
}

function resolveCharacterization(
  formulation: CanonicalFormulation,
  context: FormulationReadContext
): SolutionCharacterization | undefined {
  if (formulation.solutionCharacterizationId) {
    const byId = context.characterizationsById.get(formulation.solutionCharacterizationId);
    if (byId) return byId;
  }
  return context.characterizationsByFormulationId.get(formulation.id);
}

function findComponentsByRole(
  components: readonly FormulationComponent[],
  role: FormulationComponentRole
): FormulationComponent[] {
  return components.filter((component) => component.role === role);
}

function resolveMaterialName(
  component: FormulationComponent | undefined,
  materialsById: ReadonlyMap<string, Material>
): string | undefined {
  if (!component) return undefined;
  const material = materialsById.get(component.materialId);
  const name = material?.canonicalName?.trim() || component.materialId.trim();
  return name || undefined;
}

function readRatio(component: FormulationComponent | undefined): number | undefined {
  if (!component) return undefined;
  if (component.unit === "ratio" || component.unit === "vol_pct" || component.unit === "wt_pct") {
    return component.quantity;
  }
  return undefined;
}

function formatSolvent(name: string, component: FormulationComponent | undefined): string {
  const ratio = readRatio(component);
  return ratio === undefined ? name : `${name} (${formatNumber(ratio)}%)`;
}

function resolveOrCreateMaterial(
  materialName: string,
  category: MaterialCategory,
  existingMaterials: readonly Material[],
  timestamp: string
): Material {
  const normalizedName = normalizeMaterialName(materialName);
  const existing = existingMaterials.find(
    (material) =>
      material.category === category &&
      normalizeMaterialName(material.canonicalName) === normalizedName
  );

  if (existing) return existing;

  const canonicalName = materialName.trim();
  return {
    id: createMaterialId(canonicalName, category),
    canonicalName,
    category,
    aliases: [],
    manufacturers: [],
    commercialNames: [],
    productCodes: [],
    aiTags: [category],
    metadata: {
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: "fluidnatek-web-app",
      confidence: 1,
    },
  };
}

function createPolymerComponent(
  formulationId: string,
  materialId: string,
  concentrationPct: number
): FormulationComponent {
  return {
    id: createEntityId("FORM_COMP"),
    formulationId,
    materialId,
    role: "polymer",
    concentrationPct,
    quantity: concentrationPct,
    unit: "wt_pct",
  };
}

function createSolventComponent(
  formulationId: string,
  materialId: string,
  ratioPct?: number
): FormulationComponent {
  return {
    id: createEntityId("FORM_COMP"),
    formulationId,
    materialId,
    role: "solvent",
    quantity: ratioPct,
    unit: ratioPct === undefined ? "unknown" : "ratio",
  };
}

function createFormulationName(polymerName: string, solventName: string): string {
  return `${polymerName.trim()} / ${solventName.trim()}`;
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const text = value?.trim();
  return text ? text : undefined;
}

function normalizeMaterialName(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function createMaterialId(materialName: string, category: MaterialCategory): string {
  return `MAT_${category}_${createStableHash(`${category}:${normalizeMaterialName(materialName)}`)}`;
}

function createStableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function createEntityId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value)
    ? value.toString()
    : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
