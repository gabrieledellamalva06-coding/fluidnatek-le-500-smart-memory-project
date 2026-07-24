import type { Material } from "../types/material";

/**
 * ============================================================================
 * Material Learning Memory
 *
 * Temporary in-memory implementation.
 * It will later be replaced by Firestore persistence.
 * ============================================================================
 */

const learnedMaterials = new Map<string, Material>();

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
 * Learn a material
 * ============================================================================
 */

export function learnMaterial(
    material: Material
): void {

    learnedMaterials.set(

        normalize(material.canonicalName),

        material

    );

}

/**
 * ============================================================================
 * Get learned material
 * ============================================================================
 */

export function getLearnedMaterial(
    name: string
): Material | null {

    return (

        learnedMaterials.get(
            normalize(name)
        ) ?? null

    );

}

/**
 * ============================================================================
 * Check learned material
 * ============================================================================
 */

export function hasLearnedMaterial(
    name: string
): boolean {

    return learnedMaterials.has(
        normalize(name)
    );

}

/**
 * ============================================================================
 * Get all learned materials
 * ============================================================================
 */

export function getLearnedMaterials(): Material[] {

    return [...learnedMaterials.values()];

}

/**
 * ============================================================================
 * Clear memory
 * ============================================================================
 */

export function clearLearnedMaterials(): void {

    learnedMaterials.clear();

}