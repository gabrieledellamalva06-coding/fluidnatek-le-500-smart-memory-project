import type { Experiment, Formulation, Project } from "../../types";
import type { SolutionCharacterization } from "../../core/types/characterization";
import type { ExperimentalSetup } from "../../core/types/setup";
import type { Material } from "../../core/types/material";

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
  polymerFamily?: string;
  molecularWeight?: string | number;
  polymerConcentrationPct?: number;
  solvent1?: string;
  solvent1RatioPct?: number;
  solvent2?: string;
  solvent2RatioPct?: number;
  solventFamily?: string;
}

export interface HistoricalExperimentContext {
  experiment: Experiment;
  formulation?: Formulation;
  project?: Project;
  characterization?: SolutionCharacterization;
  setup?: ExperimentalSetup;
  polymerMaterial?: Material;
  solvent1Material?: Material;
  solvent2Material?: Material;
}

export type ContextTier = 1 | 2 | 3 | 4;

export interface SimilarityMatch {
  tier: ContextTier;
  score: number;
  context: HistoricalExperimentContext;
  reasons?: string[];
}

export interface SolutionSimilarityMatch {
  tier: ContextTier;
  score: number;
  comparableCriteriaCount: number;
  comparableCriteriaTotal: 5;
  dataCompleteness: number;
  evidenceLevel: "strong" | "moderate" | "limited";
  rankingScore: number;
  reasons: string[];
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
