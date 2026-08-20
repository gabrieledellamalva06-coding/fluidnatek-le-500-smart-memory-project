import type {
  ContextTier,
  HistoricalExperimentContext,
  SimilarityMatch,
  SimilarityQuery,
  SolutionSimilarityMatch,
} from "./similarity.types";
import { finiteNumberOrUndefined, normalizedComparableText } from "./valueSemantics";

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
    {
      experimentValue: context.formulation?.polymerMaterialId,
      queryValue: query.polymerMaterialId,
      weight: 15,
      match: exactTextMatch,
    },
    {
      experimentValue: context.formulation?.solvent1MaterialId,
      queryValue: query.solvent1MaterialId,
      weight: 10,
      match: exactTextMatch,
    },
  ] as const;

  for (const field of contextFields) {
    if (!normalizeText(field.queryValue) || !normalizeText(field.experimentValue)) continue;
    maxScore += field.weight;
    if (field.match(field.experimentValue, field.queryValue)) {
      score += field.weight;
    }
  }

  const numericRules: readonly NumericFieldRule[] = [
    {
      experimentValue: (context) => context.formulation?.solidsContentPct,
      queryValue: (value) => value.solidsContentPct,
      weight: 10,
      tolerance: 3,
    },
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

    const experimentValue = rule.experimentValue(context);
    if (experimentValue === undefined || !Number.isFinite(experimentValue)) continue;
    maxScore += rule.weight;

    const difference = Math.abs(experimentValue - queryValue);
    if (difference === 0) score += rule.weight;
    else if (difference <= rule.tolerance) score += rule.weight * 0.75;
    else if (difference <= rule.tolerance * 2) score += rule.weight * 0.4;
  }

  return maxScore <= 0 ? 0 : round((score / maxScore) * 100, 2);
}

export interface SolutionSimilarityCriterionDiagnostic {
  key: "polymer" | "polymerFamily" | "molecularWeight" | "concentration" | "solventSystem";
  label: string;
  weight: number;
  earnedWeight: number;
  includedInDenominator: boolean;
  detail: string;
  partialMatch: boolean;
}

export interface SolutionSimilarityDiagnostics {
  earnedWeight: number;
  availableWeight: number;
  criteria: SolutionSimilarityCriterionDiagnostic[];
  solventComparable: boolean;
  solventDataKnownOnBothSides: boolean;
}

/**
 * Compares solution composition only. Process parameters are intentionally
 * excluded: this answers how a solution was historically processed, before a
 * process window is derived from the matching experiments.
 */
export function searchSimilarSolutionExperiments(
  contexts: readonly HistoricalExperimentContext[],
  query: SimilarityQuery,
  minimumSimilarity = 0,
  maximumResults = 12
): SolutionSimilarityMatch[] {
  return contexts
    .map((context) => {
      const result = calculateSolutionSimilarity(context, query);
      return result === null ? null : { ...result, context, rankingScore: calculateSolutionRankingScore(result.score, result.comparableCriteriaCount, context) };
    })
    .filter((match): match is SolutionSimilarityMatch => match !== null && match.score >= minimumSimilarity)
    .sort((left, right) => right.rankingScore - left.rankingScore || right.score - left.score)
    .slice(0, maximumResults);
}

