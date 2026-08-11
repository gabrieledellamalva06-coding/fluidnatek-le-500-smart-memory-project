import type { Material } from "../../core/types/material";
import { materialRepository } from "../../repositories/material.repository";

export interface MaterialService {
  getMaterials(): Promise<Material[]>;
}

class FirestoreMaterialService implements MaterialService {
  async getMaterials(): Promise<Material[]> {
    const materials = await materialRepository.getAll();
    return [...materials].sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));
  }
}

export const materialService: MaterialService = new FirestoreMaterialService();
