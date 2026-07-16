import React, { useState, useEffect, useMemo } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Formulations from "./components/Formulations";
import RunConfig from "./components/RunConfig";
import ExcelImport from "./components/ExcelImport";
import { Project, Formulation, Experiment } from "./types";
import { SEED_PROJECTS, SEED_FORMULATIONS, SEED_EXPERIMENTS } from "./seedData";
import { ParsedExcelResult } from "./utils/excelParser";
import { Language } from "./lib/translations";

export default function App() {
  const [currentView, setCurrentView] = useState("DASHBOARD");

  // Multi-language state
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem("fluidnatek_lang");
    return (saved as Language) || "it";
  });

  // State initialization with localStorage fallback
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem("fluidnatek_projects");
    return saved ? JSON.parse(saved) : SEED_PROJECTS;
  });

  const [formulations, setFormulations] = useState<Formulation[]>(() => {
    const saved = localStorage.getItem("fluidnatek_formulations");
    return saved ? JSON.parse(saved) : SEED_FORMULATIONS;
  });

  const [experiments, setExperiments] = useState<Experiment[]>(() => {
    const saved = localStorage.getItem("fluidnatek_experiments");
    return saved ? JSON.parse(saved) : SEED_EXPERIMENTS;
  });

  const [selectedExpId, setSelectedExpId] = useState<string>(() => {
    const saved = localStorage.getItem("fluidnatek_selected_exp_id");
    if (saved) return saved;
    return SEED_EXPERIMENTS.length > 0 ? SEED_EXPERIMENTS[0].id : "";
  });

  // Sync state with localStorage on changes
  useEffect(() => {
    localStorage.setItem("fluidnatek_lang", lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem("fluidnatek_projects", JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem("fluidnatek_formulations", JSON.stringify(formulations));
  }, [formulations]);

  useEffect(() => {
    localStorage.setItem("fluidnatek_experiments", JSON.stringify(experiments));
  }, [experiments]);

  useEffect(() => {
    localStorage.setItem("fluidnatek_selected_exp_id", selectedExpId);
  }, [selectedExpId]);

  // Selected experiment object
  const selectedExp = useMemo(() => {
    return experiments.find((e) => e.id === selectedExpId) || (experiments.length > 0 ? experiments[0] : null);
  }, [experiments, selectedExpId]);

  // View handlers
  const handleAddProject = (p: Omit<Project, "id" | "createdAt">) => {
    const newProj: Project = {
      ...p,
      id: `PRJ-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setProjects((prev) => [newProj, ...prev]);
  };

  const handleAddFormulation = (f: Omit<Formulation, "id">) => {
    const newForm: Formulation = {
      ...f,
      id: `FORM-${Date.now()}`
    };
    setFormulations((prev) => [newForm, ...prev]);
  };

  const handleAddExperiment = (exp: Omit<Experiment, "id" | "ingestedAt" | "telemetryData">) => {
    // Generate a beautiful, natural fluctuations telemetry curve
    const generatedTelemetry = Array.from({ length: 40 }).map((_, i) => {
      const baseV = exp.distanceMm > 150 ? 19.5 : 15.5;
      const baseF = exp.injectorType === "Multi-emitter (x4)" ? 1.4 : 0.9;
      return {
        timestampSec: i * 5,
        voltageKv: parseFloat((baseV + Math.sin(i * 0.4) * 0.2 + (Math.random() - 0.5) * 0.05).toFixed(2)),
        flowRateMlH: parseFloat((baseF + Math.cos(i * 0.4) * 0.015 + (Math.random() - 0.5) * 0.005).toFixed(3)),
        temperatureC: parseFloat((22.4 + Math.sin(i * 0.1) * 0.15).toFixed(1)),
        humidityPct: parseFloat((37.5 + Math.cos(i * 0.1) * 0.3).toFixed(1)),
        distanceMm: exp.distanceMm
      };
    });

    const newExp: Experiment = {
      ...exp,
      id: `EXP-${Date.now()}`,
      ingestedAt: new Date().toISOString(),
      telemetryData: generatedTelemetry
    };

    setExperiments((prev) => [newExp, ...prev]);
    setSelectedExpId(newExp.id);
    setCurrentView("DASHBOARD");
  };

  // Import parsed Excel run
  const handleImportExperiments = (parsedList: ParsedExcelResult[], targetProjectId: string) => {
    // Lista di lavoro locale: consente la deduplica delle formulazioni anche
    // per più run nello stesso batch (lo state React non si aggiorna in-loop).
    const workingForms = [...formulations];
    const createdForms: Formulation[] = [];
    const createdExps: Experiment[] = [];

    parsedList.forEach((parsed, idx) => {
      // 1. Rileva o crea una Formulazione
      let matchedForm = workingForms.find(
        (f) =>
          f.projectId === targetProjectId &&
          f.polymerName.toLowerCase() === (parsed.polymerName || "Nylon-6").toLowerCase()
      );

      if (!matchedForm) {
        matchedForm = {
          id: `FORM-${Date.now()}-${idx}`,
          projectId: targetProjectId,
          polymerName: parsed.polymerName || "Nylon-6",
          solvent: parsed.solventName || "Acetic Acid",
          solidsContentPct: 15.0,
          viscosityMpas: 400,
          conductivityUsCm: 5.0,
          densityGcm3: 1.05
        };
        workingForms.push(matchedForm);
        createdForms.push(matchedForm);
      }

      // 2. Crea la run (Experiment)
      createdExps.push({
        id: `EXP-${Date.now()}-${idx}`,
        formulationId: matchedForm.id,
        operationIdentifier: parsed.operationIdentifier,
        machineModel: "Fluidnatek LE-500",
        injectorType: parsed.injectorType ?? (parsed.telemetryData.length > 50 ? "Multi-emitter (x4)" : "Single Emitter"),
        collectorType: parsed.collectorType ?? "Rotating Drum",
        distanceMm: parsed.distanceMm ?? parsed.telemetryData[0]?.distanceMm ?? 150,
        jetStabilityGrade: parsed.jetStabilityGrade ?? 4,
        operatorComments: parsed.operatorComments,
        sourceFile: parsed.sourceFile,
        ingestedAt: new Date().toISOString(),
        telemetryData: parsed.telemetryData,
        metadata: parsed.metadata
      });
    });

    if (createdForms.length) setFormulations((prev) => [...prev, ...createdForms]);
    if (createdExps.length) {
      setExperiments((prev) => [...createdExps, ...prev]);
      // Seleziona la prima run importata così la dashboard la mostra subito.
      setSelectedExpId(createdExps[0].id);
    }

    // Auto-focus dashboard so they see the charts!
    setCurrentView("DASHBOARD");
  };

  const handleDeleteExperiment = (id: string) => {
    setExperiments((prev) => prev.filter((e) => e.id !== id));
    if (selectedExpId === id) {
      setSelectedExpId("");
    }
  };

  const handleUpdateExperiment = (updatedExp: Experiment) => {
    setExperiments((prev) => prev.map((e) => (e.id === updatedExp.id ? updatedExp : e)));
  };

  const handleDeleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    // Cascade delete formulations under this project
    const formsToRemove = formulations.filter((f) => f.projectId === id).map((f) => f.id);
    setFormulations((prev) => prev.filter((f) => f.projectId !== id));
    setExperiments((prev) => prev.filter((e) => !formsToRemove.includes(e.formulationId)));
  };

  const handleDeleteFormulation = (id: string) => {
    setFormulations((prev) => prev.filter((f) => f.id !== id));
    setExperiments((prev) => prev.filter((e) => e.formulationId !== id));
  };

  // View router switcher
  const renderMainView = () => {
    switch (currentView) {
      case "DASHBOARD":
        return (
          <Dashboard
            projects={projects}
            formulations={formulations}
            experiments={experiments}
            selectedExp={selectedExp}
            onSelectExp={(exp) => setSelectedExpId(exp.id)}
            onDeleteExp={handleDeleteExperiment}
            onUpdateExp={handleUpdateExperiment}
            lang={lang}
          />
        );
      case "FORMULATIONS":
        return (
          <Formulations
            projects={projects}
            formulations={formulations}
            onAddProject={handleAddProject}
            onAddFormulation={handleAddFormulation}
            onDeleteProject={handleDeleteProject}
            onDeleteFormulation={handleDeleteFormulation}
            lang={lang}
          />
        );
      case "RUN_CONFIG":
        return (
          <RunConfig
            projects={projects}
            formulations={formulations}
            experiments={experiments}
            onAddExperiment={handleAddExperiment}
            lang={lang}
          />
        );
      case "EXCEL_IMPORT":
        return (
          <ExcelImport
            projects={projects}
            formulations={formulations}
            onImportExperiment={handleImportExperiments}
            lang={lang}
          />
        );
      default:
        return (
          <div className="flex-1 bg-[#0a0a0b] flex items-center justify-center text-white">
            Sezione non trovata.
          </div>
        );
    }
  };

  return (
    <div id="fluidnatek-app-container" className="flex h-screen bg-[#0a0a0b] font-sans overflow-hidden antialiased">
      {/* Sidebar navigation */}
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        projectsCount={projects.length}
        experimentsCount={experiments.length}
        lang={lang}
        onLanguageChange={setLang}
      />

      {/* Primary view content area */}
      <div id="main-content-layout" className="flex-1 flex flex-col min-w-0 h-full relative">
        {renderMainView()}
      </div>
    </div>
  );
}
