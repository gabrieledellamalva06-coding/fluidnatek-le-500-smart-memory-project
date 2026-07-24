/**
 * ============================================================================
 * FLUIDNATEK SMART MEMORY
 * Header Detector
 *
 * Detects the most probable header row from raw extracted worksheet rows.
 *
 * Responsibilities:
 * - evaluate structural characteristics of candidate rows;
 * - detect known header terms and measurement units;
 * - calculate a normalized confidence score;
 * - return no header when the minimum threshold is not reached.
 *
 * This module must remain domain-independent.
 * It detects table structure but does not resolve canonical fields.
 * ============================================================================
 */

import type { ExtractedCell } from "../types/extractedCell";
import type { ExtractedRow } from "../types/extractedRow";

export interface HeaderDetectionResult {
    headerRowIndex: number | null;
    headers: string[];
    confidence: number;
    score: number;
}

interface HeaderCandidateScore {
    rowIndex: number;
    headers: string[];
    score: number;
    confidence: number;
}

const MINIMUM_HEADER_CONFIDENCE = 0.35;

const HEADER_KEYWORDS: readonly string[] = [
    "project",
    "proyecto",
    "material",
    "materials",
    "materiales",
    "polymer",
    "polímero",
    "polimero",
    "solvent",
    "solvente",
    "additive",
    "aditivo",
    "formulation",
    "formulación",
    "formulacion",
    "sample",
    "muestra",
    "setup",
    "configuration",
    "configuración",
    "configuracion",
    "flow",
    "caudal",
    "voltage",
    "voltaje",
    "temperature",
    "temperatura",
    "humidity",
    "humedad",
    "distance",
    "distancia",
    "viscosity",
    "viscosidad",
    "conductivity",
    "conductividad",
    "surface tension",
    "tensión superficial",
    "tension superficial",
    "density",
    "densidad",
    "diameter",
    "diámetro",
    "diametro",
    "morphology",
    "morfología",
    "morfologia",
    "processability",
    "procesabilidad",
    "manufacturer",
    "fabricante",
    "concentration",
    "concentración",
    "concentracion",
    "date",
    "fecha",
    "code",
    "código",
    "codigo",
];

const UNIT_PATTERNS: readonly RegExp[] = [
    /\bkv\b/i,
    /\bmv\b/i,
    /\bv\b/i,
    /\bml\s*\/\s*h\b/i,
    /\bml\/h\b/i,
    /\bµl\s*\/\s*min\b/i,
    /\bul\s*\/\s*min\b/i,
    /\bmm\b/i,
    /\bcm\b/i,
    /\bµm\b/i,
    /\bum\b/i,
    /\bnm\b/i,
    /\bpa(?:\s*[·.]\s*s)?\b/i,
    /\bmpa(?:\s*[·.]\s*s)?\b/i,
    /\bms\s*\/\s*cm\b/i,
    /\bµs\s*\/\s*cm\b/i,
    /\bus\s*\/\s*cm\b/i,
    /\bmn\s*\/\s*m\b/i,
    /\bg\s*\/\s*ml\b/i,
    /\bkg\s*\/\s*m3\b/i,
    /°\s*c/i,
    /°\s*f/i,
    /%/,
    /\brpm\b/i,
];

export function detectHeaders(
    rows: readonly ExtractedRow[],
): HeaderDetectionResult {
    if (rows.length === 0) {
        return createEmptyResult();
    }

    const candidates = rows
        .map((row, position) => scoreHeaderCandidate(row, position, rows.length))
        .filter((candidate) => candidate.headers.length > 0);

    if (candidates.length === 0) {
        return createEmptyResult();
    }

    const bestCandidate = candidates.reduce((best, current) =>
        current.score > best.score ? current : best,
    );

    if (bestCandidate.confidence < MINIMUM_HEADER_CONFIDENCE) {
        return createEmptyResult(bestCandidate.score);
    }

    return {
        headerRowIndex: bestCandidate.rowIndex,
        headers: bestCandidate.headers,
        confidence: bestCandidate.confidence,
        score: bestCandidate.score,
    };
}

