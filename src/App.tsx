import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Plus, Search, X } from "lucide-react";
import Sidebar, { type MainView } from "./components/Sidebar";
import Formulations from "./components/Formulations";
import Setups from "./components/Setups";
import RunConfig from "./components/RunConfig";
import ExcelImport from "./components/ExcelImport";
import HistoricalExperiments from "./components/HistoricalExperiments";
import type { Experiment, Formulation, Project } from "./types";
import type { ParsedExcelResult } from "./utils/excelParser";
import type { Language } from "./lib/translations";
import type { Material } from "./core/types/material";
import type { SolutionCharacterization } from "./core/types/characterization";
import type { ExperimentalSetup } from "./core/types/setup";
import type { CreateExperimentInput } from "./application/experiments/experiment.mapper";
import type { CreateSetupInput } from "./application/setups/setup.service";
import type { CreateSolutionCharacterizationInput } from "./application/characterizations/characterization.service";
import { projectService } from "./application/projects/project.service";
import { formulationService } from "./application/formulations/formulation.service";
import { experimentService } from "./application/experiments/experiment.service";
import { setupService } from "./application/setups/setup.service";
import { solutionCharacterizationService } from "./application/characterizations/characterization.service";
import {materialService,type CreateMaterialInput,} from "./application/materials/material.service";
import { SEED_PROJECTS, SEED_FORMULATIONS, SEED_EXPERIMENTS } from "./seedData";
const ACTIVE_PROJECT_KEY = "fluidnatek_active_project_id";

function getStoredLanguage(): Language {
  const saved = localStorage.getItem("fluidnatek_lang");
  return saved === "it" || saved === "en" || saved === "es" ? saved : "en";
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error.";
}

function resolveImportedFormulationId(parsed: ParsedExcelResult, formulations: Formulation[], projectId: string): string {
  const polymer = (parsed.polymerName ?? "").trim().toLowerCase();
  const solvent = (parsed.solventName ?? "").trim().toLowerCase();
  const match = formulations.find((formulation) => formulation.projectId === projectId
    && (!polymer || formulation.polymerName.toLowerCase().includes(polymer))
    && (!solvent || formulation.solvent.toLowerCase().includes(solvent)));
  return match?.id ?? `IMPORTED-${projectId}`;
}

function findMaterialByReference(reference: string | undefined, materials: Material[], category: "polymer" | "solvent"): Material | undefined {
  const value = (reference ?? "").trim().toLocaleLowerCase();
  if (!value) return undefined;
  return materials.find((item) => item.category === category && [item.canonicalName, ...item.aliases, ...item.commercialNames, ...(item.productCodes ?? [])]
    .some((candidate) => candidate.trim().toLocaleLowerCase() === value || candidate.trim().toLocaleLowerCase().includes(value) || value.includes(candidate.trim().toLocaleLowerCase())));
}

function readImportedFormulaName(parsed: ParsedExcelResult): string {
  const entry = Object.entries(parsed.metadata).find(([key]) => key.trim().toLocaleLowerCase() === "formula");
  return entry?.[1]?.trim() || parsed.operationIdentifier || "Imported formulation";
}

