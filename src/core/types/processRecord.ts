/**
 * ============================================================================
 * FLUIDNATEK SMART MEMORY
 * Process Record Types
 *
 * A ProcessRecord represents a relevant snapshot of electrospinning
 * conditions belonging to one experiment.
 * ============================================================================
 */

import type { SourceTraceability } from "./traceability";

export interface ProcessParameters {
    voltageKv?: number;

    /** Negative/collector high voltage (HV-). */
    collectorVoltageKv?: number;

    flowRateMlH?: number;

    distanceMm?: number;

    collectorSpeedRpm?: number;

    injectorSpeedMmS?: number;

    carriageSpeedMmS?: number;

    substrateSpeedMmMin?: number;
}

export interface EnvironmentalConditions {
    temperatureC?: number;

    humidityPct?: number;

    pressureMbar?: number;
}

export type ProcessabilityGrade =
    | 1
    | 2
    | 3
    | 4;

export interface ProcessEvaluation {
    processabilityGrade?: ProcessabilityGrade;

    jetStabilityGrade?: ProcessabilityGrade;

    productivityGrade?: ProcessabilityGrade;

    scalabilityGrade?: ProcessabilityGrade;

    isStable?: boolean;

    operatorComments?: string;
}

export interface ProcessRecord {
    id: string;

    experimentId: string;

    sequence: number;

    timestampSec?: number;

    parameters: ProcessParameters;

    environment?: EnvironmentalConditions;

    evaluation?: ProcessEvaluation;

    source?: SourceTraceability;

    createdAt: string;
}