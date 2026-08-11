import React, { useMemo, useState } from "react";

import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  FlaskConical,
  History,
  Plus,
  Search,
  X,
} from "lucide-react";
import type { Formulation, Project } from "../types";
import type { Material } from "../core/types/material";
import type { SolutionCharacterization } from "../core/types/characterization";
import type { CreateSolutionCharacterizationInput } from "../application/characterizations/characterization.service";
import type { Language } from "../lib/translations";
import type { CreateMaterialInput } from "../application/materials/material.service";

interface Props {
  projects: Project[];
  materials: Material[];
  formulations: Formulation[];
  characterizations: SolutionCharacterization[];
  selectedFormulationId: string;
  selectedCharacterizationId: string;
  onSelectFormulation: (id: string) => void;
  onSelectCharacterization: (id: string) => void;
  onAddMaterial: (
  input: CreateMaterialInput
) => Promise<Material>;
  onAddFormulation: (formulation: Omit<Formulation, "id">) => Promise<void>;
  onAddCharacterization: (input: CreateSolutionCharacterizationInput) => Promise<void>;
  onContinue: () => void;
  lang: Language;
}

type Scope = "project" | "all";

interface FormState {
  name: string;
  polymerId: string;
  polymerConcentrationPct: number;
  solvent1Id: string;
  solvent1RatioPct: number;
  useSolvent2: boolean;
  solvent2Id: string;
  solvent2RatioPct: number;
  notes: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  polymerId: "",
  polymerConcentrationPct: 10,
  solvent1Id: "",
  solvent1RatioPct: 100,
  useSolvent2: false,
  solvent2Id: "",
  solvent2RatioPct: 0,
  notes: "",
};

