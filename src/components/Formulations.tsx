import React, { useState } from "react";
import { FolderPlus, Beaker, Layers, Plus, AlertCircle, Trash2, Tag } from "lucide-react";
import { Project, Formulation } from "../types";
import { AVAILABLE_POLYMERS, AVAILABLE_SOLVENTS } from "../seedData";
import { TRANSLATIONS, Language } from "../lib/translations";

interface FormulationsProps {
  projects: Project[];
  formulations: Formulation[];
  onAddProject: (p: Omit<Project, "id" | "createdAt">) => void;
  onAddFormulation: (f: Omit<Formulation, "id">) => void;
  onDeleteProject?: (id: string) => void;
  onDeleteFormulation?: (id: string) => void;
  lang: Language;
}

export default function Formulations({
  projects,
  formulations,
  onAddProject,
  onAddFormulation,
  onDeleteProject,
  onDeleteFormulation,
  lang
}: FormulationsProps) {
  const t = TRANSLATIONS[lang];

  // Project Form State
  const [newProjName, setNewProjName] = useState("");
  const [newProjDesc, setNewProjDesc] = useState("");
  const [projectError, setProjectError] = useState("");

  // Formulation Form State
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedPolymer, setSelectedPolymer] = useState(AVAILABLE_POLYMERS[0]);
  const [selectedSolvent, setSelectedSolvent] = useState(AVAILABLE_SOLVENTS[0]);
  
  // Custom manual insertion overrides
  const [customPolymer, setCustomPolymer] = useState("");
  const [customSolvent, setCustomSolvent] = useState("");

  const [solidsContent, setSolidsContent] = useState<number>(12.0);
  const [viscosity, setViscosity] = useState<number>(350);
  const [conductivity, setConductivity] = useState<number>(5.5);
  const [density, setDensity] = useState<number>(1.05);
  const [formulationError, setFormulationError] = useState("");

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    setProjectError("");

    if (!newProjName.trim()) {
      setProjectError(t.projectErrorRequired);
      return;
    }

    if (projects.some((p) => p.name.toLowerCase() === newProjName.trim().toLowerCase())) {
      setProjectError(t.projectErrorDuplicate);
      return;
    }

    onAddProject({
      name: newProjName.trim(),
      description: newProjDesc.trim()
    });

    setNewProjName("");
    setNewProjDesc("");
  };

  const handleCreateFormulation = (e: React.FormEvent) => {
    e.preventDefault();
    setFormulationError("");

    if (!selectedProjectId) {
      setFormulationError(lang === "it" 
        ? "Seleziona un progetto valido prima dell'invio." 
        : lang === "es" 
        ? "Seleccione un proyecto válido antes del envío." 
        : "Select a valid project before submitting.");
      return;
    }

    // Determine final material values (either selected from list or custom typed)
    const finalPolymer = selectedPolymer === "CUSTOM" ? customPolymer.trim() : selectedPolymer;
    const finalSolvent = selectedSolvent === "CUSTOM" ? customSolvent.trim() : selectedSolvent;

    if (!finalPolymer) {
      setFormulationError(lang === "it" 
        ? "Inserisci il nome del polimero personalizzato." 
        : lang === "es" 
        ? "Introduzca el nombre del polímero personalizado." 
        : "Please enter the custom polymer name.");
      return;
    }

    if (!finalSolvent) {
      setFormulationError(lang === "it" 
        ? "Inserisci il nome del solvente personalizzato." 
        : lang === "es" 
        ? "Introduzca el nombre del solvente personalizado." 
        : "Please enter the custom solvent name.");
      return;
    }

    onAddFormulation({
      projectId: selectedProjectId,
      polymerName: finalPolymer,
      solvent: finalSolvent,
      solidsContentPct: solidsContent,
      viscosityMpas: viscosity,
      conductivityUsCm: conductivity,
      densityGcm3: density
    });

    // Reset formulation params
    setCustomPolymer("");
    setCustomSolvent("");
    setSelectedPolymer(AVAILABLE_POLYMERS[0]);
    setSelectedSolvent(AVAILABLE_SOLVENTS[0]);
    setSolidsContent(12.0);
    setViscosity(350);
    setConductivity(5.5);
    setDensity(1.05);
  };

  return (
    <div id="formulations-view" className="flex-1 overflow-y-auto bg-[#0a0a0b] p-8 text-[#f4f4f5] flex flex-col space-y-8 select-none">
      
      {/* Title Header */}
      <div className="flex items-center gap-3">
        <Beaker className="w-8 h-8 text-teal-400" />
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">{t.formTitle}</h2>
          <p className="text-xs text-zinc-400">{t.formSubtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Creation Forms Column */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          
          {/* Create Project Card */}
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5 shadow-lg">
            <h3 className="text-sm font-bold tracking-wider uppercase text-zinc-400 mb-4 flex items-center gap-2">
              <FolderPlus className="w-4.5 h-4.5 text-teal-400" />
              {t.newProjectTitle}
            </h3>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  {t.projectCode}
                </label>
                <input
                  id="project-code-input"
                  type="text"
                  placeholder={t.projectCodePlaceholder}
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="w-full bg-[#0a0a0b] text-[#f4f4f5] placeholder-zinc-600 text-sm px-3.5 py-2.5 rounded-xl border border-[#27272a] focus:outline-none focus:border-teal-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  {t.projectDesc}
                </label>
                <textarea
                  id="project-desc-input"
                  rows={2}
                  placeholder={t.projectDescPlaceholder}
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  className="w-full bg-[#0a0a0b] text-[#f4f4f5] placeholder-zinc-600 text-sm px-3.5 py-2 rounded-xl border border-[#27272a] focus:outline-none focus:border-teal-400 transition resize-none"
                />
              </div>

              {projectError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{projectError}</span>
                </div>
              )}

              <button
                id="save-project-btn"
                type="submit"
                className="w-full bg-teal-500 hover:bg-teal-400 text-black text-sm font-bold py-2.5 px-4 rounded-xl transition shadow-lg shadow-teal-500/10 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {t.saveProject}
              </button>
            </form>
          </div>

          {/* Create Formulation Card */}
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5 shadow-lg">
            <h3 className="text-sm font-bold tracking-wider uppercase text-zinc-400 mb-4 flex items-center gap-2">
              <Beaker className="w-4.5 h-4.5 text-teal-400" />
              {t.newFormulationTitle}
            </h3>

            <div className="p-3 bg-teal-500/5 border border-teal-500/15 text-teal-400/90 rounded-xl text-xs flex items-start gap-2.5 mb-4">
              <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
              <span>
                <strong>{t.integrityRuleTitle}</strong> {t.integrityRuleBody}
              </span>
            </div>

            <form onSubmit={handleCreateFormulation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  {t.associateToProject}
                </label>
                <select
                  id="association-project-select"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full bg-[#0a0a0b] text-[#f4f4f5] text-sm px-3.5 py-2.5 rounded-xl border border-[#27272a] focus:outline-none focus:border-teal-400 cursor-pointer"
                >
                  <option value="" className="text-zinc-600">{t.selectProjectPlaceholder}</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#18181b]">{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    {t.polymerLabel}
                  </label>
                  <select
                    id="poly-select-box"
                    value={selectedPolymer}
                    onChange={(e) => setSelectedPolymer(e.target.value)}
                    className="w-full bg-[#0a0a0b] text-[#f4f4f5] text-sm px-3 py-2.5 rounded-xl border border-[#27272a] focus:outline-none focus:border-teal-400 cursor-pointer"
                  >
                    {AVAILABLE_POLYMERS.map((p) => (
                      <option key={p} value={p} className="bg-[#18181b]">{p}</option>
                    ))}
                    <option value="CUSTOM" className="bg-[#18181b] text-teal-400 font-bold">
                      + {lang === "it" ? "Altro polimero..." : lang === "es" ? "Otro polímero..." : "Other polymer..."}
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    {t.solventLabel}
                  </label>
                  <select
                    id="solvent-select-box"
                    value={selectedSolvent}
                    onChange={(e) => setSelectedSolvent(e.target.value)}
                    className="w-full bg-[#0a0a0b] text-[#f4f4f5] text-sm px-3 py-2.5 rounded-xl border border-[#27272a] focus:outline-none focus:border-teal-400 cursor-pointer"
                  >
                    {AVAILABLE_SOLVENTS.map((s) => (
                      <option key={s} value={s} className="bg-[#18181b]">{s}</option>
                    ))}
                    <option value="CUSTOM" className="bg-[#18181b] text-teal-400 font-bold">
                      + {lang === "it" ? "Altro solvente..." : lang === "es" ? "Otro solvente..." : "Other solvent..."}
                    </option>
                  </select>
                </div>
              </div>

              {/* Collapsible custom manual input overrides */}
              {selectedPolymer === "CUSTOM" && (
                <div className="p-3.5 bg-[#0a0a0b] rounded-xl border border-teal-500/20 space-y-1.5 animate-fadeIn">
                  <label className="block text-[10px] font-bold text-teal-400 uppercase tracking-wider">
                    {lang === "it" ? "Specifica Polimero Personalizzato" : lang === "es" ? "Especificar Polímero Personalizado" : "Specify Custom Polymer"}
                  </label>
                  <input
                    id="custom-polymer-input"
                    type="text"
                    placeholder={t.customPolymerPlaceholder}
                    value={customPolymer}
                    onChange={(e) => setCustomPolymer(e.target.value)}
                    className="w-full bg-[#18181b] text-white text-xs px-3 py-2 rounded-lg border border-[#27272a] focus:outline-none focus:border-teal-400 font-medium"
                  />
                </div>
              )}

              {selectedSolvent === "CUSTOM" && (
                <div className="p-3.5 bg-[#0a0a0b] rounded-xl border border-teal-500/20 space-y-1.5 animate-fadeIn">
                  <label className="block text-[10px] font-bold text-teal-400 uppercase tracking-wider">
                    {lang === "it" ? "Specifica Solvente Personalizzato" : lang === "es" ? "Especificar Solvente Personalizado" : "Specify Custom Solvent"}
                  </label>
                  <input
                    id="custom-solvent-input"
                    type="text"
                    placeholder={t.customSolventPlaceholder}
                    value={customSolvent}
                    onChange={(e) => setCustomSolvent(e.target.value)}
                    className="w-full bg-[#18181b] text-white text-xs px-3 py-2 rounded-lg border border-[#27272a] focus:outline-none focus:border-teal-400 font-medium"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    {t.solidsContentPct}
                  </label>
                  <input
                    id="solids-input-box"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={solidsContent}
                    onChange={(e) => setSolidsContent(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0a0a0b] text-[#f4f4f5] font-mono text-sm px-3 py-2.5 rounded-xl border border-[#27272a] focus:outline-none focus:border-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    {t.viscosityMpas}
                  </label>
                  <input
                    id="viscosity-input-box"
                    type="number"
                    step="1"
                    min="0"
                    value={viscosity}
                    onChange={(e) => setViscosity(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#0a0a0b] text-[#f4f4f5] font-mono text-sm px-3 py-2.5 rounded-xl border border-[#27272a] focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    {t.conductivityUsCm}
                  </label>
                  <input
                    id="conductivity-input-box"
                    type="number"
                    step="0.1"
                    min="0"
                    value={conductivity}
                    onChange={(e) => setConductivity(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0a0a0b] text-[#f4f4f5] font-mono text-sm px-3 py-2.5 rounded-xl border border-[#27272a] focus:outline-none focus:border-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    {t.densityGcm3}
                  </label>
                  <input
                    id="density-input-box"
                    type="number"
                    step="0.01"
                    min="0.1"
                    max="5"
                    value={density}
                    onChange={(e) => setDensity(parseFloat(e.target.value) || 0.1)}
                    className="w-full bg-[#0a0a0b] text-[#f4f4f5] font-mono text-sm px-3 py-2.5 rounded-xl border border-[#27272a] focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>

              {formulationError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{formulationError}</span>
                </div>
              )}

              <button
                id="save-formulation-btn"
                type="submit"
                className="w-full bg-teal-500 hover:bg-teal-400 text-black text-sm font-bold py-2.5 px-4 rounded-xl transition shadow-lg shadow-teal-500/10 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {t.registerFormulaButton}
              </button>
            </form>
          </div>

        </div>

        {/* Database View Columns */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 min-h-[600px] flex flex-col">
            <h3 className="text-sm font-bold tracking-wider uppercase text-zinc-400 mb-6 flex items-center gap-2">
              <Layers className="w-4.5 h-4.5 text-teal-400" />
              {t.activeRecipesTitle}
            </h3>

            {projects.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 py-16">
                <Tag className="w-12 h-12 text-zinc-700 mb-3" />
                <p className="text-sm">{t.noProjectsMessage}</p>
                <p className="text-xs text-zinc-600 mt-1">{t.createProjectPrompt}</p>
              </div>
            ) : (
              <div className="space-y-6 overflow-y-auto flex-1 pr-1 max-h-[700px]">
                {projects.map((proj) => {
                  const projectFormulations = formulations.filter((f) => f.projectId === proj.id);
                  return (
                    <div key={proj.id} id={`project-accordion-${proj.id}`} className="bg-[#0a0a0b]/80 rounded-xl border border-[#27272a] overflow-hidden">
                      {/* Project Header section */}
                      <div className="p-4 bg-[#0a0a0b] border-b border-[#27272a]/80 flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded font-bold uppercase">
                            {lang === "it" ? "Progetto" : lang === "es" ? "Proyecto" : "Project"}
                          </span>
                          <h4 className="text-sm font-bold text-white mt-1">{proj.name}</h4>
                          {proj.description && (
                            <p className="text-xs text-zinc-400 leading-relaxed">{proj.description}</p>
                          )}
                        </div>
                        {onDeleteProject && (
                          <button
                            onClick={() => onDeleteProject(proj.id)}
                            className="text-zinc-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-[#18181b] transition cursor-pointer"
                            title="Rimuovi progetto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Associated Formulations */}
                      <div className="p-4 space-y-3">
                        <h5 className="text-[10px] font-bold tracking-wider uppercase text-zinc-500">
                          {t.registeredFormulations} ({projectFormulations.length})
                        </h5>

                        {projectFormulations.length === 0 ? (
                          <p className="text-xs text-zinc-600 italic py-2">
                            {t.noFormulationsMessage}
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {projectFormulations.map((form) => (
                              <div
                                key={form.id}
                                id={`form-badge-${form.id}`}
                                className="bg-[#18181b] border border-[#27272a]/80 p-3.5 rounded-xl space-y-2.5 relative group"
                              >
                                <div className="flex justify-between items-start">
                                  <div className="space-y-0.5">
                                    <div className="text-xs font-bold text-zinc-100">{form.polymerName}</div>
                                    <div className="text-[10px] text-zinc-400 font-medium">{t.solventLabel} {form.solvent}</div>
                                  </div>
                                  {onDeleteFormulation && (
                                    <button
                                      onClick={() => onDeleteFormulation(form.id)}
                                      className="text-zinc-600 hover:text-red-400 p-1 rounded hover:bg-[#0a0a0b] transition opacity-0 group-hover:opacity-100 cursor-pointer"
                                      title="Rimuovi formula"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px] font-mono text-zinc-400 bg-[#0a0a0b]/60 p-2 rounded-lg border border-[#27272a]/40">
                                  <div>
                                    <span className="text-zinc-600 block">{t.solidsShort}:</span>
                                    <span className="text-teal-400 font-bold">{form.solidsContentPct}%</span>
                                  </div>
                                  <div>
                                    <span className="text-zinc-600 block">{t.viscosityShort}:</span>
                                    <span className="text-white text-[9px]">{form.viscosityMpas} mPa·s</span>
                                  </div>
                                  <div>
                                    <span className="text-zinc-600 block">{t.conductivityShort}:</span>
                                    <span className="text-white text-[9px]">{form.conductivityUsCm} µS</span>
                                  </div>
                                  <div>
                                    <span className="text-zinc-600 block">{t.densityShort}:</span>
                                    <span className="text-white text-[9px]">{form.densityGcm3} g/cm³</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
