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

export type VariationParameterKey =
    | "flowRateMlH"
    | "voltageKv"
    | "collectorVoltageKv"
    | "temperatureC"
    | "humidityPct"
    | "distanceMm"
    | "drumSpeedRpm";

export interface VariationParameterChange {
    key: VariationParameterKey;
    previousValue?: number;
    newValue?: number;
    unit: string;
}

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

    /** Structured provenance for a newly planned variation. */
    clonedFromExperimentId?: string;

    /** Stable client request used to make clone retries idempotent. */
    cloneRequestId?: string;

    /** Exact process record selected as the source for this variation. */
    sourceProcessRecordId?: string;

    /** Missing-safe, zero-safe operating parameter changes captured at clone time. */
    changedParameters?: VariationParameterChange[];

    /** User-entered audit identity for the variation creation. */
    variationCreatedBy?: string;

    /** User-entered reason for creating the variation. */
    variationReason?: string;

    /** Authoritative Firestore server timestamp. */
    variationCreatedAt?: unknown;

    operatorId?: string;

    startedAt?: string;

    completedAt?: string;

    notes?: string;

    createdAt: string;

    updatedAt: string;

    source?: SourceTraceability;

    dataQuality: DataQualityInfo;
}
