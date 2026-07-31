import { loadSectionADataset } from "./sectionA.loader";
import { sectionAMigrationService } from "./sectionAMigration.service";
import type {
  MigrationIssue,
} from "./sectionA.validator";

interface IssueSummary {
  severity: string;
  entityType: string;
  message: string;
  count: number;
}

function summarizeIssues(
  issues: MigrationIssue[]
): IssueSummary[] {
  const grouped = new Map<string, IssueSummary>();

  for (const issue of issues) {
    const key = [
      issue.severity,
      issue.entityType,
      issue.message,
    ].join("::");

    const existing = grouped.get(key);

    if (existing) {
      existing.count += 1;
      continue;
    }

    grouped.set(key, {
      severity: issue.severity,
      entityType: issue.entityType,
      message: issue.message,
      count: 1,
    });
  }

  return [...grouped.values()].sort(
    (first, second) =>
      second.count - first.count
  );
}

export async function runSectionADryRun(): Promise<void> {
  const dataset = await loadSectionADataset({
    projects:
      "/migration/section-a/projects.json",

    materials:
      "/migration/section-a/materials.json",

    formulations:
      "/migration/section-a/formulations.json",

    formulationComponents:
      "/migration/section-a/formulation_components.json",

    setups:
      "/migration/section-a/setups.json",

    runs:
      "/migration/section-a/runs.json",

    characterizations:
      "/migration/section-a/characterizations.json",

    results:
      "/migration/section-a/results.json",
  });

  const preview =
    sectionAMigrationService.preview(dataset);

  const errors =
    preview.validation.issues.filter(
      (issue) => issue.severity === "error"
    );

  const warnings =
    preview.validation.issues.filter(
      (issue) => issue.severity === "warning"
    );

  console.group(
    "[SECTION A MIGRATION DRY RUN]"
  );

  console.log(
    "Dataset valid:",
    preview.validation.valid
  );

  console.log(
    "Dataset counts:"
  );

  console.table([
    {
      entity: "projects",
      count: preview.validation.counts.projects,
    },
    {
      entity: "materials",
      count: preview.validation.counts.materials,
    },
    {
      entity: "formulations",
      count: preview.validation.counts.formulations,
    },
    {
      entity: "formulationComponents",
      count:
        preview.validation.counts
          .formulationComponents,
    },
    {
      entity: "setups",
      count: preview.validation.counts.setups,
    },
    {
      entity: "runs",
      count: preview.validation.counts.runs,
    },
    {
      entity: "characterizations",
      count:
        preview.validation.counts
          .characterizations,
    },
    {
      entity: "results",
      count: preview.validation.counts.results,
    },
  ]);

  console.log(
    "Mapped counts:"
  );

  console.table([
    {
      entity: "projects",
      count: preview.mappedCounts.projects,
    },
    {
      entity: "materials",
      count: preview.mappedCounts.materials,
    },
    {
      entity: "formulations",
      count: preview.mappedCounts.formulations,
    },
    {
      entity: "setups",
      count: preview.mappedCounts.setups,
    },
    {
      entity: "experiments",
      count: preview.mappedCounts.experiments,
    },
    {
      entity: "processRecords",
      count: preview.mappedCounts.processRecords,
    },
    {
      entity: "solutionCharacterizations",
      count:
        preview.mappedCounts
          .solutionCharacterizations,
    },
    {
      entity: "materialCharacterizations",
      count:
        preview.mappedCounts
          .materialCharacterizations,
    },
  ]);

  console.log(
    "Errors:",
    errors.length
  );

  console.log(
    "Warnings:",
    warnings.length
  );

  if (errors.length > 0) {
    console.log(
      "ERROR SUMMARY"
    );

    console.table(
      summarizeIssues(errors)
    );
  }

  if (warnings.length > 0) {
    console.log(
      "WARNING SUMMARY"
    );

    console.table(
      summarizeIssues(warnings)
    );
  }

  console.groupEnd();
}