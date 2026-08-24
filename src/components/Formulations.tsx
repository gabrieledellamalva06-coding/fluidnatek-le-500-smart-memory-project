import React, { useEffect, useMemo, useRef, useState } from "react";

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
import type { Experiment, Formulation, Project } from "../types";
import type { Material } from "../core/types/material";
import type { SolutionCharacterization } from "../core/types/characterization";
import type { CreateSolutionCharacterizationInput } from "../application/characterizations/characterization.service";
import { solutionCharacterizationService, type UpdateSolutionCharacterizationInput } from "../application/characterizations/characterization.service";
import type { SolutionCharacterizationRevision, SolutionCharacterizationValues } from "../core/types/characterization";
import { hasCharacterizationUpdates, isSessionCharacterizationEditable, revisionTimestamp } from "../features/characterization-revisions/characterizationRevision";
import type { Language } from "../lib/translations";
import type { CreateMaterialInput } from "../application/materials/material.service";
import {
  buildPolymerMaterialOptions,
  formatPolymerOptionLabel,
} from "./polymerMaterialOptions";
import {
  buildCharacterizationComparisonRows,
  buildHistoricalCharacterizationEvidenceResult,
  buildPolymerCompositionDisplay,
  type ExcludedHistoricalCharacterizationEvidence,
  type HistoricalCharacterizationEvidence,
} from "../features/historical-characterization/characterizationComparison";
import {
  addOptionalPolymerRow,
  optionalPolymerRowIsComplete,
  removeOptionalPolymerRow,
  submittedOptionalPolymers,
  visibleOptionalPolymerRows,
  type OptionalPolymerRowCount,
} from "../features/formulations/optionalPolymerRows";
import {
  addOptionalSolventRow,
  clearNewOptionalSolventRow,
  removeOptionalSolventRow,
  submittedOptionalSolvents,
  validateVisibleSolvents,
  visibleOptionalSolventRows,
  type OptionalSolventRowCount,
} from "../features/formulations/optionalSolventRows";
import { hydratePolymerSelection, type PolymerIdentityOption } from "../features/formulations/polymerIdentityOptions";
import {
  buildPolymerCatalogCreateInput,
  EMPTY_POLYMER_CATALOG_DRAFT,
  findDuplicatePolymerMaterial,
  resolveCatalogIdentity,
  validatePolymerCatalogDraft,
  type PolymerCatalogDraft,
} from "../features/formulations/polymerCatalogMaterial";

interface Props {
  projects: Project[];
  materials: Material[];
  formulations: Formulation[];
  characterizations: SolutionCharacterization[];
  experiments: Experiment[];
  selectedFormulationId: string;
  selectedCharacterizationId: string;
  onSelectFormulation: (id: string) => void;
  onSelectCharacterization: (id: string) => void;
  onAddMaterial: (
  input: CreateMaterialInput
) => Promise<Material>;
  onAddFormulation: (formulation: Omit<Formulation, "id">) => Promise<void>;
  onAddCharacterization: (input: CreateSolutionCharacterizationInput) => Promise<SolutionCharacterization>;
  onUpdateCharacterization: (id: string, input: UpdateSolutionCharacterizationInput) => Promise<SolutionCharacterization>;
  editableCharacterizationIds: ReadonlySet<string>;
  onContinue: () => void;
  lang: Language;
}

type Scope = "project" | "all";

interface FormState {
  name: string;
  polymerId: string;
  polymerConcentrationPct: number;
  polymer2Id: string;
  polymer2ConcentrationPct: number | undefined;
  polymer3Id: string;
  polymer3ConcentrationPct: number | undefined;
  solvent1Id: string;
  solvent1RatioPct: number | undefined;
  solvent2Id: string;
  solvent2RatioPct: number | undefined;
  solvent3Id: string;
  solvent3RatioPct: number | undefined;
  notes: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  polymerId: "",
  polymerConcentrationPct: 10,
  polymer2Id: "",
  polymer2ConcentrationPct: undefined,
  polymer3Id: "",
  polymer3ConcentrationPct: undefined,
  solvent1Id: "",
  solvent1RatioPct: 100,
  solvent2Id: "",
  solvent2RatioPct: undefined,
  solvent3Id: "",
  solvent3RatioPct: undefined,
  notes: "",
};

