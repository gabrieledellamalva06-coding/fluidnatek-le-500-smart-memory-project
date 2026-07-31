import {
  AlertTriangle,
  ArrowRight,
  Beaker,
  CheckCircle2,
  FlaskConical,
  Gauge,
  Lightbulb,
  Search,
  Settings2,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";

import type {
  Experiment,
  Formulation,
  Project,
} from "../../../types";

import {
  searchProcessMemory,
  type MemorySearchSummary,
} from "../searchMemory";

type DesignerMode =
  | "formulation"
  | "polymer"
  | "objective";

interface ProcessDesignerPageProps {
  projects: Project[];
  formulations: Formulation[];
  experiments: Experiment[];

  onApplyConfiguration?: (configuration: {
    formulationId: string;
    voltageKv: number;
    flowRateMlH: number;
    distanceMm: number;
  }) => void;
}

interface RecommendedFormulation {
  formulation: Formulation;
  experimentCount: number;
}

export default function ProcessDesignerPage({
  projects,
  formulations,
  experiments,
  onApplyConfiguration,
}: ProcessDesignerPageProps) {
  const [mode, setMode] =
    useState<DesignerMode>("formulation");

  const [selectedFormulationId, setSelectedFormulationId] =
    useState("");

  const [polymerQuery, setPolymerQuery] =
    useState("");

  const [targetVoltageKv, setTargetVoltageKv] =
    useState(15);

  const [targetFlowRateMlH, setTargetFlowRateMlH] =
    useState(1);

  const [targetDistanceMm, setTargetDistanceMm] =
    useState(150);

  const [summary, setSummary] =
    useState<MemorySearchSummary | null>(null);

  const [error, setError] =
    useState("");

  const selectedFormulation = useMemo(
    () =>
      formulations.find(
        (formulation) =>
          formulation.id === selectedFormulationId
      ) ?? null,
    [formulations, selectedFormulationId]
  );

  const matchingFormulations = useMemo<
    RecommendedFormulation[]
  >(() => {
    const normalizedQuery =
      polymerQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return [];
    }

    return formulations
      .filter((formulation) =>
        formulation.polymerName
          .toLowerCase()
          .includes(normalizedQuery)
      )
      .map((formulation) => ({
        formulation,
        experimentCount: experiments.filter(
          (experiment) =>
            experiment.formulationId ===
            formulation.id
        ).length,
      }))
      .sort(
        (left, right) =>
          right.experimentCount -
          left.experimentCount
      );
  }, [
    experiments,
    formulations,
    polymerQuery,
  ]);

  const canSearch =
    selectedFormulation !== null &&
    targetVoltageKv > 0 &&
    targetFlowRateMlH > 0 &&
    targetDistanceMm > 0;

  const handleMemorySearch = (): void => {
    if (!canSearch) {
      setError(
        "Seleziona una formulazione e inserisci parametri maggiori di zero."
      );
      return;
    }

    setError("");

    try {
      const nextSummary = searchProcessMemory({
        query: {
          formulationId:
            selectedFormulationId,
          voltageKv:
            targetVoltageKv,
          flowRateMlH:
            targetFlowRateMlH,
          distanceMm:
            targetDistanceMm,
        },
        projects,
        formulations,
        experiments,
        maximumResults: 5,
      });

      setSummary(nextSummary);
    } catch (searchError: unknown) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Impossibile analizzare la memoria storica."
      );
    }
  };

  const handleSelectPolymerFormulation = (
    formulation: Formulation
  ): void => {
    setSelectedFormulationId(
      formulation.id
    );

    setMode("formulation");
    setSummary(null);
    setError("");
  };

  const handleApplyRecommendation = (): void => {
    if (
      !summary ||
      !selectedFormulationId ||
      summary.recommendedVoltageKv === null ||
      summary.recommendedFlowRateMlH === null ||
      summary.recommendedDistanceMm === null
    ) {
      return;
    }

    const configuration = {
      formulationId:
        selectedFormulationId,
      voltageKv:
        summary.recommendedVoltageKv,
      flowRateMlH:
        summary.recommendedFlowRateMlH,
      distanceMm:
        summary.recommendedDistanceMm,
    };

    setTargetVoltageKv(
      configuration.voltageKv
    );

    setTargetFlowRateMlH(
      configuration.flowRateMlH
    );

    setTargetDistanceMm(
      configuration.distanceMm
    );

    onApplyConfiguration?.(
      configuration
    );
  };

  const selectMode = (
    nextMode: DesignerMode
  ): void => {
    setMode(nextMode);
    setSummary(null);
    setError("");
  };

  return (
    <main className="min-h-full overflow-y-auto bg-[#eef3f8] p-6 text-slate-900 lg:p-8">
      <header className="mx-auto flex max-w-7xl flex-wrap items-start justify-between gap-5">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Fluidnatek Smart Memory
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Smart Process Designer
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Parti da una formulazione, da un polimero o
            dal risultato desiderato. Il sistema cerca
            prima nella memoria storica e propone una
            configurazione operativa senza dipendere da
            Gemini.
          </p>
        </div>

        <div className="rounded-2xl border border-white bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Memoria disponibile
          </p>

          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-950">
              {experiments.length}
            </span>

            <span className="text-xs text-slate-500">
              esperimenti
            </span>
          </div>
        </div>
      </header>

      <section className="mx-auto mt-8 grid max-w-7xl gap-4 lg:grid-cols-3">
        <ModeCard
          active={mode === "formulation"}
          icon={<FlaskConical className="h-6 w-6" />}
          title="Ho una formulazione"
          description="Trova tensione, portata e distanza utilizzando gli esperimenti storici più simili."
          action="Configura la macchina"
          onClick={() => {
            selectMode("formulation");
          }}
        />

        <ModeCard
          active={mode === "polymer"}
          icon={<Beaker className="h-6 w-6" />}
          title="Ho scelto un polimero"
          description="Trova le formulazioni già sperimentate e individua quella con maggiore evidenza."
          action="Trova formulazione"
          onClick={() => {
            selectMode("polymer");
          }}
        />

        <ModeCard
          active={mode === "objective"}
          icon={<Target className="h-6 w-6" />}
          title="Ho un obiettivo"
          description="Progetta il processo partendo dalla morfologia o dalle prestazioni desiderate."
          action="Progetta il processo"
          onClick={() => {
            selectMode("objective");
          }}
        />
      </section>

      <section className="mx-auto mt-6 max-w-7xl">
        {mode === "formulation" && (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <FormulationConfigurationPanel
              formulations={formulations}
              selectedFormulationId={
                selectedFormulationId
              }
              voltageKv={
                targetVoltageKv
              }
              flowRateMlH={
                targetFlowRateMlH
              }
              distanceMm={
                targetDistanceMm
              }
              onFormulationChange={(value) => {
                setSelectedFormulationId(value);
                setSummary(null);
              }}
              onVoltageChange={
                setTargetVoltageKv
              }
              onFlowChange={
                setTargetFlowRateMlH
              }
              onDistanceChange={
                setTargetDistanceMm
              }
              onSearch={
                handleMemorySearch
              }
              canSearch={
                canSearch
              }
            />

            <RecommendationPanel
              summary={summary}
              selectedFormulation={
                selectedFormulation
              }
              error={error}
              onApply={
                handleApplyRecommendation
              }
            />
          </div>
        )}

        {mode === "polymer" && (
          <PolymerSearchPanel
            polymerQuery={polymerQuery}
            results={matchingFormulations}
            onQueryChange={
              setPolymerQuery
            }
            onSelect={
              handleSelectPolymerFormulation
            }
          />
        )}

        {mode === "objective" && (
          <ObjectivePlaceholder />
        )}
      </section>
    </main>
  );
}

