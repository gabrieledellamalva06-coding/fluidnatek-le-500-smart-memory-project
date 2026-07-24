/**
 * ============================================================================
 * FLUIDNATEK SMART MEMORY
 * Confidence Engine
 *
 * Calculates confidence scores for every automatic resolution.
 * ============================================================================
 */

export interface ConfidenceBreakdown {

    exactMatch: number;

    aliasMatch: number;

    learnedMatch: number;

    semanticMatch: number;

    completeness: number;

}

export interface ConfidenceResult {

    score: number;

    level: "HIGH" | "MEDIUM" | "LOW";

    breakdown: ConfidenceBreakdown;

}

function clamp(value: number): number {

    return Math.max(0, Math.min(100, value));

}

/**
 * ============================================================================
 * Calculate confidence
 * ============================================================================
 */

export function calculateConfidence(

    breakdown: Partial<ConfidenceBreakdown>

): ConfidenceResult {

    const complete: ConfidenceBreakdown = {

        exactMatch: breakdown.exactMatch ?? 0,

        aliasMatch: breakdown.aliasMatch ?? 0,

        learnedMatch: breakdown.learnedMatch ?? 0,

        semanticMatch: breakdown.semanticMatch ?? 0,

        completeness: breakdown.completeness ?? 0

    };

    const score = clamp(

        complete.exactMatch +
        complete.aliasMatch +
        complete.learnedMatch +
        complete.semanticMatch +
        complete.completeness

    );

    let level: "HIGH" | "MEDIUM" | "LOW";

    if (score >= 90) {

        level = "HIGH";

    } else if (score >= 65) {

        level = "MEDIUM";

    } else {

        level = "LOW";

    }

    return {

        score,

        level,

        breakdown: complete

    };

}