/**
 * ============================================================================
 * FLUIDNATEK SMART MEMORY
 * Material Normalizer
 *
 * Converts raw material names into canonical Material objects.
 * ============================================================================
 */

import type { Material } from "../types/material";

import { resolveMaterial } from "../resolver/materialResolver";

import { getLearnedMaterial } from "../learning/materialLearning";

export interface MaterialNormalizationResult {

    success: boolean;

    material: Material | null;

    originalValue: string;

    normalizedValue: string;

    confidence: number;

    source:
        | "dictionary"
        | "learning"
        | "unknown";

}

/**
 * ============================================================================
 * Normalize material
 * ============================================================================
 */

export function normalizeMaterial(

    value: string

): MaterialNormalizationResult {

    const cleaned = value.trim();

    /*
     * 1 - Static Dictionary
     */

    const resolved = resolveMaterial(cleaned);

    if (resolved) {

        return {

            success: true,

            material: resolved.material,

            originalValue: value,

            normalizedValue: resolved.material.canonicalName,

            confidence: resolved.confidence,

            source: "dictionary"

        };

    }

    /*
     * 2 - Learned Materials
     */

    const learned = getLearnedMaterial(cleaned);

    if (learned) {

        return {

            success: true,

            material: learned,

            originalValue: value,

            normalizedValue: learned.canonicalName,

            confidence: 1,

            source: "learning"

        };

    }

    /*
     * 3 - Unknown
     */

    return {

        success: false,

        material: null,

        originalValue: value,

        normalizedValue: cleaned,

        confidence: 0,

        source: "unknown"

    };

}