interface ModeCardProps {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  onClick: () => void;
}

function ModeCard({
  active,
  icon,
  title,
  description,
  action,
  onClick,
}: ModeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-3xl border p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
        active
          ? "border-blue-300 bg-gradient-to-br from-blue-50 to-cyan-50 ring-2 ring-blue-100"
          : "border-white bg-white hover:border-blue-100"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div
          className={`rounded-2xl p-3 ${
            active
              ? "bg-blue-600 text-white shadow-md shadow-blue-200"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {icon}
        </div>

        <ArrowRight
          className={`h-5 w-5 transition group-hover:translate-x-1 ${
            active
              ? "text-blue-600"
              : "text-slate-300"
          }`}
        />
      </div>

      <h2 className="mt-5 text-lg font-bold text-slate-950">
        {title}
      </h2>

      <p className="mt-2 min-h-12 text-sm leading-relaxed text-slate-500">
        {description}
      </p>

      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-blue-600">
        {action}
      </p>
    </button>
  );
}

interface FormulationConfigurationPanelProps {
  formulations: Formulation[];
  selectedFormulationId: string;
  voltageKv: number;
  flowRateMlH: number;
  distanceMm: number;
  canSearch: boolean;

  onFormulationChange: (
    value: string
  ) => void;

  onVoltageChange: (
    value: number
  ) => void;

  onFlowChange: (
    value: number
  ) => void;

  onDistanceChange: (
    value: number
  ) => void;

  onSearch: () => void;
}

function FormulationConfigurationPanel({
  formulations,
  selectedFormulationId,
  voltageKv,
  flowRateMlH,
  distanceMm,
  canSearch,
  onFormulationChange,
  onVoltageChange,
  onFlowChange,
  onDistanceChange,
  onSearch,
}: FormulationConfigurationPanelProps) {
  return (
    <article className="rounded-3xl border border-white bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
          <Settings2 className="h-5 w-5" />
        </div>

        <div>
          <h2 className="font-bold text-slate-950">
            Configurazione iniziale
          </h2>

          <p className="text-xs text-slate-500">
            Definisci il punto di partenza da confrontare
            con la memoria.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <FieldLabel label="Formulazione">
          <select
            value={selectedFormulationId}
            onChange={(event) => {
              onFormulationChange(
                event.target.value
              );
            }}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
          >
            <option value="">
              Seleziona una formulazione
            </option>

            {formulations.map(
              (formulation) => (
                <option
                  key={formulation.id}
                  value={formulation.id}
                >
                  {formulation.polymerName}
                  {" — "}
                  {formulation.solvent}
                  {" — "}
                  {formulation.solidsContentPct}
                  {"%"}
                </option>
              )
            )}
          </select>
        </FieldLabel>

        <div className="grid gap-4 sm:grid-cols-3">
          <NumericField
            label="Tensione"
            unit="kV"
            value={voltageKv}
            step={0.1}
            onChange={onVoltageChange}
          />

          <NumericField
            label="Portata"
            unit="mL/h"
            value={flowRateMlH}
            step={0.01}
            onChange={onFlowChange}
          />

          <NumericField
            label="Distanza"
            unit="mm"
            value={distanceMm}
            step={1}
            onChange={onDistanceChange}
          />
        </div>

        <button
          type="button"
          disabled={!canSearch}
          onClick={onSearch}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Search className="h-4 w-4" />
          Cerca nella memoria
        </button>
      </div>
    </article>
  );
}

interface RecommendationPanelProps {
  summary: MemorySearchSummary | null;
  selectedFormulation: Formulation | null;
  error: string;
  onApply: () => void;
}

function RecommendationPanel({
  summary,
  selectedFormulation,
  error,
  onApply,
}: RecommendationPanelProps) {
  if (error) {
    return (
      <article className="rounded-3xl border border-red-100 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          {error}
        </div>
      </article>
    );
  }

  if (!summary) {
    return (
      <article className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-white bg-white p-8 text-center shadow-sm">
        <div className="rounded-3xl bg-gradient-to-br from-blue-50 to-cyan-50 p-5 text-blue-500">
          <Lightbulb className="h-10 w-10" />
        </div>

        <h2 className="mt-5 text-lg font-bold text-slate-950">
          Pronto per analizzare
        </h2>

        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
          Il motore confronterà la formulazione e i parametri
          proposti con gli esperimenti presenti in Firestore.
        </p>
      </article>
    );
  }

  const hasRecommendation =
    summary.recommendedVoltageKv !== null &&
    summary.recommendedFlowRateMlH !== null &&
    summary.recommendedDistanceMm !== null;

  return (
    <article className="rounded-3xl border border-white bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />

            <h2 className="font-bold text-slate-950">
              Configurazione consigliata
            </h2>
          </div>

          <p className="mt-1 text-xs text-slate-500">
            {selectedFormulation?.polymerName ?? "Formulazione"}
          </p>
        </div>

        <div className="rounded-2xl bg-emerald-50 px-4 py-2 text-right">
          <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">
            Probabilità stimata
          </p>

          <p className="text-xl font-bold text-emerald-700">
            {summary.estimatedSuccessProbability.toFixed(0)}
            %
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <RecommendationMetric
          icon={<Zap className="h-4 w-4" />}
          label="Tensione"
          value={
            summary.recommendedVoltageKv === null
              ? "N/D"
              : `${summary.recommendedVoltageKv.toFixed(2)} kV`
          }
        />

        <RecommendationMetric
          icon={<Gauge className="h-4 w-4" />}
          label="Portata"
          value={
            summary.recommendedFlowRateMlH === null
              ? "N/D"
              : `${summary.recommendedFlowRateMlH.toFixed(3)} mL/h`
          }
        />

        <RecommendationMetric
          icon={<Settings2 className="h-4 w-4" />}
          label="Distanza"
          value={
            summary.recommendedDistanceMm === null
              ? "N/D"
              : `${summary.recommendedDistanceMm.toFixed(1)} mm`
          }
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <SmallStat
          label="Esperimenti trovati"
          value={String(
            summary.matchedExperiments
          )}
        />

        <SmallStat
          label="Similarità media"
          value={`${summary.averageSimilarityScore.toFixed(0)}%`}
        />

        <SmallStat
          label="Fonte"
          value="Memoria interna"
        />
      </div>

      {summary.warnings.length > 0 && (
        <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700">
            <AlertTriangle className="h-4 w-4" />
            Avvertenze
          </p>

          <div className="mt-3 space-y-2">
            {summary.warnings.map(
              (warning) => (
                <p
                  key={warning}
                  className="text-xs leading-relaxed text-amber-800"
                >
                  {warning}
                </p>
              )
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        disabled={!hasRecommendation}
        onClick={onApply}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Applica configurazione
        <ArrowRight className="h-4 w-4" />
      </button>
    </article>
  );
}

interface PolymerSearchPanelProps {
  polymerQuery: string;
  results: RecommendedFormulation[];

  onQueryChange: (
    value: string
  ) => void;

  onSelect: (
    formulation: Formulation
  ) => void;
}

function PolymerSearchPanel({
  polymerQuery,
  results,
  onQueryChange,
  onSelect,
}: PolymerSearchPanelProps) {
  return (
    <article className="rounded-3xl border border-white bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-violet-50 p-3 text-violet-600">
          <Beaker className="h-5 w-5" />
        </div>

        <div>
          <h2 className="font-bold text-slate-950">
            Quale formulazione devo usare?
          </h2>

          <p className="text-xs text-slate-500">
            Cerca un polimero nella memoria aziendale.
          </p>
        </div>
      </div>

      <div className="relative mt-6">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

        <input
          type="text"
          value={polymerQuery}
          onChange={(event) => {
            onQueryChange(
              event.target.value
            );
          }}
          placeholder="Esempio: PCL, PLA, PVA, PAN..."
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
        />
      </div>

      <div className="mt-5 grid gap-3">
        {polymerQuery.trim() &&
          results.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              Nessuna formulazione trovata nella memoria.
            </div>
          )}

        {results.map(
          ({
            formulation,
            experimentCount,
          }) => (
            <button
              key={formulation.id}
              type="button"
              onClick={() => {
                onSelect(formulation);
              }}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left transition hover:border-violet-200 hover:bg-violet-50"
            >
              <div>
                <p className="font-bold text-slate-950">
                  {formulation.polymerName}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {formulation.solvent}
                  {" · "}
                  {formulation.solidsContentPct}
                  {"% solidi"}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-lg font-bold text-violet-700">
                    {experimentCount}
                  </p>

                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Esperimenti
                  </p>
                </div>

                <ArrowRight className="h-5 w-5 text-violet-500" />
              </div>
            </button>
          )
        )}
      </div>
    </article>
  );
}

function ObjectivePlaceholder() {
  return (
    <article className="rounded-3xl border border-white bg-white p-8 shadow-sm">
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-50 text-orange-500">
          <Target className="h-8 w-8" />
        </div>

        <h2 className="mt-5 text-xl font-bold text-slate-950">
          Progettazione per obiettivo
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Questa modalità utilizzerà diametro fibra,
          porosità, orientamento e applicazione per
          selezionare polimero, formulazione e processo.
        </p>

        <div className="mt-6 rounded-2xl bg-orange-50 px-4 py-3 text-xs font-semibold text-orange-700">
          Sarà il prossimo modulo dopo la validazione delle
          prime due modalità.
        </div>
      </div>
    </article>
  );
}

interface FieldLabelProps {
  label: string;
  children: React.ReactNode;
}

function FieldLabel({
  label,
  children,
}: FieldLabelProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>

      {children}
    </label>
  );
}

interface NumericFieldProps {
  label: string;
  unit: string;
  value: number;
  step: number;
  onChange: (
    value: number
  ) => void;
}

function NumericField({
  label,
  unit,
  value,
  step,
  onChange,
}: NumericFieldProps) {
  return (
    <FieldLabel label={label}>
      <div className="relative">
        <input
          type="number"
          min={0}
          step={step}
          value={value}
          onChange={(event) => {
            onChange(
              Number.parseFloat(
                event.target.value
              ) || 0
            );
          }}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-4 pr-16 font-mono text-sm font-semibold outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
        />

        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
          {unit}
        </span>
      </div>
    </FieldLabel>
  );
}

interface RecommendationMetricProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function RecommendationMetric({
  icon,
  label,
  value,
}: RecommendationMetricProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
      <div className="flex items-center gap-2 text-blue-600">
        {icon}

        <p className="text-[10px] font-bold uppercase tracking-wider">
          {label}
        </p>
      </div>

      <p className="mt-3 font-mono text-lg font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}

interface SmallStatProps {
  label: string;
  value: string;
}

function SmallStat({
  label,
  value,
}: SmallStatProps) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}