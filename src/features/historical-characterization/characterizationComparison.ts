import type { SolutionCharacterization } from "../../core/types/characterization";
import type { Experiment, Formulation } from "../../types";
import type { Material } from "../../core/types/material";
import { calculateSolutionSimilarity, calculateSolutionSimilarityDiagnostics, type SolutionSimilarityCriterionDiagnostic } from "../experimental-assistant/similarity.engine";
import { RECOMMENDATION_CONFIG } from "../experimental-assistant/recommendation.config";
import type { HistoricalExperimentContext, SimilarityQuery } from "../experimental-assistant/similarity.types";

export type CharacterizationParameterKey =
  | "solidsContentPct"
  | "viscosityMpas"
  | "conductivityUsCm"
  | "densityGcm3"
  | "surfaceTensionMnM"
  | "ph";

export interface CharacterizationComparisonRow {
  key: CharacterizationParameterKey;
  label: string;
  unit: string;
  currentValue?: number;
  historicalValue?: number;
  difference?: number;
}

export interface PolymerCompositionDisplayItem { name: string; concentration?: number; unit: string; }

export interface HistoricalCharacterizationEvidence {
  characterization: SolutionCharacterization;
  formulation: Formulation;
  experimentIdentities: string[];
  group: "same-formulation" | "similar-formulation";
  solutionSimilarity?: number;
  comparableCriteriaCount?: number;
  earnedWeight?: number;
  availableWeight?: number;
  criteria?: SolutionSimilarityCriterionDiagnostic[];
  solventPartialMatch?: boolean;
}

export interface ExcludedHistoricalCharacterizationEvidence {
  characterization: SolutionCharacterization;
  formulation: Formulation;
  reason: string;
}

export interface HistoricalCharacterizationEvidenceResult {
  eligible: HistoricalCharacterizationEvidence[];
  excluded: ExcludedHistoricalCharacterizationEvidence[];
}

const MINIMUM_SIMILAR_COMPOSITION_CRITERIA = 2;

export const CHARACTERIZATION_PARAMETERS: ReadonlyArray<{
  key: CharacterizationParameterKey;
  label: string;
  unit: string;
}> = [
  { key: "solidsContentPct", label: "Solid content", unit: "wt %" },
  { key: "viscosityMpas", label: "Viscosity", unit: "mPa·s" },
  { key: "conductivityUsCm", label: "Conductivity", unit: "µS/cm" },
  { key: "densityGcm3", label: "Density", unit: "g/cm³" },
  { key: "surfaceTensionMnM", label: "Surface tension", unit: "mN/m" },
  { key: "ph", label: "pH", unit: "" },
];

/**
 * Same-formulation records always qualify. Cross-formulation records qualify
 * through the existing Solution Similarity engine and configured similarity
 * threshold, with at least two comparable composition criteria. Characterizations have no experimentId, so linked
 * experiment names are contextual formulation-level identities, not claimed
 * measurement provenance.
 */
export function buildHistoricalCharacterizationEvidence(input: {
  current: SolutionCharacterization | null;
  formulation: Formulation | null;
  formulations: readonly Formulation[];
  characterizations: readonly SolutionCharacterization[];
  experiments: readonly Experiment[];
  materials: readonly Material[];
}): HistoricalCharacterizationEvidence[] {
  return buildHistoricalCharacterizationEvidenceResult(input).eligible;
}

export function buildHistoricalCharacterizationEvidenceResult(input: {
  current: SolutionCharacterization | null;
  formulation: Formulation | null;
  formulations: readonly Formulation[];
  characterizations: readonly SolutionCharacterization[];
  experiments: readonly Experiment[];
  materials: readonly Material[];
}): HistoricalCharacterizationEvidenceResult {
  if (!input.current || !input.formulation) return { eligible: [], excluded: [] };
  const formulationById = new Map(input.formulations.map((item) => [item.id, item]));
  formulationById.set(input.formulation.id, input.formulation);
  const materialById = new Map(input.materials.map((item) => [item.id, item]));
  const query = buildSolutionQuery(input.formulation, materialById);

  const eligible: HistoricalCharacterizationEvidence[] = [];
  const excluded: ExcludedHistoricalCharacterizationEvidence[] = [];
  for (const characterization of input.characterizations) {
    if (characterization.id === input.current!.id) continue;
    const candidate = formulationById.get(characterization.formulationId);
    if (!candidate) continue;
    const experimentIdentities = identitiesForFormulation(input.experiments, candidate.id);
    if (candidate.id === input.formulation!.id) {
      eligible.push({ characterization, formulation: candidate, experimentIdentities, group: "same-formulation" });
      continue;
    }
    const similarity = calculateSolutionSimilarity(
      buildSimilarityContext(candidate, input.experiments, materialById),
      query
    );
    const diagnostics = calculateSolutionSimilarityDiagnostics(buildSimilarityContext(candidate, input.experiments, materialById), query);
    if (!diagnostics.solventComparable) {
      excluded.push({ characterization, formulation: candidate, reason: diagnostics.solventDataKnownOnBothSides ? "Excluded from characterization evidence: solvent system not comparable." : "Excluded from characterization evidence: insufficient solvent data for comparison." });
      continue;
    }
    if (!similarity || similarity.tier < 3 ||
      similarity.score < RECOMMENDATION_CONFIG.minimumSimilarity ||
      similarity.comparableCriteriaCount < MINIMUM_SIMILAR_COMPOSITION_CRITERIA) {
      excluded.push({ characterization, formulation: candidate, reason: "Excluded from characterization evidence: insufficient comparable solution composition." });
      continue;
    }
    eligible.push({
      characterization,
      formulation: candidate,
      experimentIdentities,
      group: "similar-formulation",
      solutionSimilarity: similarity.score,
      comparableCriteriaCount: similarity.comparableCriteriaCount,
      earnedWeight: diagnostics.earnedWeight,
      availableWeight: diagnostics.availableWeight,
      criteria: diagnostics.criteria,
      solventPartialMatch: diagnostics.criteria.find((item) => item.key === "solventSystem")?.partialMatch ?? false,
    });
  }
  return { eligible: eligible.sort(compareEvidence), excluded: excluded.sort((left, right) => left.formulation.id.localeCompare(right.formulation.id) || left.characterization.id.localeCompare(right.characterization.id)) };
}

export function buildCharacterizationComparisonRows(
  current: SolutionCharacterization | null,
  historical: SolutionCharacterization | null
): CharacterizationComparisonRow[] {
  return CHARACTERIZATION_PARAMETERS.map(({ key, label, unit }) => {
    const currentValue = finiteNumber(current?.[key]);
    const historicalValue = finiteNumber(historical?.[key]);
    return {
      key,
      label,
      unit,
      currentValue,
      historicalValue,
      difference:
        currentValue !== undefined && historicalValue !== undefined
          ? currentValue - historicalValue
          : undefined,
    };
  });
}

export function buildPolymerCompositionDisplay(formulation: Formulation): PolymerCompositionDisplayItem[] {
  const components = formulation.compositionComponents?.filter((item) => item.role === "polymer") ?? [];
  if (components.length === 0) {
    return [{ name: formulation.polymerName || "No data", concentration: finiteNumber(formulation.polymerConcentrationPct) ?? finiteNumber(formulation.solidsContentPct), unit: "%" }];
  }
  return components.map((component, index) => ({
    name: component.materialName,
    concentration: finiteNumber(component.quantity) ?? (index === 0 ? finiteNumber(formulation.polymerConcentrationPct) ?? finiteNumber(formulation.solidsContentPct) : undefined),
    unit: component.unit ?? "%",
  }));
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function compareEvidenceNewestFirst(
  left: SolutionCharacterization,
  right: SolutionCharacterization
): number {
  const dateDifference = parseDate(right.measuredAt) - parseDate(left.measuredAt);
  return dateDifference || left.id.localeCompare(right.id);
}

function compareEvidence(left: HistoricalCharacterizationEvidence, right: HistoricalCharacterizationEvidence): number {
  if (left.group !== right.group) return left.group === "same-formulation" ? -1 : 1;
  if (left.group === "similar-formulation") {
    const scoreDifference = (right.solutionSimilarity ?? 0) - (left.solutionSimilarity ?? 0);
    if (scoreDifference) return scoreDifference;
  }
  const dateDifference = compareEvidenceNewestFirst(left.characterization, right.characterization);
  return dateDifference || left.formulation.id.localeCompare(right.formulation.id) || left.characterization.id.localeCompare(right.characterization.id);
}

function identitiesForFormulation(experiments: readonly Experiment[], formulationId: string): string[] {
  return experiments.filter((item) => item.formulationId === formulationId)
    .map((item) => item.operationIdentifier.trim() || item.id)
    .filter((identity, index, identities) => identities.indexOf(identity) === index)
    .sort((left, right) => left.localeCompare(right));
}

function buildSolutionQuery(formulation: Formulation, materials: ReadonlyMap<string, Material>): SimilarityQuery {
  const polymer = formulation.polymerMaterialId ? materials.get(formulation.polymerMaterialId) : undefined;
  const solvent = formulation.solvent1MaterialId ? materials.get(formulation.solvent1MaterialId) : undefined;
  return {
    polymer: formulation.polymerName,
    polymerMaterialId: formulation.polymerMaterialId,
    polymerFamily: polymer?.polymerFamily,
    molecularWeight: polymer?.molecularWeight,
    polymerConcentrationPct: finiteNumber(formulation.polymerConcentrationPct) ?? finiteNumber(formulation.solidsContentPct),
    solvent: formulation.solvent,
    solvent1: formulation.solvent1Name ?? formulation.solvent,
    solvent1MaterialId: formulation.solvent1MaterialId,
    solvent1RatioPct: finiteNumber(formulation.solvent1RatioPct),
    solvent2: formulation.solvent2Name,
    solvent2MaterialId: formulation.solvent2MaterialId,
    solvent2RatioPct: finiteNumber(formulation.solvent2RatioPct),
    solventFamily: solvent?.solventFamily,
  };
}

function buildSimilarityContext(formulation: Formulation, experiments: readonly Experiment[], materials: ReadonlyMap<string, Material>): HistoricalExperimentContext {
  const experiment = experiments.find((item) => item.formulationId === formulation.id) ?? {
    id: `characterization-evidence:${formulation.id}`, formulationId: formulation.id, operationIdentifier: "",
    machineModel: "", injectorType: "", collectorType: "", jetStabilityGrade: 0,
    operatorComments: "", sourceFile: "", ingestedAt: "", telemetryData: [],
  };
  return {
    experiment,
    formulation,
    polymerMaterial: formulation.polymerMaterialId ? materials.get(formulation.polymerMaterialId) : undefined,
    solvent1Material: formulation.solvent1MaterialId ? materials.get(formulation.solvent1MaterialId) : undefined,
    solvent2Material: formulation.solvent2MaterialId ? materials.get(formulation.solvent2MaterialId) : undefined,
  };
}

function parseDate(value: string | undefined): number {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}
