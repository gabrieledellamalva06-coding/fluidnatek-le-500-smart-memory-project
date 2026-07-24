import {
    type CanonicalField
} from "../fields/canonicalFields";

import {
    SemanticDictionary,
    normalizeSemanticKey
} from "../dictionaries/semanticDictionary";

/**
 * ============================================================================
 * Reverse semantic index
 *
 * alias -> canonical field
 * ============================================================================
 */

const semanticIndex = new Map<string, CanonicalField>();

/**
 * ============================================================================
 * Build index only once
 * ============================================================================
 */

for (const [canonicalField, aliases] of Object.entries(SemanticDictionary)) {

    aliases.forEach(alias => {

        semanticIndex.set(

            normalizeSemanticKey(alias),

            canonicalField as CanonicalField

        );

    });

}

/**
 * ============================================================================
 * Resolve canonical field
 * ============================================================================
 */

export function resolveCanonicalField(
    header: string
): CanonicalField | null {

    return (

        semanticIndex.get(
            normalizeSemanticKey(header)
        ) ?? null

    );

}

/**
 * ============================================================================
 * Check if field exists
 * ============================================================================
 */

export function hasCanonicalField(
    header: string
): boolean {

    return semanticIndex.has(
        normalizeSemanticKey(header)
    );

}

/**
 * ============================================================================
 * Number of aliases loaded
 * ============================================================================
 */

export function semanticDictionarySize(): number {

    return semanticIndex.size;

}

/**
 * ============================================================================
 * Get semantic index
 * ============================================================================
 */

export function getSemanticIndex(): ReadonlyMap<string, CanonicalField> {

    return semanticIndex;

}