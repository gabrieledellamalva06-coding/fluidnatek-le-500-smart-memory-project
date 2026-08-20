import type {
  SolutionCharacterization,
  SolutionCharacterizationRevision,
  SolutionCharacterizationValues,
} from "../../core/types/characterization";
import { CollectionPaths } from "../../config/collectionPaths";
import { firestoreService } from "../../services/firestore.service";
import { localPersistenceService } from "../../services/local.persistence.service";
import { createCharacterizationRevisionDraft, characterizationValues, sortRevisionsNewestFirst } from "../../features/characterization-revisions/characterizationRevision";

import {
  solutionCharacterizationRepository,
} from "../../repositories/characterization.repository";

import {
  formulationRepository,
} from "../../repositories/formulation.repository";

export interface CreateSolutionCharacterizationInput {
  formulationId: string;

  solidsContentPct?: number;

  viscosityMpas?: number;

  conductivityUsCm?: number;

  densityGcm3?: number;

  surfaceTensionMnM?: number;

  ph?: number;

  measuredAt?: string;

  notes?: string;
}

export interface SolutionCharacterizationService {
  getCharacterizations(): Promise<
    SolutionCharacterization[]
  >;

  getCharacterizationsByFormulation(
    formulationId: string
  ): Promise<SolutionCharacterization[]>;

  createCharacterization(
    input: CreateSolutionCharacterizationInput
  ): Promise<SolutionCharacterization>;
  updateCharacterizationWithRevision(id: string, input: UpdateSolutionCharacterizationInput): Promise<SolutionCharacterization>;
  getRevisions(id: string): Promise<SolutionCharacterizationRevision[]>;
}

export interface UpdateSolutionCharacterizationInput extends SolutionCharacterizationValues { changeReason: string; changedBy: string; }

class FirestoreSolutionCharacterizationService
  implements SolutionCharacterizationService
{
  async getCharacterizations(): Promise<
    SolutionCharacterization[]
  > {
    const characterizations =
      await solutionCharacterizationRepository.getAll();

    return [...characterizations].sort(
      compareByMeasuredDateDescending
    );
  }

  async getCharacterizationsByFormulation(
    formulationId: string
  ): Promise<SolutionCharacterization[]> {
    const normalizedFormulationId =
      formulationId.trim();

    if (!normalizedFormulationId) {
      return [];
    }

    const characterizations =
      await this.getCharacterizations();

    return characterizations.filter(
      (characterization) =>
        characterization.formulationId ===
        normalizedFormulationId
    );
  }

  async createCharacterization(
    input: CreateSolutionCharacterizationInput
  ): Promise<SolutionCharacterization> {
    const formulationId =
      input.formulationId.trim();

    if (!formulationId) {
      throw new Error(
        "A formulation is required to create a characterization."
      );
    }

    const formulation =
      await formulationRepository.getById(
        formulationId
      );

    if (!formulation) {
      throw new Error(
        `Formulation "${formulationId}" does not exist in Firestore.`
      );
    }

    validateOptionalNonNegativeNumber(
      input.solidsContentPct,
      "Solids content"
    );

    validateOptionalNonNegativeNumber(
      input.viscosityMpas,
      "Viscosity"
    );

    validateOptionalNonNegativeNumber(
      input.conductivityUsCm,
      "Conductivity"
    );

    validateOptionalPositiveNumber(
      input.densityGcm3,
      "Density"
    );

    validateOptionalNonNegativeNumber(
      input.surfaceTensionMnM,
      "Surface tension"
    );

    validateOptionalRange(
      input.ph,
      "pH",
      0,
      14
    );

    const measuredAt =
      normalizeMeasuredAt(input.measuredAt);

    const characterization:
      SolutionCharacterization = {
        id: createEntityId(
          "SOL_CHAR"
        ),

        formulationId,

        solidsContentPct:
          input.solidsContentPct,

        viscosityMpas:
          input.viscosityMpas,

        conductivityUsCm:
          input.conductivityUsCm,

        densityGcm3:
          input.densityGcm3,

        surfaceTensionMnM:
          input.surfaceTensionMnM,

        ph:
          input.ph,

        measuredAt,

        notes:
          normalizeOptionalText(
            input.notes
          ),
      };

    await solutionCharacterizationRepository.save(
      characterization
    );

    return characterization;
  }

  async updateCharacterizationWithRevision(id: string, input: UpdateSolutionCharacterizationInput): Promise<SolutionCharacterization> {
    const current = await solutionCharacterizationRepository.getById(id);
    if (!current) throw new Error(`Characterization "${id}" does not exist.`);
    const changeReason = input.changeReason.trim();
    const changedBy = input.changedBy.trim();
    if (!changeReason) throw new Error("Change reason is required.");
    if (!changedBy) throw new Error("Changed by is required.");
    validateCharacterizationValues(input);
    const nextValues = normalizeCharacterizationValues(input);
    const previousValues = characterizationValues(current);
    const revisionId = `REV_${crypto.randomUUID()}`;
    const revision = createCharacterizationRevisionDraft({ id: revisionId, characterizationId: id, previousValues, newValues: nextValues, changeReason, changedBy });
    const changedFields = revision.changedFields;
    if (changedFields.length === 0) throw new Error("Change at least one characterization value before saving.");
    const updated: SolutionCharacterization = { ...current, ...nextValues };
    for (const field of CHARACTERIZATION_OPTIONAL_FIELDS) if (nextValues[field] === undefined) delete updated[field];
    await firestoreService.executeBatch([
      { type: "set", path: CollectionPaths.solutionCharacterizations(), id, data: nextValues, merge: true, deleteFields: CHARACTERIZATION_OPTIONAL_FIELDS.filter((field) => nextValues[field] === undefined) },
      { type: "set", path: CollectionPaths.solutionCharacterizationRevisions(id), id: revisionId, data: revision, merge: false, serverTimestampFields: ["changedAt"] },
    ]);
    await localPersistenceService.replaceDocument(CollectionPaths.solutionCharacterizations(), id, updated);
    return updated;
  }

  async getRevisions(id: string): Promise<SolutionCharacterizationRevision[]> {
    if (!id.trim()) return [];
    return sortRevisionsNewestFirst(await firestoreService.getCollection<SolutionCharacterizationRevision>(CollectionPaths.solutionCharacterizationRevisions(id)));
  }
}

const CHARACTERIZATION_OPTIONAL_FIELDS: Array<keyof SolutionCharacterizationValues> = ["solidsContentPct", "viscosityMpas", "conductivityUsCm", "densityGcm3", "surfaceTensionMnM", "ph", "notes"];
function validateCharacterizationValues(input: SolutionCharacterizationValues): void { validateOptionalNonNegativeNumber(input.solidsContentPct, "Solids content"); validateOptionalNonNegativeNumber(input.viscosityMpas, "Viscosity"); validateOptionalNonNegativeNumber(input.conductivityUsCm, "Conductivity"); validateOptionalPositiveNumber(input.densityGcm3, "Density"); validateOptionalNonNegativeNumber(input.surfaceTensionMnM, "Surface tension"); validateOptionalRange(input.ph, "pH", 0, 14); }
function normalizeCharacterizationValues(input: SolutionCharacterizationValues): SolutionCharacterizationValues { return { solidsContentPct: input.solidsContentPct, viscosityMpas: input.viscosityMpas, conductivityUsCm: input.conductivityUsCm, densityGcm3: input.densityGcm3, surfaceTensionMnM: input.surfaceTensionMnM, ph: input.ph, notes: normalizeOptionalText(input.notes) }; }

function compareByMeasuredDateDescending(
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

  const timestamp =
    Date.parse(value);

  return Number.isNaN(timestamp)
    ? 0
    : timestamp;
}

function normalizeMeasuredAt(
  value: string | undefined
): string {
  if (!value?.trim()) {
    return new Date().toISOString();
  }

  const timestamp =
    Date.parse(value);

  if (Number.isNaN(timestamp)) {
    throw new Error(
      "The characterization measurement date is invalid."
    );
  }

  return new Date(timestamp).toISOString();
}

function normalizeOptionalText(
  value: string | undefined
): string | undefined {
  const normalizedValue =
    value?.trim();

  return normalizedValue
    ? normalizedValue
    : undefined;
}

function validateOptionalNonNegativeNumber(
  value: number | undefined,
  label: string
): void {
  if (value === undefined) {
    return;
  }

  if (
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new Error(
      `${label} must be a finite non-negative number.`
    );
  }
}

function validateOptionalPositiveNumber(
  value: number | undefined,
  label: string
): void {
  if (value === undefined) {
    return;
  }

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    throw new Error(
      `${label} must be a finite positive number.`
    );
  }
}

function validateOptionalRange(
  value: number | undefined,
  label: string,
  minimum: number,
  maximum: number
): void {
  if (value === undefined) {
    return;
  }

  if (
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new Error(
      `${label} must be between ${minimum} and ${maximum}.`
    );
  }
}

function createEntityId(
  prefix: string
): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export const solutionCharacterizationService:
  SolutionCharacterizationService =
    new FirestoreSolutionCharacterizationService();