export default function App() {
  const [currentView, setCurrentView] = useState<MainView>("PROJECTS");
  const lang: Language = "en";
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [formulations, setFormulations] = useState<Formulation[]>([]);
  const [characterizations, setCharacterizations] = useState<SolutionCharacterization[]>([]);
  const [setups, setSetups] = useState<ExperimentalSetup[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => localStorage.getItem(ACTIVE_PROJECT_KEY));
  const [selectedFormulationId, setSelectedFormulationId] = useState("");
  const [selectedCharacterizationId, setSelectedCharacterizationId] = useState("");
  const [selectedSetupId, setSelectedSetupId] = useState("");
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<"loading" | "firestore" | "error">("loading");
  const [lastDataLoadAt, setLastDataLoadAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setIsDataLoading(true);
      setDataError(null);
      try {
        const [loadedProjects, loadedMaterials, loadedFormulations, loadedCharacterizations, loadedSetups, loadedExperiments] = await Promise.all([
          projectService.getProjects(),
          materialService.getMaterials(),
          formulationService.getFormulations(),
          solutionCharacterizationService.getCharacterizations(),
          setupService.getSetups(),
          experimentService.getExperiments(),
        ]);
        if (cancelled) return;
        setProjects(loadedProjects.length === 0 ? SEED_PROJECTS : loadedProjects);
        setMaterials(loadedMaterials);
        setFormulations(loadedFormulations.length === 0 ? SEED_FORMULATIONS : loadedFormulations);
        setCharacterizations(loadedCharacterizations);
        setSetups(loadedSetups);
        setExperiments(loadedExperiments.length === 0 ? SEED_EXPERIMENTS : loadedExperiments);
        setDataSource("firestore");
        setLastDataLoadAt(new Date().toLocaleTimeString());
      } catch (error) {
        if (!cancelled) {
          setDataSource("error");
          setDataError(`Unable to load shared Firestore data. ${getErrorMessage(error)}`);
        }
      } finally {
        if (!cancelled) setIsDataLoading(false);
      }
    }
    void loadData();
    return () => { cancelled = true; };
  }, []);


  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );
  const selectedFormulation = formulations.find((item) => item.id === selectedFormulationId) ?? null;
  const selectedCharacterization = characterizations.find((item) => item.id === selectedCharacterizationId) ?? undefined;
  const selectedSetup = setups.find((item) => item.id === selectedSetupId) ?? null;

  const selectProject = (id: string) => {
    setActiveProjectId(id || null);
    if (id) localStorage.setItem(ACTIVE_PROJECT_KEY, id); else localStorage.removeItem(ACTIVE_PROJECT_KEY);
    setSelectedFormulationId("");
    setSelectedCharacterizationId("");
    setSelectedSetupId("");
  };

  const handleAddProject = async (input: Omit<Project, "id" | "createdAt">) => {
    setDataError(null);
    try {
      const created = await projectService.createProject(input);
      setProjects((previous) => [created, ...previous]);
      selectProject(created.id);
    } catch (error) {
      const message = `Unable to create project: ${getErrorMessage(error)}`;
      setDataError(message);
      throw new Error(message);
    }
  };
