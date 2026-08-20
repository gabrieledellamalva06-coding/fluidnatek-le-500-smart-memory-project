import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { Project } from "../types";
import type { ExperimentalSetup } from "../core/types/setup";
import type { CreateSetupInput } from "../application/setups/setup.service";

interface Props {
  projects: Project[];
  setups: ExperimentalSetup[];
  selectedSetupId: string;
  onSelectSetup: (id: string) => void;
  onAddSetup: (input: CreateSetupInput) => Promise<void>;
  onContinue: () => void;
}

type MachineFilter = "all" | "LE100" | "LE500";

interface SetupForm {
  name: string;
  machineModel: string;
  manufacturer: string;
  serialNumber: string;
  injectorType: string;
  injectorModel: string;
  needleGauge: string;
  needleCount: string;
  emitterCount: string;
  collectorType: string;
  collectorModel: string;
  collectorDiameterMm: string;
  collectorWidthMm: string;
  platformConfiguration: string;
  notes: string;
}

const EMPTY_FORM: SetupForm = {
  name: "",
  machineModel: "LE500",
  manufacturer: "Bioinicia",
  serialNumber: "",
  injectorType: "",
  injectorModel: "",
  needleGauge: "",
  needleCount: "",
  emitterCount: "",
  collectorType: "",
  collectorModel: "",
  collectorDiameterMm: "",
  collectorWidthMm: "",
  platformConfiguration: "",
  notes: "",
};

