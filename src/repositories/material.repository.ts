import { CollectionPaths } from "../config/collectionPaths";
import type { Material } from "../core/types/material";

import { BaseRepository } from "./base.repository";

export class MaterialRepository extends BaseRepository<Material> {
  constructor(companyId?: string) {
    super(
      CollectionPaths.materials(companyId)
    );
  }
}

export const materialRepository =
  new MaterialRepository();