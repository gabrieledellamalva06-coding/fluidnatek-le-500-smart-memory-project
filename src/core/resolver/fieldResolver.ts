import {
    CanonicalFields,
    type CanonicalField
} from "../fields/canonicalFields";

import {
    SemanticDictionary,
    normalizeSemanticKey
} from "../dictionaries/semanticDictionary";

/**
 * ============================================================================
 * Result of a field resolution
 * ============================================================================
 */

export interface FieldResolution {

    originalHeader: string;

    normalizedHeader: string;

    canonicalField: CanonicalField | null;

    confidence: number;

    matchedAlias?: string;

    suggestions?: CanonicalField[];

}

/**
 * ============================================================================
 * Resolve a single Excel header
 * ============================================================================
 */

export function resolveField(
    header: string
): FieldResolution {

    const normalized = normalizeSemanticKey(header);

    for (const [canonicalField, aliases] of Object.entries(SemanticDictionary)) {

        const match = aliases.find(
            alias => normalizeSemanticKey(alias) === normalized
        );

        if (match) {

            return {

                originalHeader: header,

                normalizedHeader: normalized,

                canonicalField: canonicalField as CanonicalField,

                confidence: 1,

                matchedAlias: match,

                suggestions: []

            };

        }

    }

    return {

        originalHeader: header,

        normalizedHeader: normalized,

        canonicalField: null,

        confidence: 0,

        suggestions: []

    };

}

/**
 * ============================================================================
 * Resolve an entire header row
 * ============================================================================
 */

export function resolveHeaders(
    headers: string[]
): FieldResolution[] {

    return headers.map(resolveField);

}

/**
 * ============================================================================
 * Return only resolved canonical fields
 * ============================================================================
 */

export function getResolvedFields(
    headers: string[]
): CanonicalField[] {

    return resolveHeaders(headers)
        .filter(result => result.canonicalField !== null)
        .map(result => result.canonicalField!);

}

/**
 * ============================================================================
 * Unknown headers
 * ============================================================================
 */

export function getUnknownFields(
    headers: string[]
): string[] {

    return resolveHeaders(headers)
        .filter(result => result.canonicalField === null)
        .map(result => result.originalHeader);

}

/**
 * ============================================================================
 * Does the workbook contain unknown headers?
 * ============================================================================
 */

export function hasUnknownFields(
    headers: string[]
): boolean {

    return resolveHeaders(headers)
        .some(result => result.canonicalField === null);

}

/**
 * ============================================================================
 * Confidence helper
 * ============================================================================
 */

export function calculateFieldConfidence(
    header: string
): number {

    return resolveField(header).confidence;

}