export default function Setups({
  projects,
  setups,
  selectedSetupId,
  onSelectSetup,
  onAddSetup,
  onContinue,
}: Props) {
  const activeProject = projects[0] ?? null;
  const [machineFilter, setMachineFilter] = useState<MachineFilter>("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<SetupForm>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return setups.filter((setup) => {
      const belongsToProject = Boolean(activeProject && setup.projectId === activeProject.id);
      if (!q && !belongsToProject) return false;
      const normalizedMachine = normalizeMachine(setup.machine.model);
      const machineMatches = machineFilter === "all" || normalizedMachine === machineFilter;
      const text = [
        setup.name,
        setup.machine.model,
        setup.machine.manufacturer,
        setup.injector.type,
        setup.injector.model,
        setup.collector.type,
        setup.collector.model,
        setup.platformConfiguration,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return machineMatches && (!q || text.includes(q));
    });
  }, [setups, machineFilter, search, activeProject]);

  const projectSetupCount = useMemo(
    () => activeProject ? setups.filter((setup) => setup.projectId === activeProject.id).length : 0,
    [setups, activeProject]
  );

  const selected = setups.find((item) => item.id === selectedSetupId) ?? null;

  const createSetup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.machineModel.trim() || !form.injectorType.trim() || !form.collectorType.trim()) {
      setError("Setup name, machine, injector type and collector type are required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onAddSetup({
        projectId: activeProject?.id,
        name: form.name.trim(),
        manufacturer: clean(form.manufacturer) || undefined,
        machineModel: form.machineModel.trim(),
        serialNumber: clean(form.serialNumber) || undefined,
        injectorType: form.injectorType.trim(),
        injectorModel: clean(form.injectorModel) || undefined,
        needleGauge: clean(form.needleGauge) || undefined,
        needleCount: optionalInteger(form.needleCount),
        emitterCount: optionalInteger(form.emitterCount),
        collectorType: form.collectorType.trim(),
        collectorModel: clean(form.collectorModel) || undefined,
        collectorDiameterMm: optionalNumber(form.collectorDiameterMm),
        collectorWidthMm: optionalNumber(form.collectorWidthMm),
        platformConfiguration: clean(form.platformConfiguration) || undefined,
        notes: clean(form.notes) || undefined,
      });
      setForm(EMPTY_FORM);
      setShowCreate(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save setup.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-slate-100 p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Workflow step 4</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Machine Setup</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Choose the machine first, then select a reusable hardware configuration. Empty or unknown fields are hidden.
        </p>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Choose Machine & Setup</h2>
              <p className="mt-1 text-xs text-slate-500">
                {search.trim() ? `${filtered.length} historical/project matches` : `${projectSetupCount} setups belonging to the current project`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700"
            >
              {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showCreate ? "Cancel" : "Create New Setup"}
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <label className="block">
              <span className="label">Machine</span>
              <div className="relative">
                <select value={machineFilter} onChange={(e) => { setMachineFilter(e.target.value as MachineFilter); onSelectSetup(""); }} className="input appearance-none pr-10">
                  <option value="all">All machines</option>
                  <option value="LE500">Fluidnatek LE-500</option>
                  <option value="LE100">Fluidnatek LE-100</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </label>

            <label className="block">
              <span className="label">Search Setup</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by setup name, injector, collector or platform..."
                  style={{ paddingLeft: "2.8rem" }}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </label>
          </div>

          {!search.trim() && activeProject && projectSetupCount === 0 && (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No setup is linked to this project. Search historical setups above to use a compatible configuration.
            </p>
          )}
          {!activeProject && (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Select a current project before choosing a setup.
            </p>
          )}

          <div className="relative mt-4">
            <select
              value={selectedSetupId}
              onChange={(e) => onSelectSetup(e.target.value)}
              className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Choose a setup</option>
              {!search.trim() && activeProject && projectSetupCount > 0 && <optgroup label="Setups belonging to current project">{filtered.map((setup) => <option key={setup.id} value={setup.id}>{setupLabel(setup)}</option>)}</optgroup>}
              {search.trim() && <optgroup label="Historical and project setups">{filtered.map((setup) => <option key={setup.id} value={setup.id}>{setupLabel(setup)}</option>)}</optgroup>}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </section>

        {showCreate && (
          <section className="mt-5 rounded-3xl border border-blue-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <SlidersHorizontal className="h-5 w-5 text-blue-600" />
              <div>
                <h2 className="font-bold text-slate-950">Create New Setup</h2>
                <p className="text-xs text-slate-500">Hardware only. Process parameters such as voltage and flow are entered later.</p>
              </div>
            </div>

            <form onSubmit={createSetup} className="mt-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <TextInput label="Setup Name" value={form.name} onChange={(name) => setForm((s) => ({ ...s, name }))} />
                <SelectInput
                  label="Machine Model"
                  value={form.machineModel}
                  onChange={(machineModel) => setForm((s) => ({ ...s, machineModel }))}
                  options={["LE500", "LE100"]}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <TextInput label="Manufacturer" value={form.manufacturer} onChange={(manufacturer) => setForm((s) => ({ ...s, manufacturer }))} />
                <TextInput label="Serial Number" value={form.serialNumber} onChange={(serialNumber) => setForm((s) => ({ ...s, serialNumber }))} />
              </div>

              <HardwareGroup title="Injector">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <TextInput label="Injector Type" value={form.injectorType} onChange={(injectorType) => setForm((s) => ({ ...s, injectorType }))} />
                  <TextInput label="Injector Model" value={form.injectorModel} onChange={(injectorModel) => setForm((s) => ({ ...s, injectorModel }))} />
                  <TextInput label="Needle Gauge" value={form.needleGauge} onChange={(needleGauge) => setForm((s) => ({ ...s, needleGauge }))} />
                  <TextInput label="Needle Count" type="number" value={form.needleCount} onChange={(needleCount) => setForm((s) => ({ ...s, needleCount }))} />
                  <TextInput label="Emitter Count" type="number" value={form.emitterCount} onChange={(emitterCount) => setForm((s) => ({ ...s, emitterCount }))} />
                </div>
              </HardwareGroup>

              <HardwareGroup title="Collector">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <TextInput label="Collector Type" value={form.collectorType} onChange={(collectorType) => setForm((s) => ({ ...s, collectorType }))} />
                  <TextInput label="Collector Model" value={form.collectorModel} onChange={(collectorModel) => setForm((s) => ({ ...s, collectorModel }))} />
                  <TextInput label="Diameter (mm)" type="number" value={form.collectorDiameterMm} onChange={(collectorDiameterMm) => setForm((s) => ({ ...s, collectorDiameterMm }))} />
                  <TextInput label="Width (mm)" type="number" value={form.collectorWidthMm} onChange={(collectorWidthMm) => setForm((s) => ({ ...s, collectorWidthMm }))} />
                </div>
              </HardwareGroup>

              <div className="grid gap-4 md:grid-cols-2">
                <TextInput label="Platform Configuration" value={form.platformConfiguration} onChange={(platformConfiguration) => setForm((s) => ({ ...s, platformConfiguration }))} />
                <TextInput label="Notes" value={form.notes} onChange={(notes) => setForm((s) => ({ ...s, notes }))} />
              </div>

              {error && <ErrorMessage message={error} />}
              <button disabled={saving} className="w-full rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50">
                {saving ? "Saving..." : "Save Setup"}
              </button>
            </form>
          </section>
        )}

        {selected && (
          <>
            <section className="mt-5 rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">Selected Setup</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">{setupLabel(selected)}</h2>
              <div className="mt-5 flex flex-wrap gap-3">
                <Info label="Machine" value={clean(selected.machine.model)} />
                <Info label="Manufacturer" value={clean(selected.machine.manufacturer)} />
                <Info label="Serial Number" value={clean(selected.machine.serialNumber)} />
                <Info label="Injector" value={clean(selected.injector.type)} />
                <Info label="Injector Model" value={clean(selected.injector.model)} />
                <Info label="Needle Gauge" value={clean(selected.injector.needleGauge)} />
                <Info label="Needle Count" value={positiveInteger(selected.injector.needleCount)} />
                <Info label="Emitter Count" value={positiveInteger(selected.injector.emitterCount)} />
                <Info label="Collector" value={clean(selected.collector.type)} />
                <Info label="Collector Model" value={clean(selected.collector.model)} />
                <Info label="Collector Diameter" value={positiveNumber(selected.collector.diameterMm, "mm")} />
                <Info label="Collector Width" value={positiveNumber(selected.collector.widthMm, "mm")} />
                <Info label="Platform" value={clean(selected.platformConfiguration)} />
              </div>
              {clean(selected.notes) && <p className="mt-4 text-sm text-slate-500">{selected.notes}</p>}
            </section>

            {activeProject && (
              <div className="mt-7 flex justify-end">
                <button type="button" onClick={onContinue} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-7 py-3 font-bold text-white">
                  Continue to Experimental Run <ArrowRight className="h-4 w-4" />
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

function HardwareGroup({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl bg-slate-50 p-5"><h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-600">{title}</h3>{children}</section>; }
function TextInput({ label, value, onChange, type="text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="block"><span className="label">{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="input" /></label>; }
function SelectInput({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) { return <label className="block"><span className="label">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} className="input">{options.map((item) => <option key={item} value={item}>{item === "LE500" ? "Fluidnatek LE-500" : item === "LE100" ? "Fluidnatek LE-100" : item}</option>)}</select></label>; }
function Info({ label, value }: { label: string; value: string }) { return value ? <div className="rounded-xl bg-slate-50 px-4 py-3"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{value}</p></div> : null; }
function ErrorMessage({ message }: { message: string }) { return <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{message}</div>; }
function clean(value: unknown): string { const text=String(value ?? "").trim(); if (!text) return ""; const n=text.toLowerCase(); return n.includes("unknown") || n==="n/d" || n==="not specified" ? "" : text; }
function normalizeMachine(value: string): MachineFilter { const compact=value.toUpperCase().replace(/[^A-Z0-9]/g,""); if(compact.includes("LE500")||compact.includes("L500")) return "LE500"; if(compact.includes("LE100")||compact.includes("L100")) return "LE100"; return "all"; }
function setupLabel(setup: ExperimentalSetup): string { const name=clean(setup.name); const machine=clean(setup.machine.model); const needles=setup.injector.needleCount && setup.injector.needleCount > 0 ? `${setup.injector.needleCount} needles` : ""; const injector=clean(setup.injector.type); const collector=clean(setup.collector.type); return name || [machine, needles || injector, collector].filter(Boolean).join(" · ") || "Setup"; }
function optionalInteger(value: string): number | undefined { if(!value.trim()) return undefined; const n=Number.parseInt(value,10); return Number.isInteger(n)&&n>0?n:undefined; }
function optionalNumber(value: string): number | undefined { if(!value.trim()) return undefined; const n=Number(value); return Number.isFinite(n)&&n>0?n:undefined; }
function positiveInteger(value?: number): string { return typeof value === "number" && Number.isInteger(value) && value > 0 ? String(value) : ""; }
function positiveNumber(value: number | undefined, unit: string): string { return typeof value === "number" && Number.isFinite(value) && value > 0 ? `${value} ${unit}` : ""; }
