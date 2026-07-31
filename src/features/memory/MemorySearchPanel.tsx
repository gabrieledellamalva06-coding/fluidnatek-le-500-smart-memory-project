import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Database,
  Gauge,
  History,
  Loader2,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";

import type {
  Experiment,
  Formulation,
  Project,
} from "../../types";

import {
  searchProcessMemory,
  type MemorySearchSummary,
} from "./searchMemory";

interface MemorySearchPanelProps {
  projects: Project[];
  formulations: Formulation[];
  experiments: Experiment[];

  formulationId: string;

  voltageKv: number;
  flowRateMlH: number;
  distanceMm: number;

  onApplyRecommendation: (parameters: {
    voltageKv: number;
    flowRateMlH: number;
    distanceMm: number;
  }) => void;

  onRequestAI?: (
    summary: MemorySearchSummary
  ) => Promise<void>;
}

export default function MemorySearchPanel({
  projects,
  formulations,
  experiments,
  formulationId,
  voltageKv,
  flowRateMlH,
  distanceMm,
  onApplyRecommendation,
  onRequestAI,
}: MemorySearchPanelProps) {
  const [summary, setSummary] =
    useState<MemorySearchSummary | null>(null);

  const [isSearching, setIsSearching] =
    useState(false);

  const [isRequestingAI, setIsRequestingAI] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const selectedFormulation = useMemo(
    () =>
      formulations.find(
        (formulation) =>
          formulation.id === formulationId
      ) ?? null,
    [formulationId, formulations]
  );

  const canSearch =
    selectedFormulation !== null &&
    voltageKv > 0 &&
    flowRateMlH > 0 &&
    distanceMm > 0;

  const hasRecommendation =
    summary?.recommendedVoltageKv !== null &&
    summary?.recommendedFlowRateMlH !== null &&
    summary?.recommendedDistanceMm !== null;

  const handleSearch = (): void => {
    if (!canSearch) {
      setError(
        "Select a formulation and provide valid process parameters."
      );

      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const nextSummary = searchProcessMemory({
        query: {
          formulationId,
          voltageKv,
          flowRateMlH,
          distanceMm,
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
          : "Unable to search the historical process memory."
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleApplyRecommendation = (): void => {
    if (
      summary?.recommendedVoltageKv === null ||
      summary?.recommendedFlowRateMlH === null ||
      summary?.recommendedDistanceMm === null ||
      summary === null
    ) {
      return;
    }

    onApplyRecommendation({
      voltageKv:
        summary.recommendedVoltageKv,
      flowRateMlH:
        summary.recommendedFlowRateMlH,
      distanceMm:
        summary.recommendedDistanceMm,
    });
  };

  const handleRequestAI = async (): Promise<void> => {
    if (!summary || !onRequestAI) {
      return;
    }

    setIsRequestingAI(true);
    setError(null);

    try {
      await onRequestAI(summary);
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to request the AI analysis."
      );
    } finally {
      setIsRequestingAI(false);
    }
  };

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111318] shadow-2xl shadow-black/20">
      <header className="border-b border-white/[0.07] px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-2.5">
              <BrainCircuit className="h-5 w-5 text-cyan-300" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">
                  Smart Memory Search
                </h3>

                <span className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-emerald-300">
                  Deterministic
                </span>
              </div>

              <p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-500">
                Compare the current process configuration with historical
                experiments stored in Firestore before requesting generative
                AI assistance.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={!canSearch || isSearching}
            onClick={handleSearch}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-bold text-[#071012] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Search Memory
              </>
            )}
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <InputMetric
            label="Formulation"
            value={
              selectedFormulation
                ? selectedFormulation.polymerName
                : "Not selected"
            }
            icon={<Database className="h-4 w-4" />}
          />

          <InputMetric
            label="Target voltage"
            value={`${voltageKv.toFixed(1)} kV`}
            icon={<Zap className="h-4 w-4" />}
          />

          <InputMetric
            label="Target flow"
            value={`${flowRateMlH.toFixed(3)} mL/h`}
            icon={<Gauge className="h-4 w-4" />}
          />

          <InputMetric
            label="Emitter distance"
            value={`${distanceMm.toFixed(0)} mm`}
            icon={<History className="h-4 w-4" />}
          />
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-200"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!summary && (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-black/10 px-6 text-center">
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
              <BrainCircuit className="h-8 w-8 text-zinc-600" />
            </div>

            <h4 className="mt-4 text-sm font-semibold text-zinc-300">
              Historical evidence not evaluated
            </h4>

            <p className="mt-2 max-w-sm text-xs leading-relaxed text-zinc-600">
              Select a formulation, configure the proposed process and run the
              memory search to retrieve comparable historical experiments.
            </p>
          </div>
        )}

        {summary && (
          <>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <ResultMetric
                label="Matched runs"
                value={String(summary.matchedExperiments)}
                helper="Top historical matches"
              />

              <ResultMetric
                label="Average similarity"
                value={`${summary.averageSimilarityScore.toFixed(1)}%`}
                helper="Configuration similarity"
              />

              <ResultMetric
                label="Success probability"
                value={`${summary.estimatedSuccessProbability.toFixed(1)}%`}
                helper="Historical estimate"
              />

              <ResultMetric
                label="Evidence level"
                value={getEvidenceLabel(summary)}
                helper="Based on memory quality"
              />
            </div>

            {hasRecommendation && (
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-cyan-300" />

                      <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-200">
                        Recommended operating window
                      </h4>
                    </div>

                    <p className="mt-1 text-xs text-zinc-500">
                      Weighted from the most similar and most stable historical
                      experiments.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyRecommendation}
                    className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-cyan-200 transition hover:bg-cyan-300/15"
                  >
                    Apply parameters
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <RecommendationValue
                    label="Voltage"
                    value={`${summary.recommendedVoltageKv?.toFixed(2)} kV`}
                  />

                  <RecommendationValue
                    label="Flow rate"
                    value={`${summary.recommendedFlowRateMlH?.toFixed(3)} mL/h`}
                  />

                  <RecommendationValue
                    label="Distance"
                    value={`${summary.recommendedDistanceMm?.toFixed(1)} mm`}
                  />
                </div>
              </div>
            )}

            {summary.warnings.length > 0 && (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-300" />

                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-200">
                    Process warnings
                  </h4>
                </div>

                <ul className="mt-3 space-y-2">
                  {summary.warnings.map((warning) => (
                    <li
                      key={warning}
                      className="flex items-start gap-2 text-xs leading-relaxed text-amber-100/70"
                    >
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    Similar historical runs
                  </h4>

                  <p className="mt-1 text-[11px] text-zinc-600">
                    Ordered by formulation, process and stability similarity.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {summary.candidates.map((candidate) => (
                  <article
                    key={candidate.experiment.id}
                    className="rounded-xl border border-white/[0.07] bg-black/15 p-3 transition hover:border-white/[0.12]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-white/[0.05] px-2 py-1 font-mono text-[10px] font-semibold text-zinc-300">
                            {candidate.experiment.operationIdentifier}
                          </span>

                          <span className="text-xs font-semibold text-white">
                            {candidate.formulation.polymerName}
                          </span>

                          <span className="text-[10px] text-zinc-600">
                            {candidate.formulation.solvent}
                          </span>
                        </div>

                        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-500">
                          {candidate.experiment.operatorComments ||
                            "No operator comments recorded."}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="font-mono text-lg font-bold text-cyan-300">
                          {candidate.similarityScore.toFixed(1)}%
                        </p>

                        <p className="text-[9px] uppercase tracking-wider text-zinc-600">
                          similarity
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                      <CandidateValue
                        label="Voltage"
                        value={
                          candidate.averageVoltageKv === null
                            ? "N/A"
                            : `${candidate.averageVoltageKv.toFixed(2)} kV`
                        }
                      />

                      <CandidateValue
                        label="Flow"
                        value={
                          candidate.averageFlowRateMlH === null
                            ? "N/A"
                            : `${candidate.averageFlowRateMlH.toFixed(3)} mL/h`
                        }
                      />

                      <CandidateValue
                        label="Distance"
                        value={`${candidate.experiment.distanceMm.toFixed(1)} mm`}
                      />

                      <CandidateValue
                        label="Jet stability"
                        value={`${candidate.experiment.jetStabilityGrade}/5`}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {onRequestAI && summary.matchedExperiments > 0 && (
              <button
                type="button"
                disabled={isRequestingAI}
                onClick={() => {
                  void handleRequestAI();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/10 px-4 py-3 text-xs font-bold text-violet-200 transition hover:bg-violet-400/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRequestingAI ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating AI interpretation
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate AI interpretation from memory evidence
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}

interface MetricProps {
  label: string;
  value: string;
  icon: React.ReactNode;
}

function InputMetric({
  label,
  value,
  icon,
}: MetricProps) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/15 p-3">
      <div className="flex items-center gap-2 text-zinc-600">
        {icon}

        <span className="text-[9px] font-bold uppercase tracking-wider">
          {label}
        </span>
      </div>

      <p className="mt-2 truncate text-xs font-semibold text-zinc-300">
        {value}
      </p>
    </div>
  );
}

interface ResultMetricProps {
  label: string;
  value: string;
  helper: string;
}

function ResultMetric({
  label,
  value,
  helper,
}: ResultMetricProps) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/15 p-3">
      <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-600">
        {label}
      </p>

      <p className="mt-2 font-mono text-lg font-bold text-white">
        {value}
      </p>

      <p className="mt-1 text-[10px] text-zinc-600">
        {helper}
      </p>
    </div>
  );
}

interface ValueProps {
  label: string;
  value: string;
}

function RecommendationValue({
  label,
  value,
}: ValueProps) {
  return (
    <div className="rounded-xl border border-cyan-300/10 bg-black/20 p-3">
      <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-600">
        {label}
      </p>

      <p className="mt-1 font-mono text-sm font-bold text-cyan-200">
        {value}
      </p>
    </div>
  );
}

function CandidateValue({
  label,
  value,
}: ValueProps) {
  return (
    <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-2.5 py-2">
      <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-700">
        {label}
      </p>

      <p className="mt-1 font-mono text-[10px] font-semibold text-zinc-300">
        {value}
      </p>
    </div>
  );
}

function getEvidenceLabel(
  summary: MemorySearchSummary
): string {
  if (
    summary.matchedExperiments >= 4 &&
    summary.averageSimilarityScore >= 75
  ) {
    return "Strong";
  }

  if (
    summary.matchedExperiments >= 2 &&
    summary.averageSimilarityScore >= 55
  ) {
    return "Moderate";
  }

  return "Limited";
}