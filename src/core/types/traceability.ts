/**
 * ============================================================================
 * FLUIDNATEK SMART MEMORY
 * Source Traceability Types
 *
 * Tracks the origin of experimental information.
 * Required for historical Excel consolidation and future DataHub integration.
 * ============================================================================
 */

export type DataSourceType =
    | "manual"
    | "excel"
    | "migration"
    | "datahub"
    | "system";

export interface SourceLocation {
    fileName?: string;
    sheetName?: string;
    rowIndex?: number;
    columnName?: string;
}

export interface SourceTraceability {
    sourceType: DataSourceType;

    sourceId?: string;

    location?: SourceLocation;

    importedAt?: string;

    importedBy?: string;

    parserVersion?: string;

    originalValue?: string;

    notes?: string;
}