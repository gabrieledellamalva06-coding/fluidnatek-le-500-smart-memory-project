import { CanonicalFields } from "../fields/canonicalFields";
import type { CanonicalField } from "../fields/canonicalFields";

/**
 * ============================================================================
 * Semantic Dictionary
 *
 * All aliases MUST be normalized through normalizeSemanticKey().
 * Never compare raw Excel headers directly.
 * ============================================================================
 */

export const SemanticDictionary: Partial<Record<CanonicalField, readonly string[]>> = {

  [CanonicalFields.FLOW_RATE]: [

    "flow",
    "flow rate",
    "flowrate",
    "q",
    "q1",
    "q2",
    "ml/h",
    "feed rate",
    "caudal",
    "caudal ml/h",
    "caudal (ml/h)",
    "flujo"

  ],

  [CanonicalFields.HV_POSITIVE]: [

    "hv+",
    "hv +",
    "hv positive",
    "positive voltage",
    "positive high voltage",
    "voltage +",
    "high voltage +",
    "voltaje +",
    "alta tensión +"

  ],

  [CanonicalFields.HV_NEGATIVE]: [

    "hv-",
    "hv -",
    "negative voltage",
    "negative high voltage",
    "voltage -",
    "voltaje -",
    "alta tensión -"

  ],

  [CanonicalFields.TEMPERATURE]: [

    "temperature",
    "temp",
    "t",
    "°c",
    "temperatura"

  ],

  [CanonicalFields.HUMIDITY]: [

    "humidity",
    "rh",
    "relative humidity",
    "humedad"

  ],

  [CanonicalFields.DISTANCE]: [

    "distance",
    "dz",
    "dz (mm)",
    "needle distance",
    "working distance",
    "distancia"

  ],

  [CanonicalFields.POLYMER]: [

    "polymer",
    "polymer 1",
    "polymer 2",
    "polímero",
    "polimero"

  ],

  [CanonicalFields.SOLVENT]: [

    "solvent",
    "solvent 1",
    "solvent 2",
    "disolvente",
    "solvente"

  ],

  [CanonicalFields.FIBER_DIAMETER]: [

    "fiber diameter",
    "average fiber diameter",
    "avg fiber diameter",
    "diameter",
    "diametro fibra",
    "diámetro fibra"

  ],

  [CanonicalFields.SEM_MORPHOLOGY]: [

    "sem",
    "sem morphology",
    "morphology",
    "morfología",
    "morfologia sem"

  ]

} as const;

export function normalizeSemanticKey(value: string): string {

  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

}