function scoreHeaderCandidate(
    row: ExtractedRow,
    position: number,
    totalRows: number,
): HeaderCandidateScore {
    const normalizedHeaders = row.cells.map((cell) =>
        normalizeCellText(cell),
    );

    const nonEmptyHeaders = normalizedHeaders.filter(
        (header) => header.length > 0,
    );

    if (nonEmptyHeaders.length === 0) {
        return {
            rowIndex: row.index,
            headers: normalizedHeaders,
            score: 0,
            confidence: 0,
        };
    }

    const textualCells = row.cells.filter(isTextualCell).length;
    const numericCells = row.cells.filter(isNumericCell).length;
    const keywordMatches = countKeywordMatches(nonEmptyHeaders);
    const unitMatches = countUnitMatches(nonEmptyHeaders);
    const duplicateCount = countDuplicates(nonEmptyHeaders);

    const nonEmptyRatio =
        nonEmptyHeaders.length / Math.max(row.cells.length, 1);

    const textualRatio =
        textualCells / Math.max(nonEmptyHeaders.length, 1);

    const numericRatio =
        numericCells / Math.max(nonEmptyHeaders.length, 1);

    const keywordRatio =
        keywordMatches / Math.max(nonEmptyHeaders.length, 1);

    const unitRatio =
        unitMatches / Math.max(nonEmptyHeaders.length, 1);

    const duplicateRatio =
        duplicateCount / Math.max(nonEmptyHeaders.length, 1);

    const positionScore = calculatePositionScore(position, totalRows);

    const score =
        nonEmptyRatio * 2 +
        textualRatio * 2 +
        keywordRatio * 4 +
        unitRatio * 2 +
        positionScore -
        numericRatio * 2 -
        duplicateRatio * 2;

    const maximumExpectedScore = 11;

    return {
        rowIndex: row.index,
        headers: normalizedHeaders,
        score,
        confidence: clamp(score / maximumExpectedScore, 0, 1),
    };
}

function normalizeCellText(cell: ExtractedCell): string {
    return cell.text.trim();
}

function isTextualCell(cell: ExtractedCell): boolean {
    const text = cell.text.trim();

    if (text.length === 0) {
        return false;
    }

    return /[A-Za-zÀ-ÿ]/.test(text);
}

function isNumericCell(cell: ExtractedCell): boolean {
    const text = cell.text.trim();

    if (text.length === 0) {
        return false;
    }

    return /^[-+]?\d+(?:[.,]\d+)?$/.test(text);
}

function countKeywordMatches(headers: readonly string[]): number {
    return headers.reduce((total, header) => {
        const normalizedHeader = normalizeComparableText(header);

        const hasMatch = HEADER_KEYWORDS.some((keyword) =>
            normalizedHeader.includes(
                normalizeComparableText(keyword),
            ),
        );

        return total + (hasMatch ? 1 : 0);
    }, 0);
}

function countUnitMatches(headers: readonly string[]): number {
    return headers.reduce((total, header) => {
        const hasMatch = UNIT_PATTERNS.some((pattern) =>
            pattern.test(header),
        );

        return total + (hasMatch ? 1 : 0);
    }, 0);
}

function countDuplicates(headers: readonly string[]): number {
    const occurrences = new Map<string, number>();

    for (const header of headers) {
        const normalizedHeader = normalizeComparableText(header);

        if (normalizedHeader.length === 0) {
            continue;
        }

        occurrences.set(
            normalizedHeader,
            (occurrences.get(normalizedHeader) ?? 0) + 1,
        );
    }

    let duplicateCount = 0;

    for (const count of occurrences.values()) {
        if (count > 1) {
            duplicateCount += count - 1;
        }
    }

    return duplicateCount;
}

function calculatePositionScore(
    position: number,
    totalRows: number,
): number {
    if (totalRows <= 1) {
        return 1;
    }

    const normalizedPosition =
        position / Math.max(totalRows - 1, 1);

    return clamp(1 - normalizedPosition, 0, 1);
}

function normalizeComparableText(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[_\-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function clamp(
    value: number,
    minimum: number,
    maximum: number,
): number {
    return Math.min(Math.max(value, minimum), maximum);
}

function createEmptyResult(
    score = 0,
): HeaderDetectionResult {
    return {
        headerRowIndex: null,
        headers: [],
        confidence: 0,
        score,
    };
}