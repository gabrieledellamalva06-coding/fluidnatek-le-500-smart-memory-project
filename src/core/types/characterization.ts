/**
 * ============================================================================
 * FLUIDNATEK SMART MEMORY
 * Characterization Types
 *
 * Represents characterization performed before and after electrospinning.
 * ============================================================================
 */

import type { SourceTraceability } from "./traceability";

export interface SolutionCharacterization {
    id: string;

    formulationId: string;

    solidsContentPct?: number;

    viscosityMpas?: number;

    conductivityUsCm?: number;

    densityGcm3?: number;

    surfaceTensionMnM?: number;

    ph?: number;

    measuredAt?: string;

    notes?: string;

    source?: SourceTraceability;
}

export interface FiberDiameterStatistics {
    meanNm?: number;

    medianNm?: number;

    standardDeviationNm?: number;

    minimumNm?: number;

    maximumNm?: number;

    sampleCount?: number;
}

export interface MaterialCharacterization {
    id: string;

    experimentId: string;

    sampleCode?: string;

    fiberDiameter?: FiberDiameterStatistics;

    morphology?: string;

    basisWeightGm2?: number;

    thicknessUm?: number;

    porosityPct?: number;

    filtrationEfficiencyPct?: number;

    pressureDropPa?: number;

    measuredAt?: string;

    method?: string;

    notes?: string;

    source?: SourceTraceability;
}