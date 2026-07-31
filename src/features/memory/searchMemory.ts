import type {
  Experiment,
  Formulation,
  Project,
  TelemetryRecord,
} from "../../types";

export interface MemorySearchQuery {
  formulationId: string;
  voltageKv: number;
  flowRateMlH: number;
  distanceMm: number;
}

export interface MemorySearchCandidate {
  experiment: Experiment;
  formulation: Formulation;
  project: Project | null;

  similarityScore: number;

  averageVoltageKv: number | null;
  averageFlowRateMlH: number | null;
  averageTemperatureC: number | null;
  averageHumidityPct: number | null;

  voltageDifferenceKv: number | null;
  flowRateDifferenceMlH: number | null;
  distanceDifferenceMm: number;

  warnings: string[];
}

export interface MemorySearchSummary {
  candidates: MemorySearchCandidate[];

  matchedExperiments: number;

  averageSimilarityScore: number;

  recommendedVoltageKv: number | null;
  recommendedFlowRateMlH: number | null;
  recommendedDistanceMm: number | null;

  estimatedSuccessProbability: number;

  warnings: string[];
}

interface SearchMemoryInput {
  query: MemorySearchQuery;
  projects: Project[];
  formulations: Formulation[];
  experiments: Experiment[];
  maximumResults?: number;
}

const DEFAULT_MAXIMUM_RESULTS = 5;

export function searchProcessMemory({
  query,
  projects,
  formulations,
  experiments,
  maximumResults = DEFAULT_MAXIMUM_RESULTS,
}: SearchMemoryInput): MemorySearchSummary {
  const selectedFormulation = formulations.find(
    (formulation) => formulation.id === query.formulationId
  );

  if (!selectedFormulation) {
    return createEmptySummary([
      "The selected formulation could not be found.",
    ]);
  }

  const projectById = new Map(
    projects.map((project) => [project.id, project])
  );

  const formulationById = new Map(
    formulations.map((formulation) => [
      formulation.id,
      formulation,
    ])
  );

  const candidates = experiments
    .map((experiment): MemorySearchCandidate | null => {
      const formulation = formulationById.get(
        experiment.formulationId
      );

      if (!formulation) {
        return null;
      }

      const formulationSimilarity =
        calculateFormulationSimilarity(
          selectedFormulation,
          formulation
        );

      if (formulationSimilarity <= 0) {
        return null;
      }

      const telemetryStatistics =
        calculateTelemetryStatistics(
          experiment.telemetryData
        );

      const voltageSimilarity =
        calculateNumericSimilarity(
          query.voltageKv,
          telemetryStatistics.averageVoltageKv,
          10
        );

      const flowSimilarity =
        calculateNumericSimilarity(
          query.flowRateMlH,
          telemetryStatistics.averageFlowRateMlH,
          1
        );

      const distanceSimilarity =
        calculateNumericSimilarity(
          query.distanceMm,
          experiment.distanceMm,
          100
        );

      const processabilityScore =
        clamp(experiment.jetStabilityGrade / 5, 0, 1);

      const similarityScore =
        formulationSimilarity * 45 +
        voltageSimilarity * 15 +
        flowSimilarity * 15 +
        distanceSimilarity * 10 +
        processabilityScore * 15;

      return {
        experiment,
        formulation,
        project:
          projectById.get(formulation.projectId) ?? null,

        similarityScore: round(similarityScore, 1),

        averageVoltageKv:
          telemetryStatistics.averageVoltageKv,

        averageFlowRateMlH:
          telemetryStatistics.averageFlowRateMlH,

        averageTemperatureC:
          telemetryStatistics.averageTemperatureC,

        averageHumidityPct:
          telemetryStatistics.averageHumidityPct,

        voltageDifferenceKv:
          calculateDifference(
            query.voltageKv,
            telemetryStatistics.averageVoltageKv
          ),

        flowRateDifferenceMlH:
          calculateDifference(
            query.flowRateMlH,
            telemetryStatistics.averageFlowRateMlH
          ),

        distanceDifferenceMm: round(
          Math.abs(
            query.distanceMm -
              experiment.distanceMm
          ),
          1
        ),

        warnings: buildCandidateWarnings(
          experiment,
          telemetryStatistics
        ),
      };
    })
    .filter(
      (
        candidate
      ): candidate is MemorySearchCandidate =>
        candidate !== null
    )
    .sort(
      (first, second) =>
        second.similarityScore -
        first.similarityScore
    )
    .slice(0, maximumResults);

  if (candidates.length === 0) {
    return createEmptySummary([
      "No sufficiently related historical experiment was found.",
    ]);
  }

  const successfulCandidates = candidates.filter(
    (candidate) =>
      candidate.experiment.jetStabilityGrade >= 4
  );

  const recommendationSource =
    successfulCandidates.length > 0
      ? successfulCandidates
      : candidates;

  const recommendedVoltageKv =
    weightedAverage(
      recommendationSource,
      (candidate) =>
        candidate.averageVoltageKv,
      (candidate) =>
        candidate.similarityScore
    );

  const recommendedFlowRateMlH =
    weightedAverage(
      recommendationSource,
      (candidate) =>
        candidate.averageFlowRateMlH,
      (candidate) =>
        candidate.similarityScore
    );

  const recommendedDistanceMm =
    weightedAverage(
      recommendationSource,
      (candidate) =>
        candidate.experiment.distanceMm,
      (candidate) =>
        candidate.similarityScore
    );

  const averageSimilarityScore = average(
    candidates.map(
      (candidate) =>
        candidate.similarityScore
    )
  );

  const averageProcessability = average(
    candidates.map(
      (candidate) =>
        candidate.experiment.jetStabilityGrade
    )
  );

  const estimatedSuccessProbability = clamp(
    averageSimilarityScore * 0.65 +
      (averageProcessability / 5) * 100 * 0.35,
    0,
    100
  );

  return {
    candidates,

    matchedExperiments: candidates.length,

    averageSimilarityScore: round(
      averageSimilarityScore,
      1
    ),

    recommendedVoltageKv:
      nullableRound(
        recommendedVoltageKv,
        2
      ),

    recommendedFlowRateMlH:
      nullableRound(
        recommendedFlowRateMlH,
        3
      ),

    recommendedDistanceMm:
      nullableRound(
        recommendedDistanceMm,
        1
      ),

    estimatedSuccessProbability: round(
      estimatedSuccessProbability,
      1
    ),

    warnings: buildSummaryWarnings(
      candidates,
      estimatedSuccessProbability
    ),
  };
}

