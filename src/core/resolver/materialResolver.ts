import { MaterialDictionary } from "../dictionaries/materialDictionary";
import type { Material, MaterialMatch } from "../types/material";

/**
 * ============================================================================
 * Normalize material key
 * ============================================================================
 */

function normalizeMaterialKey(value: string): string {

    return value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ");

}

/**
 * ============================================================================
 * Resolve material
 * ============================================================================
 */

export function resolveMaterial(
    value: string
): MaterialMatch | null {

    const normalized = normalizeMaterialKey(value);

    for (const definition of MaterialDictionary) {

        if (

            normalizeMaterialKey(definition.canonicalName) === normalized ||

            definition.aliases.some(
                alias => normalizeMaterialKey(alias) === normalized
            )

        ) {

            const material: Material = {

                id: definition.id,

                canonicalName: definition.canonicalName,

                category: definition.category,

                aliases: [...definition.aliases],

                manufacturers: definition.manufacturers ?? [],

                commercialNames: definition.commercialNames ?? [],

                productCodes: definition.productCodes ?? [],

                chemicalFormula: definition.chemicalFormula,

                casNumber: definition.casNumber,

                description: definition.description,

                aiTags: definition.aiTags ?? [],

                metadata: {

                    createdAt: "",

                    updatedAt: "",

                    createdBy: "system",

                    confidence: 1

                }

            };

            return {

                material,

                confidence: 1,

                matchedAlias: value,

                isLearned: false

            };

        }

    }

    return null;

}

/**
 * ============================================================================
 * Check if material exists
 * ============================================================================
 */

export function hasMaterial(
    value: string
): boolean {

    return resolveMaterial(value) !== null;

}

/**
 * ============================================================================
 * Resolve multiple materials
 * ============================================================================
 */

export function resolveMaterials(
    values: string[]
): MaterialMatch[] {

    return values
        .map(resolveMaterial)
        .filter((m): m is MaterialMatch => m !== null);

}