const MISSING_TEXT = new Set(["", "unknown", "n/a", "na", "no data", "not available", "not specified"]);

export function isMissingValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "number") return !Number.isFinite(value);
  if (typeof value === "string") return MISSING_TEXT.has(value.trim().toLocaleLowerCase());
  return false;
}

export function finiteNumberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function normalizedComparableText(value: unknown): string | undefined {
  if (isMissingValue(value) || typeof value !== "string") return undefined;
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}