export function calculateSolutionSimilarity(
  context: HistoricalExperimentContext,
  query: SimilarityQuery
): Omit<SolutionSimilarityMatch, "context"> | null {
  const formulation = context.formulation;
  if (!formulation) return null;

  const polymer = formulation.polymerName ?? context.polymerMaterial?.canonicalName;
  const solvent1 = formulation.solvent1Name ?? formulation.solvent;
  const solvent2 = formulation.solvent2Name;
  const polymerFamily = context.polymerMaterial?.polymerFamily;
  const solventFamily = context.solvent1Material?.solventFamily;
  const molecularWeight = context.polymerMaterial?.molecularWeight;
  const concentration =
    finiteNumberOrUndefined(formulation.polymerConcentrationPct) ??
    finiteNumberOrUndefined(formulation.solidsContentPct);

  const reasons: string[] = [];
  let score = 0;
  let maxScore = 0;
  let exactPolymer = false;
  let familyFallback = false;
  let comparableCriteriaCount = 0;

  if (normalizeText(polymer) && normalizeText(query.polymer)) {
    maxScore += 35;
    exactPolymer = safeTextMatch(polymer, query.polymer);
    comparableCriteriaCount += 1;
    if (exactPolymer) {
      score += 35;
      reasons.push(`Same polymer: ${display(polymer)}`);
    }
  }

  if (normalizeText(polymerFamily) && normalizeText(query.polymerFamily)) {
    maxScore += 15;
    if (safeTextMatch(polymerFamily, query.polymerFamily)) {
      score += 15;
      familyFallback = !exactPolymer;
      reasons.push(`Same polymer family: ${display(polymerFamily)}`);
    }
    comparableCriteriaCount += 1;
  }

  const molecularWeightScore = compareMolecularWeight(molecularWeight, query.molecularWeight);
  if (molecularWeightScore !== null) {
    comparableCriteriaCount += 1;
    maxScore += 15;
    score += 15 * molecularWeightScore;
    if (molecularWeightScore === 1) reasons.push(`Same molecular weight: ${display(molecularWeight)}`);
    else if (molecularWeightScore >= 0.5) reasons.push(`Similar molecular weight: ${display(molecularWeight)}`);
  }

  const concentrationScore = compareConcentration(concentration, query.polymerConcentrationPct);
  if (concentrationScore !== null) {
    comparableCriteriaCount += 1;
    maxScore += 15;
    score += 15 * concentrationScore;
    const difference = Math.abs(concentration - (query.polymerConcentrationPct as number));
    reasons.push(`Concentration difference: ${round(difference, 2)}%`);
  }

  const solventScore = compareSolventSystem(
    { first: solvent1, second: solvent2, family: solventFamily, firstRatio: formulation.solvent1RatioPct, secondRatio: formulation.solvent2RatioPct },
    { first: query.solvent1 ?? query.solvent, second: query.solvent2, family: query.solventFamily, firstRatio: query.solvent1RatioPct, secondRatio: query.solvent2RatioPct },
  );
  if (solventScore !== null) {
    comparableCriteriaCount += 1;
    maxScore += 20;
    score += 20 * solventScore.score;
    reasons.push(...solventScore.reasons);
  }

  if (maxScore === 0 || (!exactPolymer && !familyFallback && solventScore === null)) return null;

  const tier: ContextTier = exactPolymer && molecularWeightScore === 1 && concentrationScore === 1 && solventScore?.score === 1
    ? 4
    : exactPolymer && solventScore !== null
      ? 3
      : exactPolymer
        ? 2
        : 1;

  const dataCompleteness = comparableCriteriaCount / 5;
  return { tier, score: round((score / maxScore) * 100, 2), comparableCriteriaCount, comparableCriteriaTotal: 5, dataCompleteness, evidenceLevel: resolveEvidenceLevel(comparableCriteriaCount, context), rankingScore: 0, reasons };
}

