import type {
  LegacyCharacterization,
  LegacyFormulation,
  LegacyFormulationComponent,
  LegacyMaterial,
  LegacyProject,
  LegacyResult,
  LegacyRun,
  LegacySectionADataset,
  LegacySetup,
} from "./legacySectionA.types";

export type MigrationIssueSeverity =
  | "warning"
  | "error";

export interface MigrationIssue {
  severity: MigrationIssueSeverity;
  entityType: string;
  entityId?: string;
  message: string;
}

export interface SectionAValidationReport {
  valid: boolean;

  counts: {
    projects: number;
    materials: number;
    formulations: number;
    formulationComponents: number;
    setups: number;
    runs: number;
    characterizations: number;
    results: number;
  };

  issues: MigrationIssue[];
}

function findDuplicateIds<T>(
  items: T[],
  getId: (item: T) => string,
  entityType: string
): MigrationIssue[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const item of items) {
    const id = getId(item);

    if (seen.has(id)) {
      duplicates.add(id);
    }

    seen.add(id);
  }

  return [...duplicates].map((id) => ({
    severity: "error" as const,
    entityType,
    entityId: id,
    message: `Duplicate ${entityType} ID detected.`,
  }));
}

function validateProjects(
  projects: LegacyProject[]
): MigrationIssue[] {
  const issues: MigrationIssue[] = [];

  issues.push(
    ...findDuplicateIds(
      projects,
      (project) => project.project_id,
      "project"
    )
  );

  for (const project of projects) {
    if (!project.project_id.trim()) {
      issues.push({
        severity: "error",
        entityType: "project",
        message: "Project has an empty project_id.",
      });
    }

    if (!project.project_code.trim()) {
      issues.push({
        severity: "warning",
        entityType: "project",
        entityId: project.project_id,
        message: "Project has an empty project_code.",
      });
    }
  }

  return issues;
}

function validateMaterials(
  materials: LegacyMaterial[]
): MigrationIssue[] {
  const issues: MigrationIssue[] = [];

  issues.push(
    ...findDuplicateIds(
      materials,
      (material) => material.material_id,
      "material"
    )
  );

  for (const material of materials) {
    if (!material.material_id.trim()) {
      issues.push({
        severity: "error",
        entityType: "material",
        message: "Material has an empty material_id.",
      });
    }

    if (!material.material_name.trim()) {
      issues.push({
        severity: "warning",
        entityType: "material",
        entityId: material.material_id,
        message: "Material has an empty material_name.",
      });
    }

    if (
      material.material_type.trim().toLowerCase() ===
      "unknown"
    ) {
      issues.push({
        severity: "warning",
        entityType: "material",
        entityId: material.material_id,
        message: "Material category is unknown.",
      });
    }
  }

  return issues;
}

function validateFormulations(
  formulations: LegacyFormulation[],
  projects: LegacyProject[]
): MigrationIssue[] {
  const issues: MigrationIssue[] = [];

  const projectIds = new Set(
    projects.map((project) => project.project_id)
  );

  issues.push(
    ...findDuplicateIds(
      formulations,
      (formulation) => formulation.formulation_id,
      "formulation"
    )
  );

  for (const formulation of formulations) {
    if (!formulation.formulation_id.trim()) {
      issues.push({
        severity: "error",
        entityType: "formulation",
        message: "Formulation has an empty formulation_id.",
      });
    }

    if (!projectIds.has(formulation.project_id)) {
      issues.push({
        severity: "error",
        entityType: "formulation",
        entityId: formulation.formulation_id,
        message: `Referenced project does not exist: ${formulation.project_id}`,
      });
    }
  }

  return issues;
}

function validateFormulationComponents(
  components: LegacyFormulationComponent[],
  formulations: LegacyFormulation[],
  materials: LegacyMaterial[]
): MigrationIssue[] {
  const issues: MigrationIssue[] = [];

  const formulationIds = new Set(
    formulations.map(
      (formulation) => formulation.formulation_id
    )
  );

  const materialIds = new Set(
    materials.map((material) => material.material_id)
  );

  issues.push(
    ...findDuplicateIds(
      components,
      (component) =>
        component.formulation_component_id,
      "formulationComponent"
    )
  );

  for (const component of components) {
    if (!formulationIds.has(component.formulation_id)) {
      issues.push({
        severity: "error",
        entityType: "formulationComponent",
        entityId:
          component.formulation_component_id,
        message: `Referenced formulation does not exist: ${component.formulation_id}`,
      });
    }

    if (!materialIds.has(component.material_id)) {
      issues.push({
        severity: "error",
        entityType: "formulationComponent",
        entityId:
          component.formulation_component_id,
        message: `Referenced material does not exist: ${component.material_id}`,
      });
    }
  }

  return issues;
}

