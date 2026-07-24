/**
 * ============================================================================
 * FLUIDNATEK SMART MEMORY
 * Extracted Cell
 * ============================================================================
 */

export type CellType =
    | "string"
    | "number"
    | "boolean"
    | "date"
    | "empty"
    | "formula"
    | "unknown";

export interface ExtractedCell {

    address: string;

    row: number;

    column: number;

    value: unknown;

    text: string;

    type: CellType;

    formula?: string;

    comment?: string;

    merged: boolean;

    hidden: boolean;

}