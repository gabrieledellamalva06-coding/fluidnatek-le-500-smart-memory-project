import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Play,
  Search,
  X,
} from "lucide-react";
import type { Experiment, Formulation, Project } from "../types";
import type { ExperimentalSetup } from "../core/types/setup";
import type { SolutionCharacterization } from "../core/types/characterization";
import type { ProcessabilityGrade } from "../core/types/processRecord";
import type { CreateExperimentInput } from "../application/experiments/experiment.mapper";
import type { Language } from "../lib/translations";
import NumericField from "./ui/NumericField";
import { buildHistoricalContexts } from "../features/experimental-assistant/contextBuilder";
import { searchSimilarExperiments } from "../features/experimental-assistant/similarity.engine";
import { searchSimilarSolutionExperiments } from "../features/experimental-assistant/similarity.engine";
import type { SolutionSimilarityMatch } from "../features/experimental-assistant/similarity.types";
import { analyzeSimilarExperiments } from "../features/experimental-assistant/historicalAnalysis";
import { buildSmartStartingPoint } from "../features/experimental-assistant/smartStartingPoint";
import { RECOMMENDATION_CONFIG } from "../features/experimental-assistant/recommendation.config";
import { processParameterTolerances } from "../features/experimental-assistant/processParameterTolerances";
import { searchSimilarProcessExperiments } from "../features/experimental-assistant/processConditionSimilarity.engine";
import type { ProcessConditionKey } from "../features/experimental-assistant/processConditionSimilarity.types";
import { buildInitialParameterRecommendation, type InitialParameterRecommendation, type ParameterRecommendation, type RecommendedParameterKey } from "../features/experimental-assistant/initialParameterRecommendation";
import type { Material } from "../core/types/material";
import { classifyCategoricalComparison, classifyNumericComparison } from "../features/experimental-assistant/comparisonClassification";
import { finiteNumberOrUndefined, isMissingValue } from "../features/experimental-assistant/valueSemantics";

interface Props {
  project: Project;
  formulation: Formulation;
  characterization?: SolutionCharacterization;
  setup: ExperimentalSetup;
  projects: Project[];
  formulations: Formulation[];
  characterizations: SolutionCharacterization[];
  setups: ExperimentalSetup[];
  experiments: Experiment[];
  materials: Material[];
  onAddExperiment: (input: CreateExperimentInput) => Promise<void>;
  lang: Language;
}

type Stage = "parameters" | "analysis" | "processability" | "review";
const GRADES: ProcessabilityGrade[] = [1, 2, 3, 4];

