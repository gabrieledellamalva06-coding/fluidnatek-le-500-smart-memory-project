import type { Material } from "../../core/types/material";
import { materialRepository } from "../../repositories/material.repository";

export interface CreateMaterialInput {
  canonicalName: string;
  shortName: string;
  category: "polymer" | "solvent";
  family?: string;
  molecularWeight?: string;
  supplier?: string;
}

export interface MaterialService {
  getMaterials(): Promise<Material[]>;
  createMaterial(input: CreateMaterialInput): Promise<Material>;
}

class FirestoreMaterialService implements MaterialService {
  async getMaterials(): Promise<Material[]> {
    const materials = await materialRepository.getAll();

    return [...materials].sort((a, b) =>
      a.canonicalName.localeCompare(b.canonicalName)
    );
  }

  async createMaterial(
    input: CreateMaterialInput
  ): Promise<Material> {
    const now = new Date().toISOString();

    const material: Omit<Material, "id"> = {
      canonicalName: input.canonicalName.trim(),

      category: input.category,

      aliases: input.shortName.trim()
        ? [input.shortName.trim()]
        : [],

      manufacturers: [],
      commercialNames: [],
      productCodes: [],

      molecularWeight:
        input.molecularWeight?.trim() || undefined,

      polymerFamily:
        input.category === "polymer"
          ? input.family?.trim() || undefined
          : undefined,

      solventFamily:
        input.category === "solvent"
          ? input.family?.trim() || undefined
          : undefined,

      supplier:
        input.supplier?.trim() || undefined,

      aiTags: [],

      metadata: {
        createdAt: now,
        updatedAt: now,
        createdBy: "manual-entry",
        confidence: 1,
      },
    };

    const documentReference =
      await materialRepository.create(material);

    return {
      id: documentReference.id,
      ...material,
    };
  }
}

export const materialService: MaterialService =
  new FirestoreMaterialService();