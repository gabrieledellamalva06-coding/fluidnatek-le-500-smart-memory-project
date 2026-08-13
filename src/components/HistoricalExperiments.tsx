import { useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  ChevronDown,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import type { Experiment, Formulation, Project } from "../types";

import {
  adaptHistoricalExperiments,
  type HistoricalExperimentRecord,
} from "../features/historical-experiments/historicalExperiment.adapter";

import { createHistoricalExperimentFilterOptions } from "../features/historical-experiments/historicalExperiment.options";

import { queryHistoricalExperiments } from "../features/historical-experiments/historicalExperiment.query";

import {
  createEmptyHistoricalExperimentFilters,
  DEFAULT_HISTORICAL_EXPERIMENT_SORT,
  type HistoricalExperimentFilterOption,
  type HistoricalExperimentFilters,
  type HistoricalExperimentSort,
  type HistoricalExperimentSortField,
  type NumericRangeFilter,
} from "../features/historical-experiments/historicalExperiment.types";

interface HistoricalExperimentsProps {
  experiments: Experiment[];
  projects: Project[];
  formulations: Formulation[];
  loading?: boolean;
  error?: string | null;
}

export default function HistoricalExperiments({
  experiments,
  projects,
  formulations,
  loading = false,
  error = null,
}: HistoricalExperimentsProps) {
  const [filters, setFilters] = useState<HistoricalExperimentFilters>(
    createEmptyHistoricalExperimentFilters
  );

  const [sort, setSort] = useState<HistoricalExperimentSort>({
    ...DEFAULT_HISTORICAL_EXPERIMENT_SORT,
  });

  const [selectedExperimentId, setSelectedExperimentId] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const records = useMemo(
    () =>
      adaptHistoricalExperiments({
        experiments,
        formulations,
        projects,
      }),
    [experiments, formulations, projects]
  );

  const options = useMemo(
    () => createHistoricalExperimentFilterOptions(records),
    [records]
  );

  const filteredRecords = useMemo(
    () =>
      queryHistoricalExperiments({
        records,
        filters,
        sort,
      }),
    [records, filters, sort]
  );

  const selectedRecord =
    records.find((record) => record.id === selectedExperimentId) ?? null;

  const hasActiveFilters = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(createEmptyHistoricalExperimentFilters()),
    [filters]
  );

  function updateFilter<Key extends keyof HistoricalExperimentFilters>(
    key: Key,
    value: HistoricalExperimentFilters[Key]
  ) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  }

  function updateNumericRange(
    key:
      | "flowRate"
      | "positiveVoltage"
      | "negativeVoltage"
      | "temperature"
      | "humidity"
      | "workingDistance",
    range: NumericRangeFilter
  ) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: range,
    }));
  }

  function resetFilters() {
    setFilters(createEmptyHistoricalExperimentFilters());
  }

  function handleColumnSort(field: HistoricalExperimentSortField) {
    setSort((currentSort) => {
      if (currentSort.field === field) {
        return {
          field,
          direction:
            currentSort.direction === "ascending"
              ? "descending"
              : "ascending",
        };
      }

      return {
        field,
        direction: "ascending",
      };
    });
  }

  return (
    <main className="flex-1 overflow-y-auto bg-slate-100 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
          Data & History
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          Historical Experiments
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Browse, compare and inspect saved experimental runs using normalized
          process data.
        </p>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Experiment Memory
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {filteredRecords.length} shown · {records.length} total runs
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowAdvancedFilters((visible) => !visible)}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition ${
                  showAdvancedFilters
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Advanced filters
              </button>

              <button
                type="button"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RotateCcw className="h-4 w-4" />
                Reset filters
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="relative md:col-span-2 xl:col-span-3">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={filters.searchTerm}
                onChange={(event) =>
                  updateFilter("searchTerm", event.target.value)
                }
                placeholder="Search run, project, formulation, polymer, machine or comment..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <FilterSelect
              value={filters.projectId}
              onChange={(value) => updateFilter("projectId", value)}
              placeholder="All projects"
              options={options.projects}
            />

            <FilterSelect
              value={filters.polymer}
              onChange={(value) => updateFilter("polymer", value)}
              placeholder="All polymers"
              options={options.polymers}
            />

            <FilterSelect
              value={filters.solvent}
              onChange={(value) => updateFilter("solvent", value)}
              placeholder="All solvents"
              options={options.solvents}
            />

            <FilterSelect
              value={filters.machine}
              onChange={(value) => updateFilter("machine", value)}
              placeholder="All machines"
              options={options.machines}
            />

            <FilterSelect
              value={filters.grade}
              onChange={(value) =>
                updateFilter(
                  "grade",
                  value as HistoricalExperimentFilters["grade"]
                )
              }
              placeholder="All grades"
              options={options.grades}
              emptyValue="all"
            />

            {options.polymerTypes.length > 0 && (
              <FilterSelect
                value={filters.polymerType}
                onChange={(value) => updateFilter("polymerType", value)}
                placeholder="All polymer types"
                options={options.polymerTypes}
              />
            )}

            {options.solventTypes.length > 0 && (
              <FilterSelect
                value={filters.solventType}
                onChange={(value) => updateFilter("solventType", value)}
                placeholder="All solvent types"
                options={options.solventTypes}
              />
            )}
          </div>

          {showAdvancedFilters && (
            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-800">
                  Operating parameter ranges
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Records without the selected parameter are excluded when a
                  minimum or maximum is active.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <NumericRangeInput
                  label="Flow rate"
                  unit="mL/h"
                  value={filters.flowRate}
                  onChange={(range) => updateNumericRange("flowRate", range)}
                />

                <NumericRangeInput
                  label="HV+"
                  unit="kV"
                  value={filters.positiveVoltage}
                  onChange={(range) =>
                    updateNumericRange("positiveVoltage", range)
                  }
                />

                <NumericRangeInput
                  label="HV−"
                  unit="kV"
                  value={filters.negativeVoltage}
                  onChange={(range) =>
                    updateNumericRange("negativeVoltage", range)
                  }
                />

                <NumericRangeInput
                  label="Temperature"
                  unit="°C"
                  value={filters.temperature}
                  onChange={(range) => updateNumericRange("temperature", range)}
                />

                <NumericRangeInput
                  label="Humidity"
                  unit="%"
                  value={filters.humidity}
                  onChange={(range) => updateNumericRange("humidity", range)}
                />

                <NumericRangeInput
                  label="Working distance"
                  unit="mm"
                  value={filters.workingDistance}
                  onChange={(range) =>
                    updateNumericRange("workingDistance", range)
                  }
                />
              </div>
            </div>
          )}

          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
            <div className="min-w-[850px]">
              <div className="grid grid-cols-[minmax(170px,1.2fr)_minmax(120px,.8fr)_90px_minmax(180px,1.3fr)_110px_80px] gap-3 bg-slate-50 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <SortableHeader
                  label="Run"
                  field="run"
                  sort={sort}
                  onSort={handleColumnSort}
                />

                <SortableHeader
                  label="Project"
                  field="project"
                  sort={sort}
                  onSort={handleColumnSort}
                />

                <SortableHeader
                  label="Polymer"
                  field="polymer"
                  sort={sort}
                  onSort={handleColumnSort}
                />

                <SortableHeader
                  label="Formulation"
                  field="formulation"
                  sort={sort}
                  onSort={handleColumnSort}
                />

                <SortableHeader
                  label="Machine"
                  field="machine"
                  sort={sort}
                  onSort={handleColumnSort}
                />

                <SortableHeader
                  label="Grade"
                  field="grade"
                  sort={sort}
                  onSort={handleColumnSort}
                />
              </div>

              <div className="max-h-[520px] overflow-y-auto bg-white">
                {filteredRecords.map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => setSelectedExperimentId(record.id)}
                    className={`grid w-full grid-cols-[minmax(170px,1.2fr)_minmax(120px,.8fr)_90px_minmax(180px,1.3fr)_110px_80px] gap-3 border-t border-slate-100 px-4 py-3 text-left text-xs transition first:border-t-0 hover:bg-blue-50 ${
                      selectedExperimentId === record.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <span className="truncate font-semibold text-slate-800">
                      {record.runIdentifier || "—"}
                    </span>

                    <span className="truncate text-slate-500">
                      {record.projectName || "—"}
                    </span>

                    <span className="truncate font-bold text-blue-700">
                      {record.polymer || "—"}
                    </span>

                    <span className="truncate text-slate-600">
                      {record.formulationName || "—"}
                    </span>

                    <span className="truncate text-slate-500">
                      {record.machine || "—"}
                    </span>

                    <span className="font-bold text-slate-700">
                      {record.grade === null ? "—" : `${record.grade}/4`}
                    </span>
                  </button>
                ))}

                {loading && (
                  <div className="px-5 py-16 text-center text-sm font-semibold text-blue-700">Loading local historical experiments…</div>
                )}

                {!loading && error && (
                  <div className="px-5 py-16 text-center text-sm font-semibold text-red-700">Unable to load historical experiments: {error}</div>
                )}

                {!loading && !error && filteredRecords.length === 0 && (
                  <div className="px-5 py-16 text-center">
                    <p className="text-sm font-semibold text-slate-500">
                      No experiments match the current filters.
                    </p>

                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="mt-3 text-xs font-bold text-blue-600 hover:text-blue-700"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {selectedRecord && (
          <ExperimentDetails
            record={selectedRecord}
            onClose={() => setSelectedExperimentId("")}
          />
        )}
      </div>
    </main>
  );
}

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: HistoricalExperimentFilterOption[];
  emptyValue?: string;
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
  emptyValue = "",
}: FilterSelectProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      >
        <option value={emptyValue}>{placeholder}</option>

        {options.map((option) => (
          <option key={`${placeholder}-${option.value}`} value={option.value}>
            {option.label} ({option.count})
          </option>
        ))}
      </select>

      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

interface NumericRangeInputProps {
  label: string;
  unit: string;
  value: NumericRangeFilter;
  onChange: (value: NumericRangeFilter) => void;
}

function NumericRangeInput({
  label,
  unit,
  value,
  onChange,
}: NumericRangeInputProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="text-xs font-bold text-slate-700">{label}</label>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {unit}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          value={value.min ?? ""}
          onChange={(event) =>
            onChange({
              ...value,
              min: parseOptionalNumber(event.target.value),
            })
          }
          placeholder="Minimum"
          className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />

        <input
          type="number"
          value={value.max ?? ""}
          onChange={(event) =>
            onChange({
              ...value,
              max: parseOptionalNumber(event.target.value),
            })
          }
          placeholder="Maximum"
          className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </div>

      {value.min !== null &&
        value.max !== null &&
        value.min > value.max && (
          <p className="mt-1 text-[10px] font-semibold text-red-600">
            Minimum cannot exceed maximum.
          </p>
        )}
    </div>
  );
}

interface SortableHeaderProps {
  label: string;
  field: HistoricalExperimentSortField;
  sort: HistoricalExperimentSort;
  onSort: (field: HistoricalExperimentSortField) => void;
}

function SortableHeader({
  label,
  field,
  sort,
  onSort,
}: SortableHeaderProps) {
  const isActive = sort.field === field;

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={`flex min-w-0 items-center gap-1 text-left transition hover:text-blue-600 ${
        isActive ? "text-blue-600" : ""
      }`}
    >
      <span className="truncate">{label}</span>

      {isActive &&
        (sort.direction === "ascending" ? (
          <ArrowDownAZ className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ArrowUpAZ className="h-3.5 w-3.5 shrink-0" />
        ))}
    </button>
  );
}

interface ExperimentDetailsProps {
  record: HistoricalExperimentRecord;
  onClose: () => void;
}

function ExperimentDetails({
  record,
  onClose,
}: ExperimentDetailsProps) {
  const values = [
    valueItem("Flow rate", record.flowRateMlH, "mL/h"),
    valueItem("HV+", record.positiveVoltageKv, "kV"),
    valueItem("HV−", record.negativeVoltageKv, "kV", true),
    valueItem("Temperature", record.temperatureC, "°C"),
    valueItem("Humidity", record.humidityPct, "%"),
    valueItem("Distance", record.workingDistanceMm, "mm"),
    valueItem("Drum speed", record.collectorSpeedRpm, "rpm"),
  ].filter(
    (item): item is { label: string; value: string } => item !== null
  );

  return (
    <section className="mt-5 rounded-3xl border border-blue-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">
            Selected Experiment
          </p>

          <h2 className="mt-1 text-xl font-bold text-slate-950">
            {record.runIdentifier}
          </h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Close experiment details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {record.projectName && (
          <Info label="Project" value={record.projectName} />
        )}

        {record.formulationName && (
          <Info label="Formulation" value={record.formulationName} />
        )}

        {record.polymer && <Info label="Polymer" value={record.polymer} />}

        {record.solvent && <Info label="Solvent" value={record.solvent} />}

        {record.machine && <Info label="Machine" value={record.machine} />}

        {record.grade !== null && (
          <Info label="Processability" value={`${record.grade}/4`} />
        )}
      </div>

      {values.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-bold text-slate-800">
            Operating Parameters
          </h3>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((item) => (
              <Info key={item.label} label={item.label} value={item.value} />
            ))}
          </div>
        </div>
      )}

      {record.operatorComments && (
        <div className="mt-6 rounded-2xl bg-slate-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Comments
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-700">
            {record.operatorComments}
          </p>
        </div>
      )}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function valueItem(
  label: string,
  value: number | null,
  unit: string,
  allowZero = false
): { label: string; value: string } | null {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  if (!allowZero && value === 0) {
    return null;
  }

  return {
    label,
    value: `${value} ${unit}`,
  };
}

function parseOptionalNumber(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}