function calculateFormulationSimilarity(
  selected: Formulation,
  candidate: Formulation
): number {
  const sameFormulation =
    selected.id === candidate.id;

  if (sameFormulation) {
    return 1;
  }

  const samePolymer =
    normalizeText(selected.polymerName) ===
    normalizeText(candidate.polymerName);

  const sameSolvent =
    normalizeText(selected.solvent) ===
    normalizeText(candidate.solvent);

  const solidsSimilarity =
    calculateNumericSimilarity(
      selected.solidsContentPct,
      candidate.solidsContentPct,
      10
    );

  if (!samePolymer) {
    return 0;
  }

  return clamp(
    0.55 +
      (sameSolvent ? 0.25 : 0) +
      solidsSimilarity * 0.2,
    0,
    1
  );
}

function calculateTelemetryStatistics(
  telemetryData: TelemetryRecord[]
): {
  averageVoltageKv: number | null;
  averageFlowRateMlH: number | null;
  averageTemperatureC: number | null;
  averageHumidityPct: number | null;
} {
  if (telemetryData.length === 0) {
    return {
      averageVoltageKv: null,
      averageFlowRateMlH: null,
      averageTemperatureC: null,
      averageHumidityPct: null,
    };
  }

  return {
    averageVoltageKv: average(
      telemetryData.map(
        (record) => record.voltageKv
      )
    ),

    averageFlowRateMlH: average(
      telemetryData.map(
        (record) => record.flowRateMlH
      )
    ),

    averageTemperatureC: average(
      telemetryData.map(
        (record) => record.temperatureC
      )
    ),

    averageHumidityPct: average(
      telemetryData.map(
        (record) => record.humidityPct
      )
    ),
  };
}

