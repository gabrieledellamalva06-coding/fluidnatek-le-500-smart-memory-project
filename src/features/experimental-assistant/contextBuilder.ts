import type { Experiment, Formulation, Project } from "../../types";
import type { SolutionCharacterization } from "../../core/types/characterization";
import type { ExperimentalSetup } from "../../core/types/setup";
import type { HistoricalExperimentContext } from "./similarity.types";

export function buildHistoricalContexts(
  projects: readonly Project[],
  formulations: readonly Formulation[],
  characterizations: readonly SolutionCharacterization[],
  setups: readonly ExperimentalSetup[],
  experiments: readonly Experiment[]
): HistoricalExperimentContext[] {
  const projectsById = new Map(projects.map((item) => [item.id, item]));
  const formulationsById = new Map(formulations.map((item) => [item.id, item]));
  const setupsById = new Map(setups.map((item) => [item.id, item]));

  const latestCharacterizationByFormulation = new Map<string, SolutionCharacterization>();
  for (const characterization of [...characterizations].sort(compareMeasuredAtAscending)) {
    latestCharacterizationByFormulation.set(characterization.formulationId, characterization);
  }

  return experiments.map((experiment) => {
    const formulation = formulationsById.get(experiment.formulationId);
    const project = formulation ? projectsById.get(formulation.projectId) : undefined;
    const setupId = experiment.metadata?.canonicalSetupId;

    return {
      experiment,
      formulation,
      project,
      characterization: formulation
        ? latestCharacterizationByFormulation.get(formulation.id)
        : undefined,
      setup: setupId ? setupsById.get(setupId) : undefined,
    };
  });
}

function compareMeasuredAtAscending(
  first: SolutionCharacterization,
  second: SolutionCharacterization
): number {
  return parseDate(first.measuredAt) - parseDate(second.measuredAt);
}

function parseDate(value: string | undefined): number {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}
