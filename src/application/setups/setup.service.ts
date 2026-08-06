import type {
  ExperimentalSetup,
} from "../../core/types/setup";

import {
  setupRepository,
} from "../../repositories/setup.repository";

import {
  projectRepository,
} from "../../repositories/project.repository";

export interface CreateSetupInput {
  projectId?: string;
  name: string;

  manufacturer?: string;
  machineModel: string;
  serialNumber?: string;

  injectorType: string;
  injectorModel?: string;
  needleGauge?: string;
  needleCount?: number;
  emitterCount?: number;

  collectorType: string;
  collectorModel?: string;
  collectorDiameterMm?: number;
  collectorWidthMm?: number;

  platformConfiguration?: string;
  notes?: string;
}

export interface SetupService {
  getSetups(): Promise<ExperimentalSetup[]>;

  createSetup(
    input: CreateSetupInput
  ): Promise<ExperimentalSetup>;
}

class FirestoreSetupService
  implements SetupService
{
  async getSetups(): Promise<
    ExperimentalSetup[]
  > {
    const setups =
      await setupRepository.getAll();

    return [...setups].sort(
      compareSetups
    );
  }

  async createSetup(
    input: CreateSetupInput
  ): Promise<ExperimentalSetup> {
    const name = requireText(
      input.name,
      "Setup name"
    );

    const machineModel = requireText(
      input.machineModel,
      "Machine model"
    );

    const injectorType = requireText(
      input.injectorType,
      "Injector type"
    );

    const collectorType = requireText(
      input.collectorType,
      "Collector type"
    );

    const projectId =
      normalizeOptionalText(
        input.projectId
      );

    if (projectId) {
      const project =
        await projectRepository.getById(
          projectId
        );

      if (!project) {
        throw new Error(
          `Project "${projectId}" does not exist in Firestore.`
        );
      }
    }

    validateOptionalPositiveInteger(
      input.needleCount,
      "Needle count"
    );

    validateOptionalPositiveInteger(
      input.emitterCount,
      "Emitter count"
    );

    validateOptionalPositiveNumber(
      input.collectorDiameterMm,
      "Collector diameter"
    );

    validateOptionalPositiveNumber(
      input.collectorWidthMm,
      "Collector width"
    );

    const timestamp =
      new Date().toISOString();

    const setup: ExperimentalSetup = {
      id: createEntityId("SETUP"),

      projectId,

      name,

      machine: {
        manufacturer:
          normalizeOptionalText(
            input.manufacturer
          ),

        model: machineModel,

        serialNumber:
          normalizeOptionalText(
            input.serialNumber
          ),
      },

      injector: {
        type: injectorType,

        model:
          normalizeOptionalText(
            input.injectorModel
          ),

        needleGauge:
          normalizeOptionalText(
            input.needleGauge
          ),

        needleCount:
          input.needleCount,

        emitterCount:
          input.emitterCount,
      },

      collector: {
        type: collectorType,

        model:
          normalizeOptionalText(
            input.collectorModel
          ),

        diameterMm:
          input.collectorDiameterMm,

        widthMm:
          input.collectorWidthMm,
      },

      platformConfiguration:
        normalizeOptionalText(
          input.platformConfiguration
        ),

      notes:
        normalizeOptionalText(
          input.notes
        ),

      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await setupRepository.save(setup);

    return setup;
  }
}

function compareSetups(
  first: ExperimentalSetup,
  second: ExperimentalSetup
): number {
  const firstName =
    first.name ?? first.machine.model;

  const secondName =
    second.name ?? second.machine.model;

  return firstName.localeCompare(
    secondName
  );
}

function requireText(
  value: string,
  label: string
): string {
  const normalizedValue =
    value.trim();

  if (!normalizedValue) {
    throw new Error(
      `${label} is required.`
    );
  }

  return normalizedValue;
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

function validateOptionalPositiveInteger(
  value: number | undefined,
  label: string
): void {
  if (value === undefined) {
    return;
  }

  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      `${label} must be a positive integer.`
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
      `${label} must be a positive number.`
    );
  }
}

function createEntityId(
  prefix: string
): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export const setupService: SetupService =
  new FirestoreSetupService();