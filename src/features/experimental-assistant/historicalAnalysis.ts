import type {
  HistoricalAssessment,
  HistoricalProcessWindow,
  NumericSummary,
  SimilarityMatch,
  SimilarityQuery,
} from "./similarity.types";
import { RECOMMENDATION_CONFIG } from "./recommendation.config";

export function analyzeSimilarExperiments(
  matches: readonly SimilarityMatch[],
  query: SimilarityQuery,
  minimumReliableExperiments = RECOMMENDATION_CONFIG.minimumReliableExperiments
): HistoricalAssessment {
  const graded = matches.filter((item) => isValidGrade(item.context.experiment.jetStabilityGrade));
  const grade4Matches = graded.filter((item) => item.context.experiment.jetStabilityGrade === 4);

  const expectedGrade = weightedExpectedGrade(graded);
  const processWindow = buildProcessWindow(grade4Matches);
  const recommendation = buildRecommendation(processWindow);
  const warnings = buildWarnings(processWindow, query);
  const confidence = calculateConfidence(grade4Matches, minimumReliableExperiments);
  const status = grade4Matches.length < minimumReliableExperiments
    ? "insufficient_data"
    : confidence < RECOMMENDATION_CONFIG.lowConfidenceThreshold
      ? "low_confidence"
      : "available";

  const comments = Array.from(
    new Set(
      matches
        .map((item) => item.context.experiment.operatorComments.trim())
        .filter(Boolean)
    )
  ).slice(0, 5);
  const adjustments = buildDirectionalAdjustments(matches, query);

  return {
    status,
    confidence,
    minimumRequiredExperiments: minimumReliableExperiments,
    sourceExperimentIds: grade4Matches.map((item) => item.context.experiment.id),
    total: matches.length,
    graded: graded.length,
    grade4: grade4Matches.length,
    grade4RatePct:
      graded.length === 0
        ? undefined
        : round((grade4Matches.length / graded.length) * 100, 1),
    expectedGrade,
    processWindow: status === "insufficient_data" ? {} : processWindow,
    recommendation: status === "insufficient_data" ? {} : recommendation,
    warnings,
    comments,
    adjustments,
    interpretation: status === "insufficient_data"
      ? (adjustments.length > 0
        ? "Insufficient data for a robust recommendation. The directional adjustments below come from the closest historical operation and must be tested by the operator."
        : "Insufficient data for a robust recommendation. Record more validated experiments before changing process conditions.")
      : interpretExpectedGrade(expectedGrade),
  };
}

function buildProcessWindow(matches: readonly SimilarityMatch[]): HistoricalProcessWindow {
  return {
    flowRateMlH: summarizePlausible(
      matches.flatMap((item) => item.context.experiment.telemetryData.map((r) => r.flowRateMlH)),
      withinLimit(RECOMMENDATION_CONFIG.limits.flowRateMlH)
    ),
    voltageKv: summarizePlausible(
      matches.flatMap((item) => item.context.experiment.telemetryData.map((r) => r.voltageKv)),
      withinLimit(RECOMMENDATION_CONFIG.limits.voltageKv)
    ),
    hvNegativeKv: summarizePlausible(
      matches.flatMap((item) => item.context.experiment.telemetryData
        .map((record) => record.collectorVoltageKv)
        .filter((value): value is number => value !== undefined)),
      withinLimit(RECOMMENDATION_CONFIG.limits.hvNegativeKv)
    ),
    temperatureC: summarizePlausible(
      matches.flatMap((item) => item.context.experiment.telemetryData.map((r) => r.temperatureC)),
      withinLimit(RECOMMENDATION_CONFIG.limits.temperatureC)
    ),
    humidityPct: summarizePlausible(
      matches.flatMap((item) => item.context.experiment.telemetryData.map((r) => r.humidityPct)),
      withinLimit(RECOMMENDATION_CONFIG.limits.humidityPct)
    ),
    distanceMm: summarizePlausible(
      matches.flatMap((item) => {
        const telemetry = item.context.experiment.telemetryData.map((r) => r.distanceMm);
        return telemetry.length > 0 ? telemetry : [item.context.experiment.distanceMm];
      }),
      withinLimit(RECOMMENDATION_CONFIG.limits.distanceMm)
    ),
  };
}

function buildRecommendation(
  window: HistoricalProcessWindow
): Partial<Record<keyof HistoricalProcessWindow, number>> {
  return Object.fromEntries(
    Object.entries(window)
      .filter((entry): entry is [keyof HistoricalProcessWindow, NumericSummary] => entry[1] !== undefined)
      .map(([key, summary]) => [key, summary.median])
  );
}

function buildWarnings(
  window: HistoricalProcessWindow,
  query: SimilarityQuery
): string[] {
  const checks: Array<{
    label: string;
    queryValue: number | undefined;
    summary: NumericSummary | undefined;
  }> = [
    { label: "Q1 (mL/h)", queryValue: query.flowRateMlH, summary: window.flowRateMlH },
    { label: "HV+ (kV)", queryValue: query.voltageKv, summary: window.voltageKv },
    { label: "HV- (kV)", queryValue: query.hvNegativeKv, summary: window.hvNegativeKv },
    { label: "T (°C)", queryValue: query.temperatureC, summary: window.temperatureC },
    { label: "RH (%)", queryValue: query.humidityPct, summary: window.humidityPct },
    { label: "dZ (mm)", queryValue: query.distanceMm, summary: window.distanceMm },
  ];

  return checks.flatMap(({ label, queryValue, summary }) => {
    if (queryValue === undefined || !summary) return [];
    return queryValue < summary.minimum || queryValue > summary.maximum
      ? [`${label} is outside the historical Grade 4 range (${summary.minimum} – ${summary.maximum}).`]
      : [];
  });
}