function buildCandidateWarnings(
  experiment: Experiment,
  telemetry: ReturnType<
    typeof calculateTelemetryStatistics
  >
): string[] {
  const warnings: string[] = [];

  if (experiment.jetStabilityGrade <= 2) {
    warnings.push(
      "Historical run showed low jet stability."
    );
  }

  if (
    telemetry.averageHumidityPct !== null &&
    telemetry.averageHumidityPct > 55
  ) {
    warnings.push(
      "Historical humidity was above 55% RH."
    );
  }

  if (
    telemetry.averageTemperatureC !== null &&
    (telemetry.averageTemperatureC < 18 ||
      telemetry.averageTemperatureC > 28)
  ) {
    warnings.push(
      "Historical temperature was outside the general operating window."
    );
  }

  if (experiment.telemetryData.length === 0) {
    warnings.push(
      "Historical run has no telemetry samples."
    );
  }

  return warnings;
}

function buildSummaryWarnings(
  candidates: MemorySearchCandidate[],
  estimatedSuccessProbability: number
): string[] {
  const warnings = new Set<string>();

  if (estimatedSuccessProbability < 60) {
    warnings.add(
      "Historical evidence is currently weak. Validate the parameters with a controlled trial."
    );
  }

  const unstableRuns = candidates.filter(
    (candidate) =>
      candidate.experiment.jetStabilityGrade <= 2
  );

  if (unstableRuns.length > 0) {
    warnings.add(
      `${unstableRuns.length} similar historical run(s) reported low process stability.`
    );
  }

  const candidatesWithoutTelemetry =
    candidates.filter(
      (candidate) =>
        candidate.experiment.telemetryData.length ===
        0
    );

  if (candidatesWithoutTelemetry.length > 0) {
    warnings.add(
      `${candidatesWithoutTelemetry.length} matching run(s) do not contain telemetry data.`
    );
  }

  return Array.from(warnings);
}

function createEmptySummary(
  warnings: string[]
): MemorySearchSummary {
  return {
    candidates: [],
    matchedExperiments: 0,
    averageSimilarityScore: 0,
    recommendedVoltageKv: null,
    recommendedFlowRateMlH: null,
    recommendedDistanceMm: null,
    estimatedSuccessProbability: 0,
    warnings,
  };
}

function calculateNumericSimilarity(
  target: number,
  candidate: number | null,
  tolerance: number
): number {
  if (
    candidate === null ||
    tolerance <= 0
  ) {
    return 0;
  }

  const difference = Math.abs(
    target - candidate
  );

  return clamp(
    1 - difference / tolerance,
    0,
    1
  );
}

function calculateDifference(
  target: number,
  candidate: number | null
): number | null {
  if (candidate === null) {
    return null;
  }

  return round(
    Math.abs(target - candidate),
    3
  );
}

function weightedAverage<T>(
  items: T[],
  getValue: (item: T) => number | null,
  getWeight: (item: T) => number
): number | null {
  let weightedTotal = 0;
  let weightTotal = 0;

  items.forEach((item) => {
    const value = getValue(item);

    if (value === null) {
      return;
    }

    const weight = Math.max(
      getWeight(item),
      0
    );

    weightedTotal += value * weight;
    weightTotal += weight;
  });

  if (weightTotal === 0) {
    return null;
  }

  return weightedTotal / weightTotal;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return (
    values.reduce(
      (total, value) => total + value,
      0
    ) / values.length
  );
}

function normalizeText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase();
}

function nullableRound(
  value: number | null,
  decimals: number
): number | null {
  if (value === null) {
    return null;
  }

  return round(value, decimals);
}

function round(
  value: number,
  decimals: number
): number {
  const multiplier = 10 ** decimals;

  return (
    Math.round(value * multiplier) /
    multiplier
  );
}

function clamp(
  value: number,
  minimum: number,
  maximum: number
): number {
  return Math.min(
    Math.max(value, minimum),
    maximum
  );
}