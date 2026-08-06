import React, {
  useMemo,
  useState,
} from "react";

import {
  Beaker,
  CalendarDays,
  FlaskConical,
  Plus,
  TestTube2,
} from "lucide-react";

import type {
  Formulation,
  Project,
} from "../types";

import type {
  SolutionCharacterization,
} from "../core/types/characterization";

import type {
  CreateSolutionCharacterizationInput,
} from "../application/characterizations/characterization.service";

import type {
  Language,
} from "../lib/translations";

interface FormulationsProps {
  projects: Project[];

  formulations: Formulation[];

  characterizations: SolutionCharacterization[];

  onAddFormulation: (
    formulation: Omit<Formulation, "id">
  ) => void | Promise<void>;

  onAddCharacterization: (
    input: CreateSolutionCharacterizationInput
  ) => void | Promise<void>;

  lang: Language;
}

interface FormulationFormState {
  projectId: string;
  polymerName: string;
  solventName: string;
  concentrationPct: number;
}

interface CharacterizationFormState {
  formulationId: string;
  solidsContentPct: number | undefined;
  viscosityMpas: number | undefined;
  conductivityUsCm: number | undefined;
  densityGcm3: number | undefined;
  surfaceTensionMnM: number | undefined;
  ph: number | undefined;
  notes: string;
}

const EMPTY_CHARACTERIZATION: CharacterizationFormState = {
  formulationId: "",
  solidsContentPct: undefined,
  viscosityMpas: undefined,
  conductivityUsCm: undefined,
  densityGcm3: undefined,
  surfaceTensionMnM: undefined,
  ph: undefined,
  notes: "",
};

