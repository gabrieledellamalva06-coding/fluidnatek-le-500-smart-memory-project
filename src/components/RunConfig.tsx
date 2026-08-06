import React, { useMemo, useState } from "react";
import { Activity, AlertCircle, BarChart3, CheckCircle2, FlaskConical, FolderKanban, Play, SlidersHorizontal, TestTube2 } from "lucide-react";

import type { Experiment, Formulation, Project } from "../types";
import type { SolutionCharacterization } from "../core/types/characterization";
import type { ExperimentalSetup } from "../core/types/setup";
import type { ProcessabilityGrade } from "../core/types/processRecord";
import type { CreateExperimentInput } from "../application/experiments/experiment.mapper";
import type { Language } from "../lib/translations";

import NumericField from "./ui/NumericField";

interface RunConfigProps {
  projects: Project[];
  formulations: Formulation[];
  characterizations: SolutionCharacterization[];
  setups: ExperimentalSetup[];
  experiments: Experiment[];
  onAddExperiment: (input: CreateExperimentInput) => Promise<void>;
  lang: Language;
}

interface Range { min: number; max: number; }
const GRADES = [1, 2, 3, 4] as const;

export default function RunConfig({
  projects, formulations, characterizations, setups, experiments, onAddExperiment, lang,
}: RunConfigProps) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [formulationId, setFormulationId] = useState("");
  const [characterizationId, setCharacterizationId] = useState("");
  const [setupId, setSetupId] = useState("");
  const [runName, setRunName] = useState("");
  const [voltageKv, setVoltageKv] = useState(15);
  const [flowRateMlH, setFlowRateMlH] = useState(1);
  const [distanceMm, setDistanceMm] = useState(150);
  const [temperatureC, setTemperatureC] = useState<number | undefined>();
  const [humidityPct, setHumidityPct] = useState<number | undefined>();
  const [processability, setProcessability] = useState<ProcessabilityGrade>(3);
  const [comments, setComments] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const availableFormulations = useMemo(
    () => formulations.filter((item) => item.projectId === projectId),
    [formulations, projectId]
  );
  const availableCharacterizations = useMemo(
    () => characterizations.filter((item) => item.formulationId === formulationId),
    [characterizations, formulationId]
  );
  const availableSetups = useMemo(
    () => setups.filter((item) => !item.projectId || item.projectId === projectId),
    [setups, projectId]
  );
  const selectedFormulation = formulations.find((item) => item.id === formulationId) ?? null;
  const selectedSetup = setups.find((item) => item.id === setupId) ?? null;
  const similarRuns = useMemo(
    () => experiments.filter((item) => item.formulationId === formulationId),
    [experiments, formulationId]
  );
  const evidence = useMemo(() => ({
    voltage: range(similarRuns.flatMap((run) => run.telemetryData.map((row) => row.voltageKv))),
    flow: range(similarRuns.flatMap((run) => run.telemetryData.map((row) => row.flowRateMlH))),
    distance: range(similarRuns.flatMap((run) => run.telemetryData.map((row) => row.distanceMm))),
  }), [similarRuns]);

  const saveRun = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!projectId || !formulationId || !setupId || !runName.trim() || !selectedSetup) {
      setError("Complete project, formulation, setup and run code.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await onAddExperiment({
        formulationId,
        operationIdentifier: runName.trim(),
        machineModel: selectedSetup.machine.model,
        injectorType: selectedSetup.injector.type,
        collectorType: selectedSetup.collector.type,
        voltageKv,
        flowRateMlH,
        distanceMm,
        jetStabilityGrade: processability,
        operatorComments: comments.trim(),
        sourceFile: "Manual Input",
        temperatureC,
        humidityPct,
      });
      setRunName("");
      setComments("");
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Unable to save the run.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-slate-100 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Workflow steps 5–10</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Live Telemetry & Smart Memory</h1>
        <p className="mt-2 text-sm text-slate-500">No Co-Pilot. Historical evidence only; current parameters are entered manually.</p>

        <form onSubmit={saveRun} className="mt-6 space-y-5">
          <Step number={1} icon={FolderKanban} title="Select project">
            <select value={projectId} onChange={(e) => { setProjectId(e.target.value); setFormulationId(""); setCharacterizationId(""); setSetupId(""); }} className="input">
              <option value="">Select project</option>
              {projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Step>

          <Step number={2} icon={FlaskConical} title="Select formulation">
            <select value={formulationId} disabled={!projectId} onChange={(e) => { setFormulationId(e.target.value); setCharacterizationId(""); const f=formulations.find((x)=>x.id===e.target.value); setRunName(f ? `${f.polymerName.split(" ")[0].toUpperCase()}-${Date.now().toString().slice(-5)}` : ""); }} className="input">
              <option value="">Select formulation</option>
              {availableFormulations.map((item) => <option key={item.id} value={item.id}>{item.polymerName} / {item.solvent} · {item.solidsContentPct} wt %</option>)}
            </select>
            {selectedFormulation && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Composition: <strong>{selectedFormulation.polymerName}</strong> / {selectedFormulation.solvent} · {selectedFormulation.solidsContentPct} wt %</p>}
          </Step>

          <Step number={3} icon={TestTube2} title="Review characterization">
            <select value={characterizationId} disabled={!formulationId} onChange={(e) => setCharacterizationId(e.target.value)} className="input">
              <option value="">No characterization selected</option>
              {availableCharacterizations.map((item) => <option key={item.id} value={item.id}>{item.measuredAt ? new Date(item.measuredAt).toLocaleDateString() : "Unknown date"} · viscosity {item.viscosityMpas ?? "N/D"} · conductivity {item.conductivityUsCm ?? "N/D"}</option>)}
            </select>
          </Step>

          <Step number={4} icon={SlidersHorizontal} title="Select setup">
            <select value={setupId} disabled={!projectId} onChange={(e) => setSetupId(e.target.value)} className="input">
              <option value="">Select setup</option>
              {availableSetups.map((item) => <option key={item.id} value={item.id}>{item.name ?? item.machine.model} · {item.injector.type} · {item.collector.type}</option>)}
            </select>
          </Step>

          <Step number={5} icon={BarChart3} title="Historical evidence">
            {similarRuns.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Insufficient historical evidence. Enter current parameters manually.</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-4">
                <Metric label="Similar runs" value={String(similarRuns.length)} />
                <Metric label="Voltage range" value={formatRange(evidence.voltage, "kV")} />
                <Metric label="Flow range" value={formatRange(evidence.flow, "mL/h")} />
                <Metric label="Distance range" value={formatRange(evidence.distance, "mm")} />
              </div>
            )}
          </Step>

          <Step
  number={6}
  icon={Activity}
  title="Enter current operating parameters"
