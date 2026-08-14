import type { SolutionSimilarityMatch } from "./similarity.types";
import { processParameterTolerances } from "./processParameterTolerances";

export const INITIAL_RECOMMENDATION_CONFIG = {
  minimumParameterEvidence: 2,
  minimumComparableSolutionCriteria: 3,
  evidence: {
    high: { minimumExperiments: 4, minimumSuccessful: 3, minimumQuality: 0.65 },
    medium: { minimumExperiments: 2, minimumSuccessful: 1, minimumQuality: 0.4 },
  },
  successWeights: {
    1: 0.1,
    2: 0.35,
    3: 0.7,
    4: 1,
  },
} as const;

export type RecommendedParameterKey =
  | "flowRateMlH"
  | "voltageKv"
  | "collectorVoltageKv"
  | "temperatureC"
  | "humidityPct"
  | "distanceMm"
  | "drumSpeedRpm";

export type ParameterRecommendationSourceStatus = "included" | "outlier" | "no-consensus" | "insufficient-evidence";

export interface ParameterRecommendationSource {
  experimentId: string;
  experimentName: string;
  rawValue: number;
  unit: string;
  solutionSimilarity: number;
  grade?: number;
  successWeight: number;
  contributionWeight: number;
  status: ParameterRecommendationSourceStatus;
  exclusionReason?: string;
}

export interface ParameterRecommendation {
  key: RecommendedParameterKey;
  label: string;
  unit: string;
  value?: number;
  range?: { minimum: number; maximum: number };
  evidenceLevel: "high" | "medium" | "low" | "insufficient";
  supportingExperimentIds: string[];
  supportingExperimentCount: number;
  successfulExperimentCount: number;
  explanation: string;
  filteredOutlierExperimentIds: string[];
  sources: ParameterRecommendationSource[];
}

export interface InitialParameterRecommendation {
  evidenceLevel: "high" | "medium" | "low" | "insufficient";
  supportingExperimentCount: number;
  successfulExperimentCount: number;
  bestMatch?: SolutionSimilarityMatch;
  parameters: ParameterRecommendation[];
}

interface ParameterDefinition {
  key: RecommendedParameterKey;
  label: string;
  unit: string;
  read: (match: SolutionSimilarityMatch) => number | undefined;
}

const PARAMETERS: readonly ParameterDefinition[] = [
  { key: "flowRateMlH", label: "Flow Rate", unit: "mL/h", read: (match) => representative(match)?.flowRateMlH },
  { key: "voltageKv", label: "HV+", unit: "kV", read: (match) => representative(match)?.voltageKv },
  { key: "collectorVoltageKv", label: "HV-", unit: "kV", read: (match) => representative(match)?.collectorVoltageKv },
  { key: "temperatureC", label: "Temperature", unit: "°C", read: (match) => representative(match)?.temperatureC },
  { key: "humidityPct", label: "Relative Humidity", unit: "%", read: (match) => representative(match)?.humidityPct },
  { key: "distanceMm", label: "Working Distance", unit: "mm", read: (match) => representative(match)?.distanceMm },
  { key: "drumSpeedRpm", label: "Drum / Collector Speed", unit: "rpm", read: (match) => representative(match)?.drumSpeedRpm },
];

export function buildInitialParameterRecommendation(
  matches: readonly SolutionSimilarityMatch[],
): InitialParameterRecommendation {
  const ordered = [...matches].sort((left, right) => right.score - left.score);
  const eligible = ordered.filter((match) => match.comparableCriteriaCount >= INITIAL_RECOMMENDATION_CONFIG.minimumComparableSolutionCriteria);
  const successful = eligible.filter((match) => validGrade(match.context.experiment.jetStabilityGrade) && match.context.experiment.jetStabilityGrade >= 3);
  const quality = eligible.length === 0 ? 0 : eligible.reduce((sum, match) => sum + match.score / 100, 0) / eligible.length;
  const evidenceLevel = resolveEvidenceLevel(eligible.length, successful.length, quality);

  return {
    evidenceLevel,
    supportingExperimentCount: eligible.length,
    successfulExperimentCount: successful.length,
    bestMatch: eligible[0],
    parameters: PARAMETERS.map((definition) => buildParameter(definition, eligible, ordered)),
  };
}

