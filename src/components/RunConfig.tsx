import React, { useState } from "react";
import {
  Activity,
  Sliders,
  Sparkles,
  Loader,
  Check,
  AlertTriangle,
  HelpCircle,
  Thermometer,
  CloudLightning,
  Play
} from "lucide-react";
import type {
  Project,
  Formulation,
  Experiment,
  AISuggestion,
} from "../types";

import type {
  CreateExperimentInput,
} from "../application/experiments/experiment.mapper";

import type {
  ProcessabilityGrade,
} from "../core/types/processRecord";
import { TRANSLATIONS, type Language } from "../lib/translations";

type InjectorType =
  | "Single Emitter"
  | "Coaxial"
  | "Multi-emitter (x4)"
  | "Multi-needle (x8)";

type CollectorType =
  | "Flat Plate"
  | "Rotating Drum"
  | "Mandrel"
  | "Y-axis Stage";

interface RunConfigProps {
  projects: Project[];

  formulations: Formulation[];

  experiments: Experiment[];

  onAddExperiment: (
    input: CreateExperimentInput
  ) => Promise<void>;

  lang: Language;
}

export default function RunConfig({
  projects,
  formulations,
  experiments,
  onAddExperiment,
  lang
}: RunConfigProps) {
  const t = TRANSLATIONS[lang];

  // Config state
  const [selectedFormulationId, setSelectedFormulationId] = useState("");
  const [runName, setRunName] = useState("");
  const [injectorType, setInjectorType] =
  useState<InjectorType>(
    "Single Emitter"
  );
  const [collectorType, setCollectorType] =
  useState<CollectorType>(
    "Flat Plate"
  );
  const [distanceMm, setDistanceMm] = useState<number>(150);
  const [voltageKv, setVoltageKv] = useState<number>(15.0);
  const [flowRateMlH, setFlowRateMlH] = useState<number>(1.0);
  const [jetStability, setJetStability] =
    useState<ProcessabilityGrade>(4);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [operatorComments, setOperatorComments] = useState("");

  // AI Suggestion State
  const [aiPolymer, setAiPolymer] = useState("");
  const [aiSolvent, setAiSolvent] = useState("");
  const [aiViscosity, setAiViscosity] = useState<number>(350);
  const [aiConductivity, setAiConductivity] = useState<number>(5.5);
  const [aiSolids, setAiSolids] = useState<number>(12.0);
  
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [aiError, setAiError] = useState("");

  const handleApplyFormulationParams = (fId: string) => {
    setSelectedFormulationId(fId);
    const form = formulations.find(f => f.id === fId);
    if (form) {
      setAiPolymer(form.polymerName);
      setAiSolvent(form.solvent);
      setAiViscosity(form.viscosityMpas);
      setAiConductivity(form.conductivityUsCm);
      setAiSolids(form.solidsContentPct);
      setRunName(`RUN-${form.polymerName.split(" ")[0].toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`);
    }
  };

  const triggerAISuggestion = async () => {
    if (!aiPolymer) {
      setAiError(t.selectFormulationWarning);
      return;
    }

    setIsAiLoading(true);
    setAiError("");
    setAiSuggestion(null);

    // Get a subset of historical runs of same polymer for context
    const historicalRuns = experiments
      .filter(exp => {
        const form = formulations.find(f => f.id === exp.formulationId);
        return form && form.polymerName.toLowerCase().includes(aiPolymer.toLowerCase());
      })
      .slice(0, 3)
      .map(exp => ({
        operationIdentifier: exp.operationIdentifier,
        injector: exp.injectorType,
        collector: exp.collectorType,
        distanceMm: exp.distanceMm,
        stabilityGrade: exp.jetStabilityGrade,
        comments: exp.operatorComments
      }));

    try {
      const response = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          polymerName: aiPolymer,
          solvent: aiSolvent,
          solidsContentPct: aiSolids,
          viscosityMpas: aiViscosity,
          conductivityUsCm: aiConductivity,
          historicalRuns
        })
      });

      if (!response.ok) {
        throw new Error(lang === "it" ? "Errore di risposta del server backend" : "Backend server error response");
      }

      const data = await response.json();
      setAiSuggestion(data);
    } catch (error: unknown) {
      setAiError(
        error instanceof Error
          ? error.message
          : "Error contacting AI service."
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  const applyAISuggestedParams = () => {
    if (aiSuggestion) {
      setVoltageKv(aiSuggestion.voltageKv);
      setFlowRateMlH(aiSuggestion.flowRateMlH);
      setDistanceMm(aiSuggestion.distanceMm);
    }
  };

  const handleSaveConfig = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();

    if (
      !selectedFormulationId ||
      !runName.trim() ||
      isSaving
    ) {
      return;
    }

    setIsSaving(true);
    setSaveError("");

    try {
      await onAddExperiment({
        formulationId: selectedFormulationId,
        operationIdentifier: runName.trim(),
        machineModel: "Fluidnatek LE-500",
        injectorType,
        collectorType,
        voltageKv,
        flowRateMlH,
        distanceMm,
        jetStabilityGrade: jetStability,
        operatorComments:
          operatorComments.trim() ||
          (lang === "it"
            ? "Prova registrata con successo"
            : lang === "es"
              ? "Prueba registrada correctamente"
              : "Run recorded successfully"),
        sourceFile: "Manual Input",
      });

      setRunName("");
      setOperatorComments("");
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Impossibile registrare l'esperimento."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div id="runconfig-view" className="flex-1 overflow-y-auto bg-[#0a0a0b] p-8 text-[#f4f4f5] flex flex-col space-y-8 select-none">
      
      {/* Title Header */}
      <div className="flex items-center gap-3">
        <Activity className="w-8 h-8 text-teal-400" />
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">{t.runConfigTitle}</h2>
          <p className="text-xs text-zinc-400">{t.runConfigSubtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Hardware Config & Log */}
        <div className="lg:col-span-7 bg-[#18181b] border border-[#27272a] rounded-2xl p-6 shadow-xl flex flex-col space-y-6">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-teal-400" />
            <h3 className="text-md font-bold text-white">{t.hwConfigSectionTitle}</h3>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-6">
            
            {/* Step 1: Associazone Formula */}
            <div className="space-y-3 p-4 bg-[#0a0a0b]/70 border border-[#27272a]/80 rounded-xl">
              <label className="block text-xs font-bold text-teal-400 uppercase tracking-widest">
                {t.step1RecipeSelection}
              </label>
              <select
                id="run-formulation-select"
                value={selectedFormulationId}
                onChange={(e) => handleApplyFormulationParams(e.target.value)}
                className="w-full bg-[#18181b] text-[#f4f4f5] text-sm px-3 py-2.5 rounded-lg border border-[#27272a] focus:outline-none focus:border-teal-400 cursor-pointer"
              >
                <option value="" className="text-zinc-500">{t.selectRecipePlaceholder}</option>
                {formulations.map((f) => (
                  <option key={f.id} value={f.id} className="bg-[#18181b]">
                    {f.polymerName} | {f.solvent} ({f.solidsContentPct}% {lang === "it" ? "solidi" : lang === "es" ? "sólidos" : "solids"})
                  </option>
                ))}
              </select>
            </div>

            {selectedFormulationId ? (
              <div className="space-y-5 animate-fadeIn">
                
                {/* Step 2: Parametri Fisici */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                      {t.runIdentifier}
                    </label>
                    <input
                      id="run-name-input"
                      type="text"
                      placeholder={t.runIdPlaceholder}
                      value={runName}
                      onChange={(e) => setRunName(e.target.value)}
                      className="w-full bg-[#0a0a0b] text-[#f4f4f5] font-mono text-sm px-3 py-2 rounded-xl border border-[#27272a] focus:outline-none focus:border-teal-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                      {t.injectorLabel}
                    </label>
                    <select
                      id="injector-select"
                      value={injectorType}
                      onChange={(event) => {
                        const value = event.target.value;

                        if (
                          value === "Single Emitter" ||
                          value === "Coaxial" ||
                          value === "Multi-emitter (x4)" ||
                          value === "Multi-needle (x8)"
                        ) {
                          setInjectorType(value);
                        }
                      }}
                      className="w-full bg-[#0a0a0b] text-[#f4f4f5] text-sm px-3 py-2 rounded-xl border border-[#27272a] focus:outline-none focus:border-teal-400"
                    >
                      <option value="Single Emitter" className="bg-[#18181b]">Single Emitter ({lang === "it" ? "Singolo ago" : lang === "es" ? "Aguja única" : "Single needle"})</option>
                      <option value="Coaxial" className="bg-[#18181b]">Coaxial ({lang === "it" ? "Coassiale nucleo-guscio" : lang === "es" ? "Coaxial núcleo-funda" : "Coaxial core-shell"})</option>
                      <option value="Multi-emitter (x4)" className="bg-[#18181b]">Multi-emitter ({lang === "it" ? "x4 Ugelli" : lang === "es" ? "x4 boquillas" : "x4 emitters"})</option>
                      <option value="Multi-needle (x8)" className="bg-[#18181b]">Multi-needle ({lang === "it" ? "x8 Aghi paralleli" : lang === "es" ? "x8 agujas paralelas" : "x8 parallel needles"})</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                      {t.collectorLabel}
                    </label>
                    <select
                      id="collector-select"
                      value={collectorType}
                      onChange={(event) => {
                        const value = event.target.value;

                        if (
                          value === "Flat Plate" ||
                          value === "Rotating Drum" ||
                          value === "Mandrel" ||
                          value === "Y-axis Stage"
                        ) {
                          setCollectorType(value);
                        }
                      }}
                      className="w-full bg-[#0a0a0b] text-[#f4f4f5] text-sm px-3 py-2 rounded-xl border border-[#27272a] focus:outline-none focus:border-teal-400"
                    >
                      <option value="Flat Plate" className="bg-[#18181b]">Flat Plate ({lang === "it" ? "Piastra fissa" : lang === "es" ? "Placa plana fija" : "Fixed flat plate"})</option>
                      <option value="Rotating Drum" className="bg-[#18181b]">Rotating Drum ({lang === "it" ? "Tamburo rotante veloce" : lang === "es" ? "Tambor giratorio rápido" : "Fast rotating drum"})</option>
                      <option value="Mandrel" className="bg-[#18181b]">Mandrel ({lang === "it" ? "Mandrino rotante per tubolari" : lang === "es" ? "Mandril giratorio para tubulares" : "Rotating mandrel for tubes"})</option>
                      <option value="Y-axis Stage" className="bg-[#18181b]">Y-axis Stage ({lang === "it" ? "Asse motorizzato XY" : lang === "es" ? "Eje motorizado XY" : "Motorized XY stage"})</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        {t.needleToCollectorDistance}
                      </label>
                      <span className="text-teal-400 font-mono font-bold text-xs">{distanceMm} mm</span>
                    </div>
                    <input
                      id="distance-slider"
                      type="range"
                      min="50"
                      max="300"
                      step="5"
                      value={distanceMm}
                      onChange={(e) => setDistanceMm(parseInt(e.target.value))}
                      className="w-full accent-teal-500 bg-[#0a0a0b] h-2 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* Voltage & Flow values (Pre-filled or modified) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-[#0a0a0b]/40 rounded-xl border border-[#27272a]/60">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                      {t.targetVoltage}
                    </label>
                    <input
                      id="run-voltage-input"
                      type="number"
                      step="0.1"
                      min="0"
                      value={voltageKv}
                      onChange={(e) => setVoltageKv(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#0a0a0b] text-[#f4f4f5] font-mono text-sm px-3 py-2 rounded-xl border border-[#27272a] focus:outline-none focus:border-teal-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                      {t.targetFlow}
                    </label>
                    <input
                      id="run-flow-input"
                      type="number"
                      step="0.05"
                      min="0"
                      value={flowRateMlH}
                      onChange={(e) => setFlowRateMlH(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#0a0a0b] text-[#f4f4f5] font-mono text-sm px-3 py-2 rounded-xl border border-[#27272a] focus:outline-none focus:border-teal-400"
                    />
                  </div>
                </div>

                {/* Jet Stability evaluation */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    {t.processabilityRating}
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {([1, 2, 3, 4, 5] as const).map((g) => {
                      const labelsIt = ["Gocciolamento", "Instabile", "Accettabile", "Stabile", "Taylor Cone Eccellente"];
                      const labelsEs = ["Goteo", "Inestable", "Aceptable", "Estable", "Cono Taylor Excelente"];
                      const labelsEn = ["Dripping", "Unstable", "Acceptable", "Stable", "Excellent Taylor Cone"];
                      const labels = lang === "it" ? labelsIt : lang === "es" ? labelsEs : labelsEn;
                      
                      const isSelected = jetStability === g;
                      return (
                        <button
                          key={g}
                          id={`stability-btn-${g}`}
                          type="button"
                          onClick={() => setJetStability(g)}
                          className={`p-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                            isSelected
                              ? "bg-teal-500/10 border-teal-500 text-teal-400 shadow-md shadow-teal-950/20"
                              : "bg-[#0a0a0b] border-[#27272a] text-zinc-400 hover:border-zinc-700"
                          }`}
                        >
                          <div className="text-sm">{g} ★</div>
                          <div className="text-[9px] text-zinc-500 font-normal leading-tight mt-0.5">{labels[g-1]}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Operator comments */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    {t.operatorNotesLabel}
                  </label>
                  <textarea
                    id="run-comments-textarea"
                    rows={2}
                    placeholder={lang === "it" ? "Annota la morfologia visiva al microscopio..." : lang === "es" ? "Anotar la morfología visual al microscopio..." : "Write down the visual morphology under microscope..."}
                    value={operatorComments}
                    onChange={(e) => setOperatorComments(e.target.value)}
                    className="w-full bg-[#0a0a0b] text-[#f4f4f5] placeholder-zinc-600 text-sm px-3.5 py-2.5 rounded-xl border border-[#27272a] focus:outline-none focus:border-teal-400 resize-none"
                  />
                </div>

                {saveError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400"
                  >
                    {saveError}
                  </div>
                )}

                <button
                  id="submit-run-btn"
                  type="submit"
                  disabled={isSaving}
                  className="w-full bg-teal-500 hover:bg-teal-400 text-black font-extrabold py-3 px-4 rounded-xl shadow-lg hover:brightness-110 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      {lang === "it"
                        ? "Registrazione in corso..."
                        : lang === "es"
                          ? "Registrando..."
                          : "Saving..."}
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      {t.saveAndStartButton}
                    </>
                  )}
                </button>

              </div>
            ) : (
              <div className="py-20 text-center text-zinc-500 border border-dashed border-[#27272a] rounded-xl bg-[#0a0a0b]/40">
                {t.selectFormulationWarning}
              </div>
            )}

          </form>
        </div>

        {/* Right Column: Predictive Co-Pilot AI */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 shadow-xl flex flex-col space-y-6 h-full min-h-[600px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-400" />
                <h3 className="text-md font-bold text-white">{t.smartMemoryTitle}</h3>
              </div>
              <span className="text-[10px] bg-teal-500/15 text-teal-400 px-2.5 py-1 rounded-full font-bold font-mono uppercase tracking-wider border border-teal-500/20">
                Co-Pilot
              </span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              {t.smartMemorySub}
            </p>

            {/* Polymer info panel */}
            <div className="space-y-4 p-4 bg-[#0a0a0b] rounded-xl border border-[#27272a]">
              <h4 className="text-[10px] font-bold tracking-widest text-teal-400 uppercase">
                {t.chemicalParamsHeader}
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-[#27272a]/50 pb-1">
                  <span className="text-zinc-400">{t.targetPolymerLabel}</span>
                  <span className="text-white font-semibold">{aiPolymer || (lang === "it" ? "Nessuno (Seleziona formula)" : "None (Select recipe)")}</span>
                </div>
                <div className="flex justify-between border-b border-[#27272a]/50 pb-1">
                  <span className="text-zinc-400">{t.solventLabel}</span>
                  <span className="text-white font-semibold">{aiSolvent || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">{t.solidsPercentageLabel}</span>
                  <span className="text-white font-mono">{aiSolids ? `${aiSolids}%` : "N/A"}</span>
                </div>
              </div>

              <button
                id="generate-prediction-btn"
                type="button"
                disabled={!aiPolymer || isAiLoading}
                onClick={triggerAISuggestion}
                className="w-full mt-2 bg-[#18181b] hover:bg-[#27272a] text-teal-400 font-bold py-2.5 px-4 rounded-xl transition border border-teal-500/10 hover:border-teal-500/20 text-xs flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isAiLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin text-teal-400" />
                    <span>{lang === "it" ? "Generazione in corso..." : lang === "es" ? "Generando..." : "Generating..."}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{t.calculateParamsButton}</span>
                  </>
                )}
              </button>
            </div>

            {aiError && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-start gap-2">
                <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                <span>{aiError}</span>
              </div>
            )}

            {/* AI Results Report */}
            {aiSuggestion ? (
              <div className="bg-[#0a0a0b] p-4 rounded-xl border border-teal-500/30 flex-1 flex flex-col space-y-4 animate-fadeIn">
                <div className="flex justify-between items-center border-b border-[#27272a] pb-2">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-teal-400" />
                    {t.aiReportHeader}
                  </h4>
                  <button
                    id="apply-ai-report-btn"
                    type="button"
                    onClick={applyAISuggestedParams}
                    className="text-[10px] font-bold bg-teal-500 text-black px-2 py-1 rounded hover:bg-teal-400 transition uppercase tracking-wider font-sans cursor-pointer"
                  >
                    {t.applyButton}
                  </button>
                </div>

                {/* AI Targets grid */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="bg-[#18181b] p-2.5 rounded-lg border border-[#27272a]">
                    <span className="text-[10px] text-zinc-500 block font-mono">⚡ ALTA TENSIONE</span>
                    <span className="text-sm font-bold font-mono text-teal-400">{aiSuggestion.voltageKv} kV</span>
                  </div>
                  <div className="bg-[#18181b] p-2.5 rounded-lg border border-[#27272a]">
                    <span className="text-[10px] text-zinc-500 block font-mono">💧 PORTATA POMPA</span>
                    <span className="text-sm font-bold font-mono text-teal-400">{aiSuggestion.flowRateMlH} mL/h</span>
                  </div>
                  <div className="bg-[#18181b] p-2.5 rounded-lg border border-[#27272a]">
                    <span className="text-[10px] text-zinc-500 block font-mono">📏 DISTANZA EMETTITORE</span>
                    <span className="text-sm font-bold font-mono text-white">{aiSuggestion.distanceMm} mm</span>
                  </div>
                  <div className="bg-[#18181b] p-2.5 rounded-lg border border-[#27272a]">
                    <span className="text-[10px] text-zinc-500 block font-mono">🌡️ CLIMA CAMERA</span>
                    <span className="text-[10px] text-white flex items-center gap-1 font-mono mt-0.5">
                      <Thermometer className="w-3 h-3 text-red-400" /> {aiSuggestion.temperatureC}°C
                      <CloudLightning className="w-3 h-3 text-teal-400" /> {aiSuggestion.humidityPct}%
                    </span>
                  </div>
                </div>

                {/* Scientific Reasoning */}
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">{t.scientificReasoning}</span>
                  <p className="text-xs text-zinc-300 leading-relaxed bg-[#18181b] p-2.5 rounded-lg border border-[#27272a] h-24 overflow-y-auto">
                    {aiSuggestion.reasoning}
                  </p>
                </div>

                {/* Tips */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">{t.inSituGuidelines}</span>
                  <ul className="space-y-1 text-[11px] text-zinc-400">
                    {aiSuggestion.tips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-teal-400 font-bold">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              !isAiLoading && (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 border border-dashed border-[#27272a] rounded-xl py-12 bg-[#0a0a0b]/40">
                  <HelpCircle className="w-10 h-10 text-zinc-800 mb-2" />
                  <p className="text-xs">{lang === "it" ? "Nessun report generato." : lang === "es" ? "Ningún reporte generado." : "No report generated."}</p>
                  <p className="text-[10px] text-zinc-700">{lang === "it" ? "Seleziona una formula e calcola i parametri." : lang === "es" ? "Seleccione una fórmula y calcule los parámetros." : "Select a recipe and calculate parameters."}</p>
                </div>
              )
            )}
          </div>
        </div>

      </div>

    </div>
  );
}