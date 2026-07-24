/**
 * ============================================================================
 * FLUIDNATEK SMART MEMORY
 * Material Types
 *
 * Canonical material model used by:
 * - Material Dictionary
 * - Material Resolver
 * - Learning Engine
 * - Firestore
 * - AI
 * ============================================================================
 */

export type MaterialCategory =
    | "polymer"
    | "solvent"
    | "additive"
    | "nanoparticle"
    | "surfactant"
    | "salt"
    | "ceramic"
    | "metal"
    | "drug"
    | "biopolymer"
    | "copolymer"
    | "other";

export interface MaterialMetadata {

    createdAt: string;

    updatedAt: string;

    createdBy: string;

    confidence: number;

}

export interface Material {

    id: string;

    canonicalName: string;

    category: MaterialCategory;

    aliases: string[];

    manufacturers: string[];

    commercialNames: string[];

    productCodes: string[];

    chemicalFormula?: string;

    casNumber?: string;

    molecularWeight?: string;

    supplier?: string;

    purity?: string;

    description?: string;

    aiTags: string[];

    metadata: MaterialMetadata;

}

export interface MaterialMatch {

    material: Material;

    confidence: number;

    matchedAlias?: string;

    isLearned: boolean;

}