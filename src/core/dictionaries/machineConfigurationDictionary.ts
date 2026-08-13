export const INJECTOR_MODELS = [
  "Single phase", "Single phase 5 needles", "Coaxial", "Coaxial 5 needles (old)",
  "Coaxial 5 needles", "Single phase 10 needles", "Single phase 20 needles",
  "Single phase 30 needles", "Single phase 37 needles",
] as const;

export const COLLECTOR_MODELS = [
  "Horizontal plane", "Roll-to-roll", "Mandrel 30mm", "Mandrel 20mm", "Mandrel 4mm",
  "Mandrel 6mm", "Drum 110mm", "Drum 200mm",
] as const;

export type InjectorModel = (typeof INJECTOR_MODELS)[number];
export type CollectorModel = (typeof COLLECTOR_MODELS)[number];

export function isKnownInjectorModel(value: string): value is InjectorModel {
  return INJECTOR_MODELS.includes(value as InjectorModel);
}

export function isKnownCollectorModel(value: string): value is CollectorModel {
  return COLLECTOR_MODELS.includes(value as CollectorModel);
}
