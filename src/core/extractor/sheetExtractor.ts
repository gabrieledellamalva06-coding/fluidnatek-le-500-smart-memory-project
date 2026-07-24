/**
 * ============================================================================
 * FLUIDNATEK SMART MEMORY
 * Sheet Extractor
 *
 * Extracts the raw physical structure of an Excel worksheet.
 *
 * Responsibilities:
 * - read the worksheet range;
 * - extract every physical row;
 * - preserve worksheet metadata;
 * - detect the most probable header row.
 *
 * This module must not contain semantic or domain-specific logic.
 * ============================================================================
 */

import type { ExtractedSheet } from "../types/extractedSheet";
import { detectHeaders } from "./headerDetector";
import { extractRow } from "./rowExtractor";

export interface WorksheetLike {
    [cellAddress: string]: unknown;

    "!ref"?: string;

    "!merges"?: readonly unknown[];
}

interface ParsedWorksheetRange {
    firstRowIndex: number;
    lastRowIndex: number;
    firstColumnIndex: number;
    lastColumnIndex: number;
}

export function extractSheet(
    sheetName: string,
    worksheet: WorksheetLike,
): ExtractedSheet {
    const worksheetRange = worksheet["!ref"];

    if (typeof worksheetRange !== "string") {
        return createEmptySheet(sheetName);
    }

    const parsedRange = parseWorksheetRange(worksheetRange);

    if (!parsedRange) {
        return createEmptySheet(sheetName, worksheetRange);
    }

    const rows = [];

    for (
        let rowIndex = parsedRange.firstRowIndex;
        rowIndex <= parsedRange.lastRowIndex;
        rowIndex += 1
    ) {
       rows.push(
    extractRow(
        worksheet,
        rowIndex,
        parsedRange.lastColumnIndex,
    ),
);
    }

    const headerDetection = detectHeaders(rows);

    const hasDetectedHeaders =
        headerDetection.headers.some((header) => header.length > 0) &&
        headerDetection.score > 0;

    return {
        name: sheetName,
        headers: hasDetectedHeaders
            ? headerDetection.headers
            : [],
        rows,
        hidden: false,
        metadata: {
            range: worksheetRange,
            mergedCells: countMergedCells(worksheet),
            totalRows:
                parsedRange.lastRowIndex -
                parsedRange.firstRowIndex +
                1,
            totalColumns:
                parsedRange.lastColumnIndex -
                parsedRange.firstColumnIndex +
                1,
            headerRowIndex: hasDetectedHeaders
    ? headerDetection.headerRowIndex
    : null,
            headerConfidence: hasDetectedHeaders
                ? headerDetection.confidence
                : 0,
        },
    };
}

function createEmptySheet(
    sheetName: string,
    range: string | null = null,
): ExtractedSheet {
    return {
        name: sheetName,
        headers: [],
        rows: [],
        hidden: false,
        metadata: {
            range,
            mergedCells: 0,
            totalRows: 0,
            totalColumns: 0,
            headerRowIndex: null,
            headerConfidence: 0,
        },
    };
}

function countMergedCells(worksheet: WorksheetLike): number {
    const mergedCells = worksheet["!merges"];

    return Array.isArray(mergedCells)
        ? mergedCells.length
        : 0;
}

function parseWorksheetRange(
    range: string,
): ParsedWorksheetRange | null {
    const [startAddress, endAddress] = range.split(":");

    if (!startAddress || !endAddress) {
        return null;
    }

    const startCell = parseCellAddress(startAddress);
    const endCell = parseCellAddress(endAddress);

    if (!startCell || !endCell) {
        return null;
    }

    return {
        firstRowIndex: startCell.rowIndex,
        lastRowIndex: endCell.rowIndex,
        firstColumnIndex: startCell.columnIndex,
        lastColumnIndex: endCell.columnIndex,
    };
}

function parseCellAddress(
    address: string,
): {
    rowIndex: number;
    columnIndex: number;
} | null {
    const match = /^([A-Z]+)(\d+)$/i.exec(address.trim());

    if (!match) {
        return null;
    }

    const columnLetters = match[1];
    const rowNumber = Number.parseInt(match[2], 10);

    if (
        !columnLetters ||
        !Number.isInteger(rowNumber) ||
        rowNumber <= 0
    ) {
        return null;
    }

    return {
        rowIndex: rowNumber - 1,
        columnIndex: columnLettersToIndex(columnLetters),
    };
}

function columnLettersToIndex(columnLetters: string): number {
    let columnIndex = 0;

    for (const character of columnLetters.toUpperCase()) {
        columnIndex =
            columnIndex * 26 +
            character.charCodeAt(0) -
            64;
    }

    return columnIndex - 1;
}