/**
 * ============================================================================
 * FLUIDNATEK SMART MEMORY
 * Alias Learning
 *
 * Learns aliases discovered during imports.
 * Later this module will persist data to Firestore.
 * ============================================================================
 */

const learnedAliases = new Map<string, string>();

/**
 * ============================================================================
 * Normalize
 * ============================================================================
 */

function normalize(value: string): string {

    return value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ");

}

/**
 * ============================================================================
 * Learn alias
 * ============================================================================
 */

export function learnAlias(

    alias: string,

    canonicalName: string

): void {

    learnedAliases.set(

        normalize(alias),

        canonicalName

    );

}

/**
 * ============================================================================
 * Resolve learned alias
 * ============================================================================
 */

export function resolveLearnedAlias(

    alias: string

): string | null {

    return (

        learnedAliases.get(

            normalize(alias)

        ) ?? null

    );

}

/**
 * ============================================================================
 * Alias exists
 * ============================================================================
 */

export function hasLearnedAlias(

    alias: string

): boolean {

    return learnedAliases.has(

        normalize(alias)

    );

}

/**
 * ============================================================================
 * All aliases
 * ============================================================================
 */

export function getLearnedAliases(): Map<string, string> {

    return new Map(learnedAliases);

}

/**
 * ============================================================================
 * Clear aliases
 * ============================================================================
 */

export function clearLearnedAliases(): void {

    learnedAliases.clear();

}