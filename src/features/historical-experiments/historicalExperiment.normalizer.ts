const EMPTY_MARKERS = new Set([
  "",
  "-",
  "—",
  "n/a",
  "na",
  "n.d.",
  "n/d",
  "none",
  "null",
  "undefined",
  "unknown",
  "not available",
  "not specified",
]);

const POLYMER_ALIASES: ReadonlyArray<{
  canonicalName: string;
  aliases: readonly string[];
}> = [
  {
    canonicalName: "PCL",
    aliases: ["pcl", "polycaprolactone"],
  },
  {
    canonicalName: "PEO",
    aliases: ["peo", "polyethylene oxide", "polyox"],
  },
  {
    canonicalName: "PVA",
    aliases: ["pva", "polyvinyl alcohol"],
  },
  {
    canonicalName: "PAN",
    aliases: ["pan", "polyacrylonitrile"],
  },
  {
    canonicalName: "CA",
    aliases: ["ca", "celac", "cellulose acetate"],
  },
  {
    canonicalName: "PVP",
    aliases: ["pvp", "polyvinylpyrrolidone"],
  },
  {
    canonicalName: "PVDF",
    aliases: ["pvdf", "polyvinylidene fluoride"],
  },
  {
    canonicalName: "PLGA",
    aliases: ["plga", "poly(lactic-co-glycolic acid)"],
  },
  {
    canonicalName: "PLA",
    aliases: ["pla", "polylactic acid", "poly(lactic acid)"],
  },
  {
    canonicalName: "PCO",
    aliases: ["pco"],
  },
];

const MACHINE_ALIASES: ReadonlyArray<{
  canonicalName: string;
  aliases: readonly string[];
}> = [
  {
    canonicalName: "LE-100",
    aliases: ["le100", "le-100", "le 100", "l100"],
  },
  {
    canonicalName: "LE-500",
    aliases: ["le500", "le-500", "le 500", "l500"],
  },
];

export function normalizeDisplayText(
  value: string | null | undefined
): string {
  const normalizedWhitespace = (value ?? "").trim().replace(/\s+/g, " ");

  if (EMPTY_MARKERS.has(normalizedWhitespace.toLowerCase())) {
    return "";
  }

  return normalizedWhitespace;
}

export function normalizeSearchText(
  value: string | null | undefined
): string {
  return normalizeDisplayText(value)
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase();
}

export function normalizePolymerName(
  value: string | null | undefined
): string {
  const displayValue = normalizeDisplayText(value);

  if (!displayValue) {
    return "";
  }

  const searchableValue = normalizeSearchText(displayValue);

  const match = POLYMER_ALIASES.find(({ aliases }) =>
    aliases.some((alias) => containsSemanticAlias(searchableValue, alias))
  );

  return match?.canonicalName ?? displayValue;
}

export function normalizeMachineModel(
  value: string | null | undefined
): string {
  const displayValue = normalizeDisplayText(value);

  if (!displayValue) {
    return "";
  }

  const comparableValue = normalizeComparableCode(displayValue);

  const match = MACHINE_ALIASES.find(({ canonicalName, aliases }) => {
    const candidates = [canonicalName, ...aliases];

    return candidates.some(
      (candidate) =>
        normalizeComparableCode(candidate) === comparableValue
    );
  });

  return match?.canonicalName ?? displayValue;
}

export function uniqueSortedValues(
  values: ReadonlyArray<string | null | undefined>
): string[] {
  const uniqueValues = new Map<string, string>();

  values.forEach((value) => {
    const displayValue = normalizeDisplayText(value);

    if (!displayValue) {
      return;
    }

    const comparisonKey = normalizeSearchText(displayValue);

    if (!uniqueValues.has(comparisonKey)) {
      uniqueValues.set(comparisonKey, displayValue);
    }
  });

  return [...uniqueValues.values()].sort((left, right) =>
    left.localeCompare(right, undefined, {
      numeric: true,
      sensitivity: "base",
    })
  );
}

function containsSemanticAlias(
  searchableValue: string,
  alias: string
): boolean {
  const searchableAlias = normalizeSearchText(alias);

  if (searchableAlias.length <= 4) {
    const tokens = searchableValue.split(/[^a-z0-9]+/).filter(Boolean);
    return tokens.includes(searchableAlias);
  }

  return searchableValue.includes(searchableAlias);
}

function normalizeComparableCode(value: string): string {
  return normalizeSearchText(value).replace(/[^a-z0-9]/g, "");
}