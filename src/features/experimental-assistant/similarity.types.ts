import type { Experiment, Formulation, Project } from "../../types";
import type { SolutionCharacterization } from "../../core/types/characterization";
import type { ExperimentalSetup } from "../../core/types/setup";

export interface SimilarityQuery {
  projectId?: string;
  formulationId?: string;
  polymer?: string;
  solvent?: string;
  setupId?: string;
  machine?: string;
  flowRateMlH?: number;
  voltageKv?: number;
  hvNegativeKv?: number;
  temperatureC?: number;
  humidityPct?: number;
  distanceMm?: number;
  solidsContentPct?: number;
  polymerMaterialId?: string;
  solvent1MaterialId?: string;
  solvent2MaterialId?: string;
}

export interface HistoricalExperimentContext {
  experiment: Experiment;
  formulation?: Formulation;
  project?: Project;
  characterization?: SolutionCharacterization;
  setup?: ExperimentalSetup;
}

export type ContextTier = 1 | 2 | 3 | 4;

export interface SimilarityMatch {
  tier: ContextTier;
  score: number;
  context: HistoricalExperimentContext;
}

export interface NumericSummary {
  minimum: number;
  maximum: number;
  average: number;
  median: number;
  sampleSize: number;
}

export type RecommendationAvailability =
  | "available"
  | "low_confidence"
  | "insufficient_data";

export interface HistoricalProcessWindow {
  flowRateMlH?: NumericSummary;
  voltageKv?: NumericSummary;
  hvNegativeKv?: NumericSummary;
  temperatureC?: NumericSummary;
  humidityPct?: NumericSummary;
  distanceMm?: NumericSummary;
}

export interface HistoricalAssessment {
  status: RecommendationAvailability;
  confidence: number;
  minimumRequiredExperiments: number;
  sourceExperimentIds: string[];
  total: number;
  graded: number;
  grade4: number;
  grade4RatePct?: number;
  expectedGrade?: number;
  processWindow: HistoricalProcessWindow;
  recommendation: Partial<Record<keyof HistoricalProcessWindow, number>>;
  warnings: string[];
  comments: string[];
  adjustments: string[];
  interpretation: string;
}
