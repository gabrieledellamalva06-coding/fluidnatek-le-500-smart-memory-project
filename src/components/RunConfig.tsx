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

  const analyze = () => {
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
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Experimental Run</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Enter the conditions you plan to use, analyze similar historical experiments, then record the observed processability and save the run.
        </p>

        <ContextStrip project={project} formulation={formulation} setup={setup} characterization={characterization} />
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

            <div className="mt-6 flex justify-end">
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
              <Metric label="Expected Processability" value={assessment.expectedGrade === undefined ? "No graded data" : `${assessment.expectedGrade.toFixed(2)} / 4`} />
              <Metric label="Grade 4 Historical Success" value={assessment.grade4RatePct === undefined ? "No graded data" : `${assessment.grade4RatePct}%`} />
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

            {assessment.total === 0 ? (
              <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">No sufficiently similar historical runs were found. You can still continue with the current settings.</p>
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
                <button key={grade} type="button" onClick={() => setProcessability(grade)} className={`rounded-2xl border p-4 text-left ${processability === grade ? "border-blue-500 bg-blue-50 ring-4 ring-blue-100" : "border-slate-200 bg-white"}`}>
                  <span className="text-2xl font-bold">{grade}</span>
                  <p className="text-xs text-slate-500">{gradeLabel(grade, lang)}</p>
                </button>
              ))}
            </div>

            <label className="mt-5 block"><span className="label">Process Comments</span><textarea rows={4} value={comments} onChange={(e) => setComments(e.target.value)} className="input resize-none" /></label>
            <div className="mt-6 flex justify-between"><button type="button" onClick={() => setStage("analysis")} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold">Back to Analysis</button><button type="button" onClick={() => setStage("review")} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">Review & Save</button></div>
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

function Progress({ stage }: { stage: Stage }) { const items: Stage[]=["parameters","analysis","processability","review"]; const current=items.indexOf(stage); return <div className="mt-6 grid grid-cols-4 gap-2">{items.map((item,index)=><div key={item} className={`h-2 rounded-full ${index<=current?"bg-blue-600":"bg-slate-200"}`} />)}</div>; }
function ContextStrip({ project, formulation, setup, characterization }: { project: Project; formulation: Formulation; setup: ExperimentalSetup; characterization?: SolutionCharacterization }) { return <div className="mt-6 flex flex-wrap gap-2"><Pill label="Project" value={project.name}/><Pill label="Formulation" value={formulation.name || formulation.polymerName}/><Pill label="Setup" value={setup.name || setup.machine.model}/>{characterization && <Pill label="Characterization" value={characterization.measuredAt ? new Date(characterization.measuredAt).toLocaleDateString() : "Selected"}/>}</div>; }
function Pill({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-white px-4 py-3 shadow-sm"><p className="text-[9px] font-bold uppercase text-slate-400">{label}</p><p className="text-sm font-semibold text-slate-800">{value}</p></div>}
function Metric({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase text-slate-400">{label}</p><p className="mt-2 font-semibold text-slate-800">{value}</p></div>}
function Window({label,summary,unit,sensible}:{label:string;summary:{minimum:number;maximum:number;average:number}|undefined;unit:string;sensible:(value:number)=>boolean}){if(!summary||![summary.minimum,summary.maximum,summary.average].every(sensible))return null;return <div className="rounded-xl border border-slate-200 p-4"><p className="text-[10px] font-bold uppercase text-slate-400">{label}</p><p className="mt-2 font-mono font-bold text-slate-800">{summary.minimum.toFixed(2)}–{summary.maximum.toFixed(2)} {unit}</p><p className="mt-1 text-xs text-slate-400">avg {summary.average.toFixed(2)}</p></div>}
function gradeLabel(grade:1|2|3|4,lang:Language):string{const labels={it:["Non processabile","Instabile","Accettabile","Stabile"],en:["Not processable","Unstable","Acceptable","Stable"],es:["No procesable","Inestable","Aceptable","Estable"]} as const;return labels[lang][grade-1]}
function validGrade(value:number):boolean{return Number.isFinite(value)&&value>=1&&value<=4}
