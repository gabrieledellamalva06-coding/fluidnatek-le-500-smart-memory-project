export type HistoricalExperimentGradeFilter = "all" | "1" | "2" | "3" | "4";

export type HistoricalExperimentSortField =
  | "run"
  | "project"
  | "polymer"
  | "formulation"
  | "machine"
  | "grade";

export type SortDirection = "ascending" | "descending";

export interface NumericRangeFilter {
  min: number | null;
  max: number | null;
}

export interface HistoricalExperimentFilters {
  searchTerm: string;
  projectId: string;
  polymer: string;
  polymerType: string;
  solvent: string;
  solventType: string;
  machine: string;
  grade: HistoricalExperimentGradeFilter;
  flowRate: NumericRangeFilter;
  positiveVoltage: NumericRangeFilter;
  negativeVoltage: NumericRangeFilter;
  temperature: NumericRangeFilter;
  humidity: NumericRangeFilter;
  workingDistance: NumericRangeFilter;
}

export interface HistoricalExperimentSort {
  field: HistoricalExperimentSortField;
  direction: SortDirection;
}

export interface HistoricalExperimentFilterOption {
  value: string;
  label: string;
  count: number;
}

export const EMPTY_NUMERIC_RANGE: Readonly<NumericRangeFilter> = {
  min: null,
  max: null,
};

export function createEmptyHistoricalExperimentFilters(): HistoricalExperimentFilters {
  return {
    searchTerm: "",
    projectId: "",
    polymer: "",
    polymerType: "",
    solvent: "",
    solventType: "",
    machine: "",
    grade: "all",
    flowRate: { ...EMPTY_NUMERIC_RANGE },
    positiveVoltage: { ...EMPTY_NUMERIC_RANGE },
    negativeVoltage: { ...EMPTY_NUMERIC_RANGE },
    temperature: { ...EMPTY_NUMERIC_RANGE },
    humidity: { ...EMPTY_NUMERIC_RANGE },
    workingDistance: { ...EMPTY_NUMERIC_RANGE },
  };
}

export const DEFAULT_HISTORICAL_EXPERIMENT_SORT: Readonly<HistoricalExperimentSort> =
  {
    field: "run",
    direction: "descending",
  };