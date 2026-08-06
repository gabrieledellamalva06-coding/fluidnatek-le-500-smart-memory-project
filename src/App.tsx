import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  FolderKanban,
  Plus,
} from "lucide-react";

import Sidebar, {
  type MainView,
} from "./components/Sidebar";

import Formulations from "./components/Formulations";
import Setups from "./components/Setups";
import RunConfig from "./components/RunConfig";
import ExcelImport from "./components/ExcelImport";

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

import type {
  SolutionCharacterization,
} from "./core/types/characterization";

import type {
  ExperimentalSetup,
} from "./core/types/setup";

import {
  setupService,
  type CreateSetupInput,
} from "./application/setups/setup.service";

import {
  solutionCharacterizationService,
  type CreateSolutionCharacterizationInput,
} from "./application/characterizations/characterization.service";

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Si Ã¨ verificato un errore imprevisto.";
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
    useState<MainView>("PROJECTS");

  const [lang, setLang] =
    useState<Language>(getStoredLanguage);

  const [projects, setProjects] =
    useState<Project[]>([]);

  const [formulations, setFormulations] =
    useState<Formulation[]>([]);

    const [characterizations, setCharacterizations] =
    useState<SolutionCharacterization[]>([]);

    const [setups, setSetups] =
    useState<ExperimentalSetup[]>([]);

  const [experiments, setExperiments] =
    useState<Experiment[]>([]);

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
  loadedCharacterizations,
  loadedSetups,
  loadedExperiments,
] = await Promise.all([
  projectService.getProjects(),
  formulationService.getFormulations(),
  solutionCharacterizationService.getCharacterizations(),
  setupService.getSetups(),
  experimentService.getExperiments(),
]);

        if (isCancelled) {
          return;
        }

        setProjects(loadedProjects);
        setFormulations(loadedFormulations);
        setCharacterizations(
          loadedCharacterizations
        );
        setSetups(loadedSetups);
        setExperiments(loadedExperiments);
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

  const activeProject = useMemo(
    () => projects[0] ?? null,
    [projects]
  );

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

  const handleAddCharacterization = async (
    input: CreateSolutionCharacterizationInput
  ): Promise<void> => {
    setDataError(null);

    try {
      const createdCharacterization =
        await solutionCharacterizationService.createCharacterization(
          input
        );

      setCharacterizations(
        (previousCharacterizations) => [
          createdCharacterization,
          ...previousCharacterizations,
        ]
      );
    } catch (error: unknown) {
      const message =
        `Impossibile creare la caratterizzazione: ${getErrorMessage(
          error
        )}`;

      setDataError(message);

      throw new Error(message);
    }
  };

  
  const handleAddSetup = async (
    input: CreateSetupInput
  ): Promise<void> => {
    setDataError(null);
    try {
      const createdSetup = await setupService.createSetup(input);
      setSetups((previous) => [createdSetup, ...previous]);
    } catch (error: unknown) {
      const message = `Impossibile creare il setup: ${getErrorMessage(error)}`;
      setDataError(message);
      throw new Error(message);
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

      setExperiments(
        (previousExperiments) => [
          createdExperiment,
          ...previousExperiments,
        ]
      );
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
    console.info(
      "Pending canonical Excel import:",
      {
        parsedList,
        targetProjectId,
      }
    );

    setDataError(
      "L'importazione Ã¨ temporaneamente in modalitÃ  revisione. Nessun dato Ã¨ stato scritto."
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
      }" non Ã¨ stato eliminato: sono necessarie verifiche referenziali.`
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
      }" non Ã¨ stata eliminata: sono necessarie verifiche referenziali.`
    );
  };

  const renderMainView =
    (): React.ReactNode => {
      switch (currentView) {
        case "DATABASE_MANAGEMENT":
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

        case "PROJECTS":
          return (
            <ProjectsWorkspace
              projects={projects}
              formulations={formulations}
              experiments={experiments}
              activeProject={activeProject}
              onAddProject={handleAddProject}
            />
          );

        case "FORMULATIONS_CHARACTERIZATION":
          return (
            <Formulations
              projects={projects}
              formulations={formulations}
              characterizations={
                characterizations
              }
              onAddFormulation={
                handleAddFormulation
              }
              onAddCharacterization={
                handleAddCharacterization
              }
              lang={lang}
            />
          );

        case "SETUPS":
          return (
            <Setups
              projects={projects}
              setups={setups}
              onAddSetup={handleAddSetup}
            />
          );

        case "LIVE_TELEMETRY":
          return (
            <RunConfig
  projects={projects}
  formulations={formulations}
  characterizations={characterizations}
  setups={setups}
  experiments={experiments}
  onAddExperiment={handleAddExperiment}
  lang={lang}
/>
          );
      }
    };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 font-sans antialiased">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        projectsCount={projects.length}
        experimentsCount={
          experiments.length
        }
        lang={lang}
        onLanguageChange={setLang}
      />

      <div className="fnk-content-theme relative flex h-full min-w-0 flex-1 flex-col">
        {isDataLoading && (
          <div className="border-b border-blue-100 bg-blue-50 px-6 py-3 text-sm text-blue-700">
            Caricamento dati da Firestoreâ€¦
          </div>
        )}

        {dataError && (
          <div
            role="alert"
            className="flex items-center justify-between gap-4 border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700"
          >
            <span>{dataError}</span>

            <button
              type="button"
              className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-semibold"
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

interface ProjectsWorkspaceProps {
  projects: Project[];
  formulations: Formulation[];
  experiments: Experiment[];
  activeProject: Project | null;

  onAddProject: (
    project: Omit<Project, "id" | "createdAt">
  ) => Promise<void>;
}

function ProjectsWorkspace({
  projects,
  formulations,
  experiments,
  activeProject,
  onAddProject,
}: ProjectsWorkspaceProps) {
  const [name, setName] = useState("");
  const [description, setDescription] =
    useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] =
    useState(false);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();

    const normalizedName = name.trim();

    if (!normalizedName) {
      setError(
        "Inserisci un codice o nome progetto."
      );
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await onAddProject({
        name: normalizedName,
        description: description.trim(),
      });

      setName("");
      setDescription("");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-slate-100 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            Workflow step 1
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Projects
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Crea o seleziona il progetto che definisce
            il contesto della sessione sperimentale.
          </p>
        </header>

        {activeProject && (
          <section className="mt-6 rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white shadow-lg shadow-blue-200">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100">
              Active project
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              {activeProject.name}
            </h2>

            <p className="mt-1 text-sm text-blue-50">
              {activeProject.description ||
                "Nessuna descrizione disponibile."}
            </p>
          </section>
        )}

        <div className="mt-6 grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                <Plus className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-bold text-slate-950">
                  New project
                </h2>

                <p className="text-xs text-slate-500">
                  Crea un nuovo contesto sperimentale.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-6 space-y-4"
            >
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Project code
                </span>

                <input
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Description
                </span>

                <textarea
                  rows={4}
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </label>

              {error && (
                <div className="flex gap-2 rounded-2xl border border-red-100 bg-red-50 p-3 text-xs text-red-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving
                  ? "Saving..."
                  : "Create project"}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-600">
                <FolderKanban className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-bold text-slate-950">
                  Project database
                </h2>

                <p className="text-xs text-slate-500">
                  {projects.length} registered projects
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {projects.map((project) => {
                const formulationCount =
                  formulations.filter(
                    (item) =>
                      item.projectId === project.id
                  ).length;

                const experimentCount =
                  experiments.filter(
                    (experiment) =>
                      formulations.some(
                        (formulation) =>
                          formulation.id ===
                            experiment.formulationId &&
                          formulation.projectId ===
                            project.id
                      )
                  ).length;

                return (
                  <article
                    key={project.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-slate-900">
                          {project.name}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          {project.description ||
                            "No description"}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <ProjectMetric
                          label="Formulations"
                          value={formulationCount}
                        />

                        <ProjectMetric
                          label="Runs"
                          value={experimentCount}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}

              {projects.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-400">
                  No projects registered.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

interface ProjectMetricProps {
  label: string;
  value: number;
}

function ProjectMetric({
  label,
  value,
}: ProjectMetricProps) {
  return (
    <div className="min-w-20 rounded-xl bg-white px-3 py-2 text-center shadow-sm">
      <p className="text-lg font-bold text-slate-900">
        {value}
      </p>

      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
    </div>
  );
}


