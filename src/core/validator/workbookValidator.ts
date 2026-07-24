/**
 * ============================================================================
 * FLUIDNATEK SMART MEMORY
 * Workbook Validator
 *
 * Validates workbook structure before ingestion.
 * ============================================================================
 */

export interface WorkbookValidationResult {

    valid: boolean;

    score: number;

    detectedTemplate: string;

    sheetsFound: string[];

    missingSheets: string[];

    duplicatedSheets: string[];

    warnings: string[];

    errors: string[];

}

/**
 * ============================================================================
 * Canonical sheets required by the ingestion engine
 * ============================================================================
 */

const REQUIRED_SHEETS = [

    "Lista materiales",

    "Detalles proyecto",

    "Materiales",

    "Soluciones composición",

    "Soluciones propiedades",

    "Setup",

    "Parámetros de proceso",

    "Código muestra"

] as const;

/**
 * ============================================================================
 * Validate workbook
 * ============================================================================
 */

export function validateWorkbook(

    workbook: {
        SheetNames?: string[];
    }

): WorkbookValidationResult {

    const sheetNames = workbook.SheetNames ?? [];

    const missingSheets: string[] = [];

    const duplicatedSheets: string[] = [];

    const warnings: string[] = [];

    const errors: string[] = [];

    /*
     * Workbook empty
     */

    if (sheetNames.length === 0) {

        errors.push("Workbook does not contain any sheets.");

    }

    /*
     * Missing sheets
     */

    for (const required of REQUIRED_SHEETS) {

        if (!sheetNames.includes(required)) {

            missingSheets.push(required);

        }

    }

    /*
     * Duplicate sheets
     */

    const occurrences = new Map<string, number>();

    for (const sheet of sheetNames) {

        occurrences.set(

            sheet,

            (occurrences.get(sheet) ?? 0) + 1

        );

    }

    for (const [sheet, count] of occurrences.entries()) {

        if (count > 1) {

            duplicatedSheets.push(sheet);

        }

    }

    /*
     * Warnings
     */

    if (missingSheets.length > 0) {

        warnings.push(

            `${missingSheets.length} required sheet(s) missing.`

        );

    }

    /*
     * Score
     */

    const score = Math.max(

        0,

        Math.round(

            ((REQUIRED_SHEETS.length - missingSheets.length)

                / REQUIRED_SHEETS.length) * 100

        )

    );

    /*
     * Template detection
     */

    let detectedTemplate = "Unknown";

    if (score >= 90) {

        detectedTemplate = "Fluidnatek Standard";

    }

    if (errors.length > 0) {

        detectedTemplate = "Invalid";

    }

    return {

        valid: errors.length === 0,

        score,

        detectedTemplate,

        sheetsFound: [...sheetNames],

        missingSheets,

        duplicatedSheets,

        warnings,

        errors

    };

}