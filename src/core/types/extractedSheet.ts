/**
 * ============================================================================
 * FLUIDNATEK SMART MEMORY
 * Extracted Sheet Types
 *
 * Represents the raw structural information extracted from an Excel worksheet.
 * This module contains no semantic or domain-specific logic.
 * ============================================================================
 */

import type { ExtractedRow } from "./extractedRow";

export interface ExtractedSheetMetadata {
    /**
     * Original worksheet range, for example: A1:Z200.
     */
    range: string | null;

    /**
     * Number of merged-cell regions detected in the worksheet.
     */
    mergedCells: number;

    /**
     * Total number of physical rows included in the worksheet range.
     */
    totalRows: number;

    /**
     * Total number of physical columns included in the worksheet range.
     */
    totalColumns: number;

    /**
     * Zero-based index of the most probable header row.
     *
     * Null means that no reliable header row was detected.
     */
    headerRowIndex: number | null;

    /**
     * Confidence score assigned by the Header Detector.
     *
     * Expected range: 0–1.
     */
    headerConfidence: number;
}

export interface ExtractedSheet {
    /**
     * Original worksheet name.
     */
    name: string;

    /**
     * Headers detected automatically from the worksheet content.
     */
    headers: string[];

    /**
     * Raw extracted worksheet rows.
     */
    rows: ExtractedRow[];

    /**
     * Indicates whether the worksheet is hidden.
     */
    hidden: boolean;

    /**
     * Structural worksheet metadata.
     */
    metadata: ExtractedSheetMetadata;
}