export default function RunConfig({
  project,
  formulation,
  characterization,
  setup,
  projects,
  formulations,
  characterizations,
  setups,
  experiments,
  materials,
  onAddExperiment,
  lang,
}: Props) {
  const [stage, setStage] = useState<Stage>("parameters");
  const [flowRateMlH, setFlowRateMlH] = useState<number | undefined>(1);
  const [voltageKv, setVoltageKv] = useState<number | undefined>(15);
  const [collectorVoltageKv, setCollectorVoltageKv] = useState<number | undefined>(0);
  const [temperatureC, setTemperatureC] = useState<number | undefined>(25);
  const [humidityPct, setHumidityPct] = useState<number | undefined>(40);
  const [distanceMm, setDistanceMm] = useState<number | undefined>(150);
  const [drumSpeedRpm, setDrumSpeedRpm] = useState<number | undefined>(0);
  const [runName, setRunName] = useState("");
  const [processability, setProcessability] = useState<ProcessabilityGrade>(3);
  const [comments, setComments] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [unsafeOverride, setUnsafeOverride] = useState(false);
  const [invalidParameterMessage, setInvalidParameterMessage] = useState<string[]>([]);
  const [focusMode, setFocusMode] = useState(false);
  const [openAnalysisPanel, setOpenAnalysisPanel] = useState<"analysis" | "recommendation" | null>(null);
  const [selectedRecommendationKeys, setSelectedRecommendationKeys] = useState<RecommendedParameterKey[]>([]);
  const [recommendationPreviewOpen, setRecommendationPreviewOpen] = useState(false);
  const [recommendationApplyMessage, setRecommendationApplyMessage] = useState("");

  const contexts = useMemo(
    () => buildHistoricalContexts(projects, formulations, characterizations, setups, experiments).map((context) => {
      const historicalFormulation = context.formulation;
      return {
        ...context,
        polymerMaterial: materials.find((item) => item.id === historicalFormulation?.polymerMaterialId),
        solvent1Material: materials.find((item) => item.id === historicalFormulation?.solvent1MaterialId),
        solvent2Material: materials.find((item) => item.id === historicalFormulation?.solvent2MaterialId),
      };
    }),
    [projects, formulations, characterizations, setups, experiments, materials]
  );

  const query = useMemo(
    () => ({
      projectId: project.id,
      formulationId: formulation.id,
      polymer: formulation.polymerName,
      solvent: formulation.solvent,
      setupId: setup.id,
      machine: setup.machine.model,
      flowRateMlH,
      voltageKv,
      hvNegativeKv: collectorVoltageKv,
      temperatureC,
      humidityPct,
      distanceMm,
      solidsContentPct: finiteNumberOrUndefined(formulation.solidsContentPct),
      polymerMaterialId: formulation.polymerMaterialId,
      solvent1MaterialId: formulation.solvent1MaterialId,
      solvent2MaterialId: formulation.solvent2MaterialId,
    }),
    [project, formulation, setup, flowRateMlH, voltageKv, collectorVoltageKv, temperatureC, humidityPct, distanceMm]
  );

  const matches = useMemo(
    () => searchSimilarExperiments(contexts, query, 30, 12),
    [contexts, query]
  );

  const currentPolymerMaterial = materials.find((item) => item.id === formulation.polymerMaterialId);
  const currentSolventMaterial = materials.find((item) => item.id === formulation.solvent1MaterialId);
  const solutionMatches = useMemo(
    () => searchSimilarSolutionExperiments(contexts, {
      polymer: formulation.polymerName,
      polymerFamily: currentPolymerMaterial?.polymerFamily,
      molecularWeight: currentPolymerMaterial?.molecularWeight,
      polymerConcentrationPct: finiteNumberOrUndefined(formulation.polymerConcentrationPct) ?? finiteNumberOrUndefined(formulation.solidsContentPct),
      solvent: formulation.solvent,
      solvent1: formulation.solvent1Name ?? formulation.solvent,
      solvent1RatioPct: formulation.solvent1RatioPct,
      solvent2: formulation.solvent2Name,
      solvent2RatioPct: formulation.solvent2RatioPct,
      solventFamily: currentSolventMaterial?.solventFamily,
    }, 0, 12),
    [contexts, currentPolymerMaterial, currentSolventMaterial, formulation]
  );
  const allSolutionMatches = useMemo(
    () => searchSimilarSolutionExperiments(contexts, { polymer: formulation.polymerName, polymerFamily: currentPolymerMaterial?.polymerFamily, molecularWeight: currentPolymerMaterial?.molecularWeight, polymerConcentrationPct: finiteNumberOrUndefined(formulation.polymerConcentrationPct) ?? finiteNumberOrUndefined(formulation.solidsContentPct), solvent: formulation.solvent, solvent1: formulation.solvent1Name ?? formulation.solvent, solvent1RatioPct: formulation.solvent1RatioPct, solvent2: formulation.solvent2Name, solvent2RatioPct: formulation.solvent2RatioPct, solventFamily: currentSolventMaterial?.solventFamily }, 0, contexts.length),
    [contexts, currentPolymerMaterial, currentSolventMaterial, formulation]
  );
  const [selectedHistoricalId, setSelectedHistoricalId] = useState("");
  const [analysisTab, setAnalysisTab] = useState<"solutions" | "process">("solutions");
  const [processSearchExecuted, setProcessSearchExecuted] = useState(false);
  const [includedProcessKeys, setIncludedProcessKeys] = useState<ProcessConditionKey[]>([]);
  useEffect(() => { setIncludedProcessKeys([]); setProcessSearchExecuted(false); setSelectedHistoricalId(""); setSelectedRecommendationKeys([]); setRecommendationPreviewOpen(false); setRecommendationApplyMessage(""); }, [formulation.id]);
  const selectedSolutionMatch = solutionMatches.find((match) => match.context.experiment.id === selectedHistoricalId);
  const topSolutionMatch = solutionMatches[0];
  const toggleAnalysisPanel = () => {
    setOpenAnalysisPanel((value) => {
      if (value === "analysis") {
        setSelectedHistoricalId("");
        setAnalysisTab("solutions");
        setProcessSearchExecuted(false);
        return null;
      }
      setSelectedHistoricalId("");
      setAnalysisTab("solutions");
      setProcessSearchExecuted(false);
      return "analysis";
    });
  };
  const toggleRecommendationPanel = () => {
    setSelectedHistoricalId("");
    setAnalysisTab("solutions");
    setProcessSearchExecuted(false);
    setOpenAnalysisPanel((value) => value === "recommendation" ? null : "recommendation");
  };
  const initialRecommendation = useMemo<InitialParameterRecommendation>(() => buildInitialParameterRecommendation(solutionMatches), [solutionMatches]);
  const currentParameterValues: Partial<Record<RecommendedParameterKey, number>> = { flowRateMlH, voltageKv, collectorVoltageKv, temperatureC, humidityPct, distanceMm, drumSpeedRpm };
  const applySelectedRecommendations = () => {
    initialRecommendation.parameters.forEach((parameter) => {
      if (!selectedRecommendationKeys.includes(parameter.key) || parameter.value === undefined) return;
      const setters: Record<RecommendedParameterKey, (value: number) => void> = { flowRateMlH: setFlowRateMlH, voltageKv: setVoltageKv, collectorVoltageKv: setCollectorVoltageKv, temperatureC: setTemperatureC, humidityPct: setHumidityPct, distanceMm: setDistanceMm, drumSpeedRpm: setDrumSpeedRpm };
      setters[parameter.key](parameter.value);
    });
    setProcessSearchExecuted(false);
    setSelectedHistoricalId("");
    setRecommendationPreviewOpen(false);
    setRecommendationApplyMessage("Selected starting parameters were copied to the current run. Review them before continuing.");
  };
  const processMatches = useMemo(() => processSearchExecuted ? searchSimilarProcessExperiments(contexts, { included: includedProcessKeys, values: { flowRateMlH, voltageKv, collectorVoltageKv, temperatureC, humidityPct, distanceMm, drumSpeedRpm } }, allSolutionMatches) : [], [contexts, includedProcessKeys, processSearchExecuted, flowRateMlH, voltageKv, collectorVoltageKv, temperatureC, humidityPct, distanceMm, drumSpeedRpm, allSolutionMatches]);
  const assessment = useMemo(
    () => analyzeSimilarExperiments(matches, query),
    [matches, query]
  );

  const smartStartingPoint = useMemo(
    () => buildSmartStartingPoint(formulation, experiments),
    [formulation, experiments]
  );

  function applySmartStartingPoint() {
    for (const item of smartStartingPoint.values) {
      if (item.label === "HV+") setVoltageKv(item.value);
      if (item.label === "HV−") setCollectorVoltageKv(item.value);
      if (item.label === "Flow") setFlowRateMlH(item.value);
      if (item.label === "Temperature") setTemperatureC(item.value);
      if (item.label === "RH") setHumidityPct(item.value);
      if (item.label === "Distance") setDistanceMm(item.value);
    }
  }

  const analyze = () => {
    const invalid = validateParameters({ flowRateMlH, voltageKv, temperatureC, humidityPct, distanceMm });
    if (invalid.length > 0 && !unsafeOverride) {
      setInvalidParameterMessage(invalid);
      setError("Unprocessable parameters: correct the values or explicitly confirm the unsafe override.");
      return;
    }
    setInvalidParameterMessage([]);
    setError("");
    setStage("analysis");
  };

  const save = async () => {
    if (!runName.trim()) {
      setError("Enter a Run / Sample Code before saving.");
      return;
    }
    const requiredValues = [flowRateMlH, voltageKv, distanceMm];
    if (requiredValues.some((value) => finiteNumberOrUndefined(value) === undefined)) {
      setError("Flow rate, HV+ and working distance must contain valid numeric values before saving.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onAddExperiment({
        formulationId: formulation.id,
        operationIdentifier: runName.trim(),
        machineModel: setup.machine.model,
        injectorType: setup.injector.type,
        collectorType: setup.collector.type,
        voltageKv: voltageKv as number,
        collectorVoltageKv,
        flowRateMlH: flowRateMlH as number,
        distanceMm: distanceMm as number,
        drumSpeedRpm: drumSpeedRpm > 0 ? drumSpeedRpm : undefined,
        jetStabilityGrade: processability,
        operatorComments: comments.trim(),
        sourceFile: "Manual Input",
        temperatureC,
        humidityPct,
      });
      setStage("parameters");
      setRunName("");
      setComments("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save experimental run.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-slate-100 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Workflow steps 5–8</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Live Telemetry &amp; Smart Memory</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Enter the conditions you plan to use, analyze similar historical experiments, then record the observed processability and save the run.
        </p>

        <div className="mt-4 flex justify-end">
          <button type="button" onClick={() => setFocusMode((value) => !value)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100">
            {focusMode ? "Show context" : "Focus mode"}
          </button>
        </div>

        {!focusMode && <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-sm font-bold text-slate-800">Machine telemetry unavailable</p>
              <p className="text-xs text-slate-500">DataHub is not connected. Values below are operator-entered setpoints, not real-time machine signals.</p>
            </div>
          </div>
        </section>}

        {!focusMode && <ContextStrip project={project} formulation={formulation} setup={setup} characterization={characterization} />}
        <Progress stage={stage} />

        {stage === "parameters" && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-blue-600" />
              <div>
                <h2 className="text-lg font-bold text-slate-950">Current Operating Parameters</h2>
                <p className="text-xs text-slate-500">Enter the values you want to evaluate against historical runs.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <NumericField label="Q1" unit="mL/h" value={flowRateMlH} onChange={setFlowRateMlH} min={0} decimals={3} />
              <NumericField label="HV+" unit="kV" value={voltageKv} onChange={setVoltageKv} decimals={2} />
              <NumericField label="HV-" unit="kV" value={collectorVoltageKv} onChange={setCollectorVoltageKv} decimals={2} />
              <NumericField label="Temperature" unit="°C" value={temperatureC} onChange={setTemperatureC} decimals={1} />
              <NumericField label="RH" unit="%" value={humidityPct} onChange={setHumidityPct} min={0} max={100} decimals={1} />
              <NumericField label="dZ" unit="mm" value={distanceMm} onChange={setDistanceMm} min={0} decimals={1} />
              <NumericField label="Drum speed" unit="rpm" value={drumSpeedRpm} onChange={setDrumSpeedRpm} min={0} decimals={0} />
              <label className="block sm:col-span-2">
                <span className="label">Run / Sample Code</span>
                <input value={runName} onChange={(e) => setRunName(e.target.value)} className="input" placeholder="Example: PEO-RUN-024" />
              </label>
            </div>

            <section className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-violet-800">Smart Starting Point</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{smartStartingPoint.status === "insufficient_data" ? "No validated starting point available" : smartStartingPoint.rationale}</p>
                  <p className="mt-1 text-xs text-slate-700">Confidence: {Math.round(smartStartingPoint.confidence * 100)}% · source values come from historical experiments for this formulation.</p>
                </div>
                <button type="button" disabled={smartStartingPoint.values.length === 0} onClick={applySmartStartingPoint} className="rounded-xl bg-violet-700 px-4 py-2 text-xs font-bold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50">Apply smart point</button>
              </div>
              {smartStartingPoint.values.length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{smartStartingPoint.values.map((item) => <div key={item.label} className="rounded-xl border border-violet-200 bg-white p-3"><p className="text-[10px] font-bold uppercase text-slate-600">{item.label}</p><p className="mt-1 text-sm font-bold text-slate-950">{item.value.toFixed(2)} {item.unit}</p><p className="mt-1 text-[10px] text-slate-600">n={item.evidenceCount}</p></div>)}</div>}
            </section>

            <div className="mt-6 flex justify-end">
              {invalidParameterMessage.length > 0 && <div className="mr-auto rounded-2xl border border-red-300 bg-red-50 p-4 text-left text-sm text-red-900"><p className="font-bold">UNPROCESSABLE PARAMETERS</p><ul className="mt-2 list-disc pl-5">{invalidParameterMessage.map((message) => <li key={message}>{message}</li>)}</ul><label className="mt-3 flex items-start gap-2 text-xs font-semibold"><input type="checkbox" checked={unsafeOverride} onChange={(event) => setUnsafeOverride(event.target.checked)} className="mt-0.5" />I confirm that I want to continue with parameters outside the configured machine range and accept full operator responsibility.</label></div>}
              <button type="button" onClick={analyze} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white">
                <Search className="h-4 w-4" /> Analyze Similar Historical Runs
              </button>
            </div>
          </section>
        )}

        {stage === "analysis" && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <div>
                <h2 className="text-lg font-bold text-slate-950">Historical Analysis</h2>
                <p className="text-xs text-slate-500">These results describe similar past experiments; they do not replace the current run.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <OverviewCard title="Historical Analysis" subtitle="Compare with similar historical experiments." tone="blue" open={openAnalysisPanel === "analysis"} onToggle={toggleAnalysisPanel}>
                <div className="flex flex-wrap gap-2"><Status tone="green">Solution Similarity: {topSolutionMatch?.score.toFixed(0) ?? "No data"}%</Status><Status tone="green">Historical Grade: {topSolutionMatch && validGrade(topSolutionMatch.context.experiment.jetStabilityGrade) ? `${topSolutionMatch.context.experiment.jetStabilityGrade}/4` : "No data"}</Status></div>
                <p className="mt-3 text-sm text-slate-700">Top match: <b>{topSolutionMatch?.context.experiment.operationIdentifier || "No data"}</b></p>
                <button type="button" onClick={toggleAnalysisPanel} className="mt-4 w-full rounded-xl border border-blue-300 bg-white px-4 py-3 text-xs font-bold text-blue-700">{openAnalysisPanel === "analysis" ? "Close analysis" : "Open analysis"}⌄</button>
              </OverviewCard>
              <OverviewCard title="Recommended Starting Parameters" subtitle="Get starting points from similar successful experiments." tone="violet" open={openAnalysisPanel === "recommendation"} onToggle={toggleRecommendationPanel}>
                <Status tone="amber">{initialRecommendation.evidenceLevel[0].toUpperCase() + initialRecommendation.evidenceLevel.slice(1)} historical evidence</Status>
                <p className="mt-3 text-sm text-slate-700">Best match: <b>{initialRecommendation.bestMatch?.score.toFixed(0) ?? "No data"}% similarity</b></p>
                <button type="button" onClick={toggleRecommendationPanel} className="mt-4 w-full rounded-xl border border-violet-300 bg-white px-4 py-3 text-xs font-bold text-violet-700">{openAnalysisPanel === "recommendation" ? "Close recommendations" : "Open recommendations"}⌄</button>
              </OverviewCard>
            </div>
            {openAnalysisPanel === "analysis" && <div className="mt-4 rounded-3xl border border-blue-200 bg-white p-5">
              <div className="mb-4 flex gap-2 border-b border-slate-200 pb-3"><button type="button" onClick={() => { setAnalysisTab("solutions"); setSelectedHistoricalId(""); setProcessSearchExecuted(false); setIncludedProcessKeys([]); }} className={`rounded-lg px-3 py-2 text-xs font-bold ${analysisTab === "solutions" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>Similar Solutions</button><button type="button" onClick={() => { setAnalysisTab("process"); setSelectedHistoricalId(""); setProcessSearchExecuted(false); setIncludedProcessKeys([]); }} className={`rounded-lg px-3 py-2 text-xs font-bold ${analysisTab === "process" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>Similar Process Conditions</button></div>
              {analysisTab === "process" ? <ProcessConditionSearch flowRateMlH={flowRateMlH} voltageKv={voltageKv} collectorVoltageKv={collectorVoltageKv} temperatureC={temperatureC} humidityPct={humidityPct} distanceMm={distanceMm} drumSpeedRpm={drumSpeedRpm} included={includedProcessKeys} onToggle={(key) => setIncludedProcessKeys((keys) => keys.includes(key) ? keys.filter((item) => item !== key) : [...keys, key])} onSearch={() => { setSelectedHistoricalId(""); setProcessSearchExecuted(true); }} onSelect={(id) => setSelectedHistoricalId((current) => current === id ? "" : id)} selectedHistoricalId={selectedHistoricalId} matches={processMatches} comparison={(match) => <ExperimentComparison current={currentRunSnapshot({ formulation, runName: runName || "Current Run", polymerMaterial: currentPolymerMaterial, solventMaterial: currentSolventMaterial, flowRateMlH, voltageKv, collectorVoltageKv, temperatureC, humidityPct, distanceMm, drumSpeedRpm })} match={(match.solutionMatch ?? { context: match.context, score: 0, tier: 4, comparableCriteriaCount: 0, comparableCriteriaTotal: 5, dataCompleteness: 0, evidenceLevel: "limited", rankingScore: 0, reasons: [] }) as SolutionSimilarityMatch} processMatch={match} />} /> : <>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Closest Historical Runs</p>
                <div className="mt-2 space-y-1.5">
                  {solutionMatches.slice(0, 5).map((match) => <React.Fragment key={match.context.experiment.id}><button type="button" aria-expanded={selectedHistoricalId === match.context.experiment.id} aria-controls={`comparison-${match.context.experiment.id}`} onClick={() => setSelectedHistoricalId((current) => current === match.context.experiment.id ? "" : match.context.experiment.id)} className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs ${selectedHistoricalId === match.context.experiment.id ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white hover:bg-blue-50"}`}>
                      <span className="min-w-0 whitespace-normal break-words font-semibold text-slate-800">{match.context.experiment.operationIdentifier || match.context.experiment.id}</span>
                      <div className="flex shrink-0 gap-2 text-[10px] text-slate-500">
                        <span>Solution Similarity <b className="text-slate-800">{match.score.toFixed(0)}%</b></span>
                        <span>{match.evidenceLevel[0].toUpperCase() + match.evidenceLevel.slice(1)} evidence · {match.comparableCriteriaCount}/{match.comparableCriteriaTotal}</span>
                        {validGrade(match.context.experiment.jetStabilityGrade) && <span>Grade <b className="text-slate-800">{match.context.experiment.jetStabilityGrade}/4</b></span>}
                      </div>
                    </button>{selectedHistoricalId === match.context.experiment.id && <div id={`comparison-${match.context.experiment.id}`} className="ml-3 border-l-2 border-blue-200 pl-3"><ExperimentComparison current={currentRunSnapshot({ formulation, runName: runName || "Current Run", polymerMaterial: currentPolymerMaterial, solventMaterial: currentSolventMaterial, flowRateMlH, voltageKv, collectorVoltageKv, temperatureC, humidityPct, distanceMm, drumSpeedRpm })} match={match} /></div>}</React.Fragment>)}
                  {solutionMatches.length === 0 && <p className="rounded-xl bg-white p-3 text-xs text-slate-500">No comparable historical runs.</p>}
                </div>
              </div>
              <Metric label="Highest Solution Similarity" value={topSolutionMatch ? `${topSolutionMatch.score.toFixed(0)}%` : "No data"} />
              <Metric label="Total Similar Runs" value={String(solutionMatches.length)} />
              <Metric label="Historical Evidence" value={`${Math.round(assessment.confidence * 100)}%`} />
               </>}
            </div>}


            {openAnalysisPanel === "recommendation" && <div className="mt-4 rounded-3xl border border-violet-200 bg-violet-50/40 p-5"><InitialRecommendationPanel recommendation={initialRecommendation} selectedKeys={selectedRecommendationKeys} onSelectedKeysChange={(keys) => { setSelectedRecommendationKeys(keys); setRecommendationApplyMessage(""); }} currentValues={currentParameterValues} previewOpen={recommendationPreviewOpen} onPreviewOpen={() => setRecommendationPreviewOpen(true)} onPreviewCancel={() => setRecommendationPreviewOpen(false)} onApply={applySelectedRecommendations} successMessage={recommendationApplyMessage} /></div>}

            <div className="mt-6 flex flex-wrap justify-between gap-3">
              <button type="button" onClick={() => setStage("parameters")} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700">Adjust Parameters</button>
              <button type="button" onClick={() => setStage("processability")} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">Continue to Actual Processability</button>
            </div>
          </section>
        )}

        {stage === "processability" && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              <div>
                <h2 className="text-lg font-bold text-slate-950">Observed Processability</h2>
                <p className="text-xs text-slate-500">After the physical run, record what actually happened using the agreed 1–4 scale.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {GRADES.map((grade) => (
                <button key={grade} type="button" onClick={() => setProcessability(grade)} aria-pressed={processability === grade} className={`rounded-2xl border p-4 text-left text-slate-950 transition ${processability === grade ? "border-blue-600 bg-blue-50 ring-4 ring-blue-100" : "border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/50"}`}>
                  <span className="text-2xl font-bold text-slate-950">{grade}</span>
                  <p className="text-xs text-slate-500">{gradeLabel(grade, lang)}</p>
                </button>
              ))}
            </div>

            <label className="mt-5 block"><span className="label">Process Comments</span><textarea rows={4} value={comments} onChange={(e) => setComments(e.target.value)} className="input resize-none" /></label>
            <div className="mt-6 flex justify-between"><button type="button" onClick={() => setStage("analysis")} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 hover:bg-slate-100">Back to Analysis</button><button type="button" onClick={() => setStage("review")} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">Review & Save</button></div>
          </section>
        )}

        {stage === "review" && (
          <section className="mt-6 rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Confirm & Save Experiment</h2>
            <p className="mt-1 text-xs text-slate-500">Nothing new is requested here. Check the summary and save it to historical memory.</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <Metric label="Project" value={project.name} />
              <Metric label="Formulation" value={formulation.name || formulation.polymerName} />
              <Metric label="Setup" value={setup.name || setup.machine.model} />
              <Metric label="Q1" value={`${flowRateMlH} mL/h`} />
              <Metric label="HV+" value={`${voltageKv} kV`} />
              <Metric label="HV-" value={`${collectorVoltageKv} kV`} />
              <Metric label="RH" value={`${humidityPct}%`} />
              <Metric label="Temperature" value={`${temperatureC} °C`} />
              <Metric label="dZ" value={`${distanceMm} mm`} />
              {drumSpeedRpm > 0 && <Metric label="Drum speed" value={`${drumSpeedRpm} rpm`} />}
              <Metric label="Observed Processability" value={`${processability} / 4`} />
              <Metric label="Run code" value={runName || "Missing"} />
            </div>
            {error && <div className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="h-4 w-4" />{error}</div>}
            <div className="mt-6 flex justify-between"><button type="button" onClick={() => setStage("processability")} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold">Edit</button><button type="button" disabled={saving} onClick={save} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-50"><Play className="h-4 w-4" />{saving ? "Saving..." : "Save Run & Update Memory"}</button></div>
          </section>
        )}
      </div>
      <style>{`.input{width:100%;border:1px solid #e2e8f0;border-radius:1rem;background:#f8fafc;padding:.75rem 1rem;font-size:.875rem;color:#0f172a;outline:none}.input::placeholder{color:#94a3b8}.input:focus{border-color:#60a5fa;box-shadow:0 0 0 4px #dbeafe}.label{display:block;margin-bottom:.5rem;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#64748b}`}</style>
    </main>
  );
}

function Progress({ stage }: { stage: Stage }) { const items: Stage[]=["parameters","analysis","processability","review"]; const current=items.indexOf(stage); const percent=Math.round(((current+1)/items.length)*100); return <div className="mt-6"><div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-600"><span>Workflow progress</span><span>{percent}%</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${percent}%` }} /></div></div>; }
function OverviewCard({ title, subtitle, tone, open, onToggle, children }: { title: string; subtitle: string; tone: "blue" | "violet"; open: boolean; onToggle: () => void; children: React.ReactNode }) { const accent = tone === "blue" ? "border-blue-200" : "border-violet-200"; return <section className={`rounded-3xl border ${accent} bg-white p-5 shadow-sm`}><button type="button" onClick={onToggle} className="flex w-full items-start justify-between gap-4 text-left"><span><span className={`text-sm font-bold ${tone === "blue" ? "text-blue-700" : "text-violet-700"}`}>{title}</span><span className="mt-1 block text-xs text-slate-500">{subtitle}</span></span><span className="text-lg text-slate-500">{open ? "⌃" : "⌄"}</span></button>{open && <div className="mt-4">{children}</div>}</section>; }

interface CurrentRunSnapshot {
  formulation: Formulation;
  runName: string;
  polymerMaterial?: Material;
  solventMaterial?: Material;
  flowRateMlH?: number;
  voltageKv?: number;
  collectorVoltageKv?: number;
  temperatureC?: number;
  humidityPct?: number;
  distanceMm?: number;
  drumSpeedRpm?: number;
}

function currentRunSnapshot(input: CurrentRunSnapshot): CurrentRunSnapshot { return input; }

function ExperimentComparison({ current, match, processMatch }: { current: CurrentRunSnapshot; match: SolutionSimilarityMatch; processMatch?: import("../features/experimental-assistant/processConditionSimilarity.types").ProcessConditionMatch }) {
  const historical = match.context;
  const formulation = historical.formulation;
  const telemetry = historical.experiment.telemetryData.find((item) => [item.flowRateMlH, item.voltageKv, item.collectorVoltageKv, item.temperatureC, item.humidityPct, item.distanceMm, item.drumSpeedRpm].some((value) => typeof value === "number" && Number.isFinite(value)));
  const currentConcentration = finiteNumberOrUndefined(current.formulation.polymerConcentrationPct) ?? finiteNumberOrUndefined(current.formulation.solidsContentPct);
  const historicalConcentration = finiteNumberOrUndefined(formulation?.polymerConcentrationPct) ?? finiteNumberOrUndefined(formulation?.solidsContentPct);
  const rows = [
    solutionRow("Polymer", current.formulation.polymerName, formulation?.polymerName),
    solutionRow("Polymer Family", current.polymerMaterial?.polymerFamily, historical.polymerMaterial?.polymerFamily),
    solutionRow("Molecular Weight", current.polymerMaterial?.molecularWeight, historical.polymerMaterial?.molecularWeight),
    solutionRow("Concentration", percent(currentConcentration), percent(historicalConcentration)),
    solutionRow("Solvent 1", current.formulation.solvent1Name ?? current.formulation.solvent, formulation?.solvent1Name ?? formulation?.solvent),
    solutionRow("Solvent 1 Ratio", percent(current.formulation.solvent1RatioPct), percent(formulation?.solvent1RatioPct)),
    solutionRow("Solvent 2", current.formulation.solvent2Name, formulation?.solvent2Name),
    solutionRow("Solvent 2 Ratio", percent(current.formulation.solvent2RatioPct), percent(formulation?.solvent2RatioPct)),
    processRow("Flow Rate", current.flowRateMlH, telemetry?.flowRateMlH, "flowRateMlH"),
    processRow("HV+", current.voltageKv, telemetry?.voltageKv, "voltageKv"),
    processRow("HV-", current.collectorVoltageKv, telemetry?.collectorVoltageKv, "collectorVoltageKv"),
    processRow("Temperature", current.temperatureC, telemetry?.temperatureC, "temperatureC"),
    processRow("Relative Humidity", current.humidityPct, telemetry?.humidityPct, "humidityPct"),
    processRow("Working Distance", current.distanceMm, telemetry?.distanceMm, "distanceMm"),
    processRow("Drum / Collector Speed", current.drumSpeedRpm, telemetry?.drumSpeedRpm, "drumSpeedRpm"),
  ].filter((row): row is ComparisonRow => row !== null);
  const currentLabel = current.runName || "Current Run";
  const historicalLabel = historical.experiment.operationIdentifier || historical.experiment.id;
  return <section className="mt-4 rounded-3xl border border-blue-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">Experiment Comparison</p><h3 className="mt-1 text-xl font-bold text-slate-950">{currentLabel} vs {historicalLabel}</h3></div><div className="flex gap-2 text-xs font-bold"><span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">Solution Similarity {match.score.toFixed(0)}%</span><span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Historical Grade: {validGrade(historical.experiment.jetStabilityGrade) ? `${historical.experiment.jetStabilityGrade}/4` : "No data"}</span></div></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] table-fixed text-left text-xs"><thead><tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400"><th className="w-[28%] px-3 py-2">Parameter</th><th className="w-[27%] px-3 py-2">{currentLabel}</th><th className="w-[18%] px-3 py-2 text-center">Comparison</th><th className="w-[27%] px-3 py-2">{historicalLabel}</th></tr></thead><tbody><tr><td colSpan={4} className="bg-blue-50/60 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-blue-700">Solution / Formulation</td></tr>{rows.slice(0, 8).map((row) => <ComparisonTableRow key={row.label} row={row} />)}<tr><td colSpan={4} className="bg-blue-50/60 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-blue-700">Process Parameters</td></tr>{rows.slice(8).map((row) => <ComparisonTableRow key={row.label} row={row} />)}<tr><td colSpan={4} className="bg-blue-50/60 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-blue-700">Historical Result / Processability</td></tr><tr className="border-b border-slate-100"><td className="px-3 py-2 font-semibold text-slate-700">Processability Grade</td><td className="px-3 py-2 text-slate-600">Not run yet</td><td className="px-3 py-2 text-center"><Status tone="gray">No data</Status></td><td className="px-3 py-2 text-slate-600">{validGrade(historical.experiment.jetStabilityGrade) ? `${historical.experiment.jetStabilityGrade}/4` : "No data"}</td></tr></tbody></table></div><div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-2xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Historical Comments / Result</p><p className="mt-1 text-sm text-slate-600">{historical.experiment.operatorComments || "No data"}</p></div><div className="rounded-2xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Experiment Details</p><p className="mt-1 text-xs text-slate-600">ID: {historical.experiment.id} · Project: {historical.project?.name || "Not available"} · Formulation: {formulation?.name || formulation?.polymerName || "Not available"} · Setup: {historical.setup?.name || historical.setup?.machine.model || "Not available"} · Date: {historical.experiment.ingestedAt || "Not available"}</p></div></div></section>;
}

function ComparisonTableRow({ row }: { row: ComparisonRow }) { return <tr className="border-b border-slate-100"><td className="px-3 py-2 font-semibold text-slate-700">{row.label}</td><td className="px-3 py-2 text-slate-600">{row.current}</td><td className="px-3 py-2 text-center">{row.status}</td><td className="px-3 py-2 text-slate-600">{row.historical}</td></tr>; }

function InitialRecommendationPanel({ recommendation, selectedKeys, onSelectedKeysChange, currentValues, previewOpen, onPreviewOpen, onPreviewCancel, onApply, successMessage }: { recommendation: InitialParameterRecommendation; selectedKeys: RecommendedParameterKey[]; onSelectedKeysChange: (keys: RecommendedParameterKey[]) => void; currentValues: Partial<Record<RecommendedParameterKey, number>>; previewOpen: boolean; onPreviewOpen: () => void; onPreviewCancel: () => void; onApply: () => void; successMessage: string }) {
  const [evidenceKey, setEvidenceKey] = useState<RecommendedParameterKey | null>(null);
  const evidenceLabel = recommendation.evidenceLevel === "insufficient" ? "Insufficient historical evidence" : `${recommendation.evidenceLevel[0].toUpperCase()}${recommendation.evidenceLevel.slice(1)} historical evidence`;
  const reliableKeys = recommendation.parameters.filter((parameter) => parameter.value !== undefined).map((parameter) => parameter.key);
  const allReliableSelected = reliableKeys.length > 0 && reliableKeys.every((key) => selectedKeys.includes(key));
  const selectedParameters = recommendation.parameters.filter((parameter) => selectedKeys.includes(parameter.key) && parameter.value !== undefined);
  const evidenceParameter = recommendation.parameters.find((parameter) => parameter.key === evidenceKey);
  const excludedSources = recommendation.parameters.flatMap((parameter) => parameter.sources).filter((source) => source.status !== "included");
  const criteria = recommendation.bestMatch?.comparableCriteriaCount ?? 0;
  const totalCriteria = recommendation.bestMatch?.comparableCriteriaTotal ?? 0;
  return <section className="rounded-3xl border border-violet-200 bg-violet-50/60 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold text-slate-950">Recommended Starting Parameters</h3><p className="mt-1 text-xs text-slate-600">Historical starting points—not guaranteed machine setpoints.</p></div><div className="text-left sm:text-right"><p className="text-sm font-bold text-violet-800">{evidenceLabel}</p><p className="mt-1 text-xs text-slate-600">{recommendation.supportingExperimentCount} similar experiment{recommendation.supportingExperimentCount === 1 ? "" : "s"} · {recommendation.successfulExperimentCount} successful supporting</p>{recommendation.bestMatch && <p className="mt-1 text-xs text-slate-600">Best match: {formatRecommendationNumber(recommendation.bestMatch.score, 0)}% Solution Similarity · Grade {validGrade(recommendation.bestMatch.context.experiment.jetStabilityGrade) ? `${recommendation.bestMatch.context.experiment.jetStabilityGrade}/4` : "No data"}</p>}</div></div><div className="mt-4 rounded-2xl border border-violet-200 bg-white p-4"><p className="text-sm font-bold text-slate-900">Why this recommendation</p><div className="mt-2 grid gap-2 text-xs text-slate-700 sm:grid-cols-2"><p><b>Source experiments:</b> {recommendation.parameters.flatMap((parameter) => parameter.supportingExperimentIds).filter((id, index, ids) => ids.indexOf(id) === index).join(", ") || "None"}</p><p><b>Process evidence:</b> {criteria}/{totalCriteria || "No data"} criteria comparable</p><p><b>Excluded values:</b> {excludedSources.length} (missing data, outlier, or no consensus)</p><p><b>Motivation:</b> weighted historical values from comparable records; no values are invented.</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><RecommendationParameterCards recommendation={recommendation} selectedKeys={selectedKeys} onSelectedKeysChange={onSelectedKeysChange} evidenceKey={evidenceKey} onEvidenceToggle={(key) => setEvidenceKey((current) => current === key ? null : key)} /></div>{evidenceParameter && <RecommendationEvidencePanel parameter={evidenceParameter} />}{reliableKeys.length > 0 && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-violet-200 pt-4"><label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={allReliableSelected} onChange={(event) => onSelectedKeysChange(event.target.checked ? reliableKeys : [])} />Select all reliable recommendations</label><button type="button" disabled={selectedParameters.length === 0} onClick={onPreviewOpen} className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Use selected starting parameters</button></div>}{previewOpen && <div role="dialog" aria-modal="true" aria-labelledby="recommendation-preview-title" className="mt-4 rounded-2xl border border-violet-300 bg-white p-4 shadow-sm"><h4 id="recommendation-preview-title" className="font-bold text-slate-950">Confirm starting parameters</h4><p className="mt-1 text-xs text-slate-600">Review every current value before replacing it in this unsaved run.</p><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[480px] text-left text-xs"><thead><tr className="border-b border-slate-200 text-slate-500"><th className="px-2 py-2">Parameter</th><th className="px-2 py-2">Current value</th><th className="px-2 py-2">Proposed value</th></tr></thead><tbody>{selectedParameters.map((parameter) => <tr key={parameter.key} className="border-b border-slate-100"><td className="px-2 py-2 font-semibold">{parameter.label}</td><td className="px-2 py-2">{formatRecommendationValue(parameter.key, currentValues[parameter.key])} {parameter.unit}</td><td className="px-2 py-2 font-bold text-violet-800">{formatRecommendationValue(parameter.key, parameter.value!)} {parameter.unit}</td></tr>)}</tbody></table></div><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={onPreviewCancel} className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700">Cancel</button><button type="button" onClick={onApply} className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white">Confirm and copy</button></div></div>}{successMessage && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">{successMessage}</p>}</section>;
}

function ProcessConditionSearch({ flowRateMlH, voltageKv, collectorVoltageKv, temperatureC, humidityPct, distanceMm, drumSpeedRpm, included, onToggle, onSearch, onSelect, selectedHistoricalId, matches, comparison }: { flowRateMlH?: number; voltageKv?: number; collectorVoltageKv?: number; temperatureC?: number; humidityPct?: number; distanceMm?: number; drumSpeedRpm?: number; included: ProcessConditionKey[]; onToggle: (key: ProcessConditionKey) => void; onSearch: () => void; onSelect: (id: string) => void; selectedHistoricalId: string; matches: import("../features/experimental-assistant/processConditionSimilarity.types").ProcessConditionMatch[]; comparison: (match: import("../features/experimental-assistant/processConditionSimilarity.types").ProcessConditionMatch) => React.ReactNode }) {
  const values: Array<[ProcessConditionKey, string, number | undefined, string]> = [["flowRateMlH", "Flow Rate", flowRateMlH, "mL/h"], ["voltageKv", "HV+", voltageKv, "kV"], ["collectorVoltageKv", "HV−", collectorVoltageKv, "kV"], ["temperatureC", "Temperature", temperatureC, "°C"], ["humidityPct", "Relative Humidity", humidityPct, "%"], ["distanceMm", "Working Distance", distanceMm, "mm"], ["drumSpeedRpm", "Drum/Collector Speed", drumSpeedRpm, "rpm"]];
  const includedSummary = values.filter(([key]) => included.includes(key));
  return <div><p className="text-sm font-bold text-slate-800">Intended process conditions</p><p className="mt-1 text-xs text-slate-500">Select only the process conditions you want to use as search constraints.</p><p className="mt-3 rounded-xl bg-blue-50 p-3 text-xs text-blue-800">Results are ranked by process similarity and available evidence. Solution similarity and historical grade are shown separately.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{values.map(([key, label, value, unit]) => <label key={key} className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"><span className="min-w-0"><input type="checkbox" checked={included.includes(key)} onChange={() => onToggle(key)} className="mr-2" />{label}: <b>{value} {unit}</b></span><span className="shrink-0 text-slate-400">Include</span></label>)}</div><button type="button" onClick={onSearch} disabled={included.length === 0} className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Find Similar Process Conditions</button>{includedSummary.length > 0 && <p className="mt-3 text-xs text-slate-600">Searching by: {includedSummary.map(([, label, value, unit]) => `${label} ${value} ${unit}`).join(" · ")}</p>}<div className="mt-4 space-y-2">{matches.map((match) => <React.Fragment key={match.context.experiment.id}><button type="button" onClick={() => onSelect(match.context.experiment.id)} className="flex w-full min-w-0 flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 p-3 text-left text-xs hover:bg-blue-50"><span className="min-w-0 flex-1"><span className="block break-words font-bold text-slate-900">{match.context.experiment.operationIdentifier || match.context.experiment.id}</span><span className="mt-1 block break-words text-slate-500">Project: {match.context.project?.name || "No data"} · Formulation: {match.context.formulation?.name || match.context.formulation?.polymerName || "No data"} · Setup: {match.context.setup?.name || match.context.setup?.machine.model || "No data"}</span></span><span className="grid shrink-0 grid-cols-2 gap-1 text-[10px] sm:flex sm:flex-wrap sm:justify-end"><Status tone="blue">Process {match.processScore}%</Status><Status tone="violet">Overall {match.rankingScore}%</Status><Status tone="gray">Evidence {match.comparableCriteriaCount}/{match.comparableCriteriaTotal} · {match.evidenceLevel}</Status><Status tone="green">Solution {match.solutionMatch ? `${match.solutionMatch.score.toFixed(0)}%` : "No data"}</Status><Status tone="amber">Grade {validGrade(match.context.experiment.jetStabilityGrade) ? `${match.context.experiment.jetStabilityGrade}/4` : "No grade"}</Status></span></button>{selectedHistoricalId === match.context.experiment.id && <div className="ml-3 border-l-2 border-blue-200 pl-3">{comparison(match)}</div>}</React.Fragment>)}{matches.length === 0 && <p className="text-xs text-slate-500">Run a search to view historical process-condition evidence.</p>}</div>{matches.length > 0 && <div className="mt-4 rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold text-slate-700">Observed parameters in matching historical runs</p><div className="mt-2 grid gap-1 text-[11px] text-slate-600">{values.filter(([key]) => !included.includes(key)).map(([key, label, , unit]) => { const nums = matches.map((match) => match.context.experiment.telemetryData.find((item) => typeof item[key] === "number" && Number.isFinite(item[key]))?.[key]).filter((value): value is number => value !== undefined); return <p key={key}>{label}: {nums.length === 0 ? "Insufficient historical evidence" : `${Math.min(...nums)}–${Math.max(...nums)} ${unit} · ${nums.length} supporting experiments`}</p>; })}</div></div>}</div>;
}

function RecommendationParameterCards({ recommendation, selectedKeys, onSelectedKeysChange, evidenceKey, onEvidenceToggle }: { recommendation: InitialParameterRecommendation; selectedKeys: RecommendedParameterKey[]; onSelectedKeysChange: (keys: RecommendedParameterKey[]) => void; evidenceKey: RecommendedParameterKey | null; onEvidenceToggle: (key: RecommendedParameterKey) => void }) {
  return <>{recommendation.parameters.map((parameter) => <RecommendationParameterCard key={parameter.key} parameter={parameter} selected={selectedKeys.includes(parameter.key)} onSelectedChange={(selected) => onSelectedKeysChange(selected ? [...selectedKeys, parameter.key] : selectedKeys.filter((key) => key !== parameter.key))} evidenceOpen={evidenceKey === parameter.key} onEvidenceToggle={() => onEvidenceToggle(parameter.key)} />)}</>;
}

function RecommendationParameterCard({ parameter, selected, onSelectedChange, evidenceOpen, onEvidenceToggle }: { parameter: ParameterRecommendation; selected: boolean; onSelectedChange: (selected: boolean) => void; evidenceOpen: boolean; onEvidenceToggle: () => void }) {
  const reliable = parameter.value !== undefined;
  const disclosureId = `recommendation-sources-${parameter.key}`;
  return <article className="flex min-w-0 flex-col rounded-2xl border border-violet-200 bg-white p-4"><div className="flex items-start justify-between gap-2"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{parameter.label}</p><EvidenceBadge level={parameter.evidenceLevel} /></div><p className="mt-3 text-lg font-bold text-slate-950">{reliable ? <>{formatRecommendationValue(parameter.key, parameter.value!)} <span className="text-sm font-semibold">{parameter.unit}</span></> : "No reliable historical recommendation"}</p>{reliable && parameter.range && <div className="mt-3 space-y-1 text-xs text-slate-600"><p>Supporting experiments: <b>{parameter.supportingExperimentCount}</b></p><p>Historical usable range: <b>{formatRecommendationValue(parameter.key, parameter.range.minimum)}–{formatRecommendationValue(parameter.key, parameter.range.maximum)} {parameter.unit}</b></p></div>}{reliable && <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={selected} onChange={(event) => onSelectedChange(event.target.checked)} aria-label={`Apply ${parameter.label} recommendation`} className="mt-0.5" />Apply this recommendation</label>}<button type="button" aria-expanded={evidenceOpen} aria-controls={disclosureId} onClick={onEvidenceToggle} className="mt-auto pt-4 text-left text-xs font-bold text-violet-700">Why this recommendation? {evidenceOpen ? "▴" : "▾"}</button></article>;
}

function RecommendationEvidencePanel({ parameter }: { parameter: ParameterRecommendation }) {
  const included = parameter.sources.filter((source) => source.status === "included");
  const excluded = parameter.sources.filter((source) => source.status !== "included");
  return <section id={`recommendation-sources-${parameter.key}`} className="mt-4 rounded-2xl border border-violet-200 bg-white p-4"><h4 className="font-bold text-slate-950">Recommendation evidence: {parameter.label}</h4><div className="mt-3 grid gap-4 lg:grid-cols-2"><RecommendationSourceGroup title="Included supporting experiments" sources={included} parameter={parameter} /><RecommendationSourceGroup title="Excluded historical values" sources={excluded} parameter={parameter} /></div></section>;
}

function RecommendationSourceGroup({ title, sources, parameter }: { title: string; sources: ParameterRecommendation["sources"]; parameter: ParameterRecommendation }) {
  return <section><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{title}</p>{sources.length === 0 ? <p className="mt-1 text-xs text-slate-500">None.</p> : <div className="mt-1 space-y-2">{sources.map((source) => <div key={`${parameter.key}-${source.experimentId}-${source.status}`} className="min-w-0 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600"><div className="flex flex-wrap items-start justify-between gap-2"><p className="min-w-0 flex-1 break-words font-bold text-slate-800">{source.experimentName}</p><span className={`rounded-full px-2 py-0.5 font-bold ${source.status === "included" ? "bg-emerald-100 text-emerald-700" : source.status === "outlier" ? "bg-amber-100 text-amber-800" : source.status === "no-consensus" ? "bg-red-100 text-red-700" : "bg-slate-200 text-slate-700"}`}>{source.status === "included" ? "Included" : source.status === "outlier" ? "Excluded as IQR outlier" : source.status === "no-consensus" ? "Excluded: no parameter consensus" : "Excluded: insufficient solution evidence"}</span></div><p className="mt-1">Raw value: <b>{formatRecommendationValue(parameter.key, source.rawValue)} {source.unit}</b></p><p>Solution Similarity: {formatRecommendationNumber(source.solutionSimilarity, 0)}% · Grade: {source.grade ? `${source.grade}/4` : "No data"}</p><p>Success weight: {formatRecommendationNumber(source.successWeight, 2)} · Contribution weight: {formatRecommendationNumber(source.contributionWeight, 3)}</p>{source.exclusionReason && <p className="mt-1 text-slate-500">{source.exclusionReason}</p>}</div>)}</div>}</section>;
}

const RECOMMENDATION_DISPLAY_DIGITS: Record<RecommendedParameterKey, number> = { flowRateMlH: 2, voltageKv: 1, collectorVoltageKv: 1, temperatureC: 1, humidityPct: 1, distanceMm: 1, drumSpeedRpm: 0 };
function formatRecommendationValue(key: RecommendedParameterKey, value: unknown): string { const numeric = finiteNumberOrUndefined(value); return numeric === undefined ? "No data" : formatRecommendationNumber(numeric, RECOMMENDATION_DISPLAY_DIGITS[key]); }
function formatRecommendationNumber(value: number, maximumFractionDigits: number): string { return new Intl.NumberFormat("en-US", { maximumFractionDigits, useGrouping: false }).format(value); }

function EvidenceBadge({ level }: { level: "high" | "medium" | "low" | "insufficient" }) { const labels = { high: "High", medium: "Medium", low: "Low", insufficient: "No data" }; const styles = { high: "bg-emerald-50 text-emerald-700", medium: "bg-amber-50 text-amber-700", low: "bg-orange-50 text-orange-700", insufficient: "bg-slate-100 text-slate-500" }; return <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${styles[level]}`}>{labels[level]}</span>; }

interface ComparisonRow { label: string; current: string; historical: string; status: React.ReactNode }
function solutionRow(label: string, current: string | undefined, historical: string | undefined): ComparisonRow { const comparison = classifyCategoricalComparison(current, historical); const status = comparison.kind === "no-data" ? <Status tone="gray">No data</Status> : comparison.kind === "same" ? <Status tone="green">Same</Status> : <Status tone="red">Different</Status>; return { label, current: isMissingValue(current) ? "No data" : String(current), historical: isMissingValue(historical) ? "No data" : String(historical), status }; }
function processRow(label: string, current: unknown, historical: unknown, key: string): ComparisonRow { const tolerance = processParameterTolerances[key]; const comparison = classifyNumericComparison(current, historical, tolerance); const status = comparison.kind === "no-data" ? <Status tone="gray">No data</Status> : comparison.kind === "same" ? <Status tone="green">Same</Status> : comparison.kind === "close" ? <Status tone="amber">Close ({formatSigned(comparison.delta)} {tolerance.unit})</Status> : <Status tone="red">Different ({formatSigned(comparison.delta)} {tolerance.unit})</Status>; return { label, current: formatValue(current, tolerance.unit), historical: formatValue(historical, tolerance.unit), status }; }
function percent(value: number | undefined): string | undefined { return value === undefined || !Number.isFinite(value) ? undefined : `${value}%`; }
function formatValue(value: unknown, unit: string): string { const numeric = finiteNumberOrUndefined(value); return numeric === undefined ? "No data" : `${numeric} ${unit}`; }
function formatSigned(value: number | undefined): string { return value === undefined ? "" : `${value >= 0 ? "+" : ""}${Number(value.toFixed(2))}`; }
function Status({ tone, children }: { tone: "green" | "amber" | "red" | "gray" | "blue" | "violet"; children: React.ReactNode }) { const classes = { green: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700", red: "bg-red-50 text-red-700", gray: "bg-slate-100 text-slate-500", blue: "bg-blue-50 text-blue-700", violet: "bg-violet-50 text-violet-700" }; return <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-bold ${classes[tone]}`}>{children}</span>; }
function ContextStrip({ project, formulation, setup, characterization }: { project: Project; formulation: Formulation; setup: ExperimentalSetup; characterization?: SolutionCharacterization }) { const solventParts=[formulation.solvent1Name && `${formulation.solvent1Name} ${formulation.solvent1RatioPct ?? ""}%`, formulation.solvent2Name && `${formulation.solvent2Name} ${formulation.solvent2RatioPct ?? ""}%`].filter(Boolean).join(" + "); return <div className="mt-6 grid gap-3 md:grid-cols-4"><Pill label="Project" value={project.name}/><Pill label="Formulation" value={formulation.name || formulation.polymerName} detail={`${formulation.polymerName} · ${solventParts || formulation.solvent} · ${formulation.solidsContentPct}% solids`}/><Pill label="Machine" value={setup.machine.model} detail={setup.machine.manufacturer}/><Pill label="Setup escalation" value={`${setup.injector.needleCount ?? setup.injector.emitterCount ?? "?"} needles`} detail={`${setup.injector.model || setup.injector.type} → ${setup.collector.model || setup.collector.type}`}/>{characterization && <Pill label="Characterization" value={characterization.measuredAt ? new Date(characterization.measuredAt).toLocaleDateString() : "Selected"}/>}</div>; }
function Pill({label,value,detail}:{label:string;value:string;detail?:string}){return <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><p className="text-[9px] font-bold uppercase text-slate-500">{label}</p><p className="text-sm font-semibold text-slate-900">{value}</p>{detail && <p className="mt-1 text-[11px] text-slate-600">{detail}</p>}</div>}
function Metric({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase text-slate-400">{label}</p><p className="mt-2 font-semibold text-slate-800">{value}</p></div>}
function gradeLabel(grade:1|2|3|4,lang:Language):string{const labels={it:["Non processabile","Instabile","Accettabile","Stabile"],en:["Not processable","Unstable","Acceptable","Stable"],es:["No procesable","Inestable","Aceptable","Estable"]} as const;return labels[lang][grade-1]}
function validGrade(value:number):boolean{return Number.isFinite(value)&&value>=1&&value<=4}
function recommendationStatusLabel(status:"available"|"low_confidence"|"insufficient_data"):string{return status==="available"?"Recommendation available":status==="low_confidence"?"Low confidence":"Insufficient data"}

interface CurrentParameters {
  flowRateMlH: number;
  voltageKv: number;
  temperatureC: number;
  humidityPct: number;
  distanceMm: number;
}

function validateParameters(parameters: CurrentParameters): string[] {
  const checks: Array<[string, number, { minimum: number; maximum: number }, string]> = [
    ["Flow", parameters.flowRateMlH, RECOMMENDATION_CONFIG.limits.flowRateMlH, "mL/h"],
    ["HV+", parameters.voltageKv, RECOMMENDATION_CONFIG.limits.voltageKv, "kV"],
    ["Temperature", parameters.temperatureC, RECOMMENDATION_CONFIG.limits.temperatureC, "°C"],
    ["RH", parameters.humidityPct, RECOMMENDATION_CONFIG.limits.humidityPct, "%"],
    ["Distance", parameters.distanceMm, RECOMMENDATION_CONFIG.limits.distanceMm, "mm"],
  ];
  return checks.flatMap(([label, value, range, unit]) => {
    if (!Number.isFinite(value)) return [`${label}: value is not numeric.`];
    if (value < range.minimum || value > range.maximum) return [`${label}: ${value} ${unit} is outside ${range.minimum}–${range.maximum} ${unit}.`];
    return [];
  });
}