/** Read-only explanation of the existing Solution Similarity calculation. */
export function calculateSolutionSimilarityDiagnostics(
  context: HistoricalExperimentContext,
  query: SimilarityQuery
): SolutionSimilarityDiagnostics {
  const formulation = context.formulation;
  if (!formulation) return { earnedWeight: 0, availableWeight: 0, criteria: [], solventComparable: false, solventDataKnownOnBothSides: false };
  const criteria: SolutionSimilarityCriterionDiagnostic[] = [];
  const polymer = formulation.polymerName ?? context.polymerMaterial?.canonicalName;
  const polymerComparable = Boolean(normalizeText(polymer) && normalizeText(query.polymer));
  const polymerMatched = polymerComparable && safeTextMatch(polymer, query.polymer);
  criteria.push(diagnostic("polymer", "Polymer", 35, polymerComparable, polymerMatched ? 35 : 0, polymerComparable ? (polymerMatched ? "Match" : "No match") : "Excluded from denominator: missing comparison data"));

  const family = context.polymerMaterial?.polymerFamily;
  const familyComparable = Boolean(normalizeText(family) && normalizeText(query.polymerFamily));
  const familyMatched = familyComparable && safeTextMatch(family, query.polymerFamily);
  criteria.push(diagnostic("polymerFamily", "Polymer family", 15, familyComparable, familyMatched ? 15 : 0, familyComparable ? (familyMatched ? "Match" : "No match") : "Excluded from denominator: missing comparison data"));

  const molecularScore = compareMolecularWeight(context.polymerMaterial?.molecularWeight, query.molecularWeight);
  criteria.push(diagnostic("molecularWeight", "Molecular weight", 15, molecularScore !== null, molecularScore === null ? 0 : 15 * molecularScore, molecularScore === null ? "Excluded from denominator: missing or unparseable comparison data" : molecularScore === 1 ? "Match" : molecularScore > 0 ? "Partial match" : "No match"));

  const concentration = finiteNumberOrUndefined(formulation.polymerConcentrationPct) ?? finiteNumberOrUndefined(formulation.solidsContentPct);
  const concentrationScore = compareConcentration(concentration, query.polymerConcentrationPct);
  criteria.push(diagnostic("concentration", "Concentration", 15, concentrationScore !== null, concentrationScore === null ? 0 : 15 * concentrationScore, concentrationScore === null ? "Excluded from denominator: missing comparison data" : concentrationScore === 1 ? "Match" : concentrationScore > 0 ? `Partial match · difference ${round(Math.abs(concentration! - query.polymerConcentrationPct!), 2)}%` : "No match"));

  const historicalSolvents = [formulation.solvent1Name ?? formulation.solvent, formulation.solvent2Name].filter((value) => Boolean(normalizeText(value)));
  const querySolvents = [query.solvent1 ?? query.solvent, query.solvent2].filter((value) => Boolean(normalizeText(value)));
  const solventDataKnownOnBothSides = historicalSolvents.length > 0 && querySolvents.length > 0;
  const solventScore = compareSolventSystem(
    { first: formulation.solvent1Name ?? formulation.solvent, second: formulation.solvent2Name, family: context.solvent1Material?.solventFamily, firstRatio: formulation.solvent1RatioPct, secondRatio: formulation.solvent2RatioPct },
    { first: query.solvent1 ?? query.solvent, second: query.solvent2, family: query.solventFamily, firstRatio: query.solvent1RatioPct, secondRatio: query.solvent2RatioPct },
  );
  criteria.push(diagnostic("solventSystem", "Solvent system", 20, solventScore !== null, solventScore === null ? 0 : 20 * solventScore.score, solventScore === null ? (solventDataKnownOnBothSides ? "Excluded from denominator: known solvent systems are not comparable" : "Excluded from denominator: missing solvent comparison data") : solventScore.score === 1 ? "Match" : `Partial match · ${solventScore.reasons.join(" · ")}`));
  return {
    earnedWeight: round(criteria.reduce((sum, item) => sum + item.earnedWeight, 0), 2),
    availableWeight: criteria.filter((item) => item.includedInDenominator).reduce((sum, item) => sum + item.weight, 0),
    criteria,
    solventComparable: solventScore !== null,
    solventDataKnownOnBothSides,
  };
}

function diagnostic(key: SolutionSimilarityCriterionDiagnostic["key"], label: string, weight: number, includedInDenominator: boolean, earnedWeight: number, detail: string): SolutionSimilarityCriterionDiagnostic {
  return { key, label, weight, earnedWeight: round(earnedWeight, 2), includedInDenominator, detail, partialMatch: includedInDenominator && earnedWeight > 0 && earnedWeight < weight };
}

