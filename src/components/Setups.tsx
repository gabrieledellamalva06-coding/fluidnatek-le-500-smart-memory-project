import React, {
  useMemo,
  useState,
} from "react";

import {
  Cpu,
  Plus,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";

import type {
  ExperimentalSetup,
} from "../core/types/setup";

import type {
  CreateSetupInput,
} from "../application/setups/setup.service";

import type {
  Project,
} from "../types";

interface SetupsProps {
  projects: Project[];
  setups: ExperimentalSetup[];

  onAddSetup: (
    input: CreateSetupInput
  ) => Promise<void>;
}

interface SetupFormState {
  projectId: string;
  name: string;

  manufacturer: string;
  machineModel: string;
  serialNumber: string;

  injectorType: string;
  injectorModel: string;
  needleGauge: string;
  needleCount: number | undefined;
  emitterCount: number | undefined;

  collectorType: string;
  collectorModel: string;
  collectorDiameterMm:
    number | undefined;
  collectorWidthMm:
    number | undefined;

  platformConfiguration: string;
  notes: string;
}

const EMPTY_FORM: SetupFormState = {
  projectId: "",
  name: "",

  manufacturer: "Bioinicia",
  machineModel: "Fluidnatek LE-500",
  serialNumber: "",

  injectorType: "Single Emitter",
  injectorModel: "",
  needleGauge: "",
  needleCount: 1,
  emitterCount: 1,

  collectorType: "Flat Plate",
  collectorModel: "",
  collectorDiameterMm: undefined,
  collectorWidthMm: undefined,

  platformConfiguration: "",
  notes: "",
};

export default function Setups({
  projects,
  setups,
  onAddSetup,
}: SetupsProps) {
  const [form, setForm] =
    useState<SetupFormState>({
      ...EMPTY_FORM,
      projectId: projects[0]?.id ?? "",
    });

  const [error, setError] =
    useState("");

  const [isSaving, setIsSaving] =
    useState(false);

  const setupsByProject = useMemo(
    () =>
      setups.filter(
        (setup) =>
          !form.projectId ||
          !setup.projectId ||
          setup.projectId ===
            form.projectId
      ),
    [setups, form.projectId]
  );

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();

    setError("");
    setIsSaving(true);

    try {
      await onAddSetup({
        projectId:
          form.projectId || undefined,

        name: form.name,

        manufacturer:
          form.manufacturer,

        machineModel:
          form.machineModel,

        serialNumber:
          form.serialNumber,

        injectorType:
          form.injectorType,

        injectorModel:
          form.injectorModel,

        needleGauge:
          form.needleGauge,

        needleCount:
          form.needleCount,

        emitterCount:
          form.emitterCount,

        collectorType:
          form.collectorType,

        collectorModel:
          form.collectorModel,

        collectorDiameterMm:
          form.collectorDiameterMm,

        collectorWidthMm:
          form.collectorWidthMm,

        platformConfiguration:
          form.platformConfiguration,

        notes:
          form.notes,
      });

      setForm((currentForm) => ({
        ...EMPTY_FORM,
        projectId:
          currentForm.projectId,
      }));
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save setup."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-slate-100 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            Workflow step 4
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Setups
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Reusable machine and hardware
            configurations, stored separately
            from operating parameters.
          </p>
        </header>

        <div className="mt-6 grid gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                <SlidersHorizontal className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-bold text-slate-950">
                  Create setup
                </h2>

                <p className="text-xs text-slate-500">
                  Hardware only. No run parameters.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-6 space-y-5"
            >
              <SelectField
                label="Project"
                value={form.projectId}
                onChange={(projectId) =>
                  setForm((current) => ({
                    ...current,
                    projectId,
                  }))
                }
                options={[
                  {
                    value: "",
                    label: "Reusable global setup",
                  },
                  ...projects.map(
                    (project) => ({
                      value: project.id,
                      label: project.name,
                    })
                  ),
                ]}
              />

              <TextField
                label="Setup name"
                value={form.name}
                onChange={(name) =>
                  setForm((current) => ({
                    ...current,
                    name,
                  }))
                }
              />

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <SectionLabel
                  icon={Cpu}
                  label="Machine"
                />

                <div className="mt-4 space-y-4">
                  <TextField
                    label="Manufacturer"
                    value={form.manufacturer}
                    onChange={(manufacturer) =>
                      setForm((current) => ({
                        ...current,
                        manufacturer,
                      }))
                    }
                  />

                  <TextField
                    label="Machine model"
                    value={form.machineModel}
                    onChange={(machineModel) =>
                      setForm((current) => ({
                        ...current,
                        machineModel,
                      }))
                    }
                  />

                  <TextField
                    label="Serial number"
                    value={form.serialNumber}
                    onChange={(serialNumber) =>
                      setForm((current) => ({
                        ...current,
                        serialNumber,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <SectionLabel
                  icon={Wrench}
                  label="Injector"
                />

                <div className="mt-4 space-y-4">
                  <SelectField
                    label="Injector type"
                    value={form.injectorType}
                    onChange={(injectorType) =>
                      setForm((current) => ({
                        ...current,
                        injectorType,
                      }))
                    }
                    options={[
                      {
                        value: "Single Emitter",
                        label: "Single Emitter",
                      },
                      {
                        value: "Coaxial",
                        label: "Coaxial",
                      },
                      {
                        value: "Multi-emitter",
                        label: "Multi-emitter",
                      },
                      {
                        value: "Multi-needle",
                        label: "Multi-needle",
                      },
                    ]}
                  />

                  <TextField
                    label="Injector model"
                    value={form.injectorModel}
                    onChange={(injectorModel) =>
                      setForm((current) => ({
                        ...current,
                        injectorModel,
                      }))
                    }
                  />

                  <TextField
                    label="Needle gauge"
                    value={form.needleGauge}
                    onChange={(needleGauge) =>
                      setForm((current) => ({
                        ...current,
                        needleGauge,
                      }))
                    }
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <OptionalNumberField
                      label="Needles"
                      value={form.needleCount}
                      onChange={(needleCount) =>
                        setForm((current) => ({
                          ...current,
                          needleCount,
                        }))
                      }
                    />

                    <OptionalNumberField
                      label="Emitters"
                      value={form.emitterCount}
                      onChange={(emitterCount) =>
                        setForm((current) => ({
                          ...current,
                          emitterCount,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <SectionLabel
                  icon={SlidersHorizontal}
                  label="Collector"
                />

                <div className="mt-4 space-y-4">
                  <SelectField
                    label="Collector type"
                    value={form.collectorType}
                    onChange={(collectorType) =>
                      setForm((current) => ({
                        ...current,
                        collectorType,
                      }))
                    }
                    options={[
                      {
                        value: "Flat Plate",
                        label: "Flat Plate",
                      },
                      {
                        value: "Rotating Drum",
                        label: "Rotating Drum",
                      },
                      {
                        value: "Mandrel",
                        label: "Mandrel",
                      },
                      {
                        value: "Y-axis Stage",
                        label: "Y-axis Stage",
                      },
                    ]}
                  />

                  <TextField
                    label="Collector model"
                    value={form.collectorModel}
                    onChange={(collectorModel) =>
                      setForm((current) => ({
                        ...current,
                        collectorModel,
                      }))
                    }
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <OptionalNumberField
                      label="Diameter mm"
                      value={
                        form.collectorDiameterMm
                      }
                      onChange={(
                        collectorDiameterMm
                      ) =>
                        setForm((current) => ({
                          ...current,
                          collectorDiameterMm,
                        }))
                      }
                    />

                    <OptionalNumberField
                      label="Width mm"
                      value={
                        form.collectorWidthMm
                      }
                      onChange={(
                        collectorWidthMm
                      ) =>
                        setForm((current) => ({
                          ...current,
                          collectorWidthMm,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <TextField
                label="Platform configuration"
                value={
                  form.platformConfiguration
                }
                onChange={(
                  platformConfiguration
                ) =>
                  setForm((current) => ({
                    ...current,
                    platformConfiguration,
                  }))
                }
              />

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Notes
                </span>

                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />

                {isSaving
                  ? "Saving..."
                  : "Save setup"}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-slate-950">
              Registered setups
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {setupsByProject.length} reusable
              configurations
            </p>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {setupsByProject.map(
                (setup) => (
                  <SetupCard
                    key={setup.id}
                    setup={setup}
                  />
                )
              )}

              {setupsByProject.length === 0 && (
                <div className="col-span-full rounded-2xl border border-dashed border-slate-300 py-20 text-center text-sm text-slate-400">
                  No setups registered.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

interface SetupCardProps {
  setup: ExperimentalSetup;
}

function SetupCard({
  setup,
}: SetupCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="font-bold text-slate-900">
        {setup.name ??
          setup.machine.model}
      </h3>

      <p className="mt-1 text-xs text-slate-500">
        {setup.machine.manufacturer ??
          "Unknown manufacturer"}
        {" · "}
        {setup.machine.model}
      </p>

      <div className="mt-4 space-y-2 rounded-xl bg-white p-3 text-xs text-slate-600">
        <p>
          <strong>Injector:</strong>{" "}
          {setup.injector.type}
        </p>

        <p>
          <strong>Collector:</strong>{" "}
          {setup.collector.type}
        </p>

        <p>
          <strong>Platform:</strong>{" "}
          {setup.platformConfiguration ??
            "N/D"}
        </p>
      </div>
    </article>
  );
}

interface SectionLabelProps {
  icon: typeof Cpu;
  label: string;
}

function SectionLabel({
  icon: Icon,
  label,
}: SectionLabelProps) {
  return (
    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
      <Icon className="h-4 w-4 text-blue-600" />
      {label}
    </div>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function TextField({
  label,
  value,
  onChange,
}: TextFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>

      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: SelectFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

interface OptionalNumberFieldProps {
  label: string;
  value: number | undefined;

  onChange: (
    value: number | undefined
  ) => void;
}

function OptionalNumberField({
  label,
  value,
  onChange,
}: OptionalNumberFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>

      <input
        type="number"
        min={1}
        step={1}
        value={value ?? ""}
        onChange={(event) => {
          const rawValue =
            event.target.value;

          onChange(
            rawValue
              ? Number.parseInt(
                  rawValue,
                  10
                )
              : undefined
          );
        }}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}