function validateSetups(
  setups: LegacySetup[]
): MigrationIssue[] {
  const issues: MigrationIssue[] = [];

  issues.push(
    ...findDuplicateIds(
      setups,
      (setup) => setup.setup_id,
      "setup"
    )
  );

  for (const setup of setups) {
    if (!setup.setup_id.trim()) {
      issues.push({
        severity: "error",
        entityType: "setup",
        message: "Setup has an empty setup_id.",
      });
    }

    if (!setup.machine.trim()) {
      issues.push({
        severity: "warning",
        entityType: "setup",
        entityId: setup.setup_id,
        message: "Setup has no machine defined.",
      });
    }
  }

  return issues;
}

function validateRuns(
  runs: LegacyRun[],
  projects: LegacyProject[],
  formulations: LegacyFormulation[],
  setups: LegacySetup[]
): MigrationIssue[] {
  const issues: MigrationIssue[] = [];

  const projectIds = new Set(
    projects.map((project) => project.project_id)
  );

  const formulationIds = new Set(
    formulations.map(
      (formulation) => formulation.formulation_id
    )
  );

  const setupIds = new Set(
    setups.map((setup) => setup.setup_id)
  );

  issues.push(
    ...findDuplicateIds(
      runs,
      (run) => run.run_id,
      "run"
    )
  );

  for (const run of runs) {
    if (!projectIds.has(run.project_id)) {
      issues.push({
        severity: "error",
        entityType: "run",
        entityId: run.run_id,
        message: `Referenced project does not exist: ${run.project_id}`,
      });
    }

    if (!formulationIds.has(run.formulation_id)) {
      issues.push({
        severity: "error",
        entityType: "run",
        entityId: run.run_id,
        message: `Referenced formulation does not exist: ${run.formulation_id}`,
      });
    }

    if (!setupIds.has(run.setup_id)) {
      issues.push({
        severity: "error",
        entityType: "run",
        entityId: run.run_id,
        message: `Referenced setup does not exist: ${run.setup_id}`,
      });
    }

    if (run.is_incomplete) {
      issues.push({
        severity: "warning",
        entityType: "run",
        entityId: run.run_id,
        message: "Run is marked as incomplete.",
      });
    }

    if (run.processability_score === null) {
      issues.push({
        severity: "warning",
        entityType: "run",
        entityId: run.run_id,
        message:
          "Run has no processability score.",
      });
    }
  }

  return issues;
}

function validateCharacterizations(
  characterizations: LegacyCharacterization[],
  formulations: LegacyFormulation[]
): MigrationIssue[] {
  const issues: MigrationIssue[] = [];

  const formulationIds = new Set(
    formulations.map(
      (formulation) => formulation.formulation_id
    )
  );

  issues.push(
    ...findDuplicateIds(
      characterizations,
      (characterization) =>
        characterization.characterization_id,
      "characterization"
    )
  );

  for (const characterization of characterizations) {
    if (
      !formulationIds.has(
        characterization.formulation_id
      )
    ) {
      issues.push({
        severity: "error",
        entityType: "characterization",
        entityId:
          characterization.characterization_id,
        message: `Referenced formulation does not exist: ${characterization.formulation_id}`,
      });
    }
  }

  return issues;
}

function validateResults(
  results: LegacyResult[],
  runs: LegacyRun[]
): MigrationIssue[] {
  const issues: MigrationIssue[] = [];

  const runIds = new Set(
    runs.map((run) => run.run_id)
  );

  issues.push(
    ...findDuplicateIds(
      results,
      (result) => result.result_id,
      "result"
    )
  );

  for (const result of results) {
    if (!runIds.has(result.run_id)) {
      issues.push({
        severity: "error",
        entityType: "result",
        entityId: result.result_id,
        message: `Referenced run does not exist: ${result.run_id}`,
      });
    }
  }

  return issues;
}

export function validateSectionADataset(
  dataset: LegacySectionADataset
): SectionAValidationReport {
  const issues: MigrationIssue[] = [
    ...validateProjects(dataset.projects),

    ...validateMaterials(dataset.materials),

    ...validateFormulations(
      dataset.formulations,
      dataset.projects
    ),

    ...validateFormulationComponents(
      dataset.formulationComponents,
      dataset.formulations,
      dataset.materials
    ),

    ...validateSetups(dataset.setups),

    ...validateRuns(
      dataset.runs,
      dataset.projects,
      dataset.formulations,
      dataset.setups
    ),

    ...validateCharacterizations(
      dataset.characterizations,
      dataset.formulations
    ),

    ...validateResults(
      dataset.results,
      dataset.runs
    ),
  ];

  return {
    valid: !issues.some(
      (issue) => issue.severity === "error"
    ),

    counts: {
      projects: dataset.projects.length,
      materials: dataset.materials.length,
      formulations: dataset.formulations.length,
      formulationComponents:
        dataset.formulationComponents.length,
      setups: dataset.setups.length,
      runs: dataset.runs.length,
      characterizations:
        dataset.characterizations.length,
      results: dataset.results.length,
    },

    issues,
  };
}