import { useEffect, useMemo, useRef, useState } from "react";
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
import type { CloneExperimentInput } from "../application/experiments/experiment.service";
import {
  initialProcessRecordSelection,
  isDuplicateRunName,
  suggestVariationRunName,
  variationChanges,
  resolveVariationEvidence,
  canConfirmVariation,
  type VariationValues,
} from "../features/clone-variation/cloneVariation";

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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cloneRecord, setCloneRecord] = useState<HistoricalExperimentRecord | null>(null);
  const [cloneDraftDirty, setCloneDraftDirty] = useState(false);

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

  useEffect(() => {
    if (selectedExperimentId && !filteredRecords.some((record) => record.id === selectedExperimentId)) {
      setSelectedExperimentId("");
      setCloneRecord(null);
      setCloneDraftDirty(false);
      setSuccessMessage(null);
    }
  }, [filteredRecords, selectedExperimentId]);


  const hasActiveFilters = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(createEmptyHistoricalExperimentFilters()),
    [filters]
  );

  function updateFilter<Key extends keyof HistoricalExperimentFilters>(
    key: Key,
    value: HistoricalExperimentFilters[Key]
  ) {
    if (!confirmDraftDiscard()) return;
    closeInlineSelection();
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
    if (!confirmDraftDiscard()) return;
    closeInlineSelection();
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: range,
    }));
  }

  function resetFilters() {
    if (!confirmDraftDiscard()) return;
    closeInlineSelection();
    setFilters(createEmptyHistoricalExperimentFilters());
  }

  function confirmDraftDiscard(): boolean {
    return !cloneDraftDirty || window.confirm("Discard unsaved variation changes?");
  }

  function closeInlineSelection(): void {
    setSelectedExperimentId("");
    setCloneRecord(null);
    setCloneDraftDirty(false);
    setSuccessMessage(null);
  }

  function toggleExperiment(record: HistoricalExperimentRecord): void {
    if (record.id === selectedExperimentId) {
      if (!confirmDraftDiscard()) return;
      closeInlineSelection();
      return;
    }
    if (!confirmDraftDiscard()) return;
    setSelectedExperimentId(record.id);
    setCloneRecord(null);
    setCloneDraftDirty(false);
    setSuccessMessage(null);
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
                {filteredRecords.map((record) => {
                  const selected = selectedExperimentId === record.id;
                  const panelId = `historical-experiment-panel-${record.id}`;
                  const editingClone = cloneRecord?.id === record.id;
                  const sourceId = record.experiment.variationProvenance?.clonedFromExperimentId;
                  const variationSource = sourceId ? records.find((candidate) => candidate.id === sourceId) ?? null : null;
                  const sourceIsVisible = Boolean(variationSource && filteredRecords.some((candidate) => candidate.id === variationSource.id));
                  return <div key={record.id} className="border-t border-slate-100 first:border-t-0">
                    <button
                      type="button"
                      aria-expanded={selected}
                      aria-controls={panelId}
                      onClick={() => toggleExperiment(record)}
                      className={`grid w-full grid-cols-[minmax(170px,1.2fr)_minmax(120px,.8fr)_90px_minmax(180px,1.3fr)_110px_80px] gap-3 px-4 py-3 text-left text-xs outline-none transition hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${selected ? "bg-blue-50 ring-1 ring-inset ring-blue-200" : "bg-white"}`}
                    >
                      <span className="truncate font-semibold text-slate-800">{record.runIdentifier || "—"}</span>
                      <span className="truncate text-slate-500">{record.projectName || "—"}</span>
                      <span className="truncate font-bold text-blue-700">{record.polymer || "—"}</span>
                      <span className="truncate text-slate-600">{record.formulationName || "—"}</span>
                      <span className="truncate text-slate-500">{record.machine || "—"}</span>
                      <span className="font-bold text-slate-700">{record.grade === null ? "—" : `${record.grade}/4`}</span>
                    </button>

                    {selected && <div id={panelId} className="sticky left-0 min-w-0 overflow-hidden border-t border-blue-100 bg-slate-50 p-3 sm:p-4">
                      {!editingClone && <ExperimentDetails record={record} variationSource={variationSource} onViewSource={sourceIsVisible && variationSource ? () => toggleExperiment(variationSource) : undefined} onClose={() => toggleExperiment(record)} onClone={async () => { setCloneRecord(record); setCloneDraftDirty(false); setSuccessMessage(null); }} />}
                      {editingClone && <ExperimentVariationEditor record={record} existingRunNames={experiments.map((experiment) => experiment.operationIdentifier)} onDirtyChange={setCloneDraftDirty} onCancel={() => { setCloneRecord(null); setCloneDraftDirty(false); }} onSave={async (input) => { const created = await onCloneExperiment(record.id, input); setCloneRecord(null); setCloneDraftDirty(false); setSuccessMessage("Variation created as a new planned experiment. Original historical record preserved."); onVariationSaved?.(created); }} />}
                      {successMessage && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">{successMessage}</p>}
                    </div>}
                  </div>;
                })}

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
  variationSource: HistoricalExperimentRecord | null;
  onViewSource?: () => void;
  onClose: () => void;
  onClone: () => Promise<void>;
}

function ExperimentDetails({
  record,
  variationSource,
  onViewSource,
  onClose,
  onClone,
}: ExperimentDetailsProps) {
  const provenance = record.experiment.variationProvenance;
  const variationEvidence = provenance ? resolveVariationEvidence({
    structuredChanges: provenance.changedParameters,
    sourceProcessRecordId: provenance.sourceProcessRecordId,
    sourceRecords: variationSource?.experiment.telemetryData.map(telemetryVariationValues) ?? [],
    variationRecords: record.experiment.telemetryData.map(telemetryVariationValues),
  }) : null;
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

      {provenance && <div className="mt-5 min-w-0 rounded-2xl border border-violet-200 bg-violet-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="text-sm font-bold text-violet-950">Variation Summary</h3><div className="mt-1 space-y-1 break-words text-xs text-slate-700"><p><strong>Based on:</strong> {variationSource?.runIdentifier || "Source experiment unavailable"}</p><p><strong>Created by:</strong> {provenance.variationCreatedBy || "No data"}</p><p><strong>Created at:</strong> {formatVariationCreatedAt(provenance.variationCreatedAt, record.ingestedAt)}</p><p><strong>Reason:</strong> {provenance.variationReason || "No data"}</p></div></div>{onViewSource && <button type="button" onClick={onViewSource} className="rounded-xl border border-violet-300 bg-white px-3 py-2 text-xs font-bold text-violet-800 outline-none hover:bg-violet-100 focus-visible:ring-2 focus-visible:ring-violet-500">View source experiment</button>}</div>
        <p className="mt-3 text-xs font-bold text-slate-800">Changed parameters:</p>
        {variationEvidence?.changes === null && <p className="mt-1 text-xs text-amber-800">Variation source available, but the exact parameter changes cannot be reconstructed.</p>}
        {variationEvidence?.changes && variationEvidence.changes.length > 0 && <ul className="mt-1 space-y-1 text-xs text-slate-700">{variationEvidence.changes.map((change) => <li key={change.key}><strong>{variationDetailLabel(change.key)}:</strong> {displayBareVariationValue(change.previous)} → {displayBareVariationValue(change.next)} {change.unit}</li>)}</ul>}
        {variationEvidence?.changes && variationEvidence.changes.length === 0 && <p className="mt-1 text-xs text-slate-600">No changed operating parameters recorded.</p>}
      </div>}

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
        {provenance ? <><Info label="Status" value={capitalize(record.status)} /><Info label="Record type" value={record.recordType} /><Info label="Created in" value={record.createdIn} /></> : <><Info label="Import status" value={record.importStatus || "No data"} /><Info label="Validation status" value={record.validationStatus || "No data"} /><Info label="Source file" value={record.sourceFile || "No data"} /></>}
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

type VariationFormValues = Record<keyof VariationValues, string> & { operationIdentifier: string };

function ExperimentVariationEditor({ record, existingRunNames, onDirtyChange, onCancel, onSave }: { record: HistoricalExperimentRecord; existingRunNames: string[]; onDirtyChange: (dirty: boolean) => void; onCancel: () => void; onSave: (input: CloneExperimentInput) => Promise<void> }) {
  const records = record.experiment.telemetryData;
  const recordIds = records.map((item) => item.id).filter((id): id is string => Boolean(id));
  const [sourceProcessRecordId, setSourceProcessRecordId] = useState(initialProcessRecordSelection(recordIds));
  const selected = records.find((item) => item.id === sourceProcessRecordId);
  const sourceValues: VariationValues = { flowRateMlH: selected?.flowRateMlH, voltageKv: selected?.voltageKv, collectorVoltageKv: selected?.collectorVoltageKv, temperatureC: selected?.temperatureC, humidityPct: selected?.humidityPct, distanceMm: selected?.distanceMm, drumSpeedRpm: selected?.drumSpeedRpm };
  const suggestedRunName = suggestVariationRunName(record.runIdentifier === record.id ? "VARIATION" : record.runIdentifier, existingRunNames);
  const makeValues = (telemetry = selected): VariationFormValues => ({ operationIdentifier: suggestedRunName, flowRateMlH: String(telemetry?.flowRateMlH ?? ""), voltageKv: String(telemetry?.voltageKv ?? ""), collectorVoltageKv: String(telemetry?.collectorVoltageKv ?? ""), temperatureC: String(telemetry?.temperatureC ?? ""), humidityPct: String(telemetry?.humidityPct ?? ""), distanceMm: String(telemetry?.distanceMm ?? ""), drumSpeedRpm: String(telemetry?.drumSpeedRpm ?? "") });
  const [values, setValues] = useState<VariationFormValues>(() => makeValues());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [technicalDetailsOpen, setTechnicalDetailsOpen] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [changedBy, setChangedBy] = useState("");
  const [variationReason, setVariationReason] = useState("");
  const [changedByTouched, setChangedByTouched] = useState(false);
  const [reasonTouched, setReasonTouched] = useState(false);
  const requestId = useRef(crypto.randomUUID());
  const technicalDetailsId = useRef(`clone-technical-${crypto.randomUUID()}`);
  const submitGuard = useRef(false);
  const savingRef = useRef(false);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const changedByRef = useRef<HTMLInputElement>(null);
  const numericValues: VariationValues = { flowRateMlH: optionalNumber(values.flowRateMlH), voltageKv: optionalNumber(values.voltageKv), collectorVoltageKv: optionalNumber(values.collectorVoltageKv), temperatureC: optionalNumber(values.temperatureC), humidityPct: optionalNumber(values.humidityPct), distanceMm: optionalNumber(values.distanceMm), drumSpeedRpm: optionalNumber(values.drumSpeedRpm) };
  const changes = variationChanges(sourceValues, numericValues);
  useEffect(() => {
    onDirtyChange(changes.length > 0 || values.operationIdentifier !== suggestedRunName);
  }, [changes.length, onDirtyChange, suggestedRunName, values.operationIdentifier]);
  const fields: Array<[keyof VariationValues, string, string]> = [["flowRateMlH", "Flow rate", "mL/h"], ["voltageKv", "HV+", "kV"], ["collectorVoltageKv", "HV−", "kV"], ["temperatureC", "Temperature", "°C"], ["humidityPct", "Relative humidity", "%"], ["distanceMm", "Working distance", "mm"], ["drumSpeedRpm", "Drum / collector speed", "rpm"]];
  const duplicateName = isDuplicateRunName(values.operationIdentifier, existingRunNames);
  const validNumbers = Object.values(numericValues).every((value) => value === undefined || Number.isFinite(value));
  const canCreate = Boolean(sourceProcessRecordId && values.operationIdentifier.trim() && !duplicateName && validNumbers && changes.length > 0 && !saving);
  const canConfirm = canConfirmVariation({ draftValid: canCreate, changeCount: changes.length, changedBy, reason: variationReason, saving });
  const sourceName = record.runIdentifier === record.id ? "Unnamed experiment" : record.runIdentifier;
  const formulationName = record.formulationName === record.formulationId ? "No data" : record.formulationName || "No data";
  const setupId = record.experiment.metadata?.canonicalSetupId || "";
  const setupName = record.setupName === setupId ? "No data" : record.setupName || "No data";
  const chooseRecord = (id: string) => { setSourceProcessRecordId(id); const telemetry = records.find((item) => item.id === id); setValues(makeValues(telemetry)); setMessage(null); };
  const closeConfirmation = () => {
    if (saving) return;
    setConfirmationOpen(false);
    setMessage(null);
    queueMicrotask(() => createButtonRef.current?.focus());
  };
  useEffect(() => {
    if (!confirmationOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    changedByRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { if (!savingRef.current) { event.preventDefault(); setConfirmationOpen(false); setMessage(null); queueMicrotask(() => createButtonRef.current?.focus()); } return; }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focusable?.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => { document.removeEventListener("keydown", handleKeyDown); document.body.style.overflow = previousOverflow; };
  }, [confirmationOpen]);
  const confirmAndSave = async () => {
    if (submitGuard.current) return;
    setChangedByTouched(true); setReasonTouched(true);
    if (!canConfirm) return;
    submitGuard.current = true; savingRef.current = true; setSaving(true); setMessage(null);
    try { await onSave({ cloneRequestId: requestId.current, sourceProcessRecordId, operationIdentifier: values.operationIdentifier, variationCreatedBy: changedBy, variationReason, ...numericValues }); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to create variation."); }
    finally { submitGuard.current = false; savingRef.current = false; setSaving(false); }
  };
  return <section className="mt-5 overflow-hidden rounded-3xl border border-violet-200 bg-white p-4 shadow-sm sm:p-6">
    <h2 className="break-words text-xl font-bold text-slate-950">Create Experiment Variation</h2>
    <p className="mt-1 text-sm text-slate-600">Start from an existing experiment and change only the parameters required for the new run.</p>

    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      <p className="break-words font-bold text-slate-950">Based on: {sourceName}</p>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs"><span><strong>Project:</strong> {record.projectName || "No data"}</span><span><strong>Formulation:</strong> {formulationName}</span><span><strong>Setup:</strong> {setupName}</span></div>
    </div>

    {records.length > 1 && <label className="mt-4 block text-xs font-bold text-slate-700">Process record <span className="text-red-600">*</span><select required value={sourceProcessRecordId} onChange={(event) => chooseRecord(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"><option value="">Select a process record</option>{records.map((item, index) => <option key={item.id ?? index} value={item.id ?? ""} disabled={!item.id}>{`Process record ${index + 1}${formatSourceDate(record.ingestedAt)}`}</option>)}</select></label>}

    <div className="mt-4 border-t border-slate-200 pt-3">
      <button type="button" aria-expanded={technicalDetailsOpen} aria-controls={technicalDetailsId.current} onClick={() => setTechnicalDetailsOpen((open) => !open)} className="flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-bold text-slate-600 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-violet-500"><ChevronDown className={`h-4 w-4 transition-transform ${technicalDetailsOpen ? "rotate-180" : ""}`} />Technical details</button>
      {technicalDetailsOpen && <div id={technicalDetailsId.current} className="mt-2 min-w-0 rounded-xl bg-slate-50 p-3 text-xs text-slate-600"><dl className="grid min-w-0 gap-2 sm:grid-cols-2"><TechnicalId label="Experiment ID" value={record.id} /><TechnicalId label="Project ID" value={record.projectId} /><TechnicalId label="Formulation ID" value={record.formulationId} /><TechnicalId label="Setup ID" value={setupId || "No data"} /><TechnicalId label="Selected process-record ID" value={sourceProcessRecordId || "No selection"} /><TechnicalId label="Available process-record IDs" value={recordIds.length ? recordIds.join(", ") : "No data"} /></dl></div>}
    </div>

    <label className="mt-5 block text-xs font-bold text-slate-700">New run / sample name<input value={values.operationIdentifier} onChange={(event) => { setValues((current) => ({ ...current, operationIdentifier: event.target.value })); setMessage(null); }} className={`mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-4 ${duplicateName ? "border-red-400 focus:border-red-500 focus:ring-red-100" : "border-slate-300 focus:border-violet-500 focus:ring-violet-100"}`} />{duplicateName && <span className="mt-1 block text-[11px] font-semibold text-red-700">This run name already exists. Please choose a unique name.</span>}</label>

    <div className="mt-6"><h3 className="text-base font-bold text-slate-950">Operating parameters</h3><p className="mt-1 text-xs text-slate-600">Change at least one parameter to create a new variation.</p></div>
    <div className="mt-3 grid min-w-0 gap-3 md:grid-cols-2">{fields.map(([key, label, unit]) => {
      const change = changes.find((item) => item.key === key);
      return <label key={key} className={`min-w-0 rounded-xl border p-3 text-xs font-bold transition-colors ${change ? "border-violet-400 bg-violet-50 text-violet-950" : "border-slate-200 bg-white text-slate-700"}`}>{label} ({unit})<input type="number" value={values[key]} onChange={(event) => { setValues((current) => ({ ...current, [key]: event.target.value })); setMessage(null); }} className={`mt-1 w-full min-w-0 rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-4 ${change ? "border-violet-400 focus:border-violet-500 focus:ring-violet-100" : "border-slate-300 focus:border-violet-500 focus:ring-violet-100"}`} />{change ? <span className="mt-1.5 block break-words text-[11px] font-semibold text-violet-700">Changed from {displayBareVariationValue(change.previous)} to {displayBareVariationValue(change.next)} {unit}</span> : <span className="mt-1.5 block text-[11px] font-medium text-slate-500">Original: {displayVariationValue(sourceValues[key], unit)}</span>}</label>;
    })}</div>

    <div className={`mt-5 rounded-xl border p-3 ${changes.length ? "border-violet-200 bg-violet-50" : "border-slate-200 bg-slate-50"}`}><h3 className="text-sm font-bold text-slate-900">Changes from source</h3>{changes.length ? <ul className="mt-1.5 space-y-1 text-xs text-slate-700">{changes.map((change) => <li key={change.key}><strong>{change.label}:</strong> {displayBareVariationValue(change.previous)} → {displayBareVariationValue(change.next)} {change.unit}</li>)}</ul> : <p className="mt-1 text-xs text-slate-500">No parameter changes yet.</p>}</div>
    <p className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-semibold text-blue-900">Historical results are not copied. The new variation starts as a planned experiment.</p>
    <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" onClick={onCancel} disabled={saving} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-50">Cancel</button><button ref={createButtonRef} type="button" disabled={!canCreate} onClick={() => { setMessage(null); setConfirmationOpen(true); }} className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-bold text-white outline-none hover:bg-violet-800 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40">Create New Variation</button></div>

    {confirmationOpen && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeConfirmation(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="confirm-variation-title" className="my-auto w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3"><div><h2 id="confirm-variation-title" className="text-xl font-bold text-slate-950">Confirm New Variation</h2><p className="mt-1 text-xs text-slate-600">Review the new experiment and provide its audit information.</p></div><button type="button" onClick={closeConfirmation} disabled={saving} aria-label="Close confirmation" className="rounded-lg border border-slate-200 p-2 text-slate-600 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-40"><X className="h-4 w-4" /></button></div>
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700"><dl className="grid gap-2 sm:grid-cols-2"><div><dt className="font-bold text-slate-500">Source experiment</dt><dd className="break-words font-semibold text-slate-900">{sourceName}</dd></div><div><dt className="font-bold text-slate-500">New variation</dt><dd className="break-words font-semibold text-slate-900">{values.operationIdentifier.trim()}</dd></div><div><dt className="font-bold text-slate-500">Project</dt><dd>{record.projectName || "No data"}</dd></div><div><dt className="font-bold text-slate-500">Formulation</dt><dd>{formulationName}</dd></div><div><dt className="font-bold text-slate-500">Setup</dt><dd>{setupName}</dd></div></dl><h3 className="mt-4 font-bold text-slate-900">Changes</h3><ul className="mt-1 space-y-1">{changes.map((change) => <li key={change.key}><strong>{variationDetailLabel(change.key)}:</strong> {displayBareVariationValue(change.previous)} → {displayBareVariationValue(change.next)} {change.unit}</li>)}</ul></div>
        <div className="mt-4 grid gap-4"><div><label htmlFor="variation-changed-by" className="text-xs font-bold text-slate-700">Changed by</label><input ref={changedByRef} id="variation-changed-by" value={changedBy} onChange={(event) => { setChangedBy(event.target.value); setMessage(null); }} onBlur={() => setChangedByTouched(true)} aria-invalid={changedByTouched && !changedBy.trim()} aria-describedby={changedByTouched && !changedBy.trim() ? "variation-changed-by-error" : undefined} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />{changedByTouched && !changedBy.trim() && <p id="variation-changed-by-error" className="mt-1 text-xs font-semibold text-red-700">Changed by is required.</p>}</div><div><label htmlFor="variation-reason" className="text-xs font-bold text-slate-700">Reason for variation</label><textarea id="variation-reason" value={variationReason} onChange={(event) => { setVariationReason(event.target.value); setMessage(null); }} onBlur={() => setReasonTouched(true)} aria-invalid={reasonTouched && !variationReason.trim()} aria-describedby={reasonTouched && !variationReason.trim() ? "variation-reason-error" : undefined} className="mt-1 min-h-24 w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />{reasonTouched && !variationReason.trim() && <p id="variation-reason-error" className="mt-1 text-xs font-semibold text-red-700">Reason for variation is required.</p>}</div></div>
        {message && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">{message}</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" onClick={closeConfirmation} disabled={saving} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-40">Cancel</button><button type="button" onClick={() => void confirmAndSave()} disabled={!canConfirm} className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-bold text-white outline-none hover:bg-violet-800 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40">{saving ? "Creating variation…" : "Confirm and Create Variation"}</button></div>
      </div>
    </div>}
  </section>;
}

function telemetryVariationValues(record: Experiment["telemetryData"][number]) {
  return { id: record.id, flowRateMlH: record.flowRateMlH, voltageKv: record.voltageKv, collectorVoltageKv: record.collectorVoltageKv, temperatureC: record.temperatureC, humidityPct: record.humidityPct, distanceMm: record.distanceMm, drumSpeedRpm: record.drumSpeedRpm };
}

function variationDetailLabel(key: import("../core/types/experiment").VariationParameterKey): string {
  return ({ flowRateMlH: "Flow Rate", voltageKv: "HV+", collectorVoltageKv: "HV−", temperatureC: "Temperature", humidityPct: "Relative Humidity", distanceMm: "Working Distance", drumSpeedRpm: "Drum / Collector Speed" })[key];
}

function capitalize(value: string): string { return value ? `${value[0].toUpperCase()}${value.slice(1)}` : "Unknown"; }
function formatVariationCreatedAt(authoritative: unknown, legacyCreatedAt: string): string {
  let date: Date | null = null;
  if (authoritative && typeof authoritative === "object" && "toDate" in authoritative && typeof authoritative.toDate === "function") date = authoritative.toDate();
  else if (authoritative && typeof authoritative === "object" && "seconds" in authoritative && typeof authoritative.seconds === "number") date = new Date(authoritative.seconds * 1000);
  else if (typeof authoritative === "string" || typeof authoritative === "number") { const parsed = new Date(authoritative); if (!Number.isNaN(parsed.getTime())) date = parsed; }
  if (!date && legacyCreatedAt) { const parsed = new Date(legacyCreatedAt); if (!Number.isNaN(parsed.getTime())) date = parsed; }
  return date ? date.toLocaleString() : "No data";
}

function optionalNumber(value: string): number | undefined { return value.trim() === "" ? undefined : Number(value); }
function displayVariationValue(value: number | undefined, unit: string): string { return value === undefined ? "No data" : `${value} ${unit}`; }
function displayBareVariationValue(value: number | undefined): string { return value === undefined ? "No data" : String(value); }
function formatSourceDate(value: string): string { const date = new Date(value); return Number.isNaN(date.getTime()) ? "" : ` · ${date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}`; }
function TechnicalId({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><dt className="font-bold text-slate-700">{label}</dt><dd className="break-all font-mono text-[11px]">{value}</dd></div>; }

function parseOptionalNumber(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}
