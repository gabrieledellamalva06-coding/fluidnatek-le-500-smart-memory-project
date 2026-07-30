/**
 * ============================================================================
 * FLUIDNATEK SMART MEMORY
 * Electrospinning Setup Types
 *
 * Hardware configuration is intentionally separated from process parameters.
 * ============================================================================
 */

import type { SourceTraceability } from "./traceability";
import type { DataQualityInfo } from "./dataQuality";

export interface MachineReference {
    manufacturer?: string;

    model: string;

    serialNumber?: string;
}

export interface InjectorConfiguration {
    type: string;

    model?: string;

    needleGauge?: string;

    needleCount?: number;

    emitterCount?: number;
}

export interface CollectorConfiguration {
    type: string;

    model?: string;

    diameterMm?: number;

    widthMm?: number;
}

export interface ExperimentalSetup {
    id: string;

    projectId?: string;

    dataQuality?: DataQualityInfo;

    name?: string;

    machine: MachineReference;

    injector: InjectorConfiguration;

    collector: CollectorConfiguration;

    platformConfiguration?: string;

    notes?: string;

    createdAt: string;

    updatedAt: string;

    source?: SourceTraceability;
}