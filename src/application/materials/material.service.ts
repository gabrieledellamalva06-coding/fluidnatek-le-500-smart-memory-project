import type { Material } from "../../core/types/material";
import { materialRepository } from "../../repositories/material.repository";

export interface MaterialService {
  getMaterials(): Promise<Material[]>;
  createMaterial(material: Omit<Material, "id">): Promise<void>;
}

class FirestoreMaterialService implements MaterialService {
  async getMaterials(): Promise<Material[]> {
    const materials = await materialRepository.getAll();

    return [...materials].sort((a, b) =>
      a.canonicalName.localeCompare(b.canonicalName)
    );
  }

  async createMaterial(
    material: Omit<Material, "id">
  ): Promise<void> {
    await materialRepository.create(material);
  }
}

export const materialService: MaterialService =
  new FirestoreMaterialService();