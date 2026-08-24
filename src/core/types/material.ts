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

import type { DataQualityInfo } from "./dataQuality";

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

    molecularWeightValue?: number;

    molecularWeightUnit?: "Da" | "kDa" | "MDa";

    /** Explicit identity for newly catalogued polymers; legacy records use reviewed aliases. */
    polymerIdentity?: string;

    grade?: string;

    /** Optional family fields used by the UX and similarity context. */
    polymerFamily?: string;

    solventFamily?: string;

    supplier?: string;

    articleNumber?: string;

    batchNumber?: string;

    purity?: string;

    description?: string;

    aiTags: string[];

    metadata: MaterialMetadata;

    dataQuality?: DataQualityInfo;

}

export interface MaterialMatch {

    material: Material;

    confidence: number;

    matchedAlias?: string;

    isLearned: boolean;

}
