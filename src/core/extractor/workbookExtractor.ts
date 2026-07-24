/**
 * ============================================================================
 * FLUIDNATEK SMART MEMORY
 * Workbook Extractor
 *
 * Converts an XLSX workbook into an ExtractedWorkbook.
 * ============================================================================
 */

import type { ExtractedWorkbook } from "../types/extractedWorkbook";

import type { ExtractedSheet } from "../types/extractedSheet";

import { extractSheet } from "./sheetExtractor";

interface WorksheetLike {

    [key: string]: unknown;

    "!ref"?: string;

    "!merges"?: unknown[];

}

export interface WorkbookLike {

    SheetNames: string[];

    Sheets: Record<string, WorksheetLike>;

}

export function extractWorkbook(

    workbook: WorkbookLike,

    fileName?: string

): ExtractedWorkbook {

    const sheets: ExtractedSheet[] = [];

    for (const sheetName of workbook.SheetNames) {

        const worksheet = workbook.Sheets[sheetName];

        sheets.push(

            extractSheet(

                sheetName,

                worksheet

            )

        );

    }

    return {

        fileName,

        sheets,

        importedAt: new Date().toISOString()

    };

}