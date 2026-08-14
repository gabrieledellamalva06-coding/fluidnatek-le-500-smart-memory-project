import type { HistoricalExperimentContext, SolutionSimilarityMatch } from "./similarity.types";

export type ProcessConditionKey = "flowRateMlH" | "voltageKv" | "collectorVoltageKv" | "temperatureC" | "humidityPct" | "distanceMm" | "drumSpeedRpm";
export interface ProcessConditionQuery { values: Partial<Record<ProcessConditionKey, number>>; included: ProcessConditionKey[]; }
export interface ProcessConditionMatch { context: HistoricalExperimentContext; processScore: number; processCompleteness: number; rankingScore: number; comparableCriteriaCount: number; comparableCriteriaTotal: number; evidenceLevel: "strong" | "moderate" | "limited"; solutionMatch?: SolutionSimilarityMatch; }
