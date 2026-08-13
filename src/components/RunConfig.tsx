import React, { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Play,
  Search,
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
import { analyzeSimilarExperiments } from "../features/experimental-assistant/historicalAnalysis";
import { buildSmartStartingPoint } from "../features/experimental-assistant/smartStartingPoint";
import { RECOMMENDATION_CONFIG } from "../features/experimental-assistant/recommendation.config";

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
  onAddExperiment,
  lang,
}: Props) {
  const [stage, setStage] = useState<Stage>("parameters");
  const [flowRateMlH, setFlowRateMlH] = useState(1);
  const [voltageKv, setVoltageKv] = useState(15);
  const [collectorVoltageKv, setCollectorVoltageKv] = useState(0);
  const [temperatureC, setTemperatureC] = useState(25);
  const [humidityPct, setHumidityPct] = useState(40);
  const [distanceMm, setDistanceMm] = useState(150);
  const [drumSpeedRpm, setDrumSpeedRpm] = useState(0);
  const [runName, setRunName] = useState("");
  const [processability, setProcessability] = useState<ProcessabilityGrade>(3);
  const [comments, setComments] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [unsafeOverride, setUnsafeOverride] = useState(false);
  const [invalidParameterMessage, setInvalidParameterMessage] = useState<string[]>([]);
  const [focusMode, setFocusMode] = useState(false);

  const contexts = useMemo(
    () => buildHistoricalContexts(projects, formulations, characterizations, setups, experiments),
    [projects, formulations, characterizations, setups, experiments]
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
      solidsContentPct: formulation.solidsContentPct,
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
    const invalid = validateParameters({ flowRateMlH, voltageKv, hvNegativeKv: collectorVoltageKv, temperatureC, humidityPct, distanceMm });
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
    setSaving(true);
    setError("");
    try {
      await onAddExperiment({
        formulationId: formulation.id,
        operationIdentifier: runName.trim(),
        machineModel: setup.machine.model,
        injectorType: setup.injector.type,
        collectorType: setup.collector.type,
        voltageKv,
        collectorVoltageKv,
        flowRateMlH,
        distanceMm,
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
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-blue-600" />
              <div>
                <h2 className="text-lg font-bold text-slate-950">Current Operating Parameters</h2>
                <p className="text-xs text-slate-500">Enter the values you want to evaluate against historical runs.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <NumericField label="Q1" unit="mL/h" value={flowRateMlH} onChange={(v) => setFlowRateMlH(v ?? 0)} min={0} decimals={3} />
              <NumericField label="HV+" unit="kV" value={voltageKv} onChange={(v) => setVoltageKv(v ?? 0)} decimals={2} />
              <NumericField label="HV-" unit="kV" value={collectorVoltageKv} onChange={(v) => setCollectorVoltageKv(v ?? 0)} decimals={2} />
              <NumericField label="Temperature" unit="°C" value={temperatureC} onChange={(v) => setTemperatureC(v ?? 0)} decimals={1} />
              <NumericField label="RH" unit="%" value={humidityPct} onChange={(v) => setHumidityPct(v ?? 0)} min={0} max={100} decimals={1} />
              <NumericField label="dZ" unit="mm" value={distanceMm} onChange={(v) => setDistanceMm(v ?? 0)} min={0} decimals={1} />
              <NumericField label="Drum speed" unit="rpm" value={drumSpeedRpm} onChange={(v) => setDrumSpeedRpm(v ?? 0)} min={0} decimals={0} />
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

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Metric label="Similar Runs" value={String(assessment.total)} />
              <Metric label="Recommendation status" value={recommendationStatusLabel(assessment.status)} />
              <Metric label="Deterministic confidence" value={`${Math.round(assessment.confidence * 100)}%`} />
            </div>

            {matches.length > 0 && (
              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Closest Historical Runs</p>
                <div className="mt-3 space-y-2">
                  {matches.slice(0, 5).map((match) => (
                    <div key={match.context.experiment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-4 py-3 text-sm">
                      <span className="font-semibold text-slate-800">{match.context.experiment.operationIdentifier || "Historical Run"}</span>
                      <div className="flex gap-3 text-xs text-slate-500">
                        <span>Similarity <b className="text-slate-800">{match.score.toFixed(0)}%</b></span>
                        {validGrade(match.context.experiment.jetStabilityGrade) && <span>Grade <b className="text-slate-800">{match.context.experiment.jetStabilityGrade}/4</b></span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {assessment.status === "insufficient_data" ? (
              <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900"><p>Insufficient reliable data: {assessment.grade4} valid Grade 4 source runs found; at least {assessment.minimumRequiredExperiments} are required. No robust numeric recommendation is produced.</p>{assessment.adjustments.length > 0 && <div className="mt-4"><p className="font-bold">Directional adjustments to investigate</p><ul className="mt-2 list-disc space-y-1 pl-5">{assessment.adjustments.map((adjustment) => <li key={adjustment}>{adjustment}</li>)}</ul><p className="mt-3 text-xs font-semibold">These are evidence-based directions from the closest operation, not guaranteed setpoints.</p></div>}</div>
            ) : (
              <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <Window label="Flow rate" summary={assessment.processWindow.flowRateMlH} unit="mL/h" sensible={(v) => v >= 0 && v <= 100} />
                <Window label="HV+" summary={assessment.processWindow.voltageKv} unit="kV" sensible={(v) => Math.abs(v) <= 100} />
                <Window label="HV-" summary={assessment.processWindow.hvNegativeKv} unit="kV" sensible={(v) => Math.abs(v) <= 100} />
                <Window label="Temperature" summary={assessment.processWindow.temperatureC} unit="°C" sensible={(v) => v >= -20 && v <= 100} />
                <Window label="Humidity" summary={assessment.processWindow.humidityPct} unit="%" sensible={(v) => v >= 0 && v <= 100} />
                <Window label="Distance" summary={assessment.processWindow.distanceMm} unit="mm" sensible={(v) => v >= 1 && v <= 1000} />
              </div>
            )}

            {assessment.interpretation && <p className="mt-5 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800">{assessment.interpretation}</p>}

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
function ContextStrip({ project, formulation, setup, characterization }: { project: Project; formulation: Formulation; setup: ExperimentalSetup; characterization?: SolutionCharacterization }) { const solventParts=[formulation.solvent1Name && `${formulation.solvent1Name} ${formulation.solvent1RatioPct ?? ""}%`, formulation.solvent2Name && `${formulation.solvent2Name} ${formulation.solvent2RatioPct ?? ""}%`].filter(Boolean).join(" + "); return <div className="mt-6 grid gap-3 md:grid-cols-4"><Pill label="Project" value={project.name}/><Pill label="Formulation" value={formulation.name || formulation.polymerName} detail={`${formulation.polymerName} · ${solventParts || formulation.solvent} · ${formulation.solidsContentPct}% solids`}/><Pill label="Machine" value={setup.machine.model} detail={setup.machine.manufacturer}/><Pill label="Setup escalation" value={`${setup.injector.needleCount ?? setup.injector.emitterCount ?? "?"} needles`} detail={`${setup.injector.model || setup.injector.type} → ${setup.collector.model || setup.collector.type}`}/>{characterization && <Pill label="Characterization" value={characterization.measuredAt ? new Date(characterization.measuredAt).toLocaleDateString() : "Selected"}/>}</div>; }
function Pill({label,value,detail}:{label:string;value:string;detail?:string}){return <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><p className="text-[9px] font-bold uppercase text-slate-500">{label}</p><p className="text-sm font-semibold text-slate-900">{value}</p>{detail && <p className="mt-1 text-[11px] text-slate-600">{detail}</p>}</div>}
function Metric({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase text-slate-400">{label}</p><p className="mt-2 font-semibold text-slate-800">{value}</p></div>}
function Window({label,summary,unit,sensible}:{label:string;summary:{minimum:number;maximum:number;average:number}|undefined;unit:string;sensible:(value:number)=>boolean}){if(!summary||![summary.minimum,summary.maximum,summary.average].every(sensible))return null;return <div className="rounded-xl border border-slate-200 p-4"><p className="text-[10px] font-bold uppercase text-slate-400">{label}</p><p className="mt-2 font-mono font-bold text-slate-800">{summary.minimum.toFixed(2)}–{summary.maximum.toFixed(2)} {unit}</p><p className="mt-1 text-xs text-slate-400">avg {summary.average.toFixed(2)}</p></div>}
function gradeLabel(grade:1|2|3|4,lang:Language):string{const labels={it:["Non processabile","Instabile","Accettabile","Stabile"],en:["Not processable","Unstable","Acceptable","Stable"],es:["No procesable","Inestable","Aceptable","Estable"]} as const;return labels[lang][grade-1]}
function validGrade(value:number):boolean{return Number.isFinite(value)&&value>=1&&value<=4}
function recommendationStatusLabel(status:"available"|"low_confidence"|"insufficient_data"):string{return status==="available"?"Recommendation available":status==="low_confidence"?"Low confidence":"Insufficient data"}

interface CurrentParameters {
  flowRateMlH: number;
  voltageKv: number;
  hvNegativeKv: number;
  temperatureC: number;
  humidityPct: number;
  distanceMm: number;
}

function validateParameters(parameters: CurrentParameters): string[] {
  const checks: Array<[string, number, { minimum: number; maximum: number }, string]> = [
    ["Flow", parameters.flowRateMlH, RECOMMENDATION_CONFIG.limits.flowRateMlH, "mL/h"],
    ["HV+", parameters.voltageKv, RECOMMENDATION_CONFIG.limits.voltageKv, "kV"],
    ["HV−", parameters.hvNegativeKv, RECOMMENDATION_CONFIG.limits.hvNegativeKv, "kV"],
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
