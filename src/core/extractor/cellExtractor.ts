/**
 * ============================================================================
 * FLUIDNATEK SMART MEMORY
 * Cell Extractor
 *
 * Converts a raw XLSX cell into an ExtractedCell.
 * ============================================================================
 */

import type { ExtractedCell, CellType } from "../types/extractedCell";

interface RawCell {

    v?: unknown;

    w?: string;

    f?: string;

    c?: { t?: string }[];

}

function detectCellType(value: unknown): CellType {

    if (value === undefined || value === null || value === "") {

        return "empty";

    }

    if (typeof value === "number") {

        return "number";

    }

    if (typeof value === "boolean") {

        return "boolean";

    }

    if (value instanceof Date) {

        return "date";

    }

    if (typeof value === "string") {

        return "string";

    }

    return "unknown";

}

export function extractCell(

    address: string,

    row: number,

    column: number,

    cell?: RawCell

): ExtractedCell {

    const value = cell?.v;

    const type = cell?.f
        ? "formula"
        : detectCellType(value);

    return {

        address,

        row,

        column,

        value,

        text: cell?.w ?? String(value ?? ""),

        type,

        formula: cell?.f,

        comment: cell?.c?.[0]?.t,

        merged: false,

        hidden: false

    };

}