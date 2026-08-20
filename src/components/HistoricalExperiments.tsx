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
import type { Material } from "../core/types/material";
import type { ExperimentalSetup } from "../core/types/setup";
import type { UpdateExperimentInput } from "../application/experiments/experiment.mapper";
import type { CloneExperimentInput } from "../application/experiments/experiment.service";

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
  materials?: Material[];
  setups?: ExperimentalSetup[];
  loading?: boolean;
  error?: string | null;
  onUpdateExperiment: (id: string, input: UpdateExperimentInput) => Promise<Experiment>;
  onCloneExperiment: (id: string, input: CloneExperimentInput) => Promise<Experiment>;
  onVariationSaved?: (experiment: Experiment) => void;
}

export default function HistoricalExperiments({
  experiments,
  projects,
  formulations,
  materials = [],
  setups = [],
  loading = false,
  error = null,
  onUpdateExperiment,
  onCloneExperiment,
  onVariationSaved,
}: HistoricalExperimentsProps) {
  const [filters, setFilters] = useState<HistoricalExperimentFilters>(
    createEmptyHistoricalExperimentFilters
  );

  const [sort, setSort] = useState<HistoricalExperimentSort>({
    ...DEFAULT_HISTORICAL_EXPERIMENT_SORT,
  });

  const [selectedExperimentId, setSelectedExperimentId] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [editingExperiment, setEditingExperiment] = useState<HistoricalExperimentRecord | null>(null);
  const [editValues, setEditValues] = useState<EditExperimentValues | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editMessage, setEditMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [cloneRecord, setCloneRecord] = useState<HistoricalExperimentRecord | null>(null);

  const records = useMemo(
    () =>
      adaptHistoricalExperiments({
        experiments,
        formulations,
        projects,
        materials,
        setups,
      }),
    [experiments, formulations, projects, materials, setups]
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
            onClone={async () => { setCloneRecord(selectedRecord); setFeedbackError(null); setSuccessMessage(null); }}
          />
        )}
        {cloneRecord && <ExperimentVariationEditor record={cloneRecord} saving={false} onCancel={() => setCloneRecord(null)} onSave={async (input) => { try { const created = await onCloneExperiment(cloneRecord.id, input); setCloneRecord(null); setSuccessMessage("Variation saved. Original historical record preserved."); onVariationSaved?.(created); } catch (cloneError) { setFeedbackError(cloneError instanceof Error ? cloneError.message : "Unable to clone experiment."); } }} />}
        {successMessage && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">{successMessage}</p>}
        {feedbackError && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">Clone not created: {feedbackError} Select a complete historical run with process parameters and a processability grade.</p>}
        {editingExperiment && editValues && <ExperimentEdit record={editingExperiment} values={editValues} saving={editSaving} message={editMessage} onChange={(key, value) => setEditValues((current) => current ? { ...current, [key]: value } : current)} onCancel={() => { if (JSON.stringify(editValues) !== JSON.stringify(toEditValues(editingExperiment)) && !window.confirm("Discard unsaved changes?")) return; setEditingExperiment(null); setEditValues(null); }} onSave={async () => { if (!window.confirm("This updates a historical experiment and may affect Historical Analysis and recommendations. Continue?")) return; setEditSaving(true); setEditMessage(null); try { await onUpdateExperiment(editingExperiment.id, fromEditValues(editValues)); setEditingExperiment(null); setEditValues(null); setSuccessMessage("Experiment updated successfully."); setSelectedExperimentId(editingExperiment.id); } catch (saveError) { setEditMessage(saveError instanceof Error ? saveError.message : "Unable to update experiment."); } finally { setEditSaving(false); } }} />}
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
  onClone: () => Promise<void>;
}

function ExperimentDetails({
  record,
  onClose,
  onClone,
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

        <div className="flex items-center gap-2"><span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">Historical record · Read-only</span><button
          type="button"
          onClick={() => void onClone()}
          className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
        >
          Clone as variation
        </button><button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Close experiment details"
        >
          <X className="h-4 w-4" />
        </button></div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Info label="Experiment ID" value={record.id || "No data"} />
        <Info label="Project" value={record.projectName || "No data"} />
        <Info label="Formulation" value={record.formulationName || "No data"} />
        <Info label="Polymer" value={record.polymer || "No data"} />
        <Info label="Solvent" value={record.solvent || "No data"} />
        <Info label="Concentration" value={record.concentrationPct === null ? "No data" : `${record.concentrationPct}%`} />
        <Info label="Setup" value={record.setupName || "No data"} />
        <Info label="Machine" value={record.machine || "No data"} />
        <Info label="Processability" value={record.grade === null ? "No data" : `${record.grade}/4`} />
        <Info label="Import status" value={record.importStatus || "No data"} />
        <Info label="Validation status" value={record.validationStatus || "No data"} />
        <Info label="Source file" value={record.sourceFile || "No data"} />
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

      <div className="mt-6 rounded-2xl bg-slate-50 p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Comments</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">{record.operatorComments || "No data"}</p>
      </div>
      <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4">
        <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-sky-950">Data quality</h3><span className="text-lg font-bold text-sky-950">{record.dataQuality.score}/100</span></div>
        <p className="mt-1 text-xs text-slate-600">Record completeness only. This is not a scientific quality, processability, similarity, or recommendation score.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2"><div><p className="text-xs font-bold text-emerald-800">Complete</p><p className="mt-1 text-xs text-slate-700">{record.dataQuality.complete.length ? record.dataQuality.complete.join(" · ") : "None"}</p></div><div><p className="text-xs font-bold text-amber-800">Missing</p><p className="mt-1 text-xs text-slate-700">{record.dataQuality.missing.length ? record.dataQuality.missing.join(" · ") : "None"}</p></div></div>
      </div>
    </section>
  );
}

interface EditExperimentValues { operationIdentifier: string; flowRateMlH: string; voltageKv: string; collectorVoltageKv: string; temperatureC: string; humidityPct: string; distanceMm: string; drumSpeedRpm: string; grade: string; comments: string; }
function toEditValues(record: HistoricalExperimentRecord): EditExperimentValues { return { operationIdentifier: record.runIdentifier, flowRateMlH: String(record.flowRateMlH ?? ""), voltageKv: String(record.positiveVoltageKv ?? ""), collectorVoltageKv: String(record.negativeVoltageKv ?? ""), temperatureC: String(record.temperatureC ?? ""), humidityPct: String(record.humidityPct ?? ""), distanceMm: String(record.workingDistanceMm ?? ""), drumSpeedRpm: String(record.collectorSpeedRpm ?? ""), grade: String(record.grade ?? ""), comments: record.operatorComments }; }
function fromEditValues(values: EditExperimentValues): UpdateExperimentInput { const number = (value: string) => value.trim() === "" ? undefined : Number(value); const grade = number(values.grade); return { operationIdentifier: values.operationIdentifier, flowRateMlH: number(values.flowRateMlH), voltageKv: number(values.voltageKv), collectorVoltageKv: number(values.collectorVoltageKv), temperatureC: number(values.temperatureC), humidityPct: number(values.humidityPct), distanceMm: number(values.distanceMm), drumSpeedRpm: number(values.drumSpeedRpm), jetStabilityGrade: grade as 1 | 2 | 3 | 4 | undefined, operatorComments: values.comments }; }
function ExperimentEdit({ record, values, saving, message, onChange, onCancel, onSave }: { record: HistoricalExperimentRecord; values: EditExperimentValues; saving: boolean; message: string | null; onChange: (key: keyof EditExperimentValues, value: string) => void; onCancel: () => void; onSave: () => Promise<void> }) { const fields: Array<[keyof EditExperimentValues, string, string]> = [["flowRateMlH", "Flow Rate", "mL/h"], ["voltageKv", "HV+", "kV"], ["collectorVoltageKv", "HV−", "kV"], ["temperatureC", "Temperature", "°C"], ["humidityPct", "Relative Humidity", "%"], ["distanceMm", "Working Distance", "mm"], ["drumSpeedRpm", "Drum/Collector Speed", "rpm"], ["grade", "Processability Grade", "1–4"]]; return <section className="mt-5 rounded-3xl border border-amber-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">Edit Experiment</p><h2 className="mt-1 text-xl font-bold">{record.runIdentifier}</h2></div><p className="text-xs text-slate-500">Changes affect historical analysis and recommendations.</p></div><div className="mt-5 grid gap-3 md:grid-cols-2"><label className="text-xs font-bold text-slate-600 md:col-span-2">Run name<input value={values.operationIdentifier} onChange={(event) => onChange("operationIdentifier", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>{fields.map(([key, label, unit]) => <label key={key} className="text-xs font-bold text-slate-600">{label} ({unit})<input type="number" value={values[key]} onChange={(event) => onChange(key, event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>)}<label className="text-xs font-bold text-slate-600 md:col-span-2">Comments<textarea value={values.comments} onChange={(event) => onChange("comments", event.target.value)} className="mt-1 min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label></div>{message && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">{message}</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onCancel} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold">Cancel</button><button type="button" onClick={() => void onSave()} disabled={saving} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Save Changes"}</button></div></section>; }

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
): { label: string; value: string } {
  if (value === null || !Number.isFinite(value)) return { label, value: "No data" };
  return {
    label,
    value: `${value} ${unit}`,
  };
}

function ExperimentVariationEditor({ record, saving, onCancel, onSave }: { record: HistoricalExperimentRecord; saving: boolean; onCancel: () => void; onSave: (input: CloneExperimentInput) => Promise<void> }) {
  const [values, setValues] = useState({ operationIdentifier: `${record.runIdentifier}-VARIANT`, flowRateMlH: record.flowRateMlH?.toString() ?? "", voltageKv: record.positiveVoltageKv?.toString() ?? "", collectorVoltageKv: record.negativeVoltageKv?.toString() ?? "", distanceMm: record.workingDistanceMm?.toString() ?? "", temperatureC: record.temperatureC?.toString() ?? "", humidityPct: record.humidityPct?.toString() ?? "", grade: record.grade?.toString() ?? "" });
  const update = (key: keyof typeof values, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const save = async () => {
    const numberValue = (value: string) => value.trim() === "" ? undefined : Number(value);
    const input: CloneExperimentInput = { operationIdentifier: values.operationIdentifier, flowRateMlH: numberValue(values.flowRateMlH), voltageKv: numberValue(values.voltageKv), collectorVoltageKv: numberValue(values.collectorVoltageKv), distanceMm: numberValue(values.distanceMm), temperatureC: numberValue(values.temperatureC), humidityPct: numberValue(values.humidityPct), jetStabilityGrade: numberValue(values.grade) as 1 | 2 | 3 | 4 | undefined };
    await onSave(input);
  };
  const fields: Array<[keyof typeof values, string, string]> = [["flowRateMlH", "Flow rate", "mL/h"], ["voltageKv", "HV+", "kV"], ["collectorVoltageKv", "HV−", "kV"], ["distanceMm", "Distance", "mm"], ["temperatureC", "Temperature", "°C"], ["humidityPct", "Humidity", "%"], ["grade", "Processability grade", "1–4"]];
  return <section className="mt-5 rounded-3xl border border-violet-200 bg-violet-50 p-6 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-violet-700">Create variation</p><h2 className="mt-1 text-xl font-bold text-slate-950">Editable copy of {record.runIdentifier}</h2><p className="mt-1 text-sm text-slate-600">The historical source remains read-only. Change any value before saving.</p></div></div><div className="mt-5 grid gap-3 md:grid-cols-2"><label className="text-xs font-bold text-slate-700 md:col-span-2">New run code<input value={values.operationIdentifier} onChange={(event) => update("operationIdentifier", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" /></label>{fields.map(([key, label, unit]) => <label key={key} className="text-xs font-bold text-slate-700">{label} ({unit})<input type="number" value={values[key]} onChange={(event) => update(key, event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" /></label>)}</div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onCancel} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700">Cancel</button><button type="button" disabled={saving} onClick={() => void save()} className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Save variation"}</button></div></section>;
}

function parseOptionalNumber(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}
