/**
 * ============================================================================
 * FLUIDNATEK SMART MEMORY
 * Sheet Resolver
 *
 * Resolves extracted worksheets into canonical semantic sheet identifiers.
 *
 * Responsibilities:
 * - preserve compatibility with name-only sheet resolution;
 * - evaluate worksheet names, detected headers and cell contents;
 * - calculate confidence for the selected canonical sheet;
 * - return UNKNOWN when evidence is insufficient.
 *
 * Semantic classification belongs to the Resolver, not to the Extractor.
 * ============================================================================
 */

import type { ExtractedSheet } from "../types/extractedSheet";

export type CanonicalSheet =
    | "MATERIALS_DATABASE"
    | "PROJECT_DETAILS"
    | "PROJECT_MATERIALS"
    | "FORMULATION"
    | "SOLUTION_PROPERTIES"
    | "SETUP"
    | "PROCESS_PARAMETERS"
    | "SAMPLE_CODE"
    | "UNKNOWN";

export interface SheetResolutionResult {
    canonical: CanonicalSheet;
    confidence: number;
    score: number;
    matchedAliases: string[];
    signals: SheetResolutionSignals;
}

export interface SheetResolutionSignals {
    nameScore: number;
    headerScore: number;
    contentScore: number;
    headerConfidence: number;
}

interface SheetDefinition {
    canonical: Exclude<CanonicalSheet, "UNKNOWN">;
    aliases: readonly string[];
    headerTerms: readonly string[];
    contentTerms: readonly string[];
}

interface ScoredSheetDefinition {
    definition: SheetDefinition;
    score: number;
    confidence: number;
    matchedAliases: string[];
    signals: SheetResolutionSignals;
}

const MINIMUM_RESOLUTION_CONFIDENCE = 0.3;
const MAXIMUM_CONTENT_ROWS = 20;

const SHEET_DICTIONARY: readonly SheetDefinition[] = [
    {
        canonical: "MATERIALS_DATABASE",
        aliases: [
            "lista materiales",
            "materials",
            "material list",
            "material database",
            "database",
            "raw materials",
            "base de datos materiales",
        ],
        headerTerms: [
            "material",
            "material name",
            "nombre material",
            "manufacturer",
            "fabricante",
            "supplier",
            "proveedor",
            "material type",
            "tipo material",
            "grade",
            "density",
            "densidad",
        ],
        contentTerms: [
            "polymer",
            "polimero",
            "solvent",
            "solvente",
            "additive",
            "aditivo",
            "manufacturer",
            "fabricante",
        ],
    },
    {
        canonical: "PROJECT_DETAILS",
        aliases: [
            "detalles proyecto",
            "project details",
            "project",
            "general",
            "project information",
            "informacion proyecto",
        ],
        headerTerms: [
            "project",
            "project name",
            "nombre proyecto",
            "customer",
            "cliente",
            "description",
            "descripcion",
            "responsible",
            "responsable",
            "date",
            "fecha",
        ],
        contentTerms: [
            "project name",
            "nombre proyecto",
            "customer",
            "cliente",
            "responsible",
            "responsable",
        ],
    },
    {
        canonical: "PROJECT_MATERIALS",
        aliases: [
            "materiales",
            "materials used",
            "project materials",
            "materiales proyecto",
        ],
        headerTerms: [
            "material",
            "material code",
            "codigo material",
            "type",
            "tipo",
            "function",
            "funcion",
            "supplier",
            "proveedor",
        ],
        contentTerms: [
            "polymer",
            "polimero",
            "solvent",
            "solvente",
            "additive",
            "aditivo",
        ],
    },
    {
        canonical: "FORMULATION",
        aliases: [
            "soluciones composicion",
            "solution composition",
            "composition",
            "formulation",
            "formulacion",
            "solution formulation",
        ],
        headerTerms: [
            "component",
            "componente",
            "material",
            "concentration",
            "concentracion",
            "percentage",
            "porcentaje",
            "weight",
            "peso",
            "volume",
            "volumen",
            "ratio",
            "proportion",
            "proporcion",
        ],
        contentTerms: [
            "wt",
            "w v",
            "v v",
            "polymer",
            "polimero",
            "solvent",
            "solvente",
            "concentration",
            "concentracion",
        ],
    },
    {
        canonical: "SOLUTION_PROPERTIES",
        aliases: [
            "soluciones propiedades",
            "solution properties",
            "properties",
            "propiedades solucion",
        ],
        headerTerms: [
            "viscosity",
            "viscosidad",
            "conductivity",
            "conductividad",
            "surface tension",
            "tension superficial",
            "density",
            "densidad",
            "temperature",
            "temperatura",
        ],
        contentTerms: [
            "mpa s",
            "pa s",
            "ms cm",
            "us cm",
            "mn m",
            "g ml",
        ],
    },
    {
        canonical: "SETUP",
        aliases: [
            "setup",
            "electrospinning setup",
            "machine setup",
            "configuracion",
            "configuracion maquina",
        ],
        headerTerms: [
            "machine",
            "maquina",
            "injector",
            "inyector",
            "collector",
            "colector",
            "needle",
            "aguja",
            "emitter",
            "emisor",
            "setup",
            "configuration",
            "configuracion",
        ],
        contentTerms: [
            "multi emitter",
            "single needle",
            "rotating collector",
            "drum collector",
            "needle",
            "aguja",
            "collector",
            "colector",
        ],
    },
    {
        canonical: "PROCESS_PARAMETERS",
        aliases: [
            "parametros de proceso",
            "process parameters",
            "process",
            "electrospinning",
            "process conditions",
            "condiciones proceso",
        ],
        headerTerms: [
            "voltage",
            "voltaje",
            "flow rate",
            "caudal",
            "distance",
            "distancia",
            "temperature",
            "temperatura",
            "humidity",
            "humedad",
            "speed",
            "velocidad",
            "duration",
            "duracion",
        ],
        contentTerms: [
            "kv",
            "ml h",
            "mm",
            "cm",
            "rpm",
            "humidity",
            "humedad",
            "temperature",
            "temperatura",
        ],
    },
    {
        canonical: "SAMPLE_CODE",
        aliases: [
            "codigo muestra",
            "sample code",
            "samples",
            "sample",
            "muestras",
            "sample identification",
        ],
        headerTerms: [
            "sample",
            "muestra",
            "sample code",
            "codigo muestra",
            "identifier",
            "identificador",
            "batch",
            "lote",
            "date",
            "fecha",
        ],
        contentTerms: [
            "sample",
            "muestra",
            "batch",
            "lote",
            "code",
            "codigo",
        ],
    },
];

