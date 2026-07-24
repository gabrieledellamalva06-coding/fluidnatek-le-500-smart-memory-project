/**
 * ============================================================================
 * FLUIDNATEK SMART MEMORY
 * Row Extractor
 *
 * Converts one Excel row into an ExtractedRow.
 * ============================================================================
 */

import type { ExtractedRow } from "../types/extractedRow";

import { extractCell } from "./cellExtractor";

interface WorksheetLike {

    [address: string]: unknown;

}

export function extractRow(

    worksheet: WorksheetLike,

    row: number,

    totalColumns: number

): ExtractedRow {

    const cells = [];

    for (let column = 0; column < totalColumns; column++) {

        const letter = String.fromCharCode(65 + column);

        const address = `${letter}${row}`;

        cells.push(

            extractCell(

                address,

                row,

                column + 1,

                worksheet[address] as never

            )

        );

    }

    return {

        index: row,

        cells

    };

}