export default function Formulations({
  projects,
  materials,
  formulations,
  characterizations,
  experiments,
  selectedFormulationId,
  selectedCharacterizationId,
  onSelectFormulation,
  onSelectCharacterization,
  onAddFormulation,
  onAddCharacterization,
  onUpdateCharacterization,
  editableCharacterizationIds,
  onAddMaterial,
  onContinue,
}: Props) {
  const activeProject = projects[0] ?? null;
  const [scope, setScope] = useState<Scope>(activeProject ? "project" : "all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showCharacterization, setShowCharacterization] = useState(false);
  const [historicalCharacterizationId, setHistoricalCharacterizationId] = useState("");
  const [editingCurrentCharacterization, setEditingCurrentCharacterization] = useState(false);
  const [revisions, setRevisions] = useState<SolutionCharacterizationRevision[]>([]);
  const [revisionPopoverOpen, setRevisionPopoverOpen] = useState(false);
  const [revisionHistoryOpen, setRevisionHistoryOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [optionalPolymerRowCount, setOptionalPolymerRowCount] = useState<OptionalPolymerRowCount>(
    () => visibleOptionalPolymerRows(EMPTY_FORM)
  );
  const polymer2SelectRef = useRef<HTMLSelectElement>(null);
  const polymer3SelectRef = useRef<HTMLSelectElement>(null);
  const addPolymerButtonRef = useRef<HTMLButtonElement>(null);
  const pendingPolymerFocus = useRef<2 | 3 | null>(null);
  const [polymerIdentityKey, setPolymerIdentityKey] = useState("");
  const [polymer2IdentityKey, setPolymer2IdentityKey] = useState("");
  const [polymer3IdentityKey, setPolymer3IdentityKey] = useState("");
  const [optionalSolventRowCount, setOptionalSolventRowCount] = useState<OptionalSolventRowCount>(
    () => visibleOptionalSolventRows(EMPTY_FORM)
  );
  const solvent2SelectRef = useRef<HTMLSelectElement>(null);
  const solvent3SelectRef = useRef<HTMLSelectElement>(null);
  const addSolventButtonRef = useRef<HTMLButtonElement>(null);
  const pendingSolventFocus = useRef<2 | 3 | null>(null);
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
  const [polymerCatalogDraft, setPolymerCatalogDraft] = useState<PolymerCatalogDraft>(EMPTY_POLYMER_CATALOG_DRAFT);
  const [duplicatePolymerMaterial, setDuplicatePolymerMaterial] = useState<Material | null>(null);
  const catalogIdentityRef = useRef<HTMLSelectElement>(null);
  const catalogNewIdentityRef = useRef<HTMLInputElement>(null);
  const catalogTriggerRef = useRef<HTMLButtonElement>(null);
  const catalogSaveInFlight = useRef(false);
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
  const currentCharacterization = characterizations.find((item) => item.id === selectedCharacterizationId) ?? null;
  const historicalEvidenceResult = useMemo(
    () => buildHistoricalCharacterizationEvidenceResult({
      current: currentCharacterization,
      formulation: selected,
      formulations,
      characterizations,
      experiments,
      materials,
    }),
    [currentCharacterization, selected, formulations, characterizations, experiments, materials]
  );
  const historicalEvidence = historicalEvidenceResult.eligible;
  const selectedHistoricalEvidence = historicalEvidence.find(
    (item) => item.characterization.id === historicalCharacterizationId
  ) ?? null;
  const currentCharacterizationEditable = Boolean(currentCharacterization && isSessionCharacterizationEditable(currentCharacterization.id, editableCharacterizationIds));
  useEffect(() => {
    let cancelled = false;
    setRevisionPopoverOpen(false);
    setRevisionHistoryOpen(false);
    setEditingCurrentCharacterization(false);
    if (!currentCharacterization) { setRevisions([]); return () => { cancelled = true; }; }
    void solutionCharacterizationService.getRevisions(currentCharacterization.id)
      .then((items) => { if (!cancelled) setRevisions(items); })
      .catch(() => { if (!cancelled) setRevisions([]); });
    return () => { cancelled = true; };
  }, [currentCharacterization?.id]);

  const polymers = useMemo(
    () => buildPolymerMaterialOptions(materials),
    [materials]
  );
  const polymer1Selection = useMemo(() => hydratePolymerSelection(polymers, form.polymerId), [polymers, form.polymerId]);
  const polymer2Selection = useMemo(() => hydratePolymerSelection(polymers, form.polymer2Id), [polymers, form.polymer2Id]);
  const polymer3Selection = useMemo(() => hydratePolymerSelection(polymers, form.polymer3Id), [polymers, form.polymer3Id]);
  const solvents = materials.filter((item) => item.category === "solvent");
  const polymer = materials.find((item) => item.id === form.polymerId);
  const solvent1 = materials.find((item) => item.id === form.solvent1Id);
  const solvent2 = materials.find((item) => item.id === form.solvent2Id);
  const solventValidation = validateVisibleSolvents(form.solvent1Id, form.solvent1RatioPct, form, optionalSolventRowCount);
  const solventTotal = solventValidation.total;
  const duplicateSolventId = solventValidation.duplicateMaterialId;

  useEffect(() => {
    const requiredRows = visibleOptionalPolymerRows(form);
    setOptionalPolymerRowCount((current) => Math.max(current, requiredRows) as OptionalPolymerRowCount);
  }, [form.polymer2Id, form.polymer2ConcentrationPct, form.polymer3Id, form.polymer3ConcentrationPct]);

  useEffect(() => { if (form.polymerId) setPolymerIdentityKey(polymer1Selection.identityKey); }, [form.polymerId, polymer1Selection.identityKey]);
  useEffect(() => { if (form.polymer2Id) setPolymer2IdentityKey(polymer2Selection.identityKey); }, [form.polymer2Id, polymer2Selection.identityKey]);
  useEffect(() => { if (form.polymer3Id) setPolymer3IdentityKey(polymer3Selection.identityKey); }, [form.polymer3Id, polymer3Selection.identityKey]);

  useEffect(() => {
    if (pendingPolymerFocus.current === 2) polymer2SelectRef.current?.focus();
    if (pendingPolymerFocus.current === 3) polymer3SelectRef.current?.focus();
    pendingPolymerFocus.current = null;
  }, [optionalPolymerRowCount]);

  const addPolymerRow = () => {
    const next = addOptionalPolymerRow(optionalPolymerRowCount);
    if (next === optionalPolymerRowCount) return;
    pendingPolymerFocus.current = next === 1 ? 2 : 3;
    if (next === 1) setPolymer2IdentityKey(""); else setPolymer3IdentityKey("");
    setOptionalPolymerRowCount(next);
  };

  const removePolymerRow = (row: 2 | 3) => {
    if (row === 2) {
      setPolymer2IdentityKey(form.polymer3Id || form.polymer3ConcentrationPct !== undefined ? polymer3IdentityKey : "");
      setPolymer3IdentityKey("");
    } else setPolymer3IdentityKey("");
    setForm((current) => ({ ...current, ...removeOptionalPolymerRow(current, row) }));
    setOptionalPolymerRowCount((current) => Math.max(0, current - 1) as OptionalPolymerRowCount);
    window.requestAnimationFrame(() => addPolymerButtonRef.current?.focus());
  };

  useEffect(() => {
    const requiredRows = visibleOptionalSolventRows(form);
    setOptionalSolventRowCount((current) => Math.max(current, requiredRows) as OptionalSolventRowCount);
  }, [form.solvent2Id, form.solvent2RatioPct, form.solvent3Id, form.solvent3RatioPct]);

  useEffect(() => {
    if (pendingSolventFocus.current === 2) solvent2SelectRef.current?.focus();
    if (pendingSolventFocus.current === 3) solvent3SelectRef.current?.focus();
    pendingSolventFocus.current = null;
  }, [optionalSolventRowCount]);

  const addSolventRow = () => {
    const next = addOptionalSolventRow(optionalSolventRowCount);
    if (next === optionalSolventRowCount) return;
    setForm((current) => ({ ...current, ...clearNewOptionalSolventRow(current, next === 1 ? 2 : 3) }));
    pendingSolventFocus.current = next === 1 ? 2 : 3;
    setOptionalSolventRowCount(next);
  };

  const removeSolventRow = (row: 2 | 3) => {
    setForm((current) => ({ ...current, ...removeOptionalSolventRow(current, row) }));
    setOptionalSolventRowCount((current) => Math.max(0, current - 1) as OptionalSolventRowCount);
    window.requestAnimationFrame(() => addSolventButtonRef.current?.focus());
  };
  const closePolymerCatalog = () => {
    setNewMaterialTarget(null);
    setPolymerCatalogDraft(EMPTY_POLYMER_CATALOG_DRAFT);
    setDuplicatePolymerMaterial(null);
    setMaterialError("");
    window.requestAnimationFrame(() => catalogTriggerRef.current?.focus());
  };

  const selectCatalogMaterial = (material: Material) => {
    const hydrated = hydratePolymerSelection([...materials, material], material.id);
    setPolymerIdentityKey(hydrated.identityKey);
    setForm((current) => ({ ...current, polymerId: material.id }));
    closePolymerCatalog();
  };

  const createPolymerCatalogMaterial = async () => {
    if (catalogSaveInFlight.current) return;
    const identities = polymer1Selection.identities;
    const validationError = validatePolymerCatalogDraft(polymerCatalogDraft, identities);
    if (validationError) { setMaterialError(validationError); return; }
    const duplicate = findDuplicatePolymerMaterial(polymerCatalogDraft, identities);
    if (duplicate) {
      setDuplicatePolymerMaterial(duplicate);
      setMaterialError("This exact material variant already exists. Select the existing variant instead.");
      return;
    }
    catalogSaveInFlight.current = true;
    setMaterialSaving(true);
    setMaterialError("");
    try {
      const created = await onAddMaterial(buildPolymerCatalogCreateInput(polymerCatalogDraft, identities));
      selectCatalogMaterial(created);
    } catch (caught) {
      setMaterialError(caught instanceof Error ? caught.message : "Unable to create material.");
    } finally {
      catalogSaveInFlight.current = false;
      setMaterialSaving(false);
    }
  };

  useEffect(() => {
    if (newMaterialTarget !== "polymer") return;
    if (polymerCatalogDraft.mode === "new") catalogNewIdentityRef.current?.focus();
    else catalogIdentityRef.current?.focus();
  }, [newMaterialTarget, polymerCatalogDraft.mode]);

const createMaterial = async (
  event?: React.FormEvent
) => {
  event?.preventDefault();

  if (!newMaterialTarget) {
    return;
  }

  if (newMaterialTarget === "polymer") return;

  if (!newMaterial.shortName.trim()) {
    setMaterialError("Enter a short name.");
    return;
  }

  if (!newMaterial.canonicalName.trim()) {
    setMaterialError("Enter the full material name.");
    return;
  }

  setMaterialSaving(true);
  setMaterialError("");

  try {
    const created = await onAddMaterial({
      shortName: newMaterial.shortName.trim(),
      canonicalName:
        newMaterial.canonicalName.trim(),
      category: "solvent",
      family:
        newMaterial.family.trim() || undefined,
      molecularWeight:
        newMaterial.molecularWeight.trim() ||
        undefined,
      supplier:
        newMaterial.supplier.trim() || undefined,
    });

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
    if (
      (optionalPolymerRowCount >= 1 && !optionalPolymerRowIsComplete(form.polymer2Id, form.polymer2ConcentrationPct)) ||
      (optionalPolymerRowCount >= 2 && !optionalPolymerRowIsComplete(form.polymer3Id, form.polymer3ConcentrationPct))
    ) {
      setError("Complete each visible optional polymer and its concentration, or remove the row.");
      return;
    }
    if (!solventValidation.rowsComplete) {
      setError("Complete each visible optional solvent and its ratio, or remove the row.");
      return;
    }
    if (!solventValidation.ratiosValid) {
      setError("Each solvent ratio must be between 0 and 100%.");
      return;
    }
    if (duplicateSolventId) {
      setError("Each visible solvent must be a different material.");
      return;
    }
    if (!solventValidation.totalValid) {
      setError("Solvent ratios must total 100%.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const optionalPolymers = submittedOptionalPolymers(form, optionalPolymerRowCount);
      const optionalSolvents = submittedOptionalSolvents(form, optionalSolventRowCount);
      const submittedSolvent2 = optionalSolvents[0];
      await onAddFormulation({
        projectId: activeProject.id,
        name: form.name.trim() || undefined,
        polymerName: polymer.canonicalName,
        polymerMaterialId: polymer.id,
        polymerConcentrationPct: form.polymerConcentrationPct,
        solvent: buildSolventLabel(
          solvent1.canonicalName,
          form.solvent1RatioPct as number,
          submittedSolvent2 ? solvent2?.canonicalName : undefined,
          submittedSolvent2?.ratioPct
        ),
        solvent1Name: solvent1.canonicalName,
        solvent1MaterialId: solvent1.id,
        solvent1RatioPct: form.solvent1RatioPct as number,
        solvent2Name: submittedSolvent2 ? solvent2?.canonicalName : undefined,
        solvent2MaterialId: submittedSolvent2 ? solvent2?.id : undefined,
        solvent2RatioPct: submittedSolvent2?.ratioPct,
        notes: form.notes.trim() || undefined,
        solidsContentPct: form.polymerConcentrationPct,
        viscosityMpas: 0,
        conductivityUsCm: 0,
        densityGcm3: 0,
        materialBatchIds: [],
        compositionComponents: [
          { materialId: polymer.id, materialName: polymer.canonicalName, role: "polymer", quantity: form.polymerConcentrationPct, unit: "wt_pct", basis: "wt/wt" },
          ...optionalPolymers.map((item) => ({ materialId: item.materialId, materialName: materials.find((material) => material.id === item.materialId)?.canonicalName || item.materialId, role: "polymer" as const, quantity: item.concentrationPct, unit: "wt_pct" as const, basis: "wt/wt" as const })),
          { materialId: solvent1.id, materialName: solvent1.canonicalName, role: "solvent", quantity: form.solvent1RatioPct as number, unit: "wt_pct", basis: "wt/wt" },
          ...optionalSolvents.map((item) => { const material = materials.find((candidate) => candidate.id === item.materialId); return { materialId: item.materialId, materialName: material?.canonicalName || item.materialId, role: "solvent" as const, quantity: item.ratioPct, unit: "wt_pct" as const, basis: "wt/wt" as const }; }),
        ],
      });
      setForm(EMPTY_FORM);
      setOptionalPolymerRowCount(0);
      setPolymerIdentityKey("");
      setPolymer2IdentityKey("");
      setPolymer3IdentityKey("");
      setOptionalSolventRowCount(0);
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
              onChange={(e) => { onSelectFormulation(e.target.value); onSelectCharacterization(""); setHistoricalCharacterizationId(""); }}
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

              <div>
  <PolymerIdentityVariantSelect
    rowLabel="Polymer 1"
    identityKey={polymerIdentityKey || polymer1Selection.identityKey}
    materialId={form.polymerId}
    identities={polymer1Selection.identities}
    onIdentityChange={(identityKey) => { setPolymerIdentityKey(identityKey); setForm((s) => ({ ...s, polymerId: "" })); }}
    onMaterialChange={(polymerId) => setForm((s) => ({ ...s, polymerId }))}
    concentrationField={<NumberInput label="Polymer Concentration" unit="%" value={form.polymerConcentrationPct} onChange={(polymerConcentrationPct) => setForm((s) => ({ ...s, polymerConcentrationPct }))} />}
  />

  <button
    ref={catalogTriggerRef}
    type="button"
    onClick={() => { setNewMaterialTarget("polymer"); setMaterialError(""); }}
    className="mt-2 rounded-lg px-2 py-1 text-xs font-bold text-blue-600 outline-none hover:bg-blue-50 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
  >
    + Add existing polymer variant OR new polymer
  </button>
              </div>
              {newMaterialTarget === "polymer" && (
  <section role="dialog" aria-modal="false" aria-labelledby="polymer-catalog-title" onKeyDown={(event) => { if (event.key === "Escape" && !materialSaving) closePolymerCatalog(); }} className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
    <div className="flex items-center justify-between">
      <div>
        <h3 id="polymer-catalog-title" className="font-bold text-slate-900">Add Existing Polymer Variant OR Add New Polymer</h3>
        <p className="mt-1 text-xs text-slate-600">{polymerCatalogDraft.mode === "existing" ? "Add a new molecular weight, grade, or product variant to an existing polymer." : "Create a new polymer identity and its first material variant."}</p>
      </div>
      <button type="button" aria-label="Close polymer material form" disabled={materialSaving} onClick={closePolymerCatalog} className="rounded-lg p-2 text-slate-500 outline-none hover:bg-white hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50">
        <X className="h-4 w-4" />
      </button>
    </div>
    <fieldset className="mt-4">
      <legend className="label">Material type</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Polymer catalog creation mode">
        {(["existing", "new"] as const).map((mode) => <label key={mode} className={`cursor-pointer rounded-xl border px-4 py-2 text-sm font-bold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500 has-[:focus-visible]:ring-offset-2 ${polymerCatalogDraft.mode === mode ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-700"}`}><input type="radio" name="polymer-catalog-mode" value={mode} checked={polymerCatalogDraft.mode === mode} onChange={() => { setPolymerCatalogDraft((current) => ({ ...current, mode })); setMaterialError(""); setDuplicatePolymerMaterial(null); }} className="sr-only" />{mode === "existing" ? "Existing polymer" : "New polymer"}</label>)}
      </div>
    </fieldset>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      {polymerCatalogDraft.mode === "existing" ? <label className="block"><span className="label">Polymer identity</span><select ref={catalogIdentityRef} value={polymerCatalogDraft.identityKey} onChange={(event) => setPolymerCatalogDraft((current) => ({ ...current, identityKey: event.target.value }))} className="input"><option value="">Choose polymer</option>{polymer1Selection.identities.filter((identity) => !identity.legacyReviewRequired).map((identity) => <option key={identity.key} value={identity.key}>{identity.displayLabel}</option>)}</select></label> : <><label className="block"><span className="label">New polymer name</span><input ref={catalogNewIdentityRef} required value={polymerCatalogDraft.newIdentity} onChange={(event) => setPolymerCatalogDraft((current) => ({ ...current, newIdentity: event.target.value }))} className="input" placeholder="Full polymer identity" /></label><TextInput label="Short identity / code / alias" value={polymerCatalogDraft.newIdentityAlias} onChange={(newIdentityAlias) => setPolymerCatalogDraft((current) => ({ ...current, newIdentityAlias }))} /></>}
      <TextInput label="Exact product / grade name" value={polymerCatalogDraft.productName} onChange={(productName) => setPolymerCatalogDraft((current) => ({ ...current, productName }))} />
      <label className="block"><span className="label">Molecular weight (optional)</span><div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2"><input type="number" min="0" step="any" inputMode="decimal" value={polymerCatalogDraft.molecularWeightValue} onChange={(event) => setPolymerCatalogDraft((current) => ({ ...current, molecularWeightValue: event.target.value }))} className="input min-w-0" placeholder="Numeric value" aria-label="Molecular-weight numeric value" /><select value={polymerCatalogDraft.molecularWeightUnit} onChange={(event) => setPolymerCatalogDraft((current) => ({ ...current, molecularWeightUnit: event.target.value as PolymerCatalogDraft["molecularWeightUnit"] }))} className="input min-w-0" aria-label="Molecular-weight unit"><option value="">Unit</option><option value="Da">Da</option><option value="kDa">kDa</option><option value="MDa">MDa</option></select></div></label>
      <TextInput label="Supplier / manufacturer (optional)" value={polymerCatalogDraft.supplier} onChange={(supplier) => setPolymerCatalogDraft((current) => ({ ...current, supplier }))} />
      <TextInput label="Article / product code (optional)" value={polymerCatalogDraft.articleNumber} onChange={(articleNumber) => setPolymerCatalogDraft((current) => ({ ...current, articleNumber }))} />
      <label className="block md:col-span-2"><span className="label">Aliases (optional)</span><input value={polymerCatalogDraft.aliases} onChange={(event) => setPolymerCatalogDraft((current) => ({ ...current, aliases: event.target.value }))} className="input" placeholder="Separate aliases with commas" /></label>
    </div>
    {materialError && <div className="mt-4"><ErrorMessage message={materialError} /></div>}
    {duplicatePolymerMaterial && <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><p className="font-semibold">Existing variant: {duplicatePolymerMaterial.canonicalName}</p><button type="button" onClick={() => selectCatalogMaterial(duplicatePolymerMaterial)} className="mt-2 rounded-lg bg-amber-900 px-3 py-2 text-xs font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2">Use existing variant</button></div>}
    <div className="mt-5 flex flex-wrap justify-end gap-3"><button type="button" disabled={materialSaving} onClick={closePolymerCatalog} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50">Cancel</button><button type="button" disabled={materialSaving} onClick={() => void createPolymerCatalogMaterial()} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white outline-none hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50">{materialSaving ? "Saving…" : polymerCatalogDraft.mode === "existing" ? "Add material variant" : "Add new polymer"}</button></div>
    <p className="mt-3 text-xs text-slate-600">Category: Polymer. No formulation is created by this action.</p>
  </section>
)}
              {(newMaterialTarget === "solvent1" || newMaterialTarget === "solvent2") && (
                <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5" aria-label="Add new solvent">
                  <div className="flex items-center justify-between"><div><h3 className="font-bold text-slate-900">Add New Solvent</h3><p className="mt-1 text-xs text-slate-500">Save this material to the shared material database.</p></div><button type="button" aria-label="Close solvent material form" onClick={() => setNewMaterialTarget(null)} className="rounded-lg p-2 text-slate-400 outline-none hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-blue-500"><X className="h-4 w-4" /></button></div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2"><TextInput label="Short Name" value={newMaterial.shortName} onChange={(shortName) => setNewMaterial((current) => ({ ...current, shortName }))} /><TextInput label="Full Material Name" value={newMaterial.canonicalName} onChange={(canonicalName) => setNewMaterial((current) => ({ ...current, canonicalName }))} /><TextInput label="Solvent Type" value={newMaterial.family} onChange={(family) => setNewMaterial((current) => ({ ...current, family }))} /><TextInput label="Supplier" value={newMaterial.supplier} onChange={(supplier) => setNewMaterial((current) => ({ ...current, supplier }))} /></div>
                  {materialError && <div className="mt-4"><ErrorMessage message={materialError} /></div>}
                  <button type="button" disabled={materialSaving} onClick={() => void createMaterial()} className="mt-4 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{materialSaving ? "Saving..." : "Save Material"}</button>
                </section>
              )}
              {polymer && <MaterialSummary material={polymer} />}

              <div className="min-w-0 rounded-2xl border border-indigo-100 bg-gradient-to-br from-blue-50/80 to-violet-50/80 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Additional polymers (optional, up to 3 total)</p>
                <div className="mt-3 space-y-4">
                  {optionalPolymerRowCount >= 1 && (
                    <div className="relative min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 pt-12 shadow-sm [&_.input]:bg-white">
                      <button type="button" aria-label="Remove Polymer 2" onClick={() => removePolymerRow(2)} className="absolute right-3 top-3 rounded-lg border border-rose-200 bg-rose-50/70 px-2.5 py-1 text-xs font-bold text-rose-600 outline-none hover:border-rose-300 hover:bg-rose-100 focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2">
                        × Remove
                      </button>
                      <PolymerIdentityVariantSelect selectRef={polymer2SelectRef} rowLabel="Polymer 2" identityKey={polymer2IdentityKey || polymer2Selection.identityKey} materialId={form.polymer2Id} identities={polymer2Selection.identities} onIdentityChange={(identityKey) => { setPolymer2IdentityKey(identityKey); setForm((s) => ({ ...s, polymer2Id: "" })); }} onMaterialChange={(polymer2Id) => setForm((s) => ({ ...s, polymer2Id }))} concentrationField={<OptionalNumberInput label="Polymer 2 concentration" unit="wt%" value={form.polymer2ConcentrationPct} onChange={(polymer2ConcentrationPct) => setForm((s) => ({ ...s, polymer2ConcentrationPct }))} />} />
                    </div>
                  )}
                  {optionalPolymerRowCount >= 2 && (
                    <div className="relative min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 pt-12 shadow-sm [&_.input]:bg-white">
                      <button type="button" aria-label="Remove Polymer 3" onClick={() => removePolymerRow(3)} className="absolute right-3 top-3 rounded-lg border border-rose-200 bg-rose-50/70 px-2.5 py-1 text-xs font-bold text-rose-600 outline-none hover:border-rose-300 hover:bg-rose-100 focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2">
                        × Remove
                      </button>
                      <PolymerIdentityVariantSelect selectRef={polymer3SelectRef} rowLabel="Polymer 3" identityKey={polymer3IdentityKey || polymer3Selection.identityKey} materialId={form.polymer3Id} identities={polymer3Selection.identities} onIdentityChange={(identityKey) => { setPolymer3IdentityKey(identityKey); setForm((s) => ({ ...s, polymer3Id: "" })); }} onMaterialChange={(polymer3Id) => setForm((s) => ({ ...s, polymer3Id }))} concentrationField={<OptionalNumberInput label="Polymer 3 concentration" unit="wt%" value={form.polymer3ConcentrationPct} onChange={(polymer3ConcentrationPct) => setForm((s) => ({ ...s, polymer3ConcentrationPct }))} />} />
                    </div>
                  )}
                  {optionalPolymerRowCount < 2 && (
                    <button ref={addPolymerButtonRef} type="button" onClick={addPolymerRow} className="rounded-xl border border-indigo-200 bg-white px-4 py-2 text-xs font-bold text-indigo-700 shadow-sm outline-none hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
                      + Add another polymer
                    </button>
                  )}
                </div>
              </div>

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
</div>                <OptionalNumberInput label="Solvent 1 Ratio" unit="%" value={form.solvent1RatioPct} onChange={(solvent1RatioPct) => setForm((s) => ({ ...s, solvent1RatioPct }))} />
              </div>
              {solvent1 && <MaterialSummary material={solvent1} />}

              <div className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${solventValidation.totalValid ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-300 bg-rose-50 text-rose-800"}`}>
                <span className="font-semibold">Solvent total</span>
                <span className="font-bold">{Number.isFinite(solventTotal) ? solventTotal.toFixed(2) : "—"}% / 100%</span>
              </div>
              {!solventValidation.totalValid && <p className="text-sm font-semibold text-rose-600">Solvent ratios must total 100%.</p>}

              {optionalSolventRowCount >= 1 && (
                <>
                  <div className="grid min-w-0 gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                    <div>
                      <MaterialSelect selectRef={solvent2SelectRef} constrainWidth label="Solvent 2" value={form.solvent2Id} materials={solvents} onChange={(solvent2Id) => setForm((s) => ({ ...s, solvent2Id }))} />
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
                    <OptionalNumberInput label="Solvent 2 Ratio" unit="%" value={form.solvent2RatioPct} onChange={(solvent2RatioPct) => setForm((s) => ({ ...s, solvent2RatioPct }))} />
                    <button type="button" aria-label="Remove solvent 2" onClick={() => removeSolventRow(2)} className="rounded-lg px-2 py-1 text-left text-xs font-bold text-rose-600 outline-none hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2">
                      Remove solvent
                    </button>
                  </div>
                  {solvent2 && <MaterialSummary material={solvent2} />}
                </>
              )}

              {optionalSolventRowCount >= 2 && (
                <div className="grid min-w-0 gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                  <MaterialSelect selectRef={solvent3SelectRef} constrainWidth label="Solvent 3" value={form.solvent3Id} materials={solvents} onChange={(solvent3Id) => setForm((s) => ({ ...s, solvent3Id }))} />
                  <OptionalNumberInput label="Solvent 3 Ratio" unit="%" value={form.solvent3RatioPct} onChange={(solvent3RatioPct) => setForm((s) => ({ ...s, solvent3RatioPct }))} />
                  <button type="button" aria-label="Remove solvent 3" onClick={() => removeSolventRow(3)} className="rounded-lg px-2 py-1 text-left text-xs font-bold text-rose-600 outline-none hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2">
                    Remove solvent
                  </button>
                </div>
              )}

              {optionalSolventRowCount < 2 && (
                <button ref={addSolventButtonRef} type="button" onClick={addSolventRow} className="w-fit rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 outline-none hover:bg-blue-100 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                  + Add another solvent
                </button>
              )}

              {duplicateSolventId && <p className="text-sm font-semibold text-rose-600">Each visible solvent must be a different material.</p>}

              <label className="block">
                <span className="label">Formulation Notes</span>
                <textarea rows={3} value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} className="input resize-none" />
              </label>

              {error && <ErrorMessage message={error} />}
              <button disabled={saving || !solventValidation.valid} className="w-full rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
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
                      onChange={(e) => { onSelectCharacterization(e.target.value); setHistoricalCharacterizationId(""); }}
                      className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900"
                    >
                      <option value="">Choose characterization (optional)</option>
                      {selectedHistory.map((item) => (
                        <option key={item.id} value={item.id}>{formatDate(item.measuredAt)}{compactCharacterization(item)}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                  {selectedCharacterizationId && (
                    <>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {currentCharacterizationEditable && <button type="button" onClick={() => setEditingCurrentCharacterization(true)} className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white">Edit Current Characterization</button>}
                      {hasCharacterizationUpdates(revisions) && <div className="relative"><button type="button" aria-expanded={revisionPopoverOpen} aria-controls={`revision-summary-${currentCharacterization?.id}`} aria-label="Show characterization update summary" onClick={() => setRevisionPopoverOpen((open) => !open)} className="rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700">Updated</button>{revisionPopoverOpen && <div id={`revision-summary-${currentCharacterization?.id}`} className="absolute left-0 z-10 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg"><p className="text-slate-600">Last updated: <b className="text-slate-900">{formatRevisionDate(revisions[0]?.changedAt)}</b></p><button type="button" aria-expanded={revisionHistoryOpen} aria-controls={`revision-history-${currentCharacterization?.id}`} onClick={() => setRevisionHistoryOpen(true)} className="mt-2 font-bold text-violet-700">View change history</button></div>}</div>}
                    </div>
                    {editingCurrentCharacterization && currentCharacterization && <CharacterizationEditForm record={currentCharacterization} onCancel={() => setEditingCurrentCharacterization(false)} onSave={async (input) => { const updated = await onUpdateCharacterization(currentCharacterization.id, input); setEditingCurrentCharacterization(false); setRevisions(await solutionCharacterizationService.getRevisions(updated.id)); }} />}
                    {revisionHistoryOpen && currentCharacterization && <RevisionHistory revisions={revisions} controlId={`revision-history-${currentCharacterization.id}`} onClose={() => setRevisionHistoryOpen(false)} />}
                    <CharacterizationComparison
                      current={currentCharacterization}
                      evidence={historicalEvidence}
                      selectedEvidence={selectedHistoricalEvidence}
                      excludedEvidence={historicalEvidenceResult.excluded}
                      onSelectEvidence={setHistoricalCharacterizationId}
                    />
                    </>
                  )}
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

function PolymerIdentityVariantSelect({ rowLabel, identityKey, materialId, identities, onIdentityChange, onMaterialChange, concentrationField, selectRef }: { rowLabel: string; identityKey: string; materialId: string; identities: PolymerIdentityOption[]; onIdentityChange: (value: string) => void; onMaterialChange: (value: string) => void; concentrationField: React.ReactNode; selectRef?: React.Ref<HTMLSelectElement> }) {
  const selectedIdentity = identities.find((identity) => identity.key === identityKey);
  const variants = selectedIdentity?.variants ?? [];
  const polymerLabel = rowLabel === "Polymer 1" ? "Polymer" : rowLabel;
  return <div className="grid min-w-0 gap-4 lg:grid-cols-3">
    <label className="block min-w-0"><span className="label">{polymerLabel}</span><select ref={selectRef} value={identityKey} onChange={(event) => onIdentityChange(event.target.value)} className="input min-w-0 truncate"><option value="">Choose polymer</option>{identities.map((identity) => <option key={identity.key} value={identity.key}>{identity.displayLabel}</option>)}</select></label>
    <label className="block min-w-0"><span className="label">Molecular Weight / Grade</span><select value={materialId} disabled={!identityKey} onChange={(event) => onMaterialChange(event.target.value)} className="input min-w-0 truncate disabled:cursor-not-allowed disabled:opacity-50"><option value="">Choose molecular weight or grade</option>{variants.map((variant) => <option key={variant.materialId} value={variant.materialId}>{variant.displayLabel}</option>)}</select></label>
    {concentrationField}
    {selectedIdentity?.legacyReviewRequired && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 lg:col-span-3"><p className="font-bold">Legacy or unclassified material — review required</p><p className="mt-1 break-words">{selectedIdentity.displayLabel}</p><details className="mt-2"><summary className="cursor-pointer font-semibold">Technical details</summary><p className="mt-1 break-all font-mono text-[10px]">Material ID: {materialId}</p></details></div>}
  </div>;
}

function MaterialSelect({
  label,
  value,
  materials,
  onChange,
  showPolymerDetails = false,
  selectRef,
  constrainWidth = false,
}: {
  label: string;
  value: string;
  materials: Material[];
  onChange: (value: string) => void;
  showPolymerDetails?: boolean;
  selectRef?: React.Ref<HTMLSelectElement>;
  constrainWidth?: boolean;
}) {
  return (
    <label className={constrainWidth ? "block min-w-0" : "block"}>
      <span className="label">{label}</span>
      <select ref={selectRef} value={value} onChange={(e) => onChange(e.target.value)} className={constrainWidth ? "input min-w-0 truncate" : "input"}>
        <option value="">Choose material</option>
        {materials.map((material) => (
          <option key={material.id} value={material.id}>
            {showPolymerDetails ? formatPolymerOptionLabel(material) : material.canonicalName}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><span className="label">{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} className="input" /></label>; }
function NumberInput({ label, unit, value, onChange }: { label: string; unit: string; value: number; onChange: (value: number) => void }) { return <label className="block"><span className="label">{label}</span><div className="relative"><input type="number" inputMode="decimal" step="0.01" min="0" max="100" value={value === 0 ? "" : value} placeholder="—" onChange={(e) => onChange(e.target.value.trim() === "" ? 0 : Number(e.target.value))} className="input appearance-none pr-16 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500">{unit}</span></div></label>; }
function OptionalNumberInput({ label, unit, value, onChange }: { label: string; unit: string; value: number | undefined; onChange: (value: number | undefined) => void }) { return <label className="block min-w-0"><span className="label">{label}</span><div className="relative"><input type="number" inputMode="decimal" step="0.01" min="0" max="100" value={value ?? ""} placeholder="No data" onChange={(e) => onChange(e.target.value.trim() === "" ? undefined : Number(e.target.value))} className="input appearance-none pr-16 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500">{unit}</span></div></label>; }
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

const REVISION_FIELD_LABELS: Record<keyof SolutionCharacterizationValues, string> = { solidsContentPct: "Solid content", viscosityMpas: "Viscosity", conductivityUsCm: "Conductivity", densityGcm3: "Density", surfaceTensionMnM: "Surface tension", ph: "pH", notes: "Measurement notes" };
function CharacterizationEditForm({ record, onCancel, onSave }: { record: SolutionCharacterization; onCancel: () => void; onSave: (input: UpdateSolutionCharacterizationInput) => Promise<void> }) {
  const [values, setValues] = useState({ solidsContentPct: inputNumber(record.solidsContentPct), viscosityMpas: inputNumber(record.viscosityMpas), conductivityUsCm: inputNumber(record.conductivityUsCm), densityGcm3: inputNumber(record.densityGcm3), surfaceTensionMnM: inputNumber(record.surfaceTensionMnM), ph: inputNumber(record.ph), notes: record.notes ?? "", changeReason: "", changedBy: "" });
  const [saving, setSaving] = useState(false); const [message, setMessage] = useState("");
  const fields: Array<[keyof typeof values, string, string]> = [["solidsContentPct", "Solid Content", "wt %"], ["viscosityMpas", "Viscosity", "mPa·s"], ["conductivityUsCm", "Conductivity", "µS/cm"], ["densityGcm3", "Density", "g/cm³"], ["surfaceTensionMnM", "Surface Tension", "mN/m"], ["ph", "pH", ""]];
  const save = async (event: React.FormEvent) => { event.preventDefault(); if (!values.changeReason.trim() || !values.changedBy.trim()) { setMessage("Change reason and Changed by are required."); return; } setSaving(true); setMessage(""); try { await onSave({ solidsContentPct: optionalNumber(values.solidsContentPct), viscosityMpas: optionalNumber(values.viscosityMpas), conductivityUsCm: optionalNumber(values.conductivityUsCm), densityGcm3: optionalNumber(values.densityGcm3), surfaceTensionMnM: optionalNumber(values.surfaceTensionMnM), ph: optionalNumber(values.ph), notes: values.notes.trim() || undefined, changeReason: values.changeReason, changedBy: values.changedBy }); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to update characterization."); } finally { setSaving(false); } };
  return <form onSubmit={save} className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4"><h3 className="font-bold text-slate-900">Edit Current Characterization</h3><p className="mt-1 text-xs text-slate-600">A read-only revision will preserve the previous values.</p><div className="mt-4 grid gap-3 md:grid-cols-3">{fields.map(([key, label, unit]) => <label key={key} className="block"><span className="label">{label}</span><input type="number" step="0.01" value={values[key]} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} placeholder={unit} className="input" /></label>)}</div><label className="mt-3 block"><span className="label">Measurement Notes</span><textarea value={values.notes} onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))} className="input resize-none" rows={2} /></label><div className="mt-3 grid gap-3 md:grid-cols-2"><label><span className="label">Change Reason</span><textarea required value={values.changeReason} onChange={(event) => setValues((current) => ({ ...current, changeReason: event.target.value }))} className="input resize-none" rows={2} /></label><label><span className="label">Changed By</span><input required value={values.changedBy} onChange={(event) => setValues((current) => ({ ...current, changedBy: event.target.value }))} className="input" /></label></div>{message && <p className="mt-3 text-xs font-semibold text-red-700">{message}</p>}<div className="mt-4 flex justify-end gap-2"><button type="button" disabled={saving} onClick={onCancel} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold">Cancel</button><button disabled={saving} className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Save Changes"}</button></div></form>;
}

function RevisionHistory({ revisions, controlId, onClose }: { revisions: SolutionCharacterizationRevision[]; controlId: string; onClose: () => void }) { return <section id={controlId} className="mt-4 rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between gap-2"><h3 className="font-bold text-slate-900">Change history</h3><button type="button" onClick={onClose} aria-label="Close change history" className="rounded-lg border border-slate-200 p-1"><X className="h-4 w-4" /></button></div><div className="mt-3 space-y-3">{revisions.map((revision) => <article key={revision.id} className="rounded-xl bg-slate-50 p-3 text-xs"><p className="font-semibold text-slate-900">{formatRevisionDate(revision.changedAt)} · {revision.changedBy}</p><p className="mt-1 text-slate-600">Reason: {revision.changeReason}</p><div className="mt-2 space-y-1">{revision.changedFields.map((field) => <p key={field}><b>{REVISION_FIELD_LABELS[field]}:</b> {revisionValue(revision.previousValues[field])} → {revisionValue(revision.newValues[field])}</p>)}</div></article>)}</div></section>; }
function inputNumber(value: number | undefined): string { return value === undefined ? "" : String(value); }
function revisionValue(value: unknown): string { return value === undefined ? "No data" : value === "" ? "No data" : String(value); }
function formatRevisionDate(value: unknown): string { const timestamp = revisionTimestamp(value); return timestamp ? new Date(timestamp).toLocaleString() : "Pending server timestamp"; }

function CharacterizationComparison({ current, evidence, excludedEvidence, selectedEvidence, onSelectEvidence }: { current: SolutionCharacterization | null; evidence: HistoricalCharacterizationEvidence[]; excludedEvidence: ExcludedHistoricalCharacterizationEvidence[]; selectedEvidence: HistoricalCharacterizationEvidence | null; onSelectEvidence: (id: string) => void }) {
  const [comparisonExpanded, setComparisonExpanded] = useState(true);
  const [similarityDetailsOpen, setSimilarityDetailsOpen] = useState(false);
  const similarityDetailsId = selectedEvidence ? `similarity-details-${selectedEvidence.characterization.id}` : "similarity-details";
  const comparisonContentId = current ? `historical-characterization-comparison-${current.id}` : "historical-characterization-comparison";
  useEffect(() => { setComparisonExpanded(true); }, [current?.id]);
  useEffect(() => { setSimilarityDetailsOpen(false); }, [selectedEvidence?.characterization.id]);
  const rows = buildCharacterizationComparisonRows(current, selectedEvidence?.characterization ?? null);
  const displayValue = (value: number | undefined) => value === undefined ? "No data" : formatNumber(value);
  const sameEvidence = evidence.filter((item) => item.group === "same-formulation");
  const similarEvidence = evidence.filter((item) => item.group === "similar-formulation");
  return <section className="mt-4 min-w-0 rounded-2xl border border-violet-200 bg-violet-50/50 p-4"><button type="button" aria-expanded={comparisonExpanded} aria-controls={comparisonContentId} onClick={() => setComparisonExpanded((expanded) => !expanded)} className="flex w-full min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl p-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"><h3 className="min-w-0 break-words text-sm font-bold text-slate-950">Historical characterization comparison</h3><span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-600"><span>{sameEvidence.length} same formulation · {similarEvidence.length} similar formulation</span><ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform ${comparisonExpanded ? "rotate-180" : ""}`} /></span></button>{comparisonExpanded && <div id={comparisonContentId}><p className="mt-2 text-xs font-semibold text-violet-800">Historical characterization evidence — not a guaranteed target.</p>{evidence.length === 0 ? <p className="mt-4 rounded-xl bg-white p-3 text-xs text-slate-600">No matching historical characterization is available for this formulation.</p> : <><label className="mt-4 block"><span className="label">Historical evidence record</span><select value={selectedEvidence?.characterization.id ?? ""} onChange={(event) => onSelectEvidence(event.target.value)} className="input"><option value="">Choose a historical characterization</option>{sameEvidence.length > 0 && <optgroup label="Same formulation">{sameEvidence.map((item) => <option key={item.characterization.id} value={item.characterization.id}>{historicalEvidenceLabel(item)}</option>)}</optgroup>}{similarEvidence.length > 0 && <optgroup label="Similar formulation">{similarEvidence.map((item) => <option key={item.characterization.id} value={item.characterization.id}>{historicalEvidenceLabel(item)}</option>)}</optgroup>}</select></label>{selectedEvidence ? <><div className="mt-3 grid min-w-0 gap-2 text-xs sm:grid-cols-2"><EvidenceIdentity label="Evidence group" value={selectedEvidence.group === "same-formulation" ? "Same formulation" : "Similar formulation"} /><EvidenceIdentity label="Formulation" value={`${formulationLabel(selectedEvidence.formulation)} · ${selectedEvidence.formulation.id}`} /><EvidenceIdentity label="Polymer(s) and concentration(s)" value={polymerCompositionLabel(selectedEvidence.formulation)} /><EvidenceIdentity label="Solvent(s) and ratios" value={solventCompositionLabel(selectedEvidence.formulation)} />{selectedEvidence.group === "similar-formulation" && <EvidenceIdentity label="Conditional Solution Similarity" value={`${formatNumber(selectedEvidence.solutionSimilarity!)}% · ${selectedEvidence.comparableCriteriaCount}/5 criteria comparable · ${formatNumber(selectedEvidence.earnedWeight!)} / ${formatNumber(selectedEvidence.availableWeight!)} weight`} />}<EvidenceIdentity label="Measurement date" value={formatEvidenceDate(selectedEvidence.characterization.measuredAt)} /><EvidenceIdentity label="Characterization ID" value={selectedEvidence.characterization.id} /><EvidenceIdentity label="Associated experiment(s)" value={selectedEvidence.experimentIdentities.join(" · ") || "No linked experiment identity available"} /></div>{selectedEvidence.group === "similar-formulation" && <div className="mt-3"><button type="button" aria-expanded={similarityDetailsOpen} aria-controls={similarityDetailsId} onClick={() => setSimilarityDetailsOpen((open) => !open)} className="rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-50">Why this similarity? {similarityDetailsOpen ? "▴" : "▾"}</button>{similarityDetailsOpen && <div id={similarityDetailsId} className="mt-2 rounded-xl bg-white p-3"><div className="grid gap-2 sm:grid-cols-2">{selectedEvidence.criteria?.map((criterion) => <div key={criterion.key} className="rounded-lg bg-slate-50 p-2 text-[11px]"><div className="flex justify-between gap-2"><b>{criterion.label}</b><span>{criterion.includedInDenominator ? `${formatNumber(criterion.earnedWeight)} / ${criterion.weight}` : "Excluded"}</span></div><p className="mt-1 text-slate-600">{criterion.detail}</p></div>)}</div></div>}</div>}{selectedEvidence.solventPartialMatch && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">The solvent system differs. Historical characterization values may not transfer directly.</p>}<div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{rows.map((row) => <article key={row.key} className="min-w-0 rounded-xl border border-violet-100 bg-white p-3 text-xs"><div className="flex min-w-0 items-start justify-between gap-2"><p className="min-w-0 break-words font-bold text-slate-800">{row.label}</p><span className="shrink-0 text-slate-500">{row.unit || "unitless"}</span></div><dl className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2"><dt className="text-slate-500">Current</dt><dd className="break-all text-right font-semibold text-slate-900">{displayValue(row.currentValue)}</dd><dt className="text-slate-500">Historical</dt><dd className="break-all text-right font-semibold text-slate-900">{displayValue(row.historicalValue)}</dd><dt className="text-slate-500">Difference (current − historical)</dt><dd className="break-all text-right font-semibold text-violet-800">{displayValue(row.difference)}</dd></dl></article>)}</div></> : <p className="mt-3 rounded-xl bg-white p-3 text-xs text-slate-600">Select one historical record to compare. No record is chosen silently.</p>}</>}{excludedEvidence.length > 0 && <details className="mt-4 rounded-xl border border-slate-200 bg-white p-3"><summary className="cursor-pointer text-xs font-bold text-slate-700">Excluded evidence ({excludedEvidence.length})</summary><div className="mt-2 space-y-2">{excludedEvidence.map((item) => <div key={item.characterization.id} className="rounded-lg bg-slate-50 p-2 text-xs"><p className="break-words font-semibold text-slate-800">{formulationLabel(item.formulation)} · {item.formulation.id}</p><p className="mt-1 text-slate-600">{item.reason}</p></div>)}</div></details>}</div>}</section>;
}

function EvidenceIdentity({ label, value }: { label: string; value: string }) { return <div className="min-w-0 rounded-xl bg-white p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 break-words text-slate-800">{value}</p></div>; }
function historicalEvidenceLabel(item: HistoricalCharacterizationEvidence): string { return `${formatEvidenceDate(item.characterization.measuredAt)} · ${formulationLabel(item.formulation)} · ${item.characterization.id}`; }
function formatEvidenceDate(value: string | undefined): string { if (!value) return "No measurement date"; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(); }
function formatNumber(value: number): string { return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6))); }
function polymerCompositionLabel(formulation: Formulation): string { return buildPolymerCompositionDisplay(formulation).map((item) => `${item.name}${item.concentration === undefined ? "" : ` ${formatNumber(item.concentration)}${displayCompositionUnit(item.unit)}`}`).join(" · "); }
function solventCompositionLabel(formulation: Formulation): string { const components = formulation.compositionComponents?.filter((item) => item.role === "solvent") ?? []; if (components.length) return components.map((item) => `${item.materialName}${item.quantity === undefined ? "" : ` ${formatNumber(item.quantity)}${displayCompositionUnit(item.unit ?? "")}`}`).join(" · "); return [formulation.solvent1Name && `${formulation.solvent1Name}${formulation.solvent1RatioPct === undefined ? "" : ` ${formatNumber(formulation.solvent1RatioPct)}%`}`, formulation.solvent2Name && `${formulation.solvent2Name}${formulation.solvent2RatioPct === undefined ? "" : ` ${formatNumber(formulation.solvent2RatioPct)}%`}`].filter(Boolean).join(" · ") || formulation.solvent || "No data"; }
function displayCompositionUnit(unit: string): string { return unit === "wt_pct" || unit === "vol_pct" || unit === "w_v_pct" || unit === "%" ? "%" : unit ? ` ${unit}` : ""; }