export default function Formulations({
  projects,
  materials,
  formulations,
  characterizations,
  selectedFormulationId,
  selectedCharacterizationId,
  onSelectFormulation,
  onSelectCharacterization,
  onAddFormulation,
  onAddCharacterization,
  onAddMaterial,
  onContinue,
}: Props) {
  const activeProject = projects[0] ?? null;
  const [scope, setScope] = useState<Scope>(activeProject ? "project" : "all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showCharacterization, setShowCharacterization] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [charForm, setCharForm] = useState({
    solidsContentPct: "",
    viscosityMpas: "",
    conductivityUsCm: "",
    densityGcm3: "",
    surfaceTensionMnM: "",
    ph: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
type NewMaterialTarget =
  | "polymer"
  | "solvent1"
  | "solvent2";

const [newMaterialTarget, setNewMaterialTarget] =
  useState<NewMaterialTarget | null>(null);

const [newMaterial, setNewMaterial] = useState({
  shortName: "",
  canonicalName: "",
  family: "",
  molecularWeight: "",
  supplier: "",
});

const [materialSaving, setMaterialSaving] =
  useState(false);

const [materialError, setMaterialError] =
  useState("");
  const projectFormulations = useMemo(
    () => activeProject ? formulations.filter((item) => item.projectId === activeProject.id) : [],
    [formulations, activeProject]
  );

  const baseFormulations = scope === "project" && activeProject ? projectFormulations : formulations;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return baseFormulations;
    return baseFormulations.filter((item) =>
      [item.name, item.polymerName, item.solvent, item.solvent1Name, item.solvent2Name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [baseFormulations, search]);

  const selected = formulations.find((item) => item.id === selectedFormulationId) ?? null;
  const selectedBelongsToActiveProject = Boolean(selected && activeProject && selected.projectId === activeProject.id);
  const selectedHistory = characterizations
    .filter((item) => item.formulationId === selectedFormulationId)
    .sort((a, b) => parseDate(b.measuredAt) - parseDate(a.measuredAt));

 const polymers = useMemo(() => {
  const bestByShortName = new Map<string, Material>();

  const scoreMaterial = (material: Material): number => {
    let score = 0;

    if (material.polymerFamily?.trim()) score += 10;
    if (material.molecularWeight?.trim()) score += 5;
    if (material.supplier?.trim()) score += 2;
    if (material.articleNumber?.trim()) score += 1;

    return score;
  };

  materials
    .filter((item) =>
      ["polymer", "biopolymer", "copolymer"].includes(item.category)
    )
    .forEach((item) => {
      const shortName = polymerShortName(item);
      const current = bestByShortName.get(shortName);

      if (
        !current ||
        scoreMaterial(item) > scoreMaterial(current)
      ) {
        bestByShortName.set(shortName, item);
      }
    });

  return Array.from(bestByShortName.values()).sort((a, b) =>
    polymerShortName(a).localeCompare(polymerShortName(b))
  );
}, [materials]);
  const solvents = materials.filter((item) => item.category === "solvent");
  const polymer = materials.find((item) => item.id === form.polymerId);
  const solvent1 = materials.find((item) => item.id === form.solvent1Id);
  const solvent2 = materials.find((item) => item.id === form.solvent2Id);
  console.log("SELECTED POLYMER:", polymer);
  console.log("SELECTED SOLVENT 1:", solvent1);
  console.log("SELECTED SOLVENT 2:", solvent2);
const createMaterial = async (
  event: React.FormEvent
) => {
  event.preventDefault();

  if (!newMaterialTarget) {
    return;
  }

  if (!newMaterial.shortName.trim()) {
    setMaterialError("Enter a short name.");
    return;
  }

  if (!newMaterial.canonicalName.trim()) {
    setMaterialError("Enter the full material name.");
    return;
  }

  const category =
    newMaterialTarget === "polymer"
      ? "polymer"
      : "solvent";

  setMaterialSaving(true);
  setMaterialError("");

  try {
    const created = await onAddMaterial({
      shortName: newMaterial.shortName.trim(),
      canonicalName:
        newMaterial.canonicalName.trim(),
      category,
      family:
        newMaterial.family.trim() || undefined,
      molecularWeight:
        newMaterial.molecularWeight.trim() ||
        undefined,
      supplier:
        newMaterial.supplier.trim() || undefined,
    });

    if (newMaterialTarget === "polymer") {
      setForm((current) => ({
        ...current,
        polymerId: created.id,
      }));
    }

    if (newMaterialTarget === "solvent1") {
      setForm((current) => ({
        ...current,
        solvent1Id: created.id,
      }));
    }

    if (newMaterialTarget === "solvent2") {
      setForm((current) => ({
        ...current,
        solvent2Id: created.id,
      }));
    }

    setNewMaterial({
      shortName: "",
      canonicalName: "",
      family: "",
      molecularWeight: "",
      supplier: "",
    });

    setNewMaterialTarget(null);
  } catch (caught) {
    setMaterialError(
      caught instanceof Error
        ? caught.message
        : "Unable to create material."
    );
  } finally {
    setMaterialSaving(false);
  }
};
  const createFormulation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeProject) {
      setError("Select a Current Project before creating a formulation.");
      return;
    }
    if (!polymer || !solvent1) {
      setError("Choose a polymer and at least one solvent.");
      return;
    }
    if (form.useSolvent2 && !solvent2) {
      setError("Choose Solvent 2 or disable the second solvent.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onAddFormulation({
        projectId: activeProject.id,
        name: form.name.trim() || undefined,
        polymerName: polymer.canonicalName,
        polymerMaterialId: polymer.id,
        polymerConcentrationPct: form.polymerConcentrationPct,
        solvent: buildSolventLabel(
          solvent1.canonicalName,
          form.solvent1RatioPct,
          form.useSolvent2 ? solvent2?.canonicalName : undefined,
          form.useSolvent2 ? form.solvent2RatioPct : undefined
        ),
        solvent1Name: solvent1.canonicalName,
        solvent1MaterialId: solvent1.id,
        solvent1RatioPct: form.solvent1RatioPct,
        solvent2Name: form.useSolvent2 ? solvent2?.canonicalName : undefined,
        solvent2MaterialId: form.useSolvent2 ? solvent2?.id : undefined,
        solvent2RatioPct: form.useSolvent2 ? form.solvent2RatioPct : undefined,
        notes: form.notes.trim() || undefined,
        solidsContentPct: form.polymerConcentrationPct,
        viscosityMpas: 0,
        conductivityUsCm: 0,
        densityGcm3: 0,
        materialBatchIds: [],
      });
      setForm(EMPTY_FORM);
      setShowCreate(false);
      setScope("project");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save formulation.");
    } finally {
      setSaving(false);
    }
  };

  const createCharacterization = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      await onAddCharacterization({
        formulationId: selected.id,
        solidsContentPct: optionalNumber(charForm.solidsContentPct),
        viscosityMpas: optionalNumber(charForm.viscosityMpas),
        conductivityUsCm: optionalNumber(charForm.conductivityUsCm),
        densityGcm3: optionalNumber(charForm.densityGcm3),
        surfaceTensionMnM: optionalNumber(charForm.surfaceTensionMnM),
        ph: optionalNumber(charForm.ph),
        measuredAt: new Date().toISOString(),
        notes: charForm.notes.trim() || undefined,
      });
      setCharForm({ solidsContentPct: "", viscosityMpas: "", conductivityUsCm: "", densityGcm3: "", surfaceTensionMnM: "", ph: "", notes: "" });
      setShowCharacterization(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save characterization.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-slate-100 p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Workflow steps 2–3</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Formulation & Characterization</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Search existing formulations without scrolling. Selecting one loads its stored composition automatically.
        </p>

        {!activeProject && (
          <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            Browse mode is available. Select a Current Project only when you want to create a new formulation or continue the experiment workflow.
          </div>
        )}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Choose Formulation</h2>
              <p className="mt-1 text-xs text-slate-500">{filtered.length} matching formulations</p>
            </div>
            <button
              type="button"
              disabled={!activeProject}
              onClick={() => setShowCreate((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showCreate ? "Cancel" : "Create New Formulation"}
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {activeProject && (
              <button
                type="button"
                onClick={() => { setScope("project"); onSelectFormulation(""); }}
                className={`rounded-xl px-4 py-2 text-xs font-bold ${scope === "project" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                Current Project ({projectFormulations.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => { setScope("all"); onSelectFormulation(""); }}
              className={`rounded-xl px-4 py-2 text-xs font-bold ${scope === "all" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              Historical Library ({formulations.length})
            </button>
          </div>

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by formulation, polymer or solvent..."
              style={{ paddingLeft: "2.8rem" }}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div className="relative mt-3">
            <select
              value={selectedFormulationId}
              onChange={(e) => { onSelectFormulation(e.target.value); onSelectCharacterization(""); }}
              className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Choose a formulation</option>
              {filtered.map((item) => <option key={item.id} value={item.id}>{formulationLabel(item)}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </section>

        {showCreate && activeProject && (
          <section className="mt-5 rounded-3xl border border-blue-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <FlaskConical className="h-5 w-5 text-blue-600" />
              <div>
                <h2 className="font-bold text-slate-950">Create New Formulation</h2>
                <p className="text-xs text-slate-500">Composition only. Measured characterization remains separate.</p>
              </div>
            </div>

            <form onSubmit={createFormulation} className="mt-6 space-y-5">
              <TextInput label="Formulation Name / ID" value={form.name} onChange={(name) => setForm((s) => ({ ...s, name }))} />

              <div className="grid gap-5 md:grid-cols-2">
<div>
  <MaterialSelect
    label="Polymer"
    value={form.polymerId}
    materials={polymers}
    shortName
    onChange={(polymerId) =>
      setForm((s) => ({
        ...s,
        polymerId,
      }))
    }
  />

  <button
    type="button"
    onClick={() =>
      setNewMaterialTarget(
        newMaterialTarget === "polymer"
          ? null
          : "polymer"
      )
    }
    className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-700"
  >
    + Add new polymer
  </button>
</div>                <NumberInput label="Polymer Concentration" unit="%" value={form.polymerConcentrationPct} onChange={(polymerConcentrationPct) => setForm((s) => ({ ...s, polymerConcentrationPct }))} />
              </div>
              {newMaterialTarget && (
  <form
    onSubmit={createMaterial}
    className="rounded-2xl border border-blue-200 bg-blue-50 p-5"
  >
    <div className="flex items-center justify-between">
      <div>
        <h3 className="font-bold text-slate-900">
          {newMaterialTarget === "polymer"
            ? "Add New Polymer"
            : "Add New Solvent"}
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          Save this material to the shared material database.
        </p>
      </div>

      <button
        type="button"
        onClick={() =>
          setNewMaterialTarget(null)
        }
        className="text-slate-400 hover:text-slate-700"
      >
        <X className="h-4 w-4" />
      </button>
    </div>

    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <TextInput
        label="Short Name"
        value={newMaterial.shortName}
        onChange={(shortName) =>
          setNewMaterial((current) => ({
            ...current,
            shortName,
          }))
        }
      />

      <TextInput
        label="Full Material Name"
        value={newMaterial.canonicalName}
        onChange={(canonicalName) =>
          setNewMaterial((current) => ({
            ...current,
            canonicalName,
          }))
        }
      />

      <TextInput
        label={
          newMaterialTarget === "polymer"
            ? "Polymer Type"
            : "Solvent Type"
        }
        value={newMaterial.family}
        onChange={(family) =>
          setNewMaterial((current) => ({
            ...current,
            family,
          }))
        }
      />

      {newMaterialTarget === "polymer" && (
        <TextInput
          label="Molecular Weight"
          value={newMaterial.molecularWeight}
          onChange={(molecularWeight) =>
            setNewMaterial((current) => ({
              ...current,
              molecularWeight,
            }))
          }
        />
      )}

      <TextInput
        label="Supplier"
        value={newMaterial.supplier}
        onChange={(supplier) =>
          setNewMaterial((current) => ({
            ...current,
            supplier,
          }))
        }
      />
    </div>

    {materialError && (
      <div className="mt-4">
        <ErrorMessage message={materialError} />
      </div>
    )}

    <button
      type="submit"
      disabled={materialSaving}
      className="mt-4 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
    >
      {materialSaving
        ? "Saving..."
        : "Save Material"}
    </button>
  </form>
)}
              {polymer && <MaterialSummary material={polymer} />}

              <div className="grid gap-5 md:grid-cols-2">
<div>
  <MaterialSelect
    label="Solvent 1"
    value={form.solvent1Id}
    materials={solvents}
    onChange={(solvent1Id) =>
      setForm((s) => ({
        ...s,
        solvent1Id,
      }))
    }
  />

  <button
    type="button"
    onClick={() =>
      setNewMaterialTarget(
        newMaterialTarget === "solvent1"
          ? null
          : "solvent1"
      )
    }
    className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-700"
  >
    + Add new solvent
  </button>
</div>                <NumberInput label="Solvent 1 Ratio" unit="%" value={form.solvent1RatioPct} onChange={(solvent1RatioPct) => setForm((s) => ({ ...s, solvent1RatioPct }))} />
              </div>
              {solvent1 && <MaterialSummary material={solvent1} />}

              <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={form.useSolvent2} onChange={(e) => setForm((s) => ({ ...s, useSolvent2: e.target.checked }))} />
                Use a second solvent
              </label>

              {form.useSolvent2 && (
                <>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <MaterialSelect label="Solvent 2" value={form.solvent2Id} materials={solvents} onChange={(solvent2Id) => setForm((s) => ({ ...s, solvent2Id }))} />
                      <button
                        type="button"
                        onClick={() =>
                          setNewMaterialTarget(
                            newMaterialTarget === "solvent2"
                              ? null
                              : "solvent2"
                          )
                        }
                        className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-700"
                      >
                        + Add new solvent
                      </button>
                    </div>
                    <NumberInput label="Solvent 2 Ratio" unit="%" value={form.solvent2RatioPct} onChange={(solvent2RatioPct) => setForm((s) => ({ ...s, solvent2RatioPct }))} />
                  </div>
                  {solvent2 && <MaterialSummary material={solvent2} />}
                </>
              )}

              <label className="block">
                <span className="label">Formulation Notes</span>
                <textarea rows={3} value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} className="input resize-none" />
              </label>

              {error && <ErrorMessage message={error} />}
              <button disabled={saving} className="w-full rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50">
                {saving ? "Saving..." : "Create Formulation"}
              </button>
            </form>
          </section>
        )}

        {selected && (
          <>
            <section className="mt-5 rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">Selected Formulation</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">{formulationLabel(selected)}</h2>

              {!selectedBelongsToActiveProject && activeProject && (
                <p className="mt-2 text-xs text-amber-700">
                  This is a historical formulation from another project. It is visible for reference, but choose/create a formulation in the Current Project before continuing the run.
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                <Info label="Polymer" value={clean(selected.polymerName)} />
                <Info label="Polymer Concentration" value={positive(selected.polymerConcentrationPct) ? `${selected.polymerConcentrationPct}%` : ""} />
                <Info label="Solvent 1" value={clean(selected.solvent1Name) || clean(selected.solvent)} />
                <Info label="Solvent 1 Ratio" value={positive(selected.solvent1RatioPct) ? `${selected.solvent1RatioPct}%` : ""} />
                <Info label="Solvent 2" value={clean(selected.solvent2Name)} />
                <Info label="Solvent 2 Ratio" value={positive(selected.solvent2RatioPct) ? `${selected.solvent2RatioPct}%` : ""} />
              </div>
              {clean(selected.notes) && <p className="mt-4 text-sm text-slate-500">{selected.notes}</p>}
            </section>

            <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Characterization</h2>
                  <p className="mt-1 text-xs text-slate-500">Measurements linked only to the selected formulation.</p>
                </div>
                <button type="button" onClick={() => setShowCharacterization((v) => !v)} className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-bold text-violet-700">
                  {showCharacterization ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {showCharacterization ? "Cancel" : "Add Characterization"}
                </button>
              </div>

              {selectedHistory.length > 0 ? (
                <div className="mt-5">
                  <div className="relative">
                    <select
                      value={selectedCharacterizationId}
                      onChange={(e) => onSelectCharacterization(e.target.value)}
                      className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900"
                    >
                      <option value="">Choose characterization (optional)</option>
                      {selectedHistory.map((item) => (
                        <option key={item.id} value={item.id}>{formatDate(item.measuredAt)}{compactCharacterization(item)}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              ) : (
                <p className="mt-5 text-sm text-slate-400">No characterization measurements are stored for this formulation.</p>
              )}

              {showCharacterization && (
                <form onSubmit={createCharacterization} className="mt-5 border-t border-slate-100 pt-5">
                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      ["Solid Content","wt %","solidsContentPct"],
                      ["Viscosity","mPa·s","viscosityMpas"],
                      ["Conductivity","µS/cm","conductivityUsCm"],
                      ["Density","g/cm³","densityGcm3"],
                      ["Surface Tension","mN/m","surfaceTensionMnM"],
                      ["pH","","ph"],
                    ].map(([label,unit,key]) => (
                      <label key={key} className="block">
                        <span className="label">{label}</span>
                        <input type="number" step="0.01" value={(charForm as any)[key]} onChange={(e) => setCharForm((s) => ({ ...s, [key]: e.target.value }))} className="input" placeholder={unit} />
                      </label>
                    ))}
                  </div>
                  <label className="mt-4 block"><span className="label">Measurement Notes</span><textarea rows={3} value={charForm.notes} onChange={(e) => setCharForm((s) => ({ ...s, notes: e.target.value }))} className="input resize-none" /></label>
                  {error && <div className="mt-4"><ErrorMessage message={error} /></div>}
                  <button disabled={saving} className="mt-4 w-full rounded-2xl bg-violet-600 px-5 py-3 font-bold text-white disabled:opacity-50">Save Characterization</button>
                </form>
              )}
            </section>

            {activeProject && selectedBelongsToActiveProject && (
              <div className="mt-7 flex justify-end">
                <button type="button" onClick={onContinue} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-7 py-3 font-bold text-white">
                  Continue to Machine Setup <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <style>{`.input{width:100%;border:1px solid #e2e8f0;border-radius:1rem;background:#f8fafc;padding:.75rem 1rem;font-size:.875rem;color:#0f172a;outline:none}.input::placeholder{color:#94a3b8}.input:focus{border-color:#60a5fa;box-shadow:0 0 0 4px #dbeafe}.label{display:block;margin-bottom:.5rem;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#64748b}`}</style>
    </main>
  );
}

function MaterialSelect({
  label,
  value,
  materials,
  onChange,
  shortName = false,
}: {
  label: string;
  value: string;
  materials: Material[];
  onChange: (value: string) => void;
  shortName?: boolean;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input">
        <option value="">Choose material</option>
        {materials.map((material) => (
          <option key={material.id} value={material.id}>
            {shortName ? polymerShortName(material) : material.canonicalName}
          </option>
        ))}
      </select>
    </label>
  );
}

function polymerShortName(material: Material): string {
  const source = [
    material.polymerFamily,
    ...material.aliases,
    ...material.commercialNames,
    material.canonicalName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (source.includes("polycaprolactone") || source.includes("pcl")) return "PCL";
  if (source.includes("polyethylene oxide") || source.includes("peo") || source.includes("polyox")) return "PEO";
  if (source.includes("polyvinyl alcohol") || source.includes("pva")) return "PVA";
  if (source.includes("polyacrylonitrile") || source.includes("pan")) return "PAN";
  if (source.includes("cellulose acetate") || source.includes("celac")) return "CA";
  if (source.includes("polyvinylpyrrolidone") || source.includes("pvp")) return "PVP";
  if (source.includes("polyvinylidene fluoride") || source.includes("pvdf")) return "PVDF";
  if (source.includes("polylactic acid") || source.includes("pla")) return "PLA";
  if (source.includes("plga")) return "PLGA";
  if (source.includes("thermoplastic polyurethane") || source.includes("tpu")) return "TPU";
  if (source.includes("polyurethane") || source.includes("pu")) return "PU";
  if (source.includes("polystyrene") || source.includes("ps")) return "PS";
  if (source.includes("pmma")) return "PMMA";
  if (source.includes("pco")) return "PCO";

  return material.polymerFamily?.trim() || material.canonicalName;
}
function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><span className="label">{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} className="input" /></label>; }
function NumberInput({ label, unit, value, onChange }: { label: string; unit: string; value: number; onChange: (value: number) => void }) { return <label className="block"><span className="label">{label}</span><div className="relative"><input type="number" step="0.01" value={value} onChange={(e) => onChange(Number(e.target.value))} className="input pr-16" /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">{unit}</span></div></label>; }
function MaterialSummary({ material }: { material: Material }) {
  const isPolymer = ["polymer", "biopolymer", "copolymer"].includes(
    material.category
  );

  const type = isPolymer
    ? material.polymerFamily
    : material.solventFamily;

  const rows = [
    [
      isPolymer ? "Polymer Type" : "Solvent Type",
      type,
    ],
    [
      "Molecular Weight",
      material.molecularWeight,
    ],
    [
      "Supplier",
      material.supplier,
    ],
  ].filter(([, value]) => clean(value));

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(([label, value]) => (
        <div
          key={String(label)}
          className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {label}
          </p>

          <p className="mt-1 text-sm font-bold text-slate-900">
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) { return value ? <div className="rounded-xl bg-slate-50 px-4 py-3"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{value}</p></div> : null; }
function ErrorMessage({ message }: { message: string }) { return <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{message}</div>; }
function clean(value: unknown): string { const text=String(value ?? "").trim(); if (!text) return ""; const n=text.toLowerCase(); return n.includes("unknown") || n==="n/d" || n==="not specified" ? "" : text; }
function positive(value: number | undefined): boolean { return typeof value === "number" && Number.isFinite(value) && value > 0; }
function optionalNumber(value: string): number | undefined { if (!value.trim()) return undefined; const n=Number(value); return Number.isFinite(n) ? n : undefined; }
function formulationLabel(item: Formulation): string { return item.name?.trim() || [clean(item.polymerName), clean(item.solvent)].filter(Boolean).join(" / ") || "Formulation"; }
function buildSolventLabel(s1: string, r1: number, s2?: string, r2?: number): string { return [s1 ? `${s1}${positive(r1) ? ` (${r1}%)` : ""}` : "", s2 ? `${s2}${positive(r2) ? ` (${r2}%)` : ""}` : ""].filter(Boolean).join(" + "); }
function parseDate(value?: string): number { if (!value) return 0; const t=Date.parse(value); return Number.isNaN(t)?0:t; }
function formatDate(value?: string): string { if (!value) return "Measurement"; const d=new Date(value); return Number.isNaN(d.getTime()) ? "Measurement" : d.toLocaleDateString(); }
function compactCharacterization(item: SolutionCharacterization): string { const bits: string[]=[]; if (positive(item.viscosityMpas)) bits.push(`visc. ${item.viscosityMpas}`); if (positive(item.conductivityUsCm)) bits.push(`cond. ${item.conductivityUsCm}`); return bits.length ? ` · ${bits.join(" · ")}` : ""; }
