import type { SolutionCharacterization } from "../../core/types/characterization";

export const CHARACTERIZATION_MEASUREMENT_KEYS = [
  "solidsContentPct",
  "viscosityMpas",
  "conductivityUsCm",
  "densityGcm3",
  "surfaceTensionMnM",
  "ph",
] as const satisfies ReadonlyArray<keyof SolutionCharacterization>;

export type CharacterizationMeasurementKey = typeof CHARACTERIZATION_MEASUREMENT_KEYS[number];

export function hasFiniteCharacterizationMeasurement(
  values: Partial<Record<CharacterizationMeasurementKey, unknown>> | null | undefined
): boolean {
  return Boolean(values && CHARACTERIZATION_MEASUREMENT_KEYS.some(
    (key) => typeof values[key] === "number" && Number.isFinite(values[key])
  ));
}

export function parseOptionalMeasurement(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function requireFiniteCharacterizationMeasurement(
  values: Partial<Record<CharacterizationMeasurementKey, unknown>>
): void {
  if (!hasFiniteCharacterizationMeasurement(values)) {
    throw new Error("Enter at least one measurement before saving.");
  }
}
