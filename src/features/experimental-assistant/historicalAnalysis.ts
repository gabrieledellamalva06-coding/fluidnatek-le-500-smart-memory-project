import type {
  HistoricalAssessment,
  HistoricalProcessWindow,
  NumericSummary,
  SimilarityMatch,
  SimilarityQuery,
} from "./similarity.types";

export function analyzeSimilarExperiments(
  matches: readonly SimilarityMatch[],
  query: SimilarityQuery
): HistoricalAssessment {
  const graded = matches.filter((item) => isValidGrade(item.context.experiment.jetStabilityGrade));
  const grade4Matches = graded.filter((item) => item.context.experiment.jetStabilityGrade === 4);

  const expectedGrade = weightedExpectedGrade(graded);
  const processWindow = buildProcessWindow(grade4Matches);
  const recommendation = buildRecommendation(processWindow);
  const warnings = buildWarnings(processWindow, query);

  const comments = Array.from(
    new Set(
      matches
        .map((item) => item.context.experiment.operatorComments.trim())
        .filter(Boolean)
    )
  ).slice(0, 5);

  return {
    total: matches.length,
    graded: graded.length,
    grade4: grade4Matches.length,
    grade4RatePct:
      graded.length === 0
        ? undefined
        : round((grade4Matches.length / graded.length) * 100, 1),
    expectedGrade,
    processWindow,
    recommendation,
    warnings,
    comments,
    interpretation: interpretExpectedGrade(expectedGrade),
  };
}

function buildProcessWindow(matches: readonly SimilarityMatch[]): HistoricalProcessWindow {
  return {
    flowRateMlH: summarize(matches.flatMap((item) => item.context.experiment.telemetryData.map((r) => r.flowRateMlH))),
    voltageKv: summarize(matches.flatMap((item) => item.context.experiment.telemetryData.map((r) => r.voltageKv))),
    hvNegativeKv: summarize(
      matches.flatMap((item) => {
        const raw = item.context.experiment.metadata?.hvNegativeKv;
        const parsed = raw === undefined ? Number.NaN : Number.parseFloat(raw);
        return Number.isFinite(parsed) ? [parsed] : [];
      })
    ),
    temperatureC: summarize(matches.flatMap((item) => item.context.experiment.telemetryData.map((r) => r.temperatureC))),
    humidityPct: summarize(matches.flatMap((item) => item.context.experiment.telemetryData.map((r) => r.humidityPct))),
    distanceMm: summarize(
      matches.flatMap((item) => {
        const telemetry = item.context.experiment.telemetryData.map((r) => r.distanceMm);
        return telemetry.length > 0 ? telemetry : [item.context.experiment.distanceMm];
      })
    ),
  };
}

function buildRecommendation(
  window: HistoricalProcessWindow
): Partial<Record<keyof HistoricalProcessWindow, number>> {
  return Object.fromEntries(
    Object.entries(window)
      .filter((entry): entry is [keyof HistoricalProcessWindow, NumericSummary] => entry[1] !== undefined)
      .map(([key, summary]) => [key, summary.average])
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
  const clean = values.filter(Number.isFinite);
  if (clean.length === 0) return undefined;
  return {
    minimum: round(Math.min(...clean), 2),
    maximum: round(Math.max(...clean), 2),
    average: round(clean.reduce((sum, value) => sum + value, 0) / clean.length, 2),
  };
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

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
