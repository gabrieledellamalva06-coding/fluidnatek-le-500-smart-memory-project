import type {
  Formulation,
  FormulationComponent,
  FormulationComponentRole,
} from "../../core/types/formulation";

import type {
  Material,
  MaterialCategory,
} from "../../core/types/material";

import type { Project } from "../../core/types/project";

import type {
  ExperimentalSetup,
} from "../../core/types/setup";

import type {
  Experiment,
} from "../../core/types/experiment";

import type {
  ProcessRecord,
  ProcessabilityGrade,
} from "../../core/types/processRecord";

import type {
  MaterialCharacterization,
  SolutionCharacterization,
} from "../../core/types/characterization";

import type {
  LegacyCharacterization,
  LegacyFormulation,
  LegacyFormulationComponent,
  LegacyMaterial,
  LegacyProject,
  LegacyResult,
  LegacyRun,
  LegacySetup,
} from "./legacySectionA.types";

const MIGRATION_SOURCE = "fluidnatek-ai-process-assistant";

function migrationTimestamp(): string {
  return new Date().toISOString();
}

function normalizeMaterialCategory(
  value: string
): MaterialCategory {
  switch (value.trim().toLowerCase()) {
    case "polymer":
      return "polymer";

    case "solvent":
      return "solvent";

    case "additive":
      return "additive";

    case "nanoparticle":
      return "nanoparticle";

    case "surfactant":
      return "surfactant";

    case "salt":
      return "salt";

    case "ceramic":
      return "ceramic";

    case "metal":
      return "metal";

    case "drug":
      return "drug";

    case "biopolymer":
      return "biopolymer";

    case "copolymer":
      return "copolymer";

    default:
      return "other";
  }
}

function normalizeComponentRole(
  value: string
): FormulationComponentRole {
  switch (value.trim().toLowerCase()) {
    case "polymer":
      return "polymer";

    case "solvent":
      return "solvent";

    case "additive":
      return "additive";

    case "nanoparticle":
      return "nanoparticle";

    case "surfactant":
      return "surfactant";

    case "salt":
      return "salt";

    default:
      return "other";
  }
}

function normalizeProcessability(
  value: number | null
): ProcessabilityGrade | undefined {
  if (
    value === 1 ||
    value === 2 ||
    value === 3 ||
    value === 4
  ) {
    return value;
  }

  return undefined;
}

export function mapLegacyProject(
  source: LegacyProject
): Project {
  const now = migrationTimestamp();

  const descriptionParts = [
    source.client
      ? `Client: ${source.client}`
      : undefined,

    source.beas_code
      ? `BEAS: ${source.beas_code}`
      : undefined,

    source.rd_leader
      ? `R&D leader: ${source.rd_leader}`
      : undefined,

    source.year !== null
      ? `Year: ${source.year}`
      : undefined,
  ].filter(
    (value): value is string => value !== undefined
  );

  return {
    id: source.project_id,

    code: source.project_code || source.project_id,

    name: source.project_code || source.project_id,

    description:
      descriptionParts.length > 0
        ? descriptionParts.join(" | ")
        : undefined,

    status: "completed",

    materialIds: [],

    createdAt: now,
    updatedAt: now,

    source: {
      sourceType: "migration",
      sourceId: MIGRATION_SOURCE,
      importedAt: now,
      notes: "Migrated from Section A historical database.",
    },
  };
}

export function mapLegacyMaterial(
  source: LegacyMaterial
): Material {
  const now = migrationTimestamp();

  return {
    id: source.material_id,

    canonicalName:
      source.material_name.trim() ||
      `Unknown material ${source.material_id}`,

    category: normalizeMaterialCategory(
      source.material_type
    ),

    aliases: [],

    manufacturers: [],

    commercialNames: [],

    productCodes:
      source.article_number &&
      source.article_number !== "0.0"
        ? [source.article_number]
        : [],

    molecularWeight:
      source.molecular_weight || undefined,

    supplier:
      source.supplier || undefined,

    description:
      source.notes || undefined,

    aiTags: [],

    metadata: {
      createdAt: now,
      updatedAt: now,
      createdBy: MIGRATION_SOURCE,
      confidence: source.material_name.trim()
        ? 0.8
        : 0.2,
    },
  };
}

export function mapLegacyFormulationComponent(
  source: LegacyFormulationComponent
): FormulationComponent {
  return {
    id: source.formulation_component_id,

    formulationId: source.formulation_id,

    materialId: source.material_id,

    role: normalizeComponentRole(
      source.component_role
    ),

    concentrationPct:
      source.concentration ?? undefined,

    quantity:
      source.ratio ?? undefined,

    unit:
      source.ratio !== null
        ? "ratio"
        : source.concentration !== null
          ? "wt_pct"
          : "unknown",
  };
}

export function legacyFormulationDisplayName(
  source: LegacyFormulation
): string {
  // New Section-A JSON generated from Santiago's workbook already stores
  // the human-readable FORMULA value explicitly (for example NVR_OVA+TBP_3b).
  const explicitName = source.formulation_name?.trim();

  if (explicitName) {
    return explicitName;
  }

  // Older migrated records stored the original Excel Formula ID in notes.
  const notes = (source.notes ?? "").trim();
  const match = notes.match(/Original formula ID:\s*([^\r\n]+)/i);
  const originalFormulaId = match?.[1]?.trim();

  if (originalFormulaId) {
    return originalFormulaId;
  }

  // A non-generated ID is already suitable as a display label.
  if (
    !source.formulation_id.startsWith("MIG_FORM_") &&
    !source.formulation_id.startsWith("XLS_FORM_")
  ) {
    return source.formulation_id;
  }

  // Do not expose generated database IDs to the user.
  return "Historical formulation";
}