/**
 * Preserves compatibility with the previous name-only resolver.
 */
export function resolveSheet(sheetName: string): CanonicalSheet {
    return resolveSheetName(sheetName).canonical;
}

/**
 * Resolves an extracted sheet using name, headers and worksheet content.
 */
export function resolveExtractedSheet(
    sheet: ExtractedSheet,
): SheetResolutionResult {
    const normalizedName = normalize(sheet.name);
    const normalizedHeaders = sheet.headers
        .map(normalize)
        .filter((header) => header.length > 0);

    const normalizedContent = extractNormalizedContent(sheet);

    const candidates = SHEET_DICTIONARY.map((definition) =>
        scoreDefinition(
            definition,
            normalizedName,
            normalizedHeaders,
            normalizedContent,
            sheet.metadata.headerConfidence,
        ),
    );

    const bestCandidate = candidates.reduce((best, candidate) =>
        candidate.score > best.score ? candidate : best,
    );

    if (bestCandidate.confidence < MINIMUM_RESOLUTION_CONFIDENCE) {
        return createUnknownResult(bestCandidate);
    }

    return {
        canonical: bestCandidate.definition.canonical,
        confidence: bestCandidate.confidence,
        score: bestCandidate.score,
        matchedAliases: bestCandidate.matchedAliases,
        signals: bestCandidate.signals,
    };
}

/**
 * Preserves compatibility with the previous workbook name resolver.
 */
export function resolveSheets(
    sheetNames: readonly string[],
): Record<string, CanonicalSheet> {
    const result: Record<string, CanonicalSheet> = {};

    for (const sheetName of sheetNames) {
        result[sheetName] = resolveSheet(sheetName);
    }

    return result;
}

/**
 * Resolves all extracted workbook sheets with confidence information.
 */
export function resolveExtractedSheets(
    sheets: readonly ExtractedSheet[],
): Record<string, SheetResolutionResult> {
    const result: Record<string, SheetResolutionResult> = {};

    for (const sheet of sheets) {
        result[sheet.name] = resolveExtractedSheet(sheet);
    }

    return result;
}

export function getUnknownSheets(
    sheetNames: readonly string[],
): string[] {
    return sheetNames.filter(
        (sheetName) => resolveSheet(sheetName) === "UNKNOWN",
    );
}

export function getUnknownExtractedSheets(
    sheets: readonly ExtractedSheet[],
): ExtractedSheet[] {
    return sheets.filter(
        (sheet) =>
            resolveExtractedSheet(sheet).canonical === "UNKNOWN",
    );
}

function resolveSheetName(
    sheetName: string,
): SheetResolutionResult {
    const normalizedName = normalize(sheetName);

    const candidates = SHEET_DICTIONARY.map((definition) =>
        scoreDefinition(
            definition,
            normalizedName,
            [],
            [],
            0,
        ),
    );

    const bestCandidate = candidates.reduce((best, candidate) =>
        candidate.score > best.score ? candidate : best,
    );

    if (bestCandidate.signals.nameScore <= 0) {
        return createUnknownResult(bestCandidate);
    }

    return {
        canonical: bestCandidate.definition.canonical,
        confidence: bestCandidate.confidence,
        score: bestCandidate.score,
        matchedAliases: bestCandidate.matchedAliases,
        signals: bestCandidate.signals,
    };
}

