/**
 * ============================================================================
 * FLUIDNATEK SMART MEMORY
 * Experiment Normalizer
 *
 * Builds a CanonicalExperiment from raw imported data.
 * ============================================================================
 */

import type {

    CanonicalExperiment,
    CanonicalProject,
    CanonicalFormulation,
    CanonicalProcess,
    CanonicalSolution,
    CanonicalSetup,
    CanonicalCharacterization

} from "../types/ingestion";

export interface RawExperimentData {

    id: string;

    sampleCode?: string;

    project?: Partial<CanonicalProject>;

    formulation?: Partial<CanonicalFormulation>;

    solution?: Partial<CanonicalSolution>;

    setup?: Partial<CanonicalSetup>;

    process?: Partial<CanonicalProcess>;

    characterization?: Partial<CanonicalCharacterization>;

    operatorComments?: string;

    metadata?: {

        sourceFile?: string;

        sourceSheet?: string;

        sourceRow?: number;

        originalHeaders?: string[];

    };

}

/**
 * ============================================================================
 * Normalize Experiment
 * ============================================================================
 */

export function normalizeExperiment(

    raw: RawExperimentData

): CanonicalExperiment {

    return {

        id: raw.id,

        sampleCode: raw.sampleCode,

        project: {

            id: raw.project?.id ?? "",

            name: raw.project?.name ?? "Unknown Project",

            description: raw.project?.description,

            customer: raw.project?.customer

        },

        formulation: {

            id: raw.formulation?.id ?? "",

            components: raw.formulation?.components ?? []

        },

        solution: {

            viscosity: raw.solution?.viscosity,

            conductivity: raw.solution?.conductivity,

            surfaceTension: raw.solution?.surfaceTension,

            density: raw.solution?.density

        },

        setup: {

            id: raw.setup?.id ?? "",

            name: raw.setup?.name,

            collector: raw.setup?.collector,

            injector: raw.setup?.injector,

            notes: raw.setup?.notes

        },

        process: {

            flowRate: raw.process?.flowRate,

            hvPositive: raw.process?.hvPositive,

            hvNegative: raw.process?.hvNegative,

            distance: raw.process?.distance,

            temperature: raw.process?.temperature,

            humidity: raw.process?.humidity,

            collectorSpeed: raw.process?.collectorSpeed,

            pressure: raw.process?.pressure

        },

        characterization: {

            processability: raw.characterization?.processability,

            semMorphology: raw.characterization?.semMorphology,

            fiberDiameter: raw.characterization?.fiberDiameter,

            comments: raw.characterization?.comments

        },

        operatorComments: raw.operatorComments,

        metadata: {

            sourceFile: raw.metadata?.sourceFile,

            sourceSheet: raw.metadata?.sourceSheet,

            sourceRow: raw.metadata?.sourceRow,

            originalHeaders: raw.metadata?.originalHeaders ?? [],

            importedAt: new Date().toISOString(),

            parserVersion: "2.0.0"

        }

    };

}