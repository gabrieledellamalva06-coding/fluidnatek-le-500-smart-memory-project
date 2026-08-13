import { normalizeSearchText } from "./historicalExperiment.normalizer";

import type { HistoricalExperimentRecord } from "./historicalExperiment.adapter";
import type {
  HistoricalExperimentFilters,
  HistoricalExperimentSort,
  NumericRangeFilter,
} from "./historicalExperiment.types";

export interface HistoricalExperimentQueryInput {
  records: readonly HistoricalExperimentRecord[];
  filters: HistoricalExperimentFilters;
  sort: HistoricalExperimentSort;
}

export function queryHistoricalExperiments({
  records,
  filters,
  sort,
}: HistoricalExperimentQueryInput): HistoricalExperimentRecord[] {
  return records
    .filter((record) => matchesFilters(record, filters))
    .sort((left, right) => compareRecords(left, right, sort));
}

export function matchesHistoricalExperimentFilters(
  record: HistoricalExperimentRecord,
  filters: HistoricalExperimentFilters
): boolean {
  return matchesFilters(record, filters);
}

function matchesFilters(
  record: HistoricalExperimentRecord,
  filters: HistoricalExperimentFilters
): boolean {
  const searchTerm = normalizeSearchText(filters.searchTerm);

  if (searchTerm && !record.searchText.includes(searchTerm)) {
    return false;
  }

  if (
    filters.projectId &&
    record.projectId !== filters.projectId
  ) {
    return false;
  }

  if (
    filters.polymer &&
    normalizeSearchText(record.polymer) !==
      normalizeSearchText(filters.polymer)
  ) {
    return false;
  }

  if (
    filters.polymerType &&
    normalizeSearchText(record.polymerType) !==
      normalizeSearchText(filters.polymerType)
  ) {
    return false;
  }

  if (
    filters.solvent &&
    normalizeSearchText(record.solvent) !==
      normalizeSearchText(filters.solvent)
  ) {
    return false;
  }

  if (
    filters.solventType &&
    normalizeSearchText(record.solventType) !==
      normalizeSearchText(filters.solventType)
  ) {
    return false;
  }

  if (
    filters.machine &&
    normalizeSearchText(record.machine) !==
      normalizeSearchText(filters.machine)
  ) {
    return false;
  }

  if (
    filters.grade !== "all" &&
    record.grade !== Number(filters.grade)
  ) {
    return false;
  }

  return (
    matchesNumericRange(record.flowRateMlH, filters.flowRate) &&
    matchesNumericRange(
      record.positiveVoltageKv,
      filters.positiveVoltage
    ) &&
    matchesNumericRange(
      record.negativeVoltageKv,
      filters.negativeVoltage
    ) &&
    matchesNumericRange(
      record.temperatureC,
      filters.temperature
    ) &&
    matchesNumericRange(record.humidityPct, filters.humidity) &&
    matchesNumericRange(
      record.workingDistanceMm,
      filters.workingDistance
    )
  );
}

function matchesNumericRange(
  value: number | null,
  range: NumericRangeFilter
): boolean {
  const hasMinimum = range.min !== null;
  const hasMaximum = range.max !== null;

  if (!hasMinimum && !hasMaximum) {
    return true;
  }

  if (value === null) {
    return false;
  }

  if (hasMinimum && value < range.min!) {
    return false;
  }

  if (hasMaximum && value > range.max!) {
    return false;
  }

  return true;
}

function compareRecords(
  left: HistoricalExperimentRecord,
  right: HistoricalExperimentRecord,
  sort: HistoricalExperimentSort
): number {
  const comparison = compareByField(left, right, sort.field);

  return sort.direction === "ascending"
    ? comparison
    : -comparison;
}

function compareByField(
  left: HistoricalExperimentRecord,
  right: HistoricalExperimentRecord,
  field: HistoricalExperimentSort["field"]
): number {
  switch (field) {
    case "run":
      return compareText(left.runIdentifier, right.runIdentifier);

    case "project":
      return compareText(left.projectName, right.projectName);

    case "polymer":
      return compareText(left.polymer, right.polymer);

    case "formulation":
      return compareText(
        left.formulationName,
        right.formulationName
      );

    case "machine":
      return compareText(left.machine, right.machine);

    case "grade":
      return compareNullableNumbers(left.grade, right.grade);
  }
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function compareNullableNumbers(
  left: number | null,
  right: number | null
): number {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return left - right;
}