function scoreDefinition(
    definition: SheetDefinition,
    normalizedName: string,
    normalizedHeaders: readonly string[],
    normalizedContent: readonly string[],
    headerConfidence: number,
): ScoredSheetDefinition {
    const nameMatches = findMatches(
        normalizedName.length > 0 ? [normalizedName] : [],
        definition.aliases,
        true,
    );

    const headerMatches = findMatches(
        normalizedHeaders,
        definition.headerTerms,
        false,
    );

    const contentMatches = findMatches(
        normalizedContent,
        definition.contentTerms,
        false,
    );

    const nameScore = calculateNameScore(
        normalizedName,
        definition.aliases,
    );

    const headerScore = calculateCollectionScore(
        normalizedHeaders,
        headerMatches,
    );

    const contentScore = calculateCollectionScore(
        normalizedContent,
        contentMatches,
    );

    const normalizedHeaderConfidence = clamp(
        headerConfidence,
        0,
        1,
    );

    const weightedHeaderScore =
        headerScore *
        (0.5 + normalizedHeaderConfidence * 0.5);

    const score =
        nameScore * 5 +
        weightedHeaderScore * 4 +
        contentScore * 2;

    const maximumExpectedScore = 11;

    return {
        definition,
        score,
        confidence: clamp(
            score / maximumExpectedScore,
            0,
            1,
        ),
        matchedAliases: unique([
            ...nameMatches,
            ...headerMatches,
            ...contentMatches,
        ]),
        signals: {
            nameScore,
            headerScore: weightedHeaderScore,
            contentScore,
            headerConfidence: normalizedHeaderConfidence,
        },
    };
}

function calculateNameScore(
    normalizedName: string,
    aliases: readonly string[],
): number {
    if (normalizedName.length === 0) {
        return 0;
    }

    let bestScore = 0;

    for (const alias of aliases) {
        const normalizedAlias = normalize(alias);

        if (normalizedAlias === normalizedName) {
            return 1;
        }

        if (
            normalizedName.includes(normalizedAlias) ||
            normalizedAlias.includes(normalizedName)
        ) {
            bestScore = Math.max(bestScore, 0.7);
        }
    }

    return bestScore;
}

function calculateCollectionScore(
    values: readonly string[],
    matches: readonly string[],
): number {
    if (values.length === 0 || matches.length === 0) {
        return 0;
    }

    return clamp(
        unique(matches).length /
            Math.max(Math.min(values.length, 5), 1),
        0,
        1,
    );
}

function findMatches(
    values: readonly string[],
    terms: readonly string[],
    exactOnly: boolean,
): string[] {
    const matches: string[] = [];

    for (const value of values) {
        for (const term of terms) {
            const normalizedTerm = normalize(term);

            const isMatch = exactOnly
                ? value === normalizedTerm
                : containsComparableTerm(
                      value,
                      normalizedTerm,
                  );

            if (isMatch) {
                matches.push(term);
            }
        }
    }

    return matches;
}

function containsComparableTerm(
    value: string,
    term: string,
): boolean {
    if (value === term) {
        return true;
    }

    if (term.length <= 2) {
        return value
            .split(" ")
            .some((token) => token === term);
    }

    return value.includes(term);
}

function extractNormalizedContent(
    sheet: ExtractedSheet,
): string[] {
    const content: string[] = [];

    for (const row of sheet.rows.slice(0, MAXIMUM_CONTENT_ROWS)) {
        for (const cell of row.cells) {
            const normalizedText = normalize(cell.text);

            if (normalizedText.length > 0) {
                content.push(normalizedText);
            }
        }
    }

    return content;
}

function createUnknownResult(
    candidate?: ScoredSheetDefinition,
): SheetResolutionResult {
    return {
        canonical: "UNKNOWN",
        confidence: 0,
        score: candidate?.score ?? 0,
        matchedAliases: candidate?.matchedAliases ?? [],
        signals: candidate?.signals ?? {
            nameScore: 0,
            headerScore: 0,
            contentScore: 0,
            headerConfidence: 0,
        },
    };
}

function normalize(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[_\-]+/g, " ")
        .replace(/[()[\]{}]/g, " ")
        .replace(/[^\p{L}\p{N}%/.\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function unique(values: readonly string[]): string[] {
    return [...new Set(values)];
}

function clamp(
    value: number,
    minimum: number,
    maximum: number,
): number {
    return Math.min(
        Math.max(value, minimum),
        maximum,
    );
}