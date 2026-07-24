import { getMaterialSuggestions } from "./materialRegistry";

export type MaterialType = "polymer" | "solvent";

export interface MaterialMatch {
  input: string;
  canonical: string | null;
  confidence: number;
  matchedAlias?: string;
  suggestions: string[];
}

const MATERIAL_ALIASES: Record<string, string[]> = {

  PVDF: [
    "pvdf",
    "polyvinylidene fluoride",
    "kynar",
    "kynar hsv900",
    "solef",
    "solef 6010",
    "arkema",
    "hsv900"
  ],

  PCL: [
    "pcl",
    "polycaprolactone"
  ],

  PVA: [
    "pva",
    "polyvinyl alcohol"
  ],

  DMF: [
    "dmf",
    "dimethylformamide",
    "dimethyl formamide",
    "n,n-dimethylformamide"
  ],

  DMSO: [
    "dmso",
    "dimethyl sulfoxide",
    "dimethyl sulphoxide"
  ]

};

function normalize(text: string) {

  return text
    .toLowerCase()
    .trim()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ");

}

function levenshtein(a: string, b: string) {

  const matrix = Array.from(
    { length: b.length + 1 },
    (_, i) => [i]
  );

  for (let j = 0; j <= a.length; j++)
    matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {

    for (let j = 1; j <= a.length; j++) {

      if (b[i - 1] === a[j - 1]) {

        matrix[i][j] = matrix[i - 1][j - 1];

      } else {

        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );

      }

    }

  }

  return matrix[b.length][a.length];

}

export function resolveMaterial(
  type: MaterialType,
  input: string
): MaterialMatch {

  const query = normalize(input);

  if (!query) {

    return {
      input,
      canonical: null,
      confidence: 0,
      suggestions: []
    };

  }

  let bestMaterial: string | null = null;
  let bestAlias = "";
  let bestScore = Infinity;

  for (const [canonical, aliases] of Object.entries(MATERIAL_ALIASES)) {

    for (const alias of aliases) {

      const dist = levenshtein(
        query,
        normalize(alias)
      );

      if (dist < bestScore) {

        bestScore = dist;
        bestMaterial = canonical;
        bestAlias = alias;

      }

    }

  }

  if (bestMaterial) {

    const confidence = Math.max(
      0,
      1 - bestScore / Math.max(query.length, bestAlias.length)
    );

    if (confidence >= 0.75) {

      return {

        input,

        canonical: bestMaterial,

        matchedAlias: bestAlias,

        confidence,

        suggestions: []

      };

    }

  }

  return {

    input,

    canonical: null,

    confidence: 0,

    suggestions: getMaterialSuggestions(type, input)

  };

}

export function isKnownMaterial(
  type: MaterialType,
  input: string
) {

  return resolveMaterial(type, input).canonical !== null;

}