function weightedExpectedGrade(matches: readonly SimilarityMatch[]): number | undefined {
  if (matches.length === 0) return undefined;
  const denominator = matches.reduce((sum, item) => sum + Math.max(item.score, 1), 0);
  const numerator = matches.reduce(
    (sum, item) => sum + item.context.experiment.jetStabilityGrade * Math.max(item.score, 1),
    0
  );
  return denominator === 0 ? undefined : round(numerator / denominator, 2);
}

function summarize(values: readonly number[]): NumericSummary | undefined {
  const clean = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (clean.length === 0) return undefined;
  return {
    minimum: round(quantile(clean, RECOMMENDATION_CONFIG.robustLowerQuantile), 2),
    maximum: round(quantile(clean, RECOMMENDATION_CONFIG.robustUpperQuantile), 2),
    average: round(clean.reduce((sum, value) => sum + value, 0) / clean.length, 2),
    median: round(quantile(clean, 0.5), 2),
    sampleSize: clean.length,
  };
}

function calculateConfidence(
  matches: readonly SimilarityMatch[],
  minimumReliableExperiments: number
): number {
  if (matches.length === 0) return 0;
  const sampleCoverage = Math.min(matches.length / Math.max(minimumReliableExperiments, 1), 1);
  const meanSimilarity = matches.reduce((sum, item) => sum + item.score, 0) / matches.length / 100;
  const completeness = matches.reduce((sum, item) => {
    const record = item.context.experiment.telemetryData[0];
    if (!record) return sum;
    const present = [record.flowRateMlH, record.voltageKv, record.collectorVoltageKv,
      record.temperatureC, record.humidityPct, record.distanceMm]
      .filter((value) => typeof value === "number" && Number.isFinite(value)).length;
    return sum + present / 6;
  }, 0) / matches.length;
  return round(sampleCoverage * 0.4 + meanSimilarity * 0.4 + completeness * 0.2, 2);
}

function quantile(sortedValues: readonly number[], probability: number): number {
  const position = (sortedValues.length - 1) * probability;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const lower = sortedValues[lowerIndex] ?? 0;
  const upper = sortedValues[upperIndex] ?? lower;
  return lower + (upper - lower) * (position - lowerIndex);
}

function withinLimit(limit: { minimum: number; maximum: number }) {
  return (value: number): boolean => value >= limit.minimum && value <= limit.maximum;
}

function summarizePlausible(
  values: readonly number[],
  predicate: (value: number) => boolean
): NumericSummary | undefined {
  return summarize(values.filter((value) => Number.isFinite(value) && predicate(value)));
}

function isValidGrade(value: number): boolean {
  return Number.isFinite(value) && value >= 1 && value <= 4;
}

function interpretExpectedGrade(value: number | undefined): string {
  if (value === undefined) return "Not enough graded historical data for a reliable estimate.";
  if (value >= 3.5) return "Historical evidence is close to the Grade 4 target.";
  if (value >= 3) return "The process appears workable, but optimization is still needed to reliably reach Grade 4.";
  if (value >= 2) return "Historical evidence suggests moderate processability. Parameter optimization is recommended.";
  return "Historical evidence suggests low processability for the current conditions.";
}

function buildDirectionalAdjustments(matches: readonly SimilarityMatch[], query: SimilarityQuery): string[] {
  const closest = matches[0];
  const record = closest?.context.experiment.telemetryData[0];
  if (!closest || !record) return [];
  const result: string[] = [];
  addDirection(result, "HV+", query.voltageKv, record.voltageKv, "kV", closest.context.experiment.id);
  addDirection(result, "HV−", query.hvNegativeKv, record.collectorVoltageKv, "kV", closest.context.experiment.id);
  addDirection(result, "Flow", query.flowRateMlH, record.flowRateMlH, "mL/h", closest.context.experiment.id);
  addDirection(result, "Temperature", query.temperatureC, record.temperatureC, "°C", closest.context.experiment.id);
  addDirection(result, "RH", query.humidityPct, record.humidityPct, "%", closest.context.experiment.id);
  addDirection(result, "Distance", query.distanceMm, record.distanceMm, "mm", closest.context.experiment.id);
  return result;
}

function addDirection(output: string[], label: string, current: number | undefined, historical: number | undefined, unit: string, sourceId: string): void {
  if (!Number.isFinite(current) || !Number.isFinite(historical)) return;
  const difference = (historical as number) - (current as number);
  if (Math.abs(difference) < 0.01) return;
  output.push(`${label}: investigate ${difference > 0 ? "an increase" : "a decrease"} toward ${formatNumber(historical as number)} ${unit} (source ${sourceId}).`);
}

function formatNumber(value: number): string { return Number.isInteger(value) ? String(value) : value.toFixed(2); }

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
