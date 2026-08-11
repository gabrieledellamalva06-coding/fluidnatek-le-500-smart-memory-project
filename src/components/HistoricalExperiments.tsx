import { useMemo, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import type { Experiment, Formulation, Project } from "../types";

interface HistoricalExperimentsProps {
  experiments: Experiment[];
  projects: Project[];
  formulations: Formulation[];
}

export default function HistoricalExperiments({
  experiments,
  projects,
  formulations,
}: HistoricalExperimentsProps) {
  const [search, setSearch] = useState("");
  const [projectId, setProjectId] = useState("");
  const [polymer, setPolymer] = useState("");
  const [solvent, setSolvent] = useState("");
  const [machine, setMachine] = useState("");
  const [grade, setGrade] = useState("");
  const [selectedExperimentId, setSelectedExperimentId] = useState("");

  const projectById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects]
  );

  const formulationById = useMemo(
    () => new Map(formulations.map((formulation) => [formulation.id, formulation])),
    [formulations]
  );

  const polymerOptions = useMemo(() => {
    return uniqueSorted(
      experiments
        .map((experiment) => formulationById.get(experiment.formulationId))
        .map((formulation) => shortPolymerName(formulation?.polymerName))
        .filter((value): value is string => Boolean(value))
    );
  }, [experiments, formulationById]);

  const solventOptions = useMemo(() => {
    return uniqueSorted(
      experiments
        .map((experiment) => formulationById.get(experiment.formulationId)?.solvent)
        .map(cleanText)
        .filter((value): value is string => Boolean(value))
    );
  }, [experiments, formulationById]);

  const machineOptions = useMemo(() => {
    return uniqueSorted(
      experiments
        .map((experiment) => cleanText(experiment.machineModel))
        .filter((value): value is string => Boolean(value))
    );
  }, [experiments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return experiments.filter((experiment) => {
      const canonicalProjectId = experiment.metadata?.canonicalProjectId ?? "";
      const formulation = formulationById.get(experiment.formulationId);
      const project = projectById.get(canonicalProjectId);

      const experimentPolymer = shortPolymerName(formulation?.polymerName);
      const experimentSolvent = cleanText(formulation?.solvent);
      const experimentMachine = cleanText(experiment.machineModel);

      if (projectId && canonicalProjectId !== projectId) return false;
      if (polymer && experimentPolymer !== polymer) return false;
      if (solvent && experimentSolvent !== solvent) return false;
      if (machine && experimentMachine !== machine) return false;
      if (grade && String(experiment.jetStabilityGrade) !== grade) return false;

      if (!q) return true;

      const haystack = [
        experiment.operationIdentifier,
        experiment.id,
        project?.name,
        formulation?.name,
        formulation?.polymerName,
        formulation?.solvent,
        experiment.machineModel,
        experiment.operatorComments,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [
    experiments,
    formulationById,
    grade,
    machine,
    polymer,
    projectById,
    projectId,
    search,
    solvent,
  ]);

  const selected =
    experiments.find((experiment) => experiment.id === selectedExperimentId) ?? null;

  return (
    <main className="flex-1 overflow-y-auto bg-slate-100 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
          Data & History
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Historical Experiments</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Browse saved experimental runs. Search and filter instead of scrolling through every record.
        </p>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Experiment Memory</h2>
              <p className="mt-1 text-xs text-slate-500">
                {filtered.length} shown · {experiments.length} total runs
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="relative md:col-span-2 xl:col-span-3">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search run, formulation, polymer, machine or comment..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <FilterSelect
              value={projectId}
              onChange={setProjectId}
              placeholder="All projects"
              options={projects.map((project) => ({
                value: project.id,
                label: project.name,
              }))}
            />

            <FilterSelect
              value={polymer}
              onChange={setPolymer}
              placeholder="All polymers"
              options={polymerOptions.map((value) => ({ value, label: value }))}
            />

            <FilterSelect
              value={solvent}
              onChange={setSolvent}
              placeholder="All solvents"
              options={solventOptions.map((value) => ({ value, label: value }))}
            />

            <FilterSelect
              value={machine}
              onChange={setMachine}
              placeholder="All machines"
              options={machineOptions.map((value) => ({ value, label: value }))}
            />

            <FilterSelect
              value={grade}
              onChange={setGrade}
              placeholder="All grades"
              options={[
                { value: "1", label: "Grade 1" },
                { value: "2", label: "Grade 2" },
                { value: "3", label: "Grade 3" },
                { value: "4", label: "Grade 4" },
              ]}
            />
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <div className="grid grid-cols-[minmax(170px,1.2fr)_minmax(120px,.8fr)_90px_minmax(180px,1.3fr)_110px_80px] gap-3 bg-slate-50 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>Run</span>
              <span>Project</span>
              <span>Polymer</span>
              <span>Formulation</span>
              <span>Machine</span>
              <span>Grade</span>
            </div>

            <div className="max-h-[520px] overflow-y-auto bg-white">
              {filtered.map((experiment) => {
                const canonicalProjectId = experiment.metadata?.canonicalProjectId ?? "";
                const project = projectById.get(canonicalProjectId);
                const formulation = formulationById.get(experiment.formulationId);

                return (
                  <button
                    key={experiment.id}
                    type="button"
                    onClick={() => setSelectedExperimentId(experiment.id)}
                    className="grid w-full grid-cols-[minmax(170px,1.2fr)_minmax(120px,.8fr)_90px_minmax(180px,1.3fr)_110px_80px] gap-3 border-t border-slate-100 px-4 py-3 text-left text-xs transition first:border-t-0 hover:bg-blue-50"
                  >
                    <span className="truncate font-semibold text-slate-800">
                      {experiment.operationIdentifier || experiment.id}
                    </span>
                    <span className="truncate text-slate-500">{project?.name || "—"}</span>
                    <span className="truncate font-bold text-blue-700">
                      {shortPolymerName(formulation?.polymerName) || "—"}
                    </span>
                    <span className="truncate text-slate-600">
                      {formulation?.name || formulation?.polymerName || experiment.formulationId}
                    </span>
                    <span className="truncate text-slate-500">
                      {cleanText(experiment.machineModel) || "—"}
                    </span>
                    <span className="font-bold text-slate-700">
                      {experiment.jetStabilityGrade >= 1 && experiment.jetStabilityGrade <= 4
                        ? `${experiment.jetStabilityGrade}/4`
                        : "—"}
                    </span>
                  </button>
                );
              })}

              {filtered.length === 0 && (
                <div className="px-5 py-16 text-center text-sm text-slate-400">
                  No experiments match the current filters.
                </div>
              )}
            </div>
          </div>
        </section>

        {selected && (
          <ExperimentDetails
            experiment={selected}
            project={projectById.get(selected.metadata?.canonicalProjectId ?? "")}
            formulation={formulationById.get(selected.formulationId)}
            onClose={() => setSelectedExperimentId("")}
          />
        )}
      </div>
    </main>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={`${placeholder}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function shortPolymerName(value: string | undefined): string {
  const text = cleanText(value);
  if (!text) return "";

  const lower = text.toLowerCase();

  if (lower.includes("polycaprolactone") || lower.includes("pcl")) return "PCL";
  if (lower.includes("polyethylene oxide") || lower.includes("peo") || lower.includes("polyox")) return "PEO";
  if (lower.includes("polyvinyl alcohol") || lower.includes("pva")) return "PVA";
  if (lower.includes("polyacrylonitrile") || lower.includes("pan")) return "PAN";
  if (lower.includes("cellulose acetate") || lower.includes("celac")) return "CA";
  if (lower.includes("polyvinylpyrrolidone") || lower.includes("pvp")) return "PVP";
  if (lower.includes("polyvinylidene fluoride") || lower.includes("pvdf")) return "PVDF";
  if (lower.includes("polylactic acid") || lower.includes("pla")) return "PLA";
  if (lower.includes("plga")) return "PLGA";
  if (lower.includes("pco")) return "PCO";

  return text;
}

function ExperimentDetails({
  experiment,
  project,
  formulation,
  onClose,
}: {
  experiment: Experiment;
  project?: Project;
  formulation?: Formulation;
  onClose: () => void;
}) {
  const telemetry = experiment.telemetryData[0];
  const values = [
    valueItem("Flow rate", telemetry?.flowRateMlH, "mL/h"),
    valueItem("HV+", telemetry?.voltageKv, "kV"),
    valueItem("HV-", telemetry?.collectorVoltageKv, "kV", true),
    valueItem("Temperature", telemetry?.temperatureC, "°C"),
    valueItem("Humidity", telemetry?.humidityPct, "%"),
    valueItem("Distance", telemetry?.distanceMm, "mm"),
    valueItem("Drum speed", telemetry?.drumSpeedRpm, "rpm"),
  ].filter((item): item is { label: string; value: string } => Boolean(item));

  return (
    <section className="mt-5 rounded-3xl border border-blue-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">
            Selected Experiment
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">
            {experiment.operationIdentifier || experiment.id}
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
        {project?.name && <Info label="Project" value={project.name} />}
        {formulation && (
          <Info label="Formulation" value={formulation.name || formulation.polymerName || formulation.id} />
        )}
        {cleanText(experiment.machineModel) && (
          <Info label="Machine" value={cleanText(experiment.machineModel)} />
        )}
        {experiment.jetStabilityGrade >= 1 && experiment.jetStabilityGrade <= 4 && (
          <Info label="Processability" value={`${experiment.jetStabilityGrade}/4`} />
        )}
      </div>

      {values.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-bold text-slate-800">Operating Parameters</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((item) => (
              <Info key={item.label} label={item.label} value={item.value} />
            ))}
          </div>
        </div>
      )}

      {experiment.operatorComments.trim() && (
        <div className="mt-6 rounded-2xl bg-slate-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Comments</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{experiment.operatorComments}</p>
        </div>
      )}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function valueItem(
  label: string,
  value: number | undefined,
  unit: string,
  allowZero = false
): { label: string; value: string } | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (!allowZero && value === 0) return null;
  return { label, value: `${value} ${unit}` };
}

function cleanText(value: string | undefined): string {
  const text = (value ?? "").trim();
  const normalized = text.toLowerCase();
  if (!text || normalized.includes("unknown") || normalized === "n/d") return "";
  return text;
}
