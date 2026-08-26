import type { HistoricalExperimentContext } from "./similarity.types";
import { processParameterTolerances } from "./processParameterTolerances";
import type { ProcessConditionKey, ProcessConditionMatch, ProcessConditionQuery } from "./processConditionSimilarity.types";
import type { SolutionSimilarityMatch } from "./similarity.types";
import { classifyNumericComparison } from "./comparisonClassification";

function historicalValue(context: HistoricalExperimentContext, key: ProcessConditionKey): number | undefined {
  const telemetry = context.experiment.telemetryData.find((item) => item[key] !== undefined && Number.isFinite(item[key]));
  return telemetry?.[key];
}

export function calculateProcessConditionSimilarity(current: number, historical: number, key: ProcessConditionKey): number {
  const tolerance = processParameterTolerances[key];
  const threshold = Math.max(tolerance.absolute, Math.abs(current) * tolerance.relative);
  return Math.max(0, 1 - Math.abs(current - historical) / threshold);
}

export function searchSimilarProcessExperiments(contexts: readonly HistoricalExperimentContext[], query: ProcessConditionQuery, solutionMatches: readonly SolutionSimilarityMatch[] = []): ProcessConditionMatch[] {
  const selected = query.included.filter((key) => query.values[key] !== undefined && Number.isFinite(query.values[key]));
  if (selected.length === 0) return [];
  const solutionById = new Map(solutionMatches.map((match) => [match.context.experiment.id, match]));
  return contexts.map((context) => {
    const comparable = selected.filter((key) => historicalValue(context, key) !== undefined);
    if (comparable.length === 0) return null;
    const closenessValues = comparable.map((key) => {
      const current = query.values[key] as number;
      const historical = historicalValue(context, key) as number;
      return calculateProcessConditionSimilarity(current, historical, key);
    });
    const processSimilarity = closenessValues.reduce((total, value) => total + value, 0) / comparable.length;
    const processCompleteness = comparable.length / selected.length;
    const matchingCriteriaCount = comparable.filter((key) => {
      const comparison = classifyNumericComparison(query.values[key], historicalValue(context, key), processParameterTolerances[key]);
      return comparison.kind === "same" || comparison.kind === "close";
    }).length;
    const positiveCount = closenessValues.filter((value) => value > 0).length;
    if (positiveCount === 0) return null;
    const rankingScore = processSimilarity * 0.7 + processCompleteness * 0.3;
    const evidenceLevel = processCompleteness === 1 ? "strong" : processCompleteness >= 0.5 ? "moderate" : "limited";
    return { context, processScore: Math.round(processSimilarity * 100), processCompleteness, rankingScore: Math.round(rankingScore * 100), comparableCriteriaCount: comparable.length, comparableCriteriaTotal: selected.length, matchingCriteriaCount, selectedCriteria: [...selected], queryValues: Object.fromEntries(selected.map((key) => [key, query.values[key]])), evidenceLevel, solutionMatch: solutionById.get(context.experiment.id) } as ProcessConditionMatch;
  }).filter((match): match is ProcessConditionMatch => match !== null).sort((a, b) => b.rankingScore - a.rankingScore || b.processScore - a.processScore || a.context.experiment.id.localeCompare(b.context.experiment.id));
}