const handleAddMaterial = async (
  input: CreateMaterialInput
): Promise<Material> => {
  setDataError(null);

  try {
    const created =
      await materialService.createMaterial(input);

    setMaterials((previous) =>
      [...previous, created].sort((a, b) =>
        a.canonicalName.localeCompare(b.canonicalName)
      )
    );

    return created;
  } catch (error) {
    const message =
      `Unable to create material: ${getErrorMessage(error)}`;

    setDataError(message);

    throw new Error(message);
  }
};
  const handleAddFormulation = async (input: Omit<Formulation, "id">) => {
    setDataError(null);
    try {
      const created = await formulationService.createFormulation(input);
      setFormulations((previous) => [created, ...previous]);
      setMaterials(await materialService.getMaterials());
      setSelectedFormulationId(created.id);
    } catch (error) {
      const message = `Unable to create formulation: ${getErrorMessage(error)}`;
      setDataError(message);
      throw new Error(message);
    }
  };

  const handleAddCharacterization = async (input: CreateSolutionCharacterizationInput) => {
    setDataError(null);
    try {
      const created = await solutionCharacterizationService.createCharacterization(input);
      setCharacterizations((previous) => [created, ...previous]);
      setSelectedCharacterizationId(created.id);
    } catch (error) {
      const message = `Unable to create characterization: ${getErrorMessage(error)}`;
      setDataError(message);
      throw new Error(message);
    }
  };

  const handleAddSetup = async (input: CreateSetupInput) => {
    setDataError(null);
    try {
      const created = await setupService.createSetup(input);
      setSetups((previous) => [created, ...previous]);
      setSelectedSetupId(created.id);
    } catch (error) {
      const message = `Unable to create setup: ${getErrorMessage(error)}`;
      setDataError(message);
      throw new Error(message);
    }
  };

  const handleAddExperiment = async (input: CreateExperimentInput) => {
    setDataError(null);
    try {
      const created = await experimentService.createExperiment(input);
      setExperiments((previous) => [created, ...previous]);
    } catch (error) {
      const message = `Unable to save experiment: ${getErrorMessage(error)}`;
      setDataError(message);
      throw new Error(message);
    }
  };

  const handleImportExperiments = async (parsedList: ParsedExcelResult[], targetProjectId: string): Promise<void> => {
    const imported: Experiment[] = [];
    const skipped: string[] = [];
    const createdFormulations = new Map<string, Formulation>();
    for (const parsed of parsedList) {
      const telemetry = parsed.telemetryData[0];
      let formulationId = resolveImportedFormulationId(parsed, formulations, targetProjectId);
      const existingFormulation = formulations.find((item) => item.id === formulationId);
      if (!existingFormulation) {
        const polymer = findMaterialByReference(parsed.polymerName, materials, "polymer");
        const solvent = findMaterialByReference(parsed.solventName, materials, "solvent");
        const key = `${targetProjectId}:${(parsed.polymerName || "").trim().toLocaleLowerCase()}:${(parsed.solventName || "").trim().toLocaleLowerCase()}`;
        const cached = createdFormulations.get(key);
        if (cached) formulationId = cached.id;
        else if (polymer && solvent) {
          const created = await formulationService.createFormulation({
            projectId: targetProjectId,
            name: readImportedFormulaName(parsed),
            polymerName: polymer.canonicalName,
            polymerMaterialId: polymer.id,
            solvent: solvent.canonicalName,
            solvent1Name: solvent.canonicalName,
            solvent1MaterialId: solvent.id,
            notes: `Created from ${parsed.sourceFile}; original reference: ${parsed.operationIdentifier}`,
            solidsContentPct: 0,
            viscosityMpas: 0,
            conductivityUsCm: 0,
            densityGcm3: 0,
            materialBatchIds: [],
          });
          createdFormulations.set(key, created);
          setFormulations((previous) => [...previous, created]);
          formulationId = created.id;
        }
      }
      const grade = parsed.jetStabilityGrade;
      if (!telemetry || !formulations.some((item) => item.id === formulationId) || grade === undefined || grade < 1 || grade > 4 || !Number.isFinite(telemetry.voltageKv) || !Number.isFinite(telemetry.flowRateMlH) || !Number.isFinite(telemetry.distanceMm)) {
        skipped.push(parsed.operationIdentifier || parsed.sourceFile);
        continue;
      }
      const created = await experimentService.createExperiment({
        formulationId, operationIdentifier: parsed.operationIdentifier, machineModel: parsed.metadata.machine || parsed.metadata.machineModel || "Imported machine",
        injectorType: parsed.injectorType || "Imported injector", collectorType: parsed.collectorType || "Imported collector",
        voltageKv: telemetry.voltageKv, collectorVoltageKv: telemetry.collectorVoltageKv, flowRateMlH: telemetry.flowRateMlH,
        distanceMm: telemetry.distanceMm, drumSpeedRpm: telemetry.drumSpeedRpm, jetStabilityGrade: grade as 1 | 2 | 3 | 4,
        operatorComments: parsed.operatorComments, sourceFile: parsed.sourceFile, temperatureC: telemetry.temperatureC, humidityPct: telemetry.humidityPct,
      });
      imported.push(created);
    }
    setExperiments((previous) => [...imported, ...previous]);
    setDataError(`Imported ${imported.length} run${imported.length === 1 ? "" : "s"} into Firestore.${skipped.length > 0 ? ` Skipped ${skipped.length} incomplete or invalid row${skipped.length === 1 ? "" : "s"}.` : ""}`);
  };

  const renderMainView = (): React.ReactNode => {
    switch (currentView) {
      case "PROJECTS":
        return <ProjectsWorkspace projects={projects} formulations={formulations} experiments={experiments} activeProject={activeProject} onSelectProject={selectProject} onAddProject={handleAddProject} onContinue={() => setCurrentView("FORMULATIONS_CHARACTERIZATION")} />;
      case "FORMULATIONS_CHARACTERIZATION":
        return <Formulations projects={activeProject ? [activeProject] : []
        } materials={materials} formulations={formulations} characterizations={characterizations} 
        selectedFormulationId={selectedFormulationId} selectedCharacterizationId={selectedCharacterizationId} 
        onSelectFormulation={(id) => { setSelectedFormulationId(id); setSelectedCharacterizationId(""); 
          setSelectedSetupId(""); }} onSelectCharacterization={setSelectedCharacterizationId} onAddFormulation=
          {handleAddFormulation} onAddCharacterization={handleAddCharacterization} onAddMaterial={handleAddMaterial} onContinue={() => setCurrentView("SETUPS")} lang={lang} />;
      case "SETUPS":
        return <Setups projects={activeProject ? [activeProject] : []} setups={setups} selectedSetupId={selectedSetupId} onSelectSetup={setSelectedSetupId} onAddSetup={handleAddSetup} onContinue={() => setCurrentView("LIVE_TELEMETRY")} />;
      case "LIVE_TELEMETRY":
        if (!activeProject || !selectedFormulation || !selectedSetup) {
          return <main className="flex-1 overflow-y-auto bg-slate-100 p-8"><div className="rounded-2xl bg-amber-50 p-5 text-amber-800">Complete Project, Formulation and Setup first.</div></main>;
        }
        return <RunConfig project={activeProject} formulation={selectedFormulation} characterization={selectedCharacterization} setup={selectedSetup} projects={projects} formulations={formulations} characterizations={characterizations} setups={setups} experiments={experiments} onAddExperiment={handleAddExperiment} lang={lang} />;
      case "HISTORICAL_EXPERIMENTS":
        return <HistoricalExperiments experiments={experiments} projects={projects} formulations={formulations} materials={materials} loading={isDataLoading} error={dataError} />;
      case "DATABASE_MANAGEMENT":
        return <ExcelImport projects={projects} formulations={formulations} onImportExperiment={handleImportExperiments} lang={lang} />;
    }
  };

  return (
    <div className="fnk-light-app flex h-screen overflow-hidden bg-slate-100 font-sans antialiased text-slate-950">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} projectsCount={projects.length} experimentsCount={experiments.length} collapsed={isSidebarCollapsed} onToggleCollapsed={() => setIsSidebarCollapsed((value) => !value)} activeProjectSelected={Boolean(activeProject)} formulationSelected={Boolean(selectedFormulation)} setupSelected={Boolean(selectedSetup)} />
      <div className="relative flex h-full min-w-0 flex-1 flex-col">
        <div className="flex min-h-[64px] items-center justify-between border-b border-slate-200 bg-white px-6">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Current Project</p><p className="mt-0.5 text-sm font-bold text-slate-800">{activeProject?.name || "No project selected"}</p></div>
          {activeProject && <button type="button" onClick={() => setCurrentView("PROJECTS")} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600">Change Project</button>}
        </div>
        {isDataLoading && <div className="border-b border-blue-100 bg-blue-50 px-6 py-3 text-sm text-blue-700">Loading shared Firestore data…</div>}
        {!isDataLoading && dataSource === "firestore" && <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-200 bg-emerald-50 px-6 py-2 text-xs font-semibold text-emerald-800"><span>Connected to shared Firestore · {projects.length} projects · {experiments.length} experiments · {materials.length} materials · {formulations.length} formulations · {setups.length} setups{lastDataLoadAt ? ` · Updated ${lastDataLoadAt}` : ""}</span><div className="flex items-center gap-3"><span>{import.meta.env.VITE_FIREBASE_PROJECT_ID || "Firebase project unavailable"}</span><button type="button" onClick={() => window.location.reload()} className="rounded-lg border border-emerald-300 bg-white px-3 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100">Refresh shared data</button></div></div>}
        {dataError && <div className="flex items-center justify-between gap-4 border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700"><span>{dataError}</span><button type="button" onClick={() => setDataError(null)} className="rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-semibold">Close</button></div>}
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
  onSelectProject: (projectId: string) => void;
  onAddProject: (project: Omit<Project, "id" | "createdAt">) => Promise<void>;
  onContinue: () => void;
}

function ProjectsWorkspace({ projects, formulations, experiments, activeProject, onSelectProject, onAddProject, onContinue }: ProjectsWorkspaceProps) {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((project) => [project.name, project.description].join(" ").toLowerCase().includes(q));
  }, [projects, search]);

  const createProject = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) { setError("Enter a project code or name."); return; }
    setSaving(true); setError("");
    try { await onAddProject({ name: name.trim(), description: description.trim() }); setName(""); setDescription(""); setShowCreate(false); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to create project."); }
    finally { setSaving(false); }
  };

  const formulationCount = activeProject ? formulations.filter((item) => item.projectId === activeProject.id).length : 0;
  const runCount = activeProject ? experiments.filter((run) => formulations.some((f) => f.id === run.formulationId && f.projectId === activeProject.id)).length : 0;

  return (
    <main className="flex-1 overflow-y-auto bg-slate-100 p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Workflow step 1</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Choose Your Current Project</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">A project works like a folder. Everything created in this workflow is linked to the selected project.</p>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-lg font-bold text-slate-950">Choose Project</h2><p className="text-xs text-slate-500">Search instead of scrolling through every project.</p></div><button type="button" onClick={() => setShowCreate((v) => !v)} className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">{showCreate ? <X className="h-4 w-4"/> : <Plus className="h-4 w-4"/>}{showCreate ? "Cancel" : "Create New Project"}</button></div>
          <div className="relative mt-5"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search project..." style={{ paddingLeft: "2.8rem" }} className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"/></div>
          <div className="relative mt-3"><select value={activeProject?.id || ""} onChange={(e) => onSelectProject(e.target.value)} className="input appearance-none pr-12"><option value="">Choose a project</option>{filtered.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/></div>
        </section>

        {showCreate && <section className="mt-5 rounded-3xl border border-blue-200 bg-white p-6 shadow-sm"><h2 className="font-bold">Create New Project</h2><form onSubmit={createProject} className="mt-5 space-y-4"><label className="block"><span className="label">Project Code / Name</span><input value={name} onChange={(e) => setName(e.target.value)} className="input"/></label><label className="block"><span className="label">Description</span><textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="input resize-none"/></label>{error && <div className="flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><AlertTriangle className="h-4 w-4"/>{error}</div>}<button disabled={saving} className="w-full rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50">{saving ? "Saving..." : "Create Project"}</button></form></section>}

        {activeProject && <section className="mt-5 rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">Selected Project</p><h2 className="mt-1 text-xl font-bold text-slate-950">{activeProject.name}</h2>{activeProject.description && <p className="mt-2 text-sm text-slate-500">{activeProject.description}</p>}<div className="mt-4 flex gap-3"><span className="rounded-xl bg-slate-50 px-4 py-3 text-sm"><b>{formulationCount}</b> formulations</span><span className="rounded-xl bg-slate-50 px-4 py-3 text-sm"><b>{runCount}</b> runs</span></div></section>}

        {activeProject && <div className="mt-7 flex justify-end"><button type="button" onClick={onContinue} className="rounded-2xl bg-blue-600 px-7 py-3 font-bold text-white">Continue to Formulation →</button></div>}
      </div>
      <style>{`.input{width:100%;border:1px solid #e2e8f0;border-radius:1rem;background:#f8fafc;padding:.75rem 1rem;font-size:.875rem;color:#0f172a;outline:none}.input::placeholder{color:#94a3b8}.input:focus{border-color:#60a5fa;box-shadow:0 0 0 4px #dbeafe}.label{display:block;margin-bottom:.5rem;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#64748b}`}</style>
    </main>
  );
}
