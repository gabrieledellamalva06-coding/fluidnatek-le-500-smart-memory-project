import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Formulations from "./components/Formulations";
import RunConfig from "./components/RunConfig";
import ExcelImport from "./components/ExcelImport";
import ParameterLearningPanel from "./components/ParameterLearningPanel";

import type {
  Experiment,
  Formulation,
  Project,
} from "./types";

import type { ParsedExcelResult } from "./utils/excelParser";
import { registerMaterial } from "./utils/materialRegistry";
import type { Language } from "./lib/translations";

import { projectService } from "./application/projects/project.service";
import { formulationService } from "./application/formulations/formulation.service";
import { experimentService } from "./application/experiments/experiment.service";

import type {
  CreateExperimentInput,
} from "./application/experiments/experiment.mapper";

type MainView =
  | "DASHBOARD"
  | "FORMULATIONS"
  | "RUN_CONFIG"
  | "EXCEL_IMPORT";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Si è verificato un errore imprevisto.";
}

function getStoredLanguage(): Language {
  const savedLanguage =
    localStorage.getItem("fluidnatek_lang");

  if (
    savedLanguage === "it" ||
    savedLanguage === "en" ||
    savedLanguage === "es"
  ) {
    return savedLanguage;
  }

  return "it";
}

export default function App() {
  const [currentView, setCurrentView] =
    useState<MainView>("DASHBOARD");

  const [lang, setLang] =
    useState<Language>(getStoredLanguage);

  /*
   * Firestore-backed entities.
   */
  const [projects, setProjects] =
    useState<Project[]>([]);

  const [formulations, setFormulations] =
    useState<Formulation[]>([]);

  const [experiments, setExperiments] =
    useState<Experiment[]>([]);

  /*
   * UI-only state.
   *
   * The selected experiment ID may remain in localStorage because it is
   * only a presentation preference, not industrial domain data.
   */
  const [selectedExpId, setSelectedExpId] =
    useState<string>(
      () =>
        localStorage.getItem(
          "fluidnatek_selected_exp_id"
        ) ?? ""
    );

  const [isDataLoading, setIsDataLoading] =
    useState(true);

  const [dataError, setDataError] =
    useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadFirestoreData(): Promise<void> {
      setIsDataLoading(true);
      setDataError(null);

      try {
        const [
          loadedProjects,
          loadedFormulations,
          loadedExperiments,
        ] = await Promise.all([
          projectService.getProjects(),
          formulationService.getFormulations(),
          experimentService.getExperiments(),
        ]);

        if (isCancelled) {
          return;
        }

        setProjects(loadedProjects);
        setFormulations(loadedFormulations);
        setExperiments(loadedExperiments);

        setSelectedExpId(
          (currentSelectedExperimentId) => {
            const selectedExperimentExists =
              loadedExperiments.some(
                (experiment) =>
                  experiment.id ===
                  currentSelectedExperimentId
              );

            if (selectedExperimentExists) {
              return currentSelectedExperimentId;
            }

            return loadedExperiments[0]?.id ?? "";
          }
        );
      } catch (error: unknown) {
        if (!isCancelled) {
          setDataError(
            `Impossibile caricare i dati da Firestore: ${getErrorMessage(
              error
            )}`
          );
        }
      } finally {
        if (!isCancelled) {
          setIsDataLoading(false);
        }
      }
    }

    void loadFirestoreData();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "fluidnatek_lang",
      lang
    );
  }, [lang]);

  useEffect(() => {
    if (selectedExpId) {
      localStorage.setItem(
        "fluidnatek_selected_exp_id",
        selectedExpId
      );

      return;
    }

    localStorage.removeItem(
      "fluidnatek_selected_exp_id"
    );
  }, [selectedExpId]);

  const selectedExp = useMemo(() => {
    return (
      experiments.find(
        (experiment) =>
          experiment.id === selectedExpId
      ) ??
      experiments[0] ??
      null
    );
  }, [experiments, selectedExpId]);

  const handleAddProject = async (
    project: Omit<Project, "id" | "createdAt">
  ): Promise<void> => {
    setDataError(null);

    try {
      const createdProject =
        await projectService.createProject(
          project
        );

      setProjects((previousProjects) => [
        createdProject,
        ...previousProjects,
      ]);
    } catch (error: unknown) {
      setDataError(
        `Impossibile creare il progetto: ${getErrorMessage(
          error
        )}`
      );
    }
  };

  const handleAddFormulation = async (
    formulation: Omit<Formulation, "id">
  ): Promise<void> => {
    setDataError(null);

    try {
      const createdFormulation =
        await formulationService.createFormulation(
          formulation
        );

      registerMaterial(
        "polymer",
        createdFormulation.polymerName,
        createdFormulation.polymerName,
        1
      );

      registerMaterial(
        "solvent",
        createdFormulation.solvent,
        createdFormulation.solvent,
        1
      );

      setFormulations(
        (previousFormulations) => [
          createdFormulation,
          ...previousFormulations,
        ]
      );
    } catch (error: unknown) {
      setDataError(
        `Impossibile creare la formulazione: ${getErrorMessage(
          error
        )}`
      );
    }
  };

  const handleAddExperiment = async (
    input: CreateExperimentInput
  ): Promise<void> => {
    setDataError(null);

    try {
      const createdExperiment =
        await experimentService.createExperiment(
          input
        );

      const formulation = formulations.find(
        (item) =>
          item.id === input.formulationId
      );

      if (formulation) {
        registerMaterial(
          "polymer",
          formulation.polymerName,
          formulation.polymerName,
          1
        );

        registerMaterial(
          "solvent",
          formulation.solvent,
          formulation.solvent,
          1
        );
      }

      setExperiments(
        (previousExperiments) => [
          createdExperiment,
          ...previousExperiments,
        ]
      );

      setSelectedExpId(
        createdExperiment.id
      );

      setCurrentView("DASHBOARD");
    } catch (error: unknown) {
      const message =
        `Impossibile registrare l'esperimento: ${getErrorMessage(
          error
        )}`;

      setDataError(message);

      throw new Error(message);
    }
  };

  const handleImportExperiments = (
    parsedList: ParsedExcelResult[],
    targetProjectId: string
  ): void => {
    setDataError(
      "L'importazione Excel è temporaneamente bloccata mentre colleghiamo la pipeline canonica a Firestore. Nessun dato è stato importato."
    );

    console.info(
      "Pending canonical Excel import:",
      {
        parsedList,
        targetProjectId,
      }
    );
  };

  const handleDeleteExperiment = (
    experimentId: string
  ): void => {
    const experiment =
      experiments.find(
        (item) => item.id === experimentId
      );

    setDataError(
      `L'esperimento "${
        experiment?.operationIdentifier ??
        experimentId
      }" non è stato eliminato. La cancellazione sarà abilitata tramite un'operazione Firestore controllata.`
    );
  };

  const handleUpdateExperiment = (
    updatedExperiment: Experiment
  ): void => {
    setDataError(
      `L'esperimento "${updatedExperiment.operationIdentifier}" non è stato modificato. L'aggiornamento sarà abilitato tramite il servizio applicativo canonico.`
    );
  };

  const handleDeleteProject = (
    projectId: string
  ): void => {
    const project = projects.find(
      (item) => item.id === projectId
    );

    setDataError(
      `Il progetto "${
        project?.name ?? projectId
      }" non è stato eliminato. La cancellazione sarà abilitata dopo la migrazione completa delle entità dipendenti.`
    );
  };

  const handleDeleteFormulation = (
    formulationId: string
  ): void => {
    const formulation =
      formulations.find(
        (item) =>
          item.id === formulationId
      );

    setDataError(
      `La formulazione "${
        formulation?.polymerName ??
        formulationId
      }" non è stata eliminata. La cancellazione sarà abilitata dopo l'implementazione delle verifiche referenziali.`
    );
  };

  const renderMainView =
    (): React.ReactNode => {
      switch (currentView) {
        case "DASHBOARD":
          return (
            <div className="flex flex-col gap-6 overflow-auto p-6">
              <Dashboard
                projects={projects}
                formulations={formulations}
                experiments={experiments}
                selectedExp={selectedExp}
                onSelectExp={(experiment) =>
                  setSelectedExpId(
                    experiment.id
                  )
                }
                onDeleteExp={
                  handleDeleteExperiment
                }
                onUpdateExp={
                  handleUpdateExperiment
                }
                lang={lang}
              />

              <ParameterLearningPanel />
            </div>
          );

        case "FORMULATIONS":
          return (
            <Formulations
              projects={projects}
              formulations={formulations}
              onAddProject={handleAddProject}
              onAddFormulation={
                handleAddFormulation
              }
              onDeleteProject={
                handleDeleteProject
              }
              onDeleteFormulation={
                handleDeleteFormulation
              }
              lang={lang}
            />
          );

        case "RUN_CONFIG":
          return (
            <RunConfig
              projects={projects}
              formulations={formulations}
              experiments={experiments}
              onAddExperiment={
                handleAddExperiment
              }
              lang={lang}
            />
          );

        case "EXCEL_IMPORT":
          return (
            <ExcelImport
              projects={projects}
              formulations={formulations}
              onImportExperiment={
                handleImportExperiments
              }
              lang={lang}
            />
          );

        default:
          return (
            <div className="flex flex-1 items-center justify-center bg-[#0a0a0b] text-white">
              Sezione non trovata.
            </div>
          );
      }
    };

  return (
    <div
      id="fluidnatek-app-container"
      className="flex h-screen overflow-hidden bg-[#0a0a0b] font-sans antialiased"
    >
      <Sidebar
        currentView={currentView}
        onViewChange={(view) =>
          setCurrentView(
            view as MainView
          )
        }
        projectsCount={projects.length}
        experimentsCount={
          experiments.length
        }
        lang={lang}
        onLanguageChange={setLang}
      />

      <div
        id="main-content-layout"
        className="relative flex h-full min-w-0 flex-1 flex-col"
      >
        {isDataLoading && (
          <div className="border-b border-white/10 bg-white/5 px-6 py-3 text-sm text-white/70">
            Caricamento dati da
            Firestore…
          </div>
        )}

        {dataError && (
          <div
            role="alert"
            className="flex items-center justify-between gap-4 border-b border-red-500/30 bg-red-500/10 px-6 py-3 text-sm text-red-200"
          >
            <span>{dataError}</span>

            <button
              type="button"
              className="shrink-0 rounded-md border border-red-400/30 px-3 py-1 text-xs font-medium transition hover:bg-red-400/10"
              onClick={() =>
                setDataError(null)
              }
            >
              Chiudi
            </button>
          </div>
        )}

        {renderMainView()}
      </div>
    </div>
  );
}