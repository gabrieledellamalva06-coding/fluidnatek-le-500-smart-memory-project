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

  characterizationsById: ReadonlyMap<
    string,
    SolutionCharacterization
  >;

  characterizationsByFormulationId: ReadonlyMap<
    string,
    SolutionCharacterization
  >;
}

export interface CanonicalFormulationCreation {
  formulation: CanonicalFormulation;
  characterization: SolutionCharacterization;
  materials: Material[];
}

export function mapCanonicalFormulationToUi(
  formulation: CanonicalFormulation,
  context: FormulationReadContext
): UiFormulation {
  const polymerComponents =
    findComponentsByRole(
      formulation.components,
      "polymer"
    );

  const solventComponents =
    findComponentsByRole(
      formulation.components,
      "solvent"
    );

  const characterization =
    resolveCharacterization(
      formulation,
      context
    );

  const polymerName =
    resolveComponentNames(
      polymerComponents,
      context.materialsById,
      "Unknown polymer"
    );

  const solvent =
    resolveSolventDescription(
      solventComponents,
      context.materialsById
    );

  return {
    id: formulation.id,
    projectId: formulation.projectId,

    polymerName,

    solvent,

    solidsContentPct:
      characterization?.solidsContentPct ??
      resolvePolymerConcentration(
        polymerComponents
      ) ??
      0,

    viscosityMpas:
      characterization?.viscosityMpas ?? 0,

    conductivityUsCm:
      characterization?.conductivityUsCm ?? 0,

    densityGcm3:
      characterization?.densityGcm3 ?? 0,

    materialBatchIds: [],
  };
}

export function createCanonicalFormulation(
  input: Omit<UiFormulation, "id">,
  existingMaterials: readonly Material[]
): CanonicalFormulationCreation {
  const now = new Date().toISOString();

  const polymer = resolveOrCreateMaterial(
    input.polymerName,
    "polymer",
    existingMaterials,
    now
  );

  const solvent = resolveOrCreateMaterial(
    input.solvent,
    "solvent",
    existingMaterials,
    now
  );

  const formulationId =
    createEntityId("FORM");

  const characterizationId =
    createEntityId("SOL_CHAR");

  const formulation: CanonicalFormulation = {
    id: formulationId,
    projectId: input.projectId,

    name: createFormulationName(
      input.polymerName,
      input.solvent
    ),

    components: [
      createComponent(
        formulationId,
        polymer.id,
        "polymer",
        input.solidsContentPct
      ),

      createComponent(
        formulationId,
        solvent.id,
        "solvent"
      ),
    ],

    solutionCharacterizationId:
      characterizationId,

    createdAt: now,
    updatedAt: now,
  };

  const characterization: SolutionCharacterization = {
    id: characterizationId,
    formulationId,

    solidsContentPct:
      input.solidsContentPct,

    viscosityMpas:
      input.viscosityMpas,

    conductivityUsCm:
      input.conductivityUsCm,

    densityGcm3:
      input.densityGcm3,

    measuredAt: now,

    notes:
      "Solution properties registered from the web application.",
  };

  return {
    formulation,
    characterization,
    materials: [polymer, solvent],
  };
}

function resolveCharacterization(
  formulation: CanonicalFormulation,
  context: FormulationReadContext
): SolutionCharacterization | undefined {
  if (formulation.solutionCharacterizationId) {
    const characterizationById =
      context.characterizationsById.get(
        formulation.solutionCharacterizationId
      );

    if (characterizationById) {
      return characterizationById;
    }
  }

  return context.characterizationsByFormulationId.get(
    formulation.id
  );
}

function findComponentsByRole(
  components: readonly FormulationComponent[],
  role: FormulationComponentRole
): FormulationComponent[] {
  return components.filter(
    (component) => component.role === role
  );
}

function resolveComponentNames(
  components: readonly FormulationComponent[],
  materialsById: ReadonlyMap<string, Material>,
  fallback: string
): string {
  const names = components
    .map((component) =>
      resolveMaterialName(
        component,
        materialsById
      )
    )
    .filter(
      (name): name is string =>
        name !== undefined
    );

  if (names.length === 0) {
    return fallback;
  }

  return names.join(" + ");
}

