import {
  DEFAULT_COMPANY_ID,
} from "../../config/collectionPaths";

import {
  loadSectionADataset,
} from "./sectionA.loader";

import {
  sectionAMigrationService,
  type SectionAMigrationResult,
} from "./sectionAMigration.service";

const MIGRATION_CONFIRMATION =
  "MIGRATE_SECTION_A_TO_FIRESTORE";

export interface SectionAMigrationConsole {
  runSectionA(
    confirmation: string,
    companyId?: string
  ): Promise<SectionAMigrationResult>;
}

declare global {
  interface Window {
    fluidnatekMigration?:
      SectionAMigrationConsole;
  }
}

function logMigrationResult(
  result: SectionAMigrationResult,
  companyId: string
): void {
  console.group(
    "[SECTION A FIRESTORE MIGRATION]"
  );

  console.log(
    "Company ID:",
    companyId
  );

  console.log(
    "Dataset valid:",
    result.validation.valid
  );

  console.log(
    "Migration completed:",
    result.migrated
  );

  console.log(
    "Written counts:"
  );

  console.table(
    Object.entries(
      result.writtenCounts
    ).map(([entity, count]) => ({
      entity,
      count,
    }))
  );

  console.log(
    "Failures:",
    result.failures.length
  );

  if (result.failures.length > 0) {
    console.table(
      result.failures
    );
  }

  console.groupEnd();
}

export async function runSectionAMigration(
  confirmation: string,
  companyId: string =
    DEFAULT_COMPANY_ID
): Promise<SectionAMigrationResult> {
  if (!import.meta.env.DEV) {
    throw new Error(
      "Historical migration is available only in development mode."
    );
  }

  if (
    confirmation !==
    MIGRATION_CONFIRMATION
  ) {
    throw new Error(
      `Migration blocked. Use the exact confirmation phrase: ${MIGRATION_CONFIRMATION}`
    );
  }

  const normalizedCompanyId =
    companyId.trim();

  if (!normalizedCompanyId) {
    throw new Error(
      "A valid company ID is required."
    );
  }

  const dataset =
    await loadSectionADataset({
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

  const result =
    await sectionAMigrationService.migrate(
      dataset,
      normalizedCompanyId
    );

  logMigrationResult(
    result,
    normalizedCompanyId
  );

  return result;
}

export function registerSectionAMigrationCommand(): void {
  if (!import.meta.env.DEV) {
    return;
  }

  window.fluidnatekMigration = {
    runSectionA:
      runSectionAMigration,
  };

  console.info(
    "[FLUIDNATEK MIGRATION] Manual command registered."
  );

  console.info(
    'Run: window.fluidnatekMigration?.runSectionA("MIGRATE_SECTION_A_TO_FIRESTORE", "default")'
  );
}