function buildParameter(definition: ParameterDefinition, matches: readonly SolutionSimilarityMatch[], allMatches: readonly SolutionSimilarityMatch[]): ParameterRecommendation {
  const usable = matches
    .map((match) => ({ match, value: definition.read(match), weight: contributionWeight(match) }))
    .filter((item): item is { match: SolutionSimilarityMatch; value: number; weight: number } => item.value !== undefined && Number.isFinite(item.value) && item.weight > 0);
  const { accepted: iqrAccepted, filteredOutliers } = filterRobustOutliers(usable);
  const { accepted, excluded: consensusExcluded } = filterByParameterConsensus(definition.key, iqrAccepted);
  const successfulCount = accepted.filter((item) => item.match.context.experiment.jetStabilityGrade >= 3).length;
  const ids = accepted.map((item) => item.match.context.experiment.id);
  const filteredIds = filteredOutliers.map((item) => item.match.context.experiment.id);
  const consensusExcludedIds = consensusExcluded.map((item) => item.match.context.experiment.id);
  const sources = allMatches.flatMap((match): ParameterRecommendationSource[] => {
    const rawValue = definition.read(match);
    if (rawValue === undefined || !Number.isFinite(rawValue)) return [];
    const eligible = matches.includes(match);
    const outlier = filteredIds.includes(match.context.experiment.id);
    const outsideConsensus = consensusExcludedIds.includes(match.context.experiment.id);
    const grade = validGrade(match.context.experiment.jetStabilityGrade) ? match.context.experiment.jetStabilityGrade : undefined;
    const successWeight = grade === undefined ? 0.1 : INITIAL_RECOMMENDATION_CONFIG.successWeights[grade];
    const status: ParameterRecommendationSourceStatus = !eligible ? "insufficient-evidence" : outlier ? "outlier" : outsideConsensus ? "no-consensus" : "included";
    return [{ experimentId: match.context.experiment.id, experimentName: match.context.experiment.operationIdentifier || match.context.experiment.id, rawValue, unit: definition.unit, solutionSimilarity: match.score, grade, successWeight, contributionWeight: contributionWeight(match), status, exclusionReason: status === "insufficient-evidence" ? `Only ${match.comparableCriteriaCount}/${match.comparableCriteriaTotal} solution criteria were comparable; ${INITIAL_RECOMMENDATION_CONFIG.minimumComparableSolutionCriteria} are required.` : status === "outlier" ? "Excluded by the existing IQR outlier filter." : status === "no-consensus" ? "Excluded because the value is outside the existing parameter tolerance around the median consensus center." : undefined }];
  });
  if (accepted.length < INITIAL_RECOMMENDATION_CONFIG.minimumParameterEvidence) {
    return { ...definition, evidenceLevel: "insufficient", supportingExperimentIds: ids, supportingExperimentCount: accepted.length, successfulExperimentCount: successfulCount, filteredOutlierExperimentIds: filteredIds, sources, explanation: "No reliable historical recommendation." };
  }
  const totalWeight = accepted.reduce((sum, item) => sum + item.weight, 0);
  const value = accepted.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight;
  const values = accepted.map((item) => item.value);
  const level = resolveEvidenceLevel(accepted.length, successfulCount, accepted.reduce((sum, item) => sum + item.match.score / 100, 0) / accepted.length);
  if (level === "low") {
    return { ...definition, evidenceLevel: "low", supportingExperimentIds: ids, supportingExperimentCount: accepted.length, successfulExperimentCount: successfulCount, filteredOutlierExperimentIds: filteredIds, sources, explanation: "Historical data exists, but it is not strong enough for a reliable starting parameter." };
  }
  return { ...definition, value: round(value, 2), range: { minimum: round(Math.min(...values), 2), maximum: round(Math.max(...values), 2) }, evidenceLevel: level, supportingExperimentIds: ids, supportingExperimentCount: accepted.length, successfulExperimentCount: successfulCount, filteredOutlierExperimentIds: filteredIds, sources, explanation: `${successfulCount} successful similar experiment${successfulCount === 1 ? "" : "s"} used approximately ${formatRange(Math.min(...values), Math.max(...values), definition.unit)}. Weighted historical value: ${round(value, 2)} ${definition.unit}.` };
}