function resolveSolventDescription(
  components: readonly FormulationComponent[],
  materialsById: ReadonlyMap<string, Material>
): string {
  if (components.length === 0) {
    return "Unknown solvent";
  }

  const descriptions = components
    .map((component) => {
      const materialName =
        resolveMaterialName(
          component,
          materialsById
        );

      if (!materialName) {
        return undefined;
      }

      const quantityDescription =
        resolveQuantityDescription(component);

      return quantityDescription
        ? `${materialName} (${quantityDescription})`
        : materialName;
    })
    .filter(
      (description): description is string =>
        description !== undefined
    );

  if (descriptions.length === 0) {
    return "Unknown solvent";
  }

  return descriptions.join(" + ");
}

function resolveMaterialName(
  component: FormulationComponent,
  materialsById: ReadonlyMap<string, Material>
): string | undefined {
  const material =
    materialsById.get(component.materialId);

  const resolvedName =
    material?.canonicalName.trim() ||
    component.materialId.trim();

  return resolvedName || undefined;
}

function resolveQuantityDescription(
  component: FormulationComponent
): string | undefined {
  if (component.quantity === undefined) {
    return undefined;
  }

  switch (component.unit) {
    case "ratio":
      return `ratio ${formatNumber(
        component.quantity
      )}`;

    case "wt_pct":
      return `${formatNumber(
        component.quantity
      )}% w/w`;

    case "vol_pct":
      return `${formatNumber(
        component.quantity
      )}% v/v`;

    case "w_v_pct":
      return `${formatNumber(
        component.quantity
      )}% w/v`;

    case "g":
    case "mg":
    case "ml":
    case "ul":
      return `${formatNumber(
        component.quantity
      )} ${component.unit}`;

    default:
      return undefined;
  }
}

function resolvePolymerConcentration(
  components: readonly FormulationComponent[]
): number | undefined {
  for (const component of components) {
    if (
      component.concentrationPct !== undefined
    ) {
      return component.concentrationPct;
    }

    if (
      component.unit === "wt_pct" &&
      component.quantity !== undefined
    ) {
      return component.quantity;
    }
  }

  return undefined;
}

function resolveOrCreateMaterial(
  materialName: string,
  category: MaterialCategory,
  existingMaterials: readonly Material[],
  timestamp: string
): Material {
  const normalizedName =
    normalizeMaterialName(materialName);

  const existingMaterial =
    existingMaterials.find(
      (material) =>
        material.category === category &&
        normalizeMaterialName(
          material.canonicalName
        ) === normalizedName
    );

  if (existingMaterial) {
    return existingMaterial;
  }

  const canonicalName = materialName.trim();

  return {
    id: createMaterialId(
      canonicalName,
      category
    ),

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

function createComponent(
  formulationId: string,
  materialId: string,
  role: FormulationComponentRole,
  concentrationPct?: number
): FormulationComponent {
  return {
    id: createEntityId("FORM_COMP"),

    formulationId,
    materialId,
    role,

    concentrationPct,
    quantity: concentrationPct,

    unit:
      concentrationPct === undefined
        ? "unknown"
        : "wt_pct",
  };
}

function createFormulationName(
  polymerName: string,
  solventName: string
): string {
  return `${polymerName.trim()} / ${solventName.trim()}`;
}

function normalizeMaterialName(
  value: string
): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, " ");
}

function createMaterialId(
  materialName: string,
  category: MaterialCategory
): string {
  const normalizedValue =
    `${category}:${normalizeMaterialName(
      materialName
    )}`;

  return `MAT_${category}_${createStableHash(
    normalizedValue
  )}`;
}

function createStableHash(
  value: string
): string {
  let hash = 2166136261;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0)
    .toString(16)
    .padStart(8, "0");
}

function createEntityId(
  prefix: string
): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function formatNumber(
  value: number
): string {
  return Number.isInteger(value)
    ? value.toString()
    : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}