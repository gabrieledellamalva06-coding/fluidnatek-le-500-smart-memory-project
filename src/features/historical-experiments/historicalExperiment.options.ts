import type { HistoricalExperimentRecord } from "./historicalExperiment.adapter";

import {
  normalizeDisplayText,
  normalizeSearchText,
} from "./historicalExperiment.normalizer";

import type {
  HistoricalExperimentFilterOption,
  HistoricalExperimentGradeFilter,
} from "./historicalExperiment.types";

export interface HistoricalExperimentFilterOptions {
  projects: HistoricalExperimentFilterOption[];
  polymers: HistoricalExperimentFilterOption[];
  polymerTypes: HistoricalExperimentFilterOption[];
  solvents: HistoricalExperimentFilterOption[];
  solventTypes: HistoricalExperimentFilterOption[];
  machines: HistoricalExperimentFilterOption[];
  grades: HistoricalExperimentFilterOption[];
}

interface OptionSource {
  value: string;
  label: string;
}

interface CountedOption {
  value: string;
  label: string;
  count: number;
}

export function createHistoricalExperimentFilterOptions(
  records: readonly HistoricalExperimentRecord[]
): HistoricalExperimentFilterOptions {
  return {
    projects: buildOptions(
      records.map((record) => ({
        value: record.projectId,
        label: record.projectName || record.projectId,
      }))
    ),

    polymers: buildOptions(
      records.map((record) => ({
        value: record.polymer,
        label: record.polymer,
      }))
    ),

    polymerTypes: buildOptions(
      records.map((record) => ({
        value: record.polymerType,
        label: record.polymerType,
      }))
    ),

    solvents: buildOptions(
      records.map((record) => ({
        value: record.solvent,
        label: record.solvent,
      }))
    ),

    solventTypes: buildOptions(
      records.map((record) => ({
        value: record.solventType,
        label: record.solventType,
      }))
    ),

    machines: buildOptions(
      records.map((record) => ({
        value: record.machine,
        label: record.machine,
      }))
    ),

    grades: createGradeOptions(records),
  };
}

function buildOptions(
  sources: readonly OptionSource[]
): HistoricalExperimentFilterOption[] {
  const optionByComparisonKey = new Map<string, CountedOption>();

  sources.forEach((source) => {
    const value = normalizeDisplayText(source.value);
    const label = normalizeDisplayText(source.label) || value;

    if (!value) {
      return;
    }

    const comparisonKey = normalizeSearchText(value);
    const existingOption = optionByComparisonKey.get(comparisonKey);

    if (existingOption) {
      existingOption.count += 1;
      return;
    }

    optionByComparisonKey.set(comparisonKey, {
      value,
      label,
      count: 1,
    });
  });

  return [...optionByComparisonKey.values()].sort(compareOptions);
}

function createGradeOptions(
  records: readonly HistoricalExperimentRecord[]
): HistoricalExperimentFilterOption[] {
  const gradeCounts = new Map<HistoricalExperimentGradeFilter, number>();

  records.forEach((record) => {
    if (record.grade === null) {
      return;
    }

    const grade = String(
      record.grade
    ) as HistoricalExperimentGradeFilter;

    gradeCounts.set(grade, (gradeCounts.get(grade) ?? 0) + 1);
  });

  const orderedGrades: readonly HistoricalExperimentGradeFilter[] = [
    "1",
    "2",
    "3",
    "4",
  ];

  return orderedGrades
    .filter((grade) => gradeCounts.has(grade))
    .map((grade) => ({
      value: grade,
      label: `Grade ${grade}`,
      count: gradeCounts.get(grade) ?? 0,
    }));
}

function compareOptions(
  left: HistoricalExperimentFilterOption,
  right: HistoricalExperimentFilterOption
): number {
  return left.label.localeCompare(right.label, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}