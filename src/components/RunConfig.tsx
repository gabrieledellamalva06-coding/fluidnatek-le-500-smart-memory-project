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
  Play,
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

import {
  TRANSLATIONS,
  type Language,
} from "../lib/translations";

import MemorySearchPanel from "../features/memory/MemorySearchPanel";

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
  lang,
}: RunConfigProps) {
  const t = TRANSLATIONS[lang];

  const [selectedFormulationId, setSelectedFormulationId] =
    useState("");

  const [runName, setRunName] =
    useState("");

  const [injectorType, setInjectorType] =
    useState<InjectorType>("Single Emitter");

  const [collectorType, setCollectorType] =
    useState<CollectorType>("Flat Plate");

  const [distanceMm, setDistanceMm] =
    useState<number>(150);

  const [voltageKv, setVoltageKv] =
    useState<number>(15);

  const [flowRateMlH, setFlowRateMlH] =
    useState<number>(1);

  const [jetStability, setJetStability] =
    useState<ProcessabilityGrade>(4);

  const [isSaving, setIsSaving] =
    useState(false);

  const [saveError, setSaveError] =
    useState("");

  const [operatorComments, setOperatorComments] =
    useState("");

  const [aiPolymer, setAiPolymer] =
    useState("");

  const [aiSolvent, setAiSolvent] =
    useState("");

  const [aiViscosity, setAiViscosity] =
    useState<number>(350);

  const [aiConductivity, setAiConductivity] =
    useState<number>(5.5);

  const [aiSolids, setAiSolids] =
    useState<number>(12);

  const [isAiLoading, setIsAiLoading] =
    useState(false);

  const [aiSuggestion, setAiSuggestion] =
    useState<AISuggestion | null>(null);

  const [aiError, setAiError] =
    useState("");

  const handleApplyFormulationParams = (
    formulationId: string
  ): void => {
    setSelectedFormulationId(formulationId);
    setAiSuggestion(null);
    setAiError("");

    const formulation = formulations.find(
      (item) => item.id === formulationId
    );

    if (!formulation) {
      setAiPolymer("");
      setAiSolvent("");
      return;
    }

    setAiPolymer(formulation.polymerName);
    setAiSolvent(formulation.solvent);
    setAiViscosity(formulation.viscosityMpas);
    setAiConductivity(formulation.conductivityUsCm);
    setAiSolids(formulation.solidsContentPct);

    const polymerCode = formulation.polymerName
      .split(" ")[0]
      .toUpperCase();

    const randomRunNumber =
      Math.floor(Math.random() * 900) + 100;

    setRunName(
      `RUN-${polymerCode}-${randomRunNumber}`
    );
  };

  const triggerAISuggestion =
    async (): Promise<void> => {
      if (!aiPolymer) {
        setAiError(t.selectFormulationWarning);
        return;
      }

      setIsAiLoading(true);
      setAiError("");
      setAiSuggestion(null);

      const historicalRuns = experiments
        .filter((experiment) => {
          const formulation = formulations.find(
            (item) =>
              item.id === experiment.formulationId
          );

          return (
            formulation !== undefined &&
            formulation.polymerName
              .toLowerCase()
              .includes(aiPolymer.toLowerCase())
          );
        })
        .slice(0, 3)
        .map((experiment) => ({
          operationIdentifier:
            experiment.operationIdentifier,

          injector:
            experiment.injectorType,

          collector:
            experiment.collectorType,

          distanceMm:
            experiment.distanceMm,

          stabilityGrade:
            experiment.jetStabilityGrade,

          comments:
            experiment.operatorComments,
        }));

      try {
        const response = await fetch(
          "/api/suggest",
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              polymerName: aiPolymer,
              solvent: aiSolvent,
              solidsContentPct: aiSolids,
              viscosityMpas: aiViscosity,
              conductivityUsCm: aiConductivity,
              historicalRuns,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(
            lang === "it"
              ? "Errore di risposta del server backend"
              : lang === "es"
                ? "Error de respuesta del servidor backend"
                : "Backend server error response"
          );
        }

        const data: AISuggestion =
          await response.json();

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

  const applyAISuggestedParams = (): void => {
    if (!aiSuggestion) {
      return;
    }

    setVoltageKv(aiSuggestion.voltageKv);
    setFlowRateMlH(
      aiSuggestion.flowRateMlH
    );
    setDistanceMm(aiSuggestion.distanceMm);
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
        formulationId:
          selectedFormulationId,

        operationIdentifier:
          runName.trim(),

        machineModel:
          "Fluidnatek LE-500",

        injectorType,

        collectorType,

        voltageKv,

        flowRateMlH,

        distanceMm,

        jetStabilityGrade:
          jetStability,

        operatorComments:
          operatorComments.trim() ||
          (
            lang === "it"
              ? "Prova registrata con successo"
              : lang === "es"
                ? "Prueba registrada correctamente"
                : "Run recorded successfully"
          ),

        sourceFile:
          "Manual Input",
      });

      setRunName("");
      setOperatorComments("");
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error
          ? error.message
          : lang === "it"
            ? "Impossibile registrare l'esperimento."
            : lang === "es"
              ? "No se pudo registrar el experimento."
              : "Unable to save the experiment."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="runconfig-view"
      className="flex-1 select-none space-y-8 overflow-y-auto bg-[#0a0a0b] p-8 text-[#f4f4f5]"
    >
      <div className="flex items-center gap-3">
        <Activity className="h-8 w-8 text-teal-400" />

        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            {t.runConfigTitle}
          </h2>

          <p className="text-xs text-zinc-400">
            {t.runConfigSubtitle}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="flex flex-col space-y-6 rounded-2xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl lg:col-span-7">
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-teal-400" />

            <h3 className="text-md font-bold text-white">
              {t.hwConfigSectionTitle}
            </h3>
          </div>

          <form
            onSubmit={handleSaveConfig}
            className="space-y-6"
          >
            <div className="space-y-3 rounded-xl border border-[#27272a]/80 bg-[#0a0a0b]/70 p-4">
              <label className="block text-xs font-bold uppercase tracking-widest text-teal-400">
                {t.step1RecipeSelection}
              </label>

              <select
                id="run-formulation-select"
                value={selectedFormulationId}
                onChange={(event) => {
                  handleApplyFormulationParams(
                    event.target.value
                  );
                }}
                className="w-full cursor-pointer rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-2.5 text-sm text-[#f4f4f5] focus:border-teal-400 focus:outline-none"
              >
                <option
                  value=""
                  className="text-zinc-500"
                >
                  {t.selectRecipePlaceholder}
                </option>

                {formulations.map(
                  (formulation) => (
                    <option
                      key={formulation.id}
                      value={formulation.id}
                      className="bg-[#18181b]"
                    >
                      {formulation.polymerName}
                      {" | "}
                      {formulation.solvent}
                      {" ("}
                      {formulation.solidsContentPct}
                      {"% "}
                      {lang === "it"
                        ? "solidi"
                        : lang === "es"
                          ? "sólidos"
                          : "solids"}
                      {")"}
                    </option>
                  )
                )}
              </select>
            </div>

            {selectedFormulationId ? (
              <div className="animate-fadeIn space-y-5">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      {t.runIdentifier}
                    </label>

                    <input
                      id="run-name-input"
                      type="text"
                      placeholder={
                        t.runIdPlaceholder
                      }
                      value={runName}
                      onChange={(event) => {
                        setRunName(
                          event.target.value
                        );
                      }}
                      className="w-full rounded-xl border border-[#27272a] bg-[#0a0a0b] px-3 py-2 font-mono text-sm text-[#f4f4f5] focus:border-teal-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      {t.injectorLabel}
                    </label>

                    <select
                      id="injector-select"
                      value={injectorType}
                      onChange={(event) => {
                        const value =
                          event.target.value;

                        if (
                          value ===
                            "Single Emitter" ||
                          value === "Coaxial" ||
                          value ===
                            "Multi-emitter (x4)" ||
                          value ===
                            "Multi-needle (x8)"
                        ) {
                          setInjectorType(value);
                        }
                      }}
                      className="w-full rounded-xl border border-[#27272a] bg-[#0a0a0b] px-3 py-2 text-sm text-[#f4f4f5] focus:border-teal-400 focus:outline-none"
                    >
                      <option
                        value="Single Emitter"
                        className="bg-[#18181b]"
                      >
                        Single Emitter (
                        {lang === "it"
                          ? "Singolo ago"
                          : lang === "es"
                            ? "Aguja única"
                            : "Single needle"}
                        )
                      </option>

                      <option
                        value="Coaxial"
                        className="bg-[#18181b]"
                      >
                        Coaxial (
                        {lang === "it"
                          ? "Coassiale nucleo-guscio"
                          : lang === "es"
                            ? "Coaxial núcleo-funda"
                            : "Coaxial core-shell"}
                        )
                      </option>

                      <option
                        value="Multi-emitter (x4)"
                        className="bg-[#18181b]"
                      >
                        Multi-emitter (
                        {lang === "it"
                          ? "x4 Ugelli"
                          : lang === "es"
                            ? "x4 boquillas"
                            : "x4 emitters"}
                        )
                      </option>

                      <option
                        value="Multi-needle (x8)"
                        className="bg-[#18181b]"
                      >
                        Multi-needle (
                        {lang === "it"
                          ? "x8 Aghi paralleli"
                          : lang === "es"
                            ? "x8 agujas paralelas"
                            : "x8 parallel needles"}
                        )
                      </option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      {t.collectorLabel}
                    </label>

                    <select
                      id="collector-select"
                      value={collectorType}
                      onChange={(event) => {
                        const value =
                          event.target.value;

                        if (
                          value ===
                            "Flat Plate" ||
                          value ===
                            "Rotating Drum" ||
                          value === "Mandrel" ||
                          value ===
                            "Y-axis Stage"
                        ) {
                          setCollectorType(value);
                        }
                      }}
                      className="w-full rounded-xl border border-[#27272a] bg-[#0a0a0b] px-3 py-2 text-sm text-[#f4f4f5] focus:border-teal-400 focus:outline-none"
                    >
                      <option
                        value="Flat Plate"
                        className="bg-[#18181b]"
                      >
                        Flat Plate (
                        {lang === "it"
                          ? "Piastra fissa"
                          : lang === "es"
                            ? "Placa plana fija"
                            : "Fixed flat plate"}
                        )
                      </option>

                      <option
                        value="Rotating Drum"
                        className="bg-[#18181b]"
                      >
                        Rotating Drum (
                        {lang === "it"
                          ? "Tamburo rotante veloce"
                          : lang === "es"
                            ? "Tambor giratorio rápido"
                            : "Fast rotating drum"}
                        )
                      </option>

                      <option
                        value="Mandrel"
                        className="bg-[#18181b]"
                      >
                        Mandrel (
                        {lang === "it"
                          ? "Mandrino rotante per tubolari"
                          : lang === "es"
                            ? "Mandril giratorio para tubulares"
                            : "Rotating mandrel for tubes"}
                        )
                      </option>

                      <option
                        value="Y-axis Stage"
                        className="bg-[#18181b]"
                      >
                        Y-axis Stage (
                        {lang === "it"
                          ? "Asse motorizzato XY"
                          : lang === "es"
                            ? "Eje motorizado XY"
                            : "Motorized XY stage"}
                        )
                      </option>
                    </select>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        {t.needleToCollectorDistance}
                      </label>

                      <span className="font-mono text-xs font-bold text-teal-400">
                        {distanceMm} mm
                      </span>
                    </div>

                    <input
                      id="distance-slider"
                      type="range"
                      min="50"
                      max="300"
                      step="5"
                      value={distanceMm}
                      onChange={(event) => {
                        setDistanceMm(
                          Number.parseInt(
                            event.target.value,
                            10
                          )
                        );
                      }}
                      className="h-2 w-full cursor-pointer rounded-lg bg-[#0a0a0b] accent-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 rounded-xl border border-[#27272a]/60 bg-[#0a0a0b]/40 p-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      {t.targetVoltage}
                    </label>

                    <input
                      id="run-voltage-input"
                      type="number"
                      step="0.1"
                      min="0"
                      value={voltageKv}
                      onChange={(event) => {
                        setVoltageKv(
                          Number.parseFloat(
                            event.target.value
                          ) || 0
                        );
                      }}
                      className="w-full rounded-xl border border-[#27272a] bg-[#0a0a0b] px-3 py-2 font-mono text-sm text-[#f4f4f5] focus:border-teal-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      {t.targetFlow}
                    </label>

                    <input
                      id="run-flow-input"
                      type="number"
                      step="0.05"
                      min="0"
                      value={flowRateMlH}
                      onChange={(event) => {
                        setFlowRateMlH(
                          Number.parseFloat(
                            event.target.value
                          ) || 0
                        );
                      }}
                      className="w-full rounded-xl border border-[#27272a] bg-[#0a0a0b] px-3 py-2 font-mono text-sm text-[#f4f4f5] focus:border-teal-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    {t.processabilityRating}
                  </label>

                  <div className="grid grid-cols-5 gap-2">
                    {(
                      [1, 2, 3, 4, 5] as const
                    ).map((grade) => {
                      const labelsIt = [
                        "Gocciolamento",
                        "Instabile",
                        "Accettabile",
                        "Stabile",
                        "Taylor Cone Eccellente",
                      ];

                      const labelsEs = [
                        "Goteo",
                        "Inestable",
                        "Aceptable",
                        "Estable",
                        "Cono Taylor Excelente",
                      ];

                      const labelsEn = [
                        "Dripping",
                        "Unstable",
                        "Acceptable",
                        "Stable",
                        "Excellent Taylor Cone",
                      ];

                      const labels =
                        lang === "it"
                          ? labelsIt
                          : lang === "es"
                            ? labelsEs
                            : labelsEn;

                      const isSelected =
                        jetStability === grade;

                      return (
                        <button
                          key={grade}
                          id={`stability-btn-${grade}`}
                          type="button"
                          onClick={() => {
                            setJetStability(
                              grade
                            );
                          }}
                          className={`cursor-pointer rounded-xl border p-2 text-xs font-semibold transition ${
                            isSelected
                              ? "border-teal-500 bg-teal-500/10 text-teal-400 shadow-md shadow-teal-950/20"
                              : "border-[#27272a] bg-[#0a0a0b] text-zinc-400 hover:border-zinc-700"
                          }`}
                        >
                          <div className="text-sm">
                            {grade} ★
                          </div>

                          <div className="mt-0.5 text-[9px] font-normal leading-tight text-zinc-500">
                            {labels[grade - 1]}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    {t.operatorNotesLabel}
                  </label>

                  <textarea
                    id="run-comments-textarea"
                    rows={2}
                    placeholder={
                      lang === "it"
                        ? "Annota la morfologia visiva al microscopio..."
                        : lang === "es"
                          ? "Anotar la morfología visual al microscopio..."
                          : "Write down the visual morphology under microscope..."
                    }
                    value={operatorComments}
                    onChange={(event) => {
                      setOperatorComments(
                        event.target.value
                      );
                    }}
                    className="w-full resize-none rounded-xl border border-[#27272a] bg-[#0a0a0b] px-3.5 py-2.5 text-sm text-[#f4f4f5] placeholder-zinc-600 focus:border-teal-400 focus:outline-none"
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
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-teal-500 px-4 py-3 font-extrabold text-black shadow-lg transition hover:bg-teal-400 hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
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
                      <Play className="h-4 w-4 fill-current" />
                      {t.saveAndStartButton}
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#27272a] bg-[#0a0a0b]/40 py-20 text-center text-zinc-500">
                {t.selectFormulationWarning}
              </div>
            )}
          </form>
        </div>

        <div className="flex flex-col lg:col-span-5">
          <div className="flex h-full min-h-[600px] flex-col space-y-6 rounded-2xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-teal-400" />

                <h3 className="text-md font-bold text-white">
                  {t.smartMemoryTitle}
                </h3>
              </div>

              <span className="rounded-full border border-teal-500/20 bg-teal-500/15 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-teal-400">
                Co-Pilot
              </span>
            </div>

            <p className="text-xs leading-relaxed text-zinc-400">
              {t.smartMemorySub}
            </p>

            <div className="space-y-4 rounded-xl border border-[#27272a] bg-[#0a0a0b] p-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-teal-400">
                {t.chemicalParamsHeader}
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-[#27272a]/50 pb-1">
                  <span className="text-zinc-400">
                    {t.targetPolymerLabel}
                  </span>

                  <span className="font-semibold text-white">
                    {aiPolymer ||
                      (
                        lang === "it"
                          ? "Nessuno (Seleziona formula)"
                          : lang === "es"
                            ? "Ninguno (Selecciona fórmula)"
                            : "None (Select recipe)"
                      )}
                  </span>
                </div>

                <div className="flex justify-between border-b border-[#27272a]/50 pb-1">
                  <span className="text-zinc-400">
                    {t.solventLabel}
                  </span>

                  <span className="font-semibold text-white">
                    {aiSolvent || "N/A"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-zinc-400">
                    {t.solidsPercentageLabel}
                  </span>

                  <span className="font-mono text-white">
                    {aiPolymer
                      ? `${aiSolids}%`
                      : "N/A"}
                  </span>
                </div>
              </div>

              <button
                id="generate-prediction-btn"
                type="button"
                disabled={
                  !aiPolymer ||
                  isAiLoading
                }
                onClick={() => {
                  void triggerAISuggestion();
                }}
                className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-teal-500/10 bg-[#18181b] px-4 py-2.5 text-xs font-bold text-teal-400 transition hover:border-teal-500/20 hover:bg-[#27272a] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isAiLoading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin text-teal-400" />

                    <span>
                      {lang === "it"
                        ? "Generazione in corso..."
                        : lang === "es"
                          ? "Generando..."
                          : "Generating..."}
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>
                      {t.calculateParamsButton}
                    </span>
                  </>
                )}
              </button>
            </div>

            {aiError && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-400">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{aiError}</span>
              </div>
            )}

            {aiSuggestion ? (
              <div className="animate-fadeIn flex flex-1 flex-col space-y-4 rounded-xl border border-teal-500/30 bg-[#0a0a0b] p-4">
                <div className="flex items-center justify-between border-b border-[#27272a] pb-2">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Check className="h-4 w-4 text-teal-400" />
                    {t.aiReportHeader}
                  </h4>

                  <button
                    id="apply-ai-report-btn"
                    type="button"
                    onClick={applyAISuggestedParams}
                    className="cursor-pointer rounded bg-teal-500 px-2 py-1 font-sans text-[10px] font-bold uppercase tracking-wider text-black transition hover:bg-teal-400"
                  >
                    {t.applyButton}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="rounded-lg border border-[#27272a] bg-[#18181b] p-2.5">
                    <span className="block font-mono text-[10px] text-zinc-500">
                      ⚡ ALTA TENSIONE
                    </span>

                    <span className="font-mono text-sm font-bold text-teal-400">
                      {aiSuggestion.voltageKv} kV
                    </span>
                  </div>

                  <div className="rounded-lg border border-[#27272a] bg-[#18181b] p-2.5">
                    <span className="block font-mono text-[10px] text-zinc-500">
                      💧 PORTATA POMPA
                    </span>

                    <span className="font-mono text-sm font-bold text-teal-400">
                      {aiSuggestion.flowRateMlH} mL/h
                    </span>
                  </div>

                  <div className="rounded-lg border border-[#27272a] bg-[#18181b] p-2.5">
                    <span className="block font-mono text-[10px] text-zinc-500">
                      📏 DISTANZA EMETTITORE
                    </span>

                    <span className="font-mono text-sm font-bold text-white">
                      {aiSuggestion.distanceMm} mm
                    </span>
                  </div>

                  <div className="rounded-lg border border-[#27272a] bg-[#18181b] p-2.5">
                    <span className="block font-mono text-[10px] text-zinc-500">
                      🌡️ CLIMA CAMERA
                    </span>

                    <span className="mt-0.5 flex items-center gap-1 font-mono text-[10px] text-white">
                      <Thermometer className="h-3 w-3 text-red-400" />
                      {aiSuggestion.temperatureC}°C

                      <CloudLightning className="h-3 w-3 text-teal-400" />
                      {aiSuggestion.humidityPct}%
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    {t.scientificReasoning}
                  </span>

                  <p className="h-24 overflow-y-auto rounded-lg border border-[#27272a] bg-[#18181b] p-2.5 text-xs leading-relaxed text-zinc-300">
                    {aiSuggestion.reasoning}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    {t.inSituGuidelines}
                  </span>

                  <ul className="space-y-1 text-[11px] text-zinc-400">
                    {aiSuggestion.tips.map(
                      (tip, index) => (
                        <li
                          key={`${tip}-${index}`}
                          className="flex items-start gap-1.5"
                        >
                          <span className="font-bold text-teal-400">
                            •
                          </span>

                          <span>{tip}</span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              </div>
            ) : (
              !isAiLoading && (
                <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#27272a] bg-[#0a0a0b]/40 py-12 text-zinc-600">
                  <HelpCircle className="mb-2 h-10 w-10 text-zinc-800" />

                  <p className="text-xs">
                    {lang === "it"
                      ? "Nessun report generato."
                      : lang === "es"
                        ? "Ningún reporte generado."
                        : "No report generated."}
                  </p>

                  <p className="text-[10px] text-zinc-700">
                    {lang === "it"
                      ? "Seleziona una formula e calcola i parametri."
                      : lang === "es"
                        ? "Seleccione una fórmula y calcule los parámetros."
                        : "Select a recipe and calculate parameters."}
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <MemorySearchPanel
        projects={projects}
        formulations={formulations}
        experiments={experiments}
        formulationId={selectedFormulationId}
        voltageKv={voltageKv}
        flowRateMlH={flowRateMlH}
        distanceMm={distanceMm}
        onApplyRecommendation={(parameters) => {
          setVoltageKv(parameters.voltageKv);
          setFlowRateMlH(
            parameters.flowRateMlH
          );
          setDistanceMm(
            parameters.distanceMm
          );
        }}
      />
    </div>
  );
}