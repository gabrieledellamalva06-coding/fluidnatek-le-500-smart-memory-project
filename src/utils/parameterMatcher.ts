import { PARAMETER_DICTIONARY } from "./parameterDictionary";
import { similarity } from "./fuzzyMatcher";
import {
  findRegisteredParameter,
  registerParameter
} from "./parameterRegistry";
import { normalizeHeader } from "./headerNormalizer";

export interface MatchResult {
  parameter: string | null;
  confidence: number;
}

export function detectParameter(header: string): MatchResult {

  const h = normalizeHeader(header);

  const invalidAliases = [
  "",
  "-",
  "--",
  "...",
  "#",
  "value",
  "column",
  "column1",
  "unnamed",
  "null",
  "undefined"
];

if (
  invalidAliases.includes(h) ||
  h.length < 2
) {
  return {
    parameter: null,
    confidence: 0
  };
}

const cached = findRegisteredParameter(h);

if (cached) {
  return {
    parameter: cached.parameter,
    confidence: 1
  };
}

  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const [parameter, aliases] of Object.entries(PARAMETER_DICTIONARY)) {

    for (const alias of aliases) {

      const score = similarity(h, alias);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = parameter;
      }

    }

  }

if (bestMatch && bestScore >= 0.85) {
  registerParameter(
    bestMatch,
    header,
    bestScore
  );
}

return {
  parameter: bestScore >= 0.60 ? bestMatch : null,
  confidence: bestScore
};

}