function resolveEvidenceLevel(criteria: number, context: HistoricalExperimentContext): "strong" | "moderate" | "limited" {
  const hasSolutionData = Boolean(context.formulation?.polymerName || context.formulation?.solvent || context.polymerMaterial?.molecularWeight || context.polymerMaterial?.polymerFamily);
  if (criteria >= 4 && hasSolutionData) return "strong";
  if (criteria >= 3 && hasSolutionData) return "moderate";
  return "limited";
}

function calculateSolutionRankingScore(score: number, criteria: number, context: HistoricalExperimentContext): number {
  const completeness = criteria / 5;
  const grade = context.experiment.jetStabilityGrade;
  const success = Number.isInteger(grade) && grade >= 1 && grade <= 4 ? grade / 4 : 0;
  return round(score * 0.6 + completeness * 25 + success * 15, 2);
}

interface SolventSystem {
  first?: string;
  second?: string;
  family?: string;
  firstRatio?: number;
  secondRatio?: number;
}

function compareSolventSystem(left: SolventSystem, right: SolventSystem): { score: number; reasons: string[] } | null {
  if (!right.first && !right.second && !right.family) return null;
  const leftNames = [left.first, left.second].filter((value): value is string => Boolean(normalizeText(value))).map(normalizeText).sort();
  const rightNames = [right.first, right.second].filter((value): value is string => Boolean(normalizeText(value))).map(normalizeText).sort();
  if (leftNames.length === 0 || rightNames.length === 0) {
    return safeTextMatch(left.family, right.family) ? { score: 0.45, reasons: [`Same solvent family: ${display(left.family)}`] } : null;
  }
  if (leftNames.join("|") !== rightNames.join("|")) {
    return safeTextMatch(left.family, right.family) ? { score: 0.35, reasons: [`Similar solvent family: ${display(left.family)}`] } : null;
  }
  const reasons = [`Same solvent system: ${leftNames.join(" + ")}`];
  const leftRatio = finiteNumberOrUndefined(left.firstRatio);
  const rightRatio = finiteNumberOrUndefined(right.firstRatio);
  if (leftRatio === undefined || rightRatio === undefined) return { score: 1, reasons };
  const ratioDifference = Math.abs(leftRatio - rightRatio);
  const ratioScore = Math.max(0, 1 - ratioDifference / 100);
  if (ratioDifference === 0) reasons.push("Same solvent ratios");
  else reasons.push(`Solvent ratio difference: ${round(ratioDifference, 2)}%`);
  return { score: ratioScore, reasons };
}

function compareConcentration(left: number | undefined, right: number | undefined): number | null {
  if (left === undefined || right === undefined || !Number.isFinite(left) || !Number.isFinite(right)) return null;
  const difference = Math.abs(left - right);
  if (difference === 0) return 1;
  if (difference <= 1) return 0.85;
  if (difference <= 2) return 0.65;
  if (difference <= 5) return 0.35;
  return 0;
}

function compareMolecularWeight(left: string | undefined, right: string | number | undefined): number | null {
  const leftValue = parseMolecularWeight(left);
  const rightValue = parseMolecularWeight(right);
  if (leftValue === null || rightValue === null) return null;
  if (leftValue === rightValue) return 1;
  const difference = Math.abs(leftValue - rightValue) / Math.max(leftValue, rightValue);
  return difference <= 0.1 ? 0.75 : difference <= 0.25 ? 0.45 : 0;
}

function parseMolecularWeight(value: string | number | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const match = value?.trim().toLocaleLowerCase().match(/^([0-9]+(?:\.[0-9]+)?)\s*(kda|mda)?$/);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return null;
  return match[2] === "mda" ? amount * 1000 : amount;
}

function display(value: string | number | undefined): string {
  return value === undefined || value === "" ? "unknown" : String(value);
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
  const telemetryAverage = average(
    context.experiment.telemetryData
      .map((item) => item.collectorVoltageKv)
      .filter((value): value is number => value !== undefined)
  );
  if (telemetryAverage !== undefined) return telemetryAverage;

  const raw = context.experiment.metadata?.hvNegativeKv;
  if (raw === undefined) return undefined;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeText(value: string | undefined): string {
  return normalizedComparableText(value) ?? "";
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
