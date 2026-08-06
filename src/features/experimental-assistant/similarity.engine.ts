import type {
  ContextTier,
  HistoricalExperimentContext,
  SimilarityMatch,
  SimilarityQuery,
} from "./similarity.types";

interface NumericFieldRule {
  experimentValue: (context: HistoricalExperimentContext) => number | undefined;
  queryValue: (query: SimilarityQuery) => number | undefined;
  weight: number;
  tolerance: number;
}

export function searchSimilarExperiments(
  contexts: readonly HistoricalExperimentContext[],
  query: SimilarityQuery,
  minimumSimilarity = 30,
  maximumResults = 12
): SimilarityMatch[] {
  const candidates = contexts.flatMap((context) => {
    const tier = resolveContextTier(context, query);
    if (tier === 0) return [];

    const score = calculateSimilarityScore(context, query);
    return score >= minimumSimilarity
      ? [{ tier, score, context }]
      : [];
  });

  if (candidates.length === 0) return [];

  const highestTier = Math.max(...candidates.map((item) => item.tier));

  return candidates
    .filter((item) => item.tier === highestTier)
    .sort((a, b) => b.score - a.score)
    .slice(0, maximumResults);
}

export function calculateSimilarityScore(
  context: HistoricalExperimentContext,
  query: SimilarityQuery
): number {
  let score = 0;
  let maxScore = 0;

  const contextFields = [
    {
      experimentValue: context.formulation?.id,
      queryValue: query.formulationId,
      weight: 35,
      match: exactTextMatch,
    },
    {
      experimentValue: context.formulation?.polymerName,
      queryValue: query.polymer,
      weight: 25,
      match: safeTextMatch,
    },
    {
      experimentValue: context.formulation?.solvent,
      queryValue: query.solvent,
      weight: 15,
      match: safeTextMatch,
    },
    {
      experimentValue: context.setup?.machine.model ?? context.experiment.machineModel,
      queryValue: query.machine,
      weight: 10,
      match: machineMatch,
    },
    {
      experimentValue: context.project?.id,
      queryValue: query.projectId,
      weight: 5,
      match: exactTextMatch,
    },
  ] as const;

  for (const field of contextFields) {
    if (!normalizeText(field.queryValue)) continue;
    maxScore += field.weight;
    if (field.match(field.experimentValue, field.queryValue)) {
      score += field.weight;
    }
  }

  const numericRules: readonly NumericFieldRule[] = [
    {
      experimentValue: getAverageFlow,
      queryValue: (value) => value.flowRateMlH,
      weight: 15,
      tolerance: 0.5,
    },
    {
      experimentValue: getAverageVoltage,
      queryValue: (value) => value.voltageKv,
      weight: 15,
      tolerance: 2,
    },
    {
      experimentValue: getHvNegative,
      queryValue: (value) => value.hvNegativeKv,
      weight: 5,
      tolerance: 2,
    },
    {
      experimentValue: getAverageTemperature,
      queryValue: (value) => value.temperatureC,
      weight: 5,
      tolerance: 5,
    },
    {
      experimentValue: getAverageHumidity,
      queryValue: (value) => value.humidityPct,
      weight: 5,
      tolerance: 10,
    },
    {
      experimentValue: getAverageDistance,
      queryValue: (value) => value.distanceMm,
      weight: 10,
      tolerance: 20,
    },
  ];

  for (const rule of numericRules) {
    const queryValue = rule.queryValue(query);
    if (queryValue === undefined || !Number.isFinite(queryValue)) continue;

    maxScore += rule.weight;
    const experimentValue = rule.experimentValue(context);
    if (experimentValue === undefined || !Number.isFinite(experimentValue)) continue;

    const difference = Math.abs(experimentValue - queryValue);
    if (difference === 0) score += rule.weight;
    else if (difference <= rule.tolerance) score += rule.weight * 0.75;
    else if (difference <= rule.tolerance * 2) score += rule.weight * 0.4;
  }

  return maxScore <= 0 ? 0 : round((score / maxScore) * 100, 2);
}

function resolveContextTier(
  context: HistoricalExperimentContext,
  query: SimilarityQuery
): ContextTier | 0 {
  const formulaMatch = Boolean(query.formulationId) &&
    exactTextMatch(context.formulation?.id, query.formulationId);
  const polymerMatch = Boolean(query.polymer) &&
    safeTextMatch(context.formulation?.polymerName, query.polymer);
  const solventMatch = Boolean(query.solvent) &&
    safeTextMatch(context.formulation?.solvent, query.solvent);

  if (formulaMatch) return 4;
  if (polymerMatch && solventMatch) return 3;
  if (polymerMatch) return 2;
  if (solventMatch) return 1;

  if (!query.formulationId && !query.polymer && !query.solvent) return 1;
  return 0;
}

function getAverageVoltage(context: HistoricalExperimentContext): number | undefined {
  return average(context.experiment.telemetryData.map((item) => item.voltageKv));
}

function getAverageFlow(context: HistoricalExperimentContext): number | undefined {
  return average(context.experiment.telemetryData.map((item) => item.flowRateMlH));
}

function getAverageTemperature(context: HistoricalExperimentContext): number | undefined {
  return average(context.experiment.telemetryData.map((item) => item.temperatureC));
}

function getAverageHumidity(context: HistoricalExperimentContext): number | undefined {
  return average(context.experiment.telemetryData.map((item) => item.humidityPct));
}

function getAverageDistance(context: HistoricalExperimentContext): number | undefined {
  const telemetryAverage = average(
    context.experiment.telemetryData.map((item) => item.distanceMm)
  );
  return telemetryAverage ?? context.experiment.distanceMm;
}

function getHvNegative(context: HistoricalExperimentContext): number | undefined {
  const raw = context.experiment.metadata?.hvNegativeKv;
  if (raw === undefined) return undefined;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeText(value: string | undefined): string {
  return value?.trim().toLocaleLowerCase().replace(/\s+/g, " ") ?? "";
}

function exactTextMatch(left: string | undefined, right: string | undefined): boolean {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

function safeTextMatch(left: string | undefined, right: string | undefined): boolean {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);
  return Boolean(
    normalizedLeft &&
    normalizedRight &&
    (normalizedLeft === normalizedRight ||
      normalizedLeft.includes(normalizedRight) ||
      normalizedRight.includes(normalizedLeft))
  );
}

function machineMatch(left: string | undefined, right: string | undefined): boolean {
  return normalizeMachine(left) === normalizeMachine(right) && Boolean(normalizeMachine(left));
}

function normalizeMachine(value: string | undefined): string {
  const compact = value?.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") ?? "";
  if (compact === "L100" || compact === "LE100") return "LE100";
  if (compact === "L500" || compact === "LE500") return "LE500";
  if (compact.includes("LEGACY")) return "";
  return compact;
}

function average(values: readonly number[]): number | undefined {
  const finiteValues = values.filter(Number.isFinite);
  if (finiteValues.length === 0) return undefined;
  return finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