function filterRobustOutliers(items: readonly { match: SolutionSimilarityMatch; value: number; weight: number }[]): { accepted: typeof items[number][]; filteredOutliers: typeof items[number][] } {
  if (items.length < 4) return { accepted: [...items], filteredOutliers: [] };
  const sorted = items.map((item) => item.value).sort((a, b) => a - b);
  const q1 = percentile(sorted, 0.25);
  const q3 = percentile(sorted, 0.75);
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  const accepted = items.filter((item) => item.value >= lower && item.value <= upper);
  return { accepted, filteredOutliers: items.filter((item) => !accepted.includes(item)) };
}

function filterByParameterConsensus(key: RecommendedParameterKey, items: readonly { match: SolutionSimilarityMatch; value: number; weight: number }[]): { accepted: typeof items[number][]; excluded: typeof items[number][] } {
  if (items.length === 0) return { accepted: [], excluded: [] };
  const sorted = items.map((item) => item.value).sort((left, right) => left - right);
  const center = percentile(sorted, 0.5);
  const tolerance = processParameterTolerances[key];
  const consensusTolerance = Math.max(tolerance.absolute, Math.abs(center) * tolerance.relative);
  const accepted = items.filter((item) => Math.abs(item.value - center) <= consensusTolerance);
  return { accepted, excluded: items.filter((item) => !accepted.includes(item)) };
}

function percentile(values: readonly number[], position: number): number { const index = (values.length - 1) * position; const lower = Math.floor(index); const upper = Math.ceil(index); const fraction = index - lower; return values[lower] + (values[upper] - values[lower]) * fraction; }

function contributionWeight(match: SolutionSimilarityMatch): number {
  const grade = validGrade(match.context.experiment.jetStabilityGrade) ? match.context.experiment.jetStabilityGrade : 0;
  const successWeight = grade === 0 ? 0.1 : INITIAL_RECOMMENDATION_CONFIG.successWeights[grade as 1 | 2 | 3 | 4];
  return (match.score / 100) * successWeight;
}

function representative(match: SolutionSimilarityMatch) {
  return match.context.experiment.telemetryData.find((item) => [item.flowRateMlH, item.voltageKv, item.collectorVoltageKv, item.temperatureC, item.humidityPct, item.distanceMm, item.drumSpeedRpm].some((value) => typeof value === "number" && Number.isFinite(value))) ?? match.context.experiment.telemetryData[0];
}

function resolveEvidenceLevel(experiments: number, successful: number, quality: number): "high" | "medium" | "low" | "insufficient" {
  if (experiments < INITIAL_RECOMMENDATION_CONFIG.minimumParameterEvidence) return "insufficient";
  if (experiments >= INITIAL_RECOMMENDATION_CONFIG.evidence.high.minimumExperiments && successful >= INITIAL_RECOMMENDATION_CONFIG.evidence.high.minimumSuccessful && quality >= INITIAL_RECOMMENDATION_CONFIG.evidence.high.minimumQuality) return "high";
  if (experiments >= INITIAL_RECOMMENDATION_CONFIG.evidence.medium.minimumExperiments && successful >= INITIAL_RECOMMENDATION_CONFIG.evidence.medium.minimumSuccessful && quality >= INITIAL_RECOMMENDATION_CONFIG.evidence.medium.minimumQuality) return "medium";
  return "low";
}

function formatRange(minimum: number, maximum: number, unit: string): string { return `${round(minimum, 2)}–${round(maximum, 2)} ${unit}`; }
function round(value: number, digits: number): number { const factor = 10 ** digits; return Math.round(value * factor) / factor; }
function validGrade(value: number): value is 1 | 2 | 3 | 4 { return Number.isInteger(value) && value >= 1 && value <= 4; }
