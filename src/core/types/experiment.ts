/**
 * ============================================================================
 * FLUIDNATEK SMART MEMORY
 * Experiment Types
 *
 * Canonical electrospinning experiment entity.
 * ============================================================================
 */

import type { SourceTraceability } from "./traceability";
import type { DataQualityInfo } from "./dataQuality";

export type ExperimentStatus =
    | "draft"
    | "planned"
    | "running"
    | "completed"
    | "failed"
    | "cancelled";

export interface Experiment {
    id: string;

    projectId: string;

    formulationId: string;

    setupId: string;

    operationIdentifier: string;

    sampleCode?: string;

    status: ExperimentStatus;

    processRecordIds: string[];

    materialCharacterizationIds: string[];

    operatorId?: string;

    startedAt?: string;

    completedAt?: string;

    notes?: string;

    createdAt: string;

    updatedAt: string;

    source?: SourceTraceability;

    dataQuality: DataQualityInfo;
}