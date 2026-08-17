import { finiteNumberOrUndefined, normalizedComparableText } from "./valueSemantics";

export type ComparisonKind = "no-data" | "same" | "close" | "different";

export function classifyNumericComparison(currentValue: unknown, historicalValue: unknown, tolerance: { absolute: number; relative: number }, epsilon = Number.EPSILON * 16) {
  const current = finiteNumberOrUndefined(currentValue);
  const historical = finiteNumberOrUndefined(historicalValue);
  if (current === undefined || historical === undefined) return { kind: "no-data" as const, comparable: false };
  const delta = historical - current;
  if (Math.abs(delta) <= epsilon * Math.max(1, Math.abs(current), Math.abs(historical))) return { kind: "same" as const, comparable: true };
  const threshold = Math.max(tolerance.absolute, Math.abs(current) * tolerance.relative);
  return Math.abs(delta) <= threshold
    ? { kind: "close" as const, comparable: true, delta }
    : { kind: "different" as const, comparable: true, delta };
}

export function classifyCategoricalComparison(currentValue: unknown, historicalValue: unknown) {
  const current = normalizedComparableText(currentValue);
  const historical = normalizedComparableText(historicalValue);
  if (current === undefined || historical === undefined) return { kind: "no-data" as const, comparable: false };
  return current === historical ? { kind: "same" as const, comparable: true } : { kind: "different" as const, comparable: true };
}