export default function Formulations({
  projects,
  formulations,
  characterizations,
  onAddFormulation,
  onAddCharacterization,
}: FormulationsProps) {
  const [selectedProjectId, setSelectedProjectId] =
    useState(projects[0]?.id ?? "");

  const [formulationForm, setFormulationForm] =
    useState<FormulationFormState>({
      projectId: projects[0]?.id ?? "",
      polymerName: "",
      solventName: "",
      concentrationPct: 0,
    });

  const [
    characterizationForm,
    setCharacterizationForm,
  ] =
    useState<CharacterizationFormState>(
      EMPTY_CHARACTERIZATION
    );

  const [formulationError, setFormulationError] =
    useState("");

  const [
    characterizationError,
    setCharacterizationError,
  ] = useState("");

  const [isSavingFormulation, setIsSavingFormulation] =
    useState(false);

  const [
    isSavingCharacterization,
    setIsSavingCharacterization,
  ] = useState(false);

  const visibleFormulations = useMemo(
    () =>
      formulations.filter(
        (formulation) =>
          !selectedProjectId ||
          formulation.projectId ===
            selectedProjectId
      ),
    [formulations, selectedProjectId]
  );

  const handleProjectContextChange = (
    projectId: string
  ): void => {
    setSelectedProjectId(projectId);

    setFormulationForm(
      (currentForm) => ({
        ...currentForm,
        projectId,
      })
    );

    setCharacterizationForm(
      EMPTY_CHARACTERIZATION
    );
  };

  const handleCreateFormulation = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();

    const projectId =
      formulationForm.projectId.trim();

    const polymerName =
      formulationForm.polymerName.trim();

    const solventName =
      formulationForm.solventName.trim();

    if (!projectId) {
      setFormulationError(
        "Select a project before creating the formulation."
      );
      return;
    }

    if (!polymerName) {
      setFormulationError(
        "Enter at least one polymer."
      );
      return;
    }

    if (!solventName) {
      setFormulationError(
        "Enter at least one solvent."
      );
      return;
    }

    setFormulationError("");
    setIsSavingFormulation(true);

    try {
      await onAddFormulation({
        projectId,
        polymerName,
        solvent: solventName,

        /*
         * Compatibility fields.
         *
         * The current UI model still exposes these values on Formulation,
         * but measured properties are no longer entered here.
         */
        solidsContentPct:
          formulationForm.concentrationPct,

        viscosityMpas: 0,
        conductivityUsCm: 0,
        densityGcm3: 0,

        materialBatchIds: [],
      });

      setFormulationForm({
        projectId,
        polymerName: "",
        solventName: "",
        concentrationPct: 0,
      });
    } catch (error: unknown) {
      setFormulationError(
        getErrorMessage(
          error,
          "Unable to create formulation."
        )
      );
    } finally {
      setIsSavingFormulation(false);
    }
  };

  const handleCreateCharacterization = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();

    if (
      !characterizationForm.formulationId
    ) {
      setCharacterizationError(
        "Select a formulation before saving the characterization."
      );
      return;
    }

    setCharacterizationError("");
    setIsSavingCharacterization(true);

    try {
      await onAddCharacterization({
        formulationId:
          characterizationForm.formulationId,

        solidsContentPct:
          characterizationForm.solidsContentPct,

        viscosityMpas:
          characterizationForm.viscosityMpas,

        conductivityUsCm:
          characterizationForm.conductivityUsCm,

        densityGcm3:
          characterizationForm.densityGcm3,

        surfaceTensionMnM:
          characterizationForm.surfaceTensionMnM,

        ph:
          characterizationForm.ph,

        measuredAt:
          new Date().toISOString(),

        notes:
          characterizationForm.notes.trim() ||
          undefined,
      });

      setCharacterizationForm({
        ...EMPTY_CHARACTERIZATION,
        formulationId:
          characterizationForm.formulationId,
      });
    } catch (error: unknown) {
      setCharacterizationError(
        getErrorMessage(
          error,
          "Unable to save characterization."
        )
      );
    } finally {
      setIsSavingCharacterization(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-slate-100 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            Workflow steps 2–3
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Formulations & Characterization
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
            Formulations define intended composition.
            Characterization records contain measured
            properties and remain separate from the
            formulation.
          </p>
        </header>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block max-w-xl">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Active project context
            </span>

            <select
              value={selectedProjectId}
              onChange={(event) =>
                handleProjectContextChange(
                  event.target.value
                )
              }
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
            >
              <option value="">
                Select project
              </option>

              {projects.map((project) => (
                <option
                  key={project.id}
                  value={project.id}
                >
                  {project.name}
                </option>
              ))}
            </select>
          </label>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <SectionHeading
              icon={FlaskConical}
              colorClass="bg-blue-50 text-blue-600"
              title="Create formulation"
              subtitle="Intended materials, concentrations and ratios."
            />

            <form
              onSubmit={handleCreateFormulation}
              className="mt-6 space-y-4"
            >
              <TextField
                label="Polymer"
                placeholder="Example: PEO 300 kDa"
                value={
                  formulationForm.polymerName
                }
                onChange={(polymerName) =>
                  setFormulationForm(
                    (currentForm) => ({
                      ...currentForm,
                      polymerName,
                    })
                  )
                }
              />

              <TextField
                label="Solvent"
                placeholder="Example: distilled water"
                value={
                  formulationForm.solventName
                }
                onChange={(solventName) =>
                  setFormulationForm(
                    (currentForm) => ({
                      ...currentForm,
                      solventName,
                    })
                  )
                }
              />

              <RequiredNumberField
                label="Nominal concentration"
                unit="wt %"
                min={0}
                max={100}
                value={
                  formulationForm.concentrationPct
                }
                onChange={(concentrationPct) =>
                  setFormulationForm(
                    (currentForm) => ({
                      ...currentForm,
                      concentrationPct,
                    })
                  )
                }
              />

              {formulationError && (
                <ErrorMessage
                  message={formulationError}
                />
              )}

              <button
                type="submit"
                disabled={
                  isSavingFormulation ||
                  !formulationForm.projectId
                }
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />

                {isSavingFormulation
                  ? "Saving..."
                  : "Save formulation"}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <SectionHeading
              icon={TestTube2}
              colorClass="bg-violet-50 text-violet-600"
              title="Add characterization"
              subtitle="Measured properties stored as a separate dated record."
            />

            <form
              onSubmit={
                handleCreateCharacterization
              }
              className="mt-6 space-y-4"
            >
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Formulation
                </span>

                <select
                  value={
                    characterizationForm.formulationId
                  }
                  onChange={(event) =>
                    setCharacterizationForm(
                      (currentForm) => ({
                        ...currentForm,
                        formulationId:
                          event.target.value,
                      })
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                >
                  <option value="">
                    Select formulation
                  </option>

                  {visibleFormulations.map(
                    (formulation) => (
                      <option
                        key={formulation.id}
                        value={formulation.id}
                      >
                        {getFormulationLabel(
                          formulation
                        )}
                      </option>
                    )
                  )}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <OptionalNumberField
                  label="Measured solid content"
                  unit="wt %"
                  min={0}
                  max={100}
                  value={
                    characterizationForm.solidsContentPct
                  }
                  onChange={(
                    solidsContentPct
                  ) =>
                    setCharacterizationForm(
                      (currentForm) => ({
                        ...currentForm,
                        solidsContentPct,
                      })
                    )
                  }
                />

                <OptionalNumberField
                  label="Viscosity"
                  unit="mPa·s"
                  min={0}
                  value={
                    characterizationForm.viscosityMpas
                  }
                  onChange={(viscosityMpas) =>
                    setCharacterizationForm(
                      (currentForm) => ({
                        ...currentForm,
                        viscosityMpas,
                      })
                    )
                  }
                />

                <OptionalNumberField
                  label="Conductivity"
                  unit="µS/cm"
                  min={0}
                  value={
                    characterizationForm.conductivityUsCm
                  }
                  onChange={(
                    conductivityUsCm
                  ) =>
                    setCharacterizationForm(
                      (currentForm) => ({
                        ...currentForm,
                        conductivityUsCm,
                      })
                    )
                  }
                />

                <OptionalNumberField
                  label="Density"
                  unit="g/cm³"
                  min={0}
                  value={
                    characterizationForm.densityGcm3
                  }
                  onChange={(densityGcm3) =>
                    setCharacterizationForm(
                      (currentForm) => ({
                        ...currentForm,
                        densityGcm3,
                      })
                    )
                  }
                />

                <OptionalNumberField
                  label="Surface tension"
                  unit="mN/m"
                  min={0}
                  value={
                    characterizationForm.surfaceTensionMnM
                  }
                  onChange={(
                    surfaceTensionMnM
                  ) =>
                    setCharacterizationForm(
                      (currentForm) => ({
                        ...currentForm,
                        surfaceTensionMnM,
                      })
                    )
                  }
                />

                <OptionalNumberField
                  label="pH"
                  unit=""
                  min={0}
                  max={14}
                  value={
                    characterizationForm.ph
                  }
                  onChange={(ph) =>
                    setCharacterizationForm(
                      (currentForm) => ({
                        ...currentForm,
                        ph,
                      })
                    )
                  }
                />
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Measurement notes
                </span>

                <textarea
                  rows={3}
                  value={
                    characterizationForm.notes
                  }
                  onChange={(event) =>
                    setCharacterizationForm(
                      (currentForm) => ({
                        ...currentForm,
                        notes:
                          event.target.value,
                      })
                    )
                  }
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                />
              </label>

              {characterizationError && (
                <ErrorMessage
                  message={
                    characterizationError
                  }
                />
              )}

              <button
                type="submit"
                disabled={
                  isSavingCharacterization ||
                  !characterizationForm.formulationId
                }
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />

                {isSavingCharacterization
                  ? "Saving..."
                  : "Save characterization"}
              </button>
            </form>
          </section>
        </div>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionHeading
            icon={Beaker}
            colorClass="bg-slate-100 text-slate-600"
            title="Registered formulations"
            subtitle={`${visibleFormulations.length} formulations in the selected project`}
          />

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {visibleFormulations.map(
              (formulation) => {
                const records =
                  characterizations
                    .filter(
                      (characterization) =>
                        characterization.formulationId ===
                        formulation.id
                    )
                    .sort(
                      compareCharacterizations
                    );

                return (
                  <article
                    key={formulation.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <h3 className="font-bold text-slate-900">
                      {getFormulationLabel(
                        formulation
                      )}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Nominal concentration:{" "}
                      {
                        formulation.solidsContentPct
                      }{" "}
                      wt %
                    </p>

                    <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <CalendarDays className="h-4 w-4 text-violet-500" />
                        Characterization history
                      </div>

                      {records.length === 0 ? (
                        <p className="mt-3 text-xs text-slate-400">
                          No characterization
                          records.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {records.map(
                            (record) => (
                              <CharacterizationCard
                                key={record.id}
                                record={record}
                              />
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                );
              }
            )}

            {visibleFormulations.length ===
              0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-400">
                No formulations registered in
                this project.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

interface SectionHeadingProps {
  icon: typeof Beaker;
  colorClass: string;
  title: string;
  subtitle: string;
}

function SectionHeading({
  icon: Icon,
  colorClass,
  title,
  subtitle,
}: SectionHeadingProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`rounded-2xl p-3 ${colorClass}`}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div>
        <h2 className="font-bold text-slate-950">
          {title}
        </h2>

        <p className="text-xs text-slate-500">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

interface TextFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

function TextField({
  label,
  placeholder,
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
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}

interface RequiredNumberFieldProps {
  label: string;
  unit: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

function RequiredNumberField({
  label,
  unit,
  value,
  min,
  max,
  onChange,
}: RequiredNumberFieldProps) {
  return (
    <NumberInputContainer
      label={label}
      unit={unit}
    >
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={0.01}
        onChange={(event) =>
          onChange(
            Number.parseFloat(
              event.target.value
            ) || 0
          )
        }
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-4 pr-20 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
      />
    </NumberInputContainer>
  );
}

interface OptionalNumberFieldProps {
  label: string;
  unit: string;
  value: number | undefined;
  min?: number;
  max?: number;
  onChange: (
    value: number | undefined
  ) => void;
}

function OptionalNumberField({
  label,
  unit,
  value,
  min,
  max,
  onChange,
}: OptionalNumberFieldProps) {
  return (
    <NumberInputContainer
      label={label}
      unit={unit}
    >
      <input
        type="number"
        value={value ?? ""}
        min={min}
        max={max}
        step={0.01}
        onChange={(event) => {
          const rawValue =
            event.target.value;

          onChange(
            rawValue === ""
              ? undefined
              : Number.parseFloat(rawValue)
          );
        }}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-4 pr-20 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
      />
    </NumberInputContainer>
  );
}

interface NumberInputContainerProps {
  label: string;
  unit: string;
  children: React.ReactNode;
}

function NumberInputContainer({
  label,
  unit,
  children,
}: NumberInputContainerProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>

      <div className="relative">
        {children}

        {unit && (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
            {unit}
          </span>
        )}
      </div>
    </label>
  );
}

interface CharacterizationCardProps {
  record: SolutionCharacterization;
}

function CharacterizationCard({
  record,
}: CharacterizationCardProps) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-800">
        {formatDate(record.measuredAt)}
      </p>

      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
        <span>
          Viscosity:{" "}
          {formatMeasurement(
            record.viscosityMpas,
            "mPa·s"
          )}
        </span>

        <span>
          Conductivity:{" "}
          {formatMeasurement(
            record.conductivityUsCm,
            "µS/cm"
          )}
        </span>

        <span>
          Surface tension:{" "}
          {formatMeasurement(
            record.surfaceTensionMnM,
            "mN/m"
          )}
        </span>

        <span>
          Solid content:{" "}
          {formatMeasurement(
            record.solidsContentPct,
            "wt %"
          )}
        </span>
      </div>

      {record.notes && (
        <p className="mt-2 text-xs text-slate-500">
          {record.notes}
        </p>
      )}
    </div>
  );
}

interface ErrorMessageProps {
  message: string;
}

function ErrorMessage({
  message,
}: ErrorMessageProps) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700"
    >
      {message}
    </div>
  );
}

function getFormulationLabel(
  formulation: Formulation
): string {
  return `${formulation.polymerName} / ${formulation.solvent}`;
}

function compareCharacterizations(
  first: SolutionCharacterization,
  second: SolutionCharacterization
): number {
  return (
    parseDate(second.measuredAt) -
    parseDate(first.measuredAt)
  );
}

function parseDate(
  value: string | undefined
): number {
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(value);

  return Number.isNaN(timestamp)
    ? 0
    : timestamp;
}

function formatDate(
  value: string | undefined
): string {
  if (!value) {
    return "Unknown date";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString();
}

function formatMeasurement(
  value: number | undefined,
  unit: string
): string {
  return value === undefined
    ? "N/D"
    : `${value} ${unit}`;
}

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  return error instanceof Error
    ? error.message
    : fallback;
}