export function mapLegacyFormulation(
  source: LegacyFormulation,
  components: LegacyFormulationComponent[]
): Formulation {
  const now = migrationTimestamp();

  const formulationComponents = components
    .filter(
      (component) =>
        component.formulation_id ===
        source.formulation_id
    )
    .map(mapLegacyFormulationComponent);

  const displayLabel = legacyFormulationDisplayName(source);

  return {
    id: source.formulation_id,

    projectId: source.project_id,

    // Keep MIG_FORM_* only as the internal ID. The user sees the Formula ID
    // that came from Excel (when available).
    code: displayLabel,

    name: displayLabel,

    components: formulationComponents,

    notes: source.notes || undefined,

    createdAt: now,
    updatedAt: now,

    source: {
      sourceType: "migration",
      sourceId: MIGRATION_SOURCE,
      importedAt: now,
      notes:
        source.polymer_concentration !== null
          ? `Legacy polymer concentration: ${source.polymer_concentration}%`
          : "Migrated historical formulation.",
    },
  };
}

export function mapLegacySetup(
  source: LegacySetup
): ExperimentalSetup {
  const now = migrationTimestamp();

  return {
    id: source.setup_id,

    name: source.name || undefined,

    machine: {
      model:
        source.machine.trim() ||
        "unknown",
    },

    injector: {
      type:
        source.injector_model_id ||
        "unknown",

      model:
        source.injector_model_id ||
        undefined,

      needleGauge:
        source.needle_gauge ||
        undefined,

      needleCount:
        source.number_of_needles ??
        undefined,
    },

    collector: {
      type:
        source.collector_model_id ||
        "unknown",

      model:
        source.collector_model_id ||
        undefined,
    },

    platformConfiguration:
      source.platform || undefined,

    notes:
      source.notes || undefined,

    createdAt: now,
    updatedAt: now,

    source: {
      sourceType: "migration",
      sourceId: MIGRATION_SOURCE,
      importedAt: now,
      notes:
        "Original custom setup configuration preserved in legacy source database.",
    },
  };
}

export function mapLegacyExperiment(
  source: LegacyRun,
  materialCharacterizationIds: string[]
): Experiment {
  const now = migrationTimestamp();

  const warnings: string[] = [];

  if (source.is_incomplete) {
    warnings.push(
      "Historical run is marked as incomplete."
    );
  }

  if (source.processability_score === null) {
    warnings.push(
      "Processability score is missing."
    );
  }

  return {
    id: source.run_id,

    projectId: source.project_id,

    formulationId: source.formulation_id,

    setupId: source.setup_id,

    operationIdentifier:
      source.sample_code ||
      source.run_id,

    sampleCode:
      source.sample_code ||
      undefined,

    status:
      source.is_incomplete
        ? "draft"
        : "completed",

    processRecordIds: [
      `${source.run_id}__process_1`,
    ],

    materialCharacterizationIds,

    startedAt:
      source.date || undefined,

    notes:
      source.purpose || undefined,

    createdAt: now,

    updatedAt: now,

    dataQuality: {
      status:
        warnings.length > 0
          ? "review_required"
          : "valid",

      warnings,

      reviewed: false,
    },

    source: {
      sourceType: "migration",

      sourceId: MIGRATION_SOURCE,

      importedAt: now,

      notes:
        source.is_incomplete
          ? "Historical run marked as incomplete in source database."
          : "Historical run migrated from Section A.",
    },
  };
}
export function mapLegacyProcessRecord(
  source: LegacyRun
): ProcessRecord {
  const now = migrationTimestamp();

  return {
    id: `${source.run_id}__process_1`,

    experimentId: source.run_id,

    sequence: 1,

    parameters: {
      voltageKv:
        source.injector_voltage ??
        undefined,

      flowRateMlH:
        source.flow_rate ??
        undefined,

      collectorSpeedRpm:
        source.drum_speed ??
        undefined,
    },

    environment: {
      temperatureC:
        source.temperature ??
        undefined,

      humidityPct:
        source.relative_humidity ??
        undefined,
    },

    evaluation: {
      processabilityGrade:
        normalizeProcessability(
          source.processability_score
        ),

      operatorComments:
        source.process_comments ||
        undefined,
    },

    createdAt: now,

    source: {
      sourceType: "migration",
      sourceId: MIGRATION_SOURCE,
      importedAt: now,
      notes:
        source.is_incomplete
          ? "Source run is incomplete."
          : undefined,
    },
  };
}

export function mapLegacySolutionCharacterization(
  source: LegacyCharacterization
): SolutionCharacterization {
  return {
    id: source.characterization_id,

    formulationId: source.formulation_id,

    viscosityMpas:
      source.viscosity ?? undefined,

    conductivityUsCm:
      source.conductivity ?? undefined,

    surfaceTensionMnM:
      source.surface_tension ?? undefined,

    solidsContentPct:
      source.solid_content ?? undefined,

    measuredAt:
      source.measurement_date ||
      undefined,

    notes:
      source.notes || undefined,

    source: {
      sourceType: "migration",
      sourceId: MIGRATION_SOURCE,
      importedAt: migrationTimestamp(),
    },
  };
}

export function mapLegacyMaterialCharacterization(
  source: LegacyResult
): MaterialCharacterization {
  return {
    id: source.result_id,

    experimentId: source.run_id,

    morphology:
      source.sem_morphology ||
      undefined,

    notes: [
      source.filtration_performance,
      source.notes,
    ]
      .filter(
        (value) =>
          value.trim().length > 0
      )
      .join(" | ") || undefined,

    source: {
      sourceType: "migration",
      sourceId: MIGRATION_SOURCE,
      importedAt: migrationTimestamp(),
    },
  };
}