>
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    <NumericField
      label="Voltage"
      unit="kV"
      value={voltageKv}
      onChange={(value) => {
        if (value !== undefined) {
          setVoltageKv(value);
        }
      }}
      min={0}
      max={100}
      decimals={2}
      placeholder="15.00"
    />

    <NumericField
      label="Flow rate"
      unit="mL/h"
      value={flowRateMlH}
      onChange={(value) => {
        if (value !== undefined) {
          setFlowRateMlH(value);
        }
      }}
      min={0}
      max={100}
      decimals={3}
      placeholder="0.850"
    />

    <NumericField
      label="Distance"
      unit="mm"
      value={distanceMm}
      onChange={(value) => {
        if (value !== undefined) {
          setDistanceMm(value);
        }
      }}
      min={1}
      max={1000}
      decimals={1}
      placeholder="150.0"
    />

    <NumericField
      label="Temperature"
      unit="°C"
      value={temperatureC}
      onChange={(value) =>
  setTemperatureC(value ?? 0)
}
      min={-20}
      max={100}
      decimals={1}
      placeholder="23.0"
    />

    <NumericField
      label="Humidity"
      unit="%"
      value={humidityPct}
      onChange={(value) =>
  setHumidityPct(value ?? 0)
}
      min={0}
      max={100}
      decimals={1}
      placeholder="40.0"
    />

    <label className="block">
      <span className="label">
        Run code
      </span>

      <input
        value={runName}
        onChange={(event) =>
          setRunName(event.target.value)
        }
        className="input"
      />
    </label>
  </div>
</Step>

          <Step number={7} icon={CheckCircle2} title="Evaluate processability (1–4)">
            <div className="grid gap-3 sm:grid-cols-4">
              {GRADES.map((grade) => (
                <button key={grade} type="button" onClick={() => setProcessability(grade)} className={`rounded-2xl border p-4 text-left ${processability===grade ? "border-blue-500 bg-blue-50 ring-4 ring-blue-100" : "border-slate-200 bg-white"}`}>
                  <span className="text-2xl font-bold">{grade}</span>
                  <p className="text-xs text-slate-500">{gradeLabel(grade, lang)}</p>
                </button>
              ))}
            </div>
            <textarea rows={3} value={comments} onChange={(e)=>setComments(e.target.value)} placeholder="Process comments" className="input mt-4 resize-none" />
          </Step>

          {error && <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="h-4 w-4" />{error}</div>}

          <button type="submit" disabled={isSaving} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 font-bold text-white hover:bg-blue-700 disabled:opacity-50">
            <Play className="h-4 w-4" />{isSaving ? "Saving..." : "Save run and update memory"}
          </button>
        </form>
      </div>
      <style>{`.input{width:100%;border:1px solid #e2e8f0;border-radius:1rem;background:#f8fafc;padding:.75rem 1rem;font-size:.875rem;outline:none}.input:focus{border-color:#60a5fa;box-shadow:0 0 0 4px #dbeafe}.label{display:block;margin-bottom:.5rem;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#64748b}`}</style>
    </main>
  );
}

function Step({ number, icon: Icon, title, children }: { number:number; icon:typeof Activity; title:string; children:React.ReactNode }) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><header className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 font-bold text-white">{number}</span><Icon className="h-5 w-5 text-blue-600"/><h2 className="font-bold text-slate-950">{title}</h2></header>{children}</section>;
}
function Metric({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase text-slate-400">{label}</p><p className="mt-2 font-mono font-bold">{value}</p></div>}
function range(values:number[]):Range|null{const valid=values.filter(Number.isFinite);return valid.length?{min:Math.min(...valid),max:Math.max(...valid)}:null}
function formatRange(value:Range|null,unit:string):string{return value?`${value.min.toFixed(2)}–${value.max.toFixed(2)} ${unit}`:"N/D"}
function gradeLabel(grade:1|2|3|4,lang:Language):string{const labels={it:["Non processabile","Instabile","Accettabile","Stabile"],en:["Not processable","Unstable","Acceptable","Stable"],es:["No procesable","Inestable","Aceptable","Estable"]} as const;return labels[lang][grade-1]}
