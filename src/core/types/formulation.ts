/**
 * ============================================================================
 * FLUIDNATEK SMART MEMORY
 * Formulation Types
 *
 * Canonical representation of solution formulations.
 * ============================================================================
 */

import type { SourceTraceability } from "./traceability";

export type FormulationComponentRole =
    | "polymer"
    | "solvent"
    | "additive"
    | "nanoparticle"
    | "surfactant"
    | "salt"
    | "other";

export type FormulationQuantityUnit =
    | "wt_pct"
    | "vol_pct"
    | "w_v_pct"
    | "g"
    | "mg"
    | "ml"
    | "ul"
    | "ratio"
    | "unknown";

export interface FormulationComponent {
    id: string;

    formulationId: string;

    materialId: string;

    role: FormulationComponentRole;

    quantity?: number;

    unit?: FormulationQuantityUnit;

    concentrationPct?: number;

    notes?: string;

    basis?: "wt/wt" | "vol/vol" | "wt/vol";
}

export interface Formulation {
    id: string;

    projectId: string;

    code?: string;

    name: string;

    components: FormulationComponent[];

    preparationProcedure?: string;

    preparationTemperatureC?: number;

    preparationTimeMin?: number;

    agingTimeH?: number;

    solutionCharacterizationId?: string;

    notes?: string;

    createdAt: string;

    updatedAt: string;

    source?: SourceTraceability;
}
