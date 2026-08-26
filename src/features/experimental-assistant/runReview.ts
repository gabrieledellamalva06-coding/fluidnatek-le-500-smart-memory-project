import type { Formulation } from "../../types";
import type { Material } from "../../core/types/material";
import type { ExperimentalSetup } from "../../core/types/setup";
import type { SolutionCharacterization } from "../../core/types/characterization";
import type { RecommendedParameterKey } from "./initialParameterRecommendation";

export type ChangeSource = "Manual adjustment" | "Smart Starting Point" | "Recommended Starting Parameters";
export type OperatingValues = Partial<Record<RecommendedParameterKey, number>>;
export interface ParameterTrace { source: ChangeSource; previousValue?: number; appliedValue?: number; manuallyAdjusted?: boolean; }
export interface ReviewRow { label: string; value: string; }
export interface OperatingChange { key: RecommendedParameterKey; label: string; unit: string; original?: number; final?: number; source: ChangeSource; }

export const OPERATING_PARAMETER_META: Record<RecommendedParameterKey, { label: string; unit: string }> = {
  flowRateMlH: { label: "Flow rate", unit: "mL/h" }, voltageKv: { label: "HV+", unit: "kV" }, collectorVoltageKv: { label: "HV−", unit: "kV" },
  temperatureC: { label: "Temperature", unit: "°C" }, humidityPct: { label: "Relative humidity", unit: "%" }, distanceMm: { label: "Working distance", unit: "mm" }, drumSpeedRpm: { label: "Drum / collector speed", unit: "rpm" },
};

export function buildOperatingChanges(initial: OperatingValues, current: OperatingValues, traces: Partial<Record<RecommendedParameterKey, ParameterTrace>>): OperatingChange[] {
  return (Object.keys(OPERATING_PARAMETER_META) as RecommendedParameterKey[]).flatMap((key) => {
    const original = finite(initial[key]); const final = finite(current[key]);
    if (original === final || (original === undefined && final === undefined)) return [];
    const trace = traces[key]; const meta = OPERATING_PARAMETER_META[key];
    return [{ key, ...meta, original, final, source: trace?.manuallyAdjusted ? "Manual adjustment" : trace?.source ?? "Manual adjustment" }];
  });
}

export function buildFormulationReview(formulation: Formulation, materials: readonly Material[]): { polymers: ReviewRow[]; solvents: ReviewRow[] } {
  const materialById = new Map(materials.map((item) => [item.id, item]));
  const components = formulation.compositionComponents ?? [];
  const polymers = components.filter((item) => item.role === "polymer").map((item, index) => componentRow(`Polymer ${index + 1}`, item.materialName, materialById.get(item.materialId), item.quantity, item.unit));
  const solvents = components.filter((item) => item.role === "solvent").map((item, index) => componentRow(`Solvent ${index + 1}`, item.materialName, materialById.get(item.materialId), item.quantity, item.unit));
  if (polymers.length === 0) polymers.push(componentRow("Polymer 1", formulation.polymerName, formulation.polymerMaterialId ? materialById.get(formulation.polymerMaterialId) : undefined, formulation.polymerConcentrationPct, "wt_pct"));
  if (solvents.length === 0) {
    if (formulation.solvent1Name || formulation.solvent) solvents.push(componentRow("Solvent 1", formulation.solvent1Name || formulation.solvent, formulation.solvent1MaterialId ? materialById.get(formulation.solvent1MaterialId) : undefined, formulation.solvent1RatioPct, "%"));
    if (formulation.solvent2Name) solvents.push(componentRow("Solvent 2", formulation.solvent2Name, formulation.solvent2MaterialId ? materialById.get(formulation.solvent2MaterialId) : undefined, formulation.solvent2RatioPct, "%"));
  }
  return { polymers, solvents };
}

export function buildCharacterizationReview(value?: SolutionCharacterization): ReviewRow[] {
  if (!value) return [];
  const fields: Array<[keyof SolutionCharacterization, string, string]> = [["solidsContentPct", "Solid content", "wt%"], ["viscosityMpas", "Viscosity", "mPa·s"], ["conductivityUsCm", "Conductivity", "µS/cm"], ["densityGcm3", "Density", "g/cm³"], ["surfaceTensionMnM", "Surface tension", "mN/m"], ["ph", "pH", ""]];
  return fields.flatMap(([key, label, unit]) => { const numeric = finite(value[key]); return numeric === undefined ? [] : [{ label, value: `${numeric}${unit ? ` ${unit}` : ""}` }]; });
}

export function buildSetupReview(setup: ExperimentalSetup): ReviewRow[] {
  return compactRows([
    ["Machine", setup.machine.model], ["Manufacturer", setup.machine.manufacturer], ["Injector", setup.injector.type], ["Injector model", setup.injector.model], ["Collector", setup.collector.type], ["Collector model", setup.collector.model], ["Needle gauge", setup.injector.needleGauge],
    ["Needle count", displayOptionalNumber(setup.injector.needleCount)], ["Emitter count", displayOptionalNumber(setup.injector.emitterCount)], ["Working hardware configuration", setup.platformConfiguration],
  ]);
}

export function compactRows(rows: Array<[string, unknown]>): ReviewRow[] { return rows.flatMap(([label, value]) => meaningful(value) ? [{ label, value: String(value).trim() }] : []); }
export function displayOptionalNumber(value: unknown): string | undefined { const number = finite(value); return number === undefined ? undefined : String(number); }
function meaningful(value: unknown): boolean { return typeof value === "number" ? Number.isFinite(value) : typeof value === "string" && value.trim().length > 0; }
function finite(value: unknown): number | undefined { return typeof value === "number" && Number.isFinite(value) ? value : undefined; }
function componentRow(label: string, name: string, material: Material | undefined, quantity: number | undefined, unit: string | undefined): ReviewRow {
  const grade = [material?.molecularWeight?.trim(), material?.grade?.trim()].filter(Boolean).join(" / "); const concentration = finite(quantity); const displayUnit = unit === "wt_pct" || unit === "vol_pct" || unit === "w_v_pct" || unit === "%" ? "%" : unit && unit !== "unknown" ? ` ${unit}` : "";
  return { label, value: [name, grade && `Molecular weight / grade: ${grade}`, concentration !== undefined && `Concentration / ratio: ${concentration}${displayUnit}`].filter(Boolean).join(" · ") };
}
