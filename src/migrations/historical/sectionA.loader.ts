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

interface SectionAJsonFiles {
  projects: string;
  materials: string;
  formulations: string;
  formulationComponents: string;
  setups: string;
  runs: string;
  characterizations: string;
  results: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Unable to load migration dataset: ${url} (${response.status})`
    );
  }

  return response.json() as Promise<T>;
}

export async function loadSectionADataset(
  files: SectionAJsonFiles
): Promise<LegacySectionADataset> {
  const [
    projects,
    materials,
    formulations,
    formulationComponents,
    setups,
    runs,
    characterizations,
    results,
  ] = await Promise.all([
    fetchJson<LegacyProject[]>(files.projects),
    fetchJson<LegacyMaterial[]>(files.materials),
    fetchJson<LegacyFormulation[]>(files.formulations),
    fetchJson<LegacyFormulationComponent[]>(
      files.formulationComponents
    ),
    fetchJson<LegacySetup[]>(files.setups),
    fetchJson<LegacyRun[]>(files.runs),
    fetchJson<LegacyCharacterization[]>(
      files.characterizations
    ),
    fetchJson<LegacyResult[]>(files.results),
  ]);

  return {
    projects,
    materials,
    formulations,
    formulationComponents,
    setups,
    runs,
    characterizations,
    results,
  };
}