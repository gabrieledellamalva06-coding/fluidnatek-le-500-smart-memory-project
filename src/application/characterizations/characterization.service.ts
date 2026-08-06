import type {
  SolutionCharacterization,
} from "../../core/types/characterization